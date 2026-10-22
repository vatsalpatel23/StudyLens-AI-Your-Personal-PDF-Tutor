import json
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, Document, ChatSession, ChatMessage
from backend.app.schemas import ChatSendRequest, ChatMessageResponse, ChatSessionResponse, CitationItem
from backend.app.security import get_current_user, rate_limiter
from backend.app.vector_store import vector_store
from backend.app.rag_engine import get_rag_provider, rag_cache

router = APIRouter(prefix="/api/chat", tags=["RAG Chat"])


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/message", response_model=ChatMessageResponse)
def send_chat_message(
    req: ChatSendRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    RAG-Grounded Interactive Study Chat:
    - Verifies server-side resource ownership (IDOR defense).
    - Multi-tenant vector retrieval strictly scoped to current_user.id and document_id.
    - System prompt defense against direct and indirect prompt injection.
    - Strict citation validation: model citations must map to actual retrieved chunks.
    - Rate limited to protect AI resources.
    """
    client_ip = get_client_ip(request)
    allowed, wait_secs = rate_limiter.is_allowed(
        f"chat_{client_ip}", max_requests=settings.RATE_LIMIT_CHAT_PER_MIN
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Chat rate limit exceeded. Please wait {wait_secs} seconds.",
        )

    # 1. Authorize document ownership
    doc = (
        db.query(Document)
        .filter(Document.id == req.document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    # 2. Get or create chat session
    session = None
    if req.session_id:
        session = (
            db.query(ChatSession)
            .filter(
                ChatSession.id == req.session_id,
                ChatSession.user_id == current_user.id,
                ChatSession.document_id == doc.id,
            )
            .first()
        )

    if not session:
        session = ChatSession(
            user_id=current_user.id,
            document_id=doc.id,
            title=f"Tutoring: {doc.title[:40]}",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    # 3. Multi-tenant Isolated Vector Search (with automatic cold-start database recovery)
    retrieved_chunks = vector_store.search(
        query=req.message,
        user_id=current_user.id,
        document_id=doc.id,
        top_k=settings.TOP_K_CHUNKS,
        threshold=settings.VECTOR_SIMILARITY_THRESHOLD,
        db=db,
    )

    # 4. Check Query Cache for Identical Questions on Same Document (Tenant-isolated)
    cached_entry = rag_cache.get(
        user_id=current_user.id,
        document_id=doc.id,
        query=req.message,
    )

    if cached_entry:
        assistant_content, valid_citations = cached_entry
    else:
        # Generate Grounded AI Response with Citation Verification
        rag = get_rag_provider()
        assistant_content, valid_citations = rag.generate_answer(
            query=req.message, retrieved_chunks=retrieved_chunks
        )
        # Store in query cache
        rag_cache.set(
            user_id=current_user.id,
            document_id=doc.id,
            query=req.message,
            answer=assistant_content,
            citations=valid_citations,
        )

    # 5. Persist User and Assistant Messages
    user_msg = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="user",
        content=req.message,
        citations_json="[]",
    )
    db.add(user_msg)

    citations_serialized = json.dumps([c.model_dump() for c in valid_citations])
    assistant_msg = ChatMessage(
        session_id=session.id,
        user_id=current_user.id,
        role="assistant",
        content=assistant_content,
        citations_json=citations_serialized,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatMessageResponse(
        id=assistant_msg.id,
        session_id=session.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        citations=valid_citations,
        created_at=assistant_msg.created_at,
    )


@router.get("/sessions/{document_id}", response_model=ChatSessionResponse)
def get_chat_session_history(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetches chat session history for a document.
    Enforces authorization check on document and messages.
    """
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == current_user.id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    session = (
        db.query(ChatSession)
        .filter(ChatSession.document_id == doc.id, ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .first()
    )

    if not session:
        session = ChatSession(
            user_id=current_user.id,
            document_id=doc.id,
            title=f"Tutoring: {doc.title[:40]}",
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id, ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    parsed_messages = []
    for m in messages:
        try:
            cit_list = json.loads(m.citations_json)
            citations = [CitationItem(**c) for c in cit_list]
        except Exception:
            citations = []

        parsed_messages.append(
            ChatMessageResponse(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                citations=citations,
                created_at=m.created_at,
            )
        )

    return ChatSessionResponse(
        id=session.id,
        document_id=session.document_id,
        title=session.title,
        created_at=session.created_at,
        messages=parsed_messages,
    )


@router.delete("/sessions/{session_id}")
def clear_chat_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clears a chat session and associated messages.
    Checks ownership server-side.
    """
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or access denied.",
        )

    db.delete(session)
    db.commit()
    return {"message": "Chat history cleared successfully."}
