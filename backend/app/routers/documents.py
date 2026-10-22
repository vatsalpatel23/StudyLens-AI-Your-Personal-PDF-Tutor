import os
import uuid
import asyncio
import logging
from pathlib import Path

logger = logging.getLogger("studylens.documents")
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, Document, DocumentChunk
from backend.app.schemas import DocumentResponse, DocumentDetailResponse, DocumentChunkResponse
from backend.app.security import get_current_user, rate_limiter
from backend.app.pdf_processor import process_and_store_pdf
from backend.app.vector_store import vector_store

router = APIRouter(prefix="/api/documents", tags=["Documents"])

# Bounded concurrency semaphore: prevents memory/CPU exhaustion when many concurrent uploads arrive
upload_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_UPLOADS)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Secure PDF Document Ingestion:
    - Validates MIME type and magic bytes signature (%PDF-).
    - Enforces max file size (20MB) and max page count (100 pages).
    - Prevents path traversal using sanitized filenames and internal UUID storage paths.
    - Generates page-aware semantic text chunks and indexes into vector store with tenant isolation.
    """
    client_ip = get_client_ip(request)
    allowed, wait_secs = rate_limiter.is_allowed(
        f"upload_{client_ip}", max_requests=settings.RATE_LIMIT_UPLOAD_PER_MIN
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Upload rate limit exceeded. Please wait {wait_secs} seconds.",
        )

    async with upload_semaphore:
        # Read bytes safely with size check
        content = await file.read()
        if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB.",
            )

        # Process and validate PDF within bounded concurrency slot
        processed = process_and_store_pdf(
            user_id=current_user.id,
            original_filename=file.filename or "uploaded_study_doc.pdf",
            file_bytes=content,
        )

    # Create Document record
    new_doc = Document(
        id=processed.document_id,
        user_id=current_user.id,
        title=processed.sanitized_title,
        storage_path=processed.storage_path,
        file_size_bytes=processed.file_size_bytes,
        page_count=processed.page_count,
        sha256_hash=processed.sha256_hash,
    )
    db.add(new_doc)

    # Persist Chunks to Database and Index in Vector Store
    for chunk_data in processed.chunks:
        chunk_id = str(uuid.uuid4())
        chunk_model = DocumentChunk(
            id=chunk_id,
            document_id=new_doc.id,
            user_id=current_user.id,
            chunk_index=chunk_data.chunk_index,
            page_number=chunk_data.page_number,
            content=chunk_data.content,
            token_count=chunk_data.token_count,
        )
        db.add(chunk_model)
        # Add to vector store for retrieval with strict user_id tenant isolation
        vector_store.add_chunk(
            chunk_id=chunk_id,
            document_id=new_doc.id,
            user_id=current_user.id,
            page_number=chunk_data.page_number,
            content=chunk_data.content,
        )

    db.commit()
    db.refresh(new_doc)

    return DocumentResponse.model_validate(new_doc)


@router.get("", response_model=list[DocumentResponse])
def list_user_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lists all documents owned by the authenticated user.
    Server-side filtering guarantees User A cannot see User B's documents.
    """
    documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [DocumentResponse.model_validate(d) for d in documents]


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves document metadata and extracted chunks.
    IDOR/BOLA Protection: Strictly checks document.user_id == current_user.id.
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
        .all()
    )

    chunk_responses = [DocumentChunkResponse.model_validate(c) for c in chunks]

    return DocumentDetailResponse(
        id=doc.id,
        title=doc.title,
        file_size_bytes=doc.file_size_bytes,
        page_count=doc.page_count,
        sha256_hash=doc.sha256_hash,
        summary=doc.summary,
        created_at=doc.created_at,
        chunk_count=len(chunks),
        chunks=chunk_responses,
    )


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Streams PDF for preview.
    Prevents path traversal and checks resource ownership.
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

    file_path = Path(doc.storage_path).resolve()
    # Ensure file is inside user directory
    user_dir = (Path(settings.STORAGE_DIR) / current_user.id).resolve()
    if not str(file_path).startswith(str(user_dir)) or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested file does not exist on server.",
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=doc.title,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cascading Document Deletion:
    Removes database records, associated vector records, and physical disk file.
    IDOR/BOLA Protection: Only owner can delete.
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

    # 1. Remove physical file from storage
    try:
        file_path = Path(doc.storage_path)
        if file_path.exists():
            file_path.unlink()
    except OSError as err:
        logger.debug(f"File unlinking notification: {err}")

    # 2. Remove chunks from vector store
    vector_store.delete_document_chunks(doc.id, current_user.id)

    # 3. Delete database record (cascades to chunks, chats, flashcards, quizzes)
    db.delete(doc)
    db.commit()

    return {"message": "Document and all associated study materials were permanently deleted."}
