import os
import hashlib
import uuid
import re
import logging
from pathlib import Path

logger = logging.getLogger("studylens.pdf")
from pypdf import PdfReader
from pypdf.errors import PdfReadError, FileNotDecryptedError
from fastapi import HTTPException, status
from backend.app.config import settings

# PDF Magic Bytes signature
PDF_MAGIC_BYTES = b"%PDF-"


class ExtractedChunk:
    def __init__(self, chunk_index: int, page_number: int, content: str, token_count: int):
        self.chunk_index = chunk_index
        self.page_number = page_number
        self.content = content
        self.token_count = token_count


class ProcessedPDF:
    def __init__(
        self,
        document_id: str,
        sanitized_title: str,
        storage_path: str,
        file_size_bytes: int,
        page_count: int,
        sha256_hash: str,
        chunks: list[ExtractedChunk],
    ):
        self.document_id = document_id
        self.sanitized_title = sanitized_title
        self.storage_path = storage_path
        self.file_size_bytes = file_size_bytes
        self.page_count = page_count
        self.sha256_hash = sha256_hash
        self.chunks = chunks


def sanitize_filename(raw_filename: str) -> str:
    """
    Sanitizes user-provided filename:
    Removes path traversal sequences, null bytes, and non-printable characters.
    """
    if not raw_filename:
        return "untitled_document.pdf"

    clean = raw_filename.replace("\x00", "")
    # Remove path traversal sequences (../ or ..\)
    clean = re.sub(r"(\.\.[/\\])+", "", clean)
    clean = re.sub(r"^[/\\]+", "", clean)

    # If it contains genuine path components like etc/ or system32/
    clean_slash = clean.replace("\\", "/")
    if any(dir_marker in clean_slash for dir_marker in ["etc/", "system32/", "windows/", "home/"]):
        clean = clean_slash.split("/")[-1]

    # Remove dangerous characters, allow alphanumeric, spaces, dashes, dots, underscores
    sanitized = re.sub(r"[^\w\s\.-]", "", clean)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()

    if not sanitized.lower().endswith(".pdf"):
        sanitized = f"{sanitized}.pdf"

    if len(sanitized) > 150:
        stem = sanitized[:140]
        sanitized = f"{stem}.pdf"

    return sanitized or "document.pdf"


def validate_pdf_signature(file_bytes: bytes) -> None:
    """
    Validates magic bytes signature to ensure the file is truly a PDF,
    not an executable or malicious script with a .pdf extension.
    """
    if len(file_bytes) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty or too small to be a valid PDF document.",
        )

    # A valid PDF header must begin with %PDF- within the first 1024 bytes (ISO 32000-1)
    header_sample = file_bytes[:1024]
    if PDF_MAGIC_BYTES not in header_sample:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file signature: The uploaded file does not conform to standard PDF structure.",
        )


def process_and_store_pdf(user_id: str, original_filename: str, file_bytes: bytes) -> ProcessedPDF:
    """
    Safely inspects, validates, parses, chunks, and writes the PDF file to private user storage.
    Enforces strict upload size and page limits to prevent DoS attacks.
    """
    # 1. Size Validation
    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )
    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds the maximum allowed size of {max_mb} MB.",
        )

    # 2. Magic Bytes Signature Check
    validate_pdf_signature(file_bytes)

    # 3. SHA-256 Checksum
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    # 4. Parse PDF using PyPDF safely in a temporary sandbox
    temp_id = str(uuid.uuid4())
    temp_dir = Path(settings.TEMP_DIR)
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"temp_{temp_id}.pdf"

    try:
        # Write bytes to temporary location
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        # Parse with PyPDF
        try:
            reader = PdfReader(str(temp_path))
        except FileNotDecryptedError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Encrypted or password-protected PDFs are not supported. Please upload an unprotected PDF.",
            )
        except (PdfReadError, Exception) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed or corrupt PDF: Unable to parse document structure.",
            )

        # 5. Check if encrypted
        if reader.is_encrypted:
            try:
                # Attempt empty password decryption
                if not reader.decrypt(""):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The PDF is password protected. Please remove the password before uploading.",
                    )
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Encrypted PDFs are not supported. Please upload an unlocked PDF.",
                )

        # 6. Page Count Limit Enforcement
        page_count = len(reader.pages)
        if page_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The PDF contains 0 pages and cannot be processed.",
            )
        if page_count > settings.MAX_PDF_PAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"The document exceeds the maximum page limit ({page_count} pages > {settings.MAX_PDF_PAGES} max).",
            )

        # 7. Extract Text and Chunk by Page
        extracted_chunks: list[ExtractedChunk] = []
        chunk_idx = 0
        total_text_chars = 0

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""

            # Sanitize extracted text: normalize whitespace and remove null bytes
            page_text = page_text.replace("\x00", "").strip()
            total_text_chars += len(page_text)

            if not page_text:
                continue

            # Chunk within page to preserve exact page attribution
            page_chunks = create_chunks_from_text(page_text, settings.CHUNK_SIZE_CHARS, settings.CHUNK_OVERLAP_CHARS)
            for c_text in page_chunks:
                words = c_text.split()
                approx_tokens = len(words)
                extracted_chunks.append(
                    ExtractedChunk(
                        chunk_index=chunk_idx,
                        page_number=page_num,
                        content=c_text,
                        token_count=approx_tokens,
                    )
                )
                chunk_idx += 1

        # If document had no extractable text (e.g. scanned image PDF without OCR)
        if not extracted_chunks or total_text_chars < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to extract readable text from this PDF. Please ensure the document contains selectable text.",
            )

        # 8. Generate safe random internal UUID filename and store in user directory
        doc_id = str(uuid.uuid4())
        user_storage_dir = Path(settings.STORAGE_DIR) / user_id
        user_storage_dir.mkdir(parents=True, exist_ok=True)

        final_storage_path = user_storage_dir / f"{doc_id}.pdf"

        # Verify path traversal boundary: ensure final path is strictly inside user_storage_dir
        resolved_path = final_storage_path.resolve()
        resolved_user_dir = user_storage_dir.resolve()
        if not str(resolved_path).startswith(str(resolved_user_dir)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security violation: Illegal file destination path.",
            )

        # Move/write to permanent user storage
        with open(final_storage_path, "wb") as f:
            f.write(file_bytes)

        sanitized_title = sanitize_filename(original_filename)

        return ProcessedPDF(
            document_id=doc_id,
            sanitized_title=sanitized_title,
            storage_path=str(final_storage_path),
            file_size_bytes=file_size,
            page_count=page_count,
            sha256_hash=sha256_hash,
            chunks=extracted_chunks,
        )

    finally:
        # Guarantee cleanup of temporary file on success and failure
        if temp_path.exists():
            try:
                temp_path.unlink()
            except OSError as err:
                logger.debug(f"Temporary file cleanup notification: {err}")


def create_chunks_from_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> list[str]:
    """
    Sliding window chunker that splits on sentence or paragraph boundaries.
    """
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()]

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) + 1 <= chunk_size:
            current_chunk = f"{current_chunk}\n{paragraph}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If paragraph itself is longer than chunk_size, split by sentences
            if len(paragraph) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", paragraph)
                sub_chunk = ""
                for sentence in sentences:
                    if len(sub_chunk) + len(sentence) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {sentence}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = sentence
                current_chunk = sub_chunk
            else:
                current_chunk = paragraph

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
