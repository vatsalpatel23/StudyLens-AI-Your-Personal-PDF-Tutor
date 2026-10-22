import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User, Document, DocumentChunk, FlashcardSet, QuizSet
from backend.app.schemas import (
    DocumentSummaryResponse,
    FlashcardSetResponse,
    FlashcardItem,
    QuizSetResponse,
    QuizQuestionItem,
)
from backend.app.security import get_current_user
from backend.app.vector_store import VectorSearchResult
from backend.app.rag_engine import get_rag_provider

router = APIRouter(prefix="/api/study", tags=["Study Tools"])


@router.get("/summary/{document_id}", response_model=DocumentSummaryResponse)
def get_document_summary(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generates an executive summary, key takeaways, and suggested review questions
    grounded exclusively in the user's document.
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

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id, DocumentChunk.user_id == current_user.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .limit(10)
        .all()
    )

    text_samples = [c.content for c in chunks]
    rag = get_rag_provider()
    summary_data = rag.generate_summary(text_samples)

    # Cache summary on document record
    if not doc.summary:
        doc.summary = summary_data["summary"]
        db.commit()

    return DocumentSummaryResponse(
        document_id=doc.id,
        title=doc.title,
        summary=summary_data["summary"],
        key_takeaways=summary_data["key_takeaways"],
        suggested_questions=summary_data["suggested_questions"],
    )


@router.get("/flashcards/{document_id}", response_model=FlashcardSetResponse)
def get_document_flashcards(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves or generates interactive flashcards with exact page citations.
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

    existing_set = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.document_id == doc.id, FlashcardSet.user_id == current_user.id)
        .first()
    )

    if existing_set:
        cards_raw = json.loads(existing_set.cards_json)
        cards = [FlashcardItem(**c) for c in cards_raw]
        return FlashcardSetResponse(
            id=existing_set.id,
            document_id=doc.id,
            title=existing_set.title,
            cards=cards,
            created_at=existing_set.created_at,
        )

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id, DocumentChunk.user_id == current_user.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )

    vector_results = [
        VectorSearchResult(
            chunk_id=c.id,
            document_id=c.document_id,
            page_number=c.page_number,
            content=c.content,
            score=1.0,
        )
        for c in chunks
    ]

    rag = get_rag_provider()
    cards = rag.generate_flashcards(vector_results)

    cards_json = json.dumps([c.model_dump() for c in cards])
    new_set = FlashcardSet(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Flashcards: {doc.title[:40]}",
        cards_json=cards_json,
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)

    return FlashcardSetResponse(
        id=new_set.id,
        document_id=doc.id,
        title=new_set.title,
        cards=cards,
        created_at=new_set.created_at,
    )


@router.get("/quiz/{document_id}", response_model=QuizSetResponse)
def get_document_quiz(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves or generates a practice quiz with multiple-choice questions,
    answer keys, and page explanations.
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

    existing_set = (
        db.query(QuizSet)
        .filter(QuizSet.document_id == doc.id, QuizSet.user_id == current_user.id)
        .first()
    )

    if existing_set:
        questions_raw = json.loads(existing_set.questions_json)
        questions = [QuizQuestionItem(**q) for q in questions_raw]
        return QuizSetResponse(
            id=existing_set.id,
            document_id=doc.id,
            title=existing_set.title,
            questions=questions,
            created_at=existing_set.created_at,
        )

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id, DocumentChunk.user_id == current_user.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )

    vector_results = [
        VectorSearchResult(
            chunk_id=c.id,
            document_id=c.document_id,
            page_number=c.page_number,
            content=c.content,
            score=1.0,
        )
        for c in chunks
    ]

    rag = get_rag_provider()
    questions = rag.generate_quiz(vector_results)

    questions_json = json.dumps([q.model_dump() for q in questions])
    new_set = QuizSet(
        user_id=current_user.id,
        document_id=doc.id,
        title=f"Practice Quiz: {doc.title[:40]}",
        questions_json=questions_json,
    )
    db.add(new_set)
    db.commit()
    db.refresh(new_set)

    return QuizSetResponse(
        id=new_set.id,
        document_id=doc.id,
        title=new_set.title,
        questions=questions,
        created_at=new_set.created_at,
    )
