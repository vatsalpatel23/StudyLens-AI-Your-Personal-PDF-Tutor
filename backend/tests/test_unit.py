import time
from datetime import timedelta
import pytest
from fastapi import HTTPException

from backend.app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    SlidingWindowRateLimiter,
)
from backend.app.pdf_processor import (
    validate_pdf_signature,
    sanitize_filename,
    create_chunks_from_text,
)
from backend.app.rag_engine import validate_citations
from backend.app.vector_store import VectorSearchResult


def test_argon2id_password_hashing():
    raw_pass = "MySecretPassw0rd!"
    hashed = hash_password(raw_pass)

    assert hashed.startswith("$argon2id$")
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False


def test_jwt_token_creation_and_validation():
    user_id = "test-user-uuid-123"
    token, jti = create_access_token(user_id=user_id, is_admin=False)
    assert token is not None
    assert len(jti) == 36

    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["jti"] == jti
    assert payload["iss"] == "studylens-api"


def test_jwt_tampered_token_rejection():
    user_id = "test-user-uuid-123"
    token, _ = create_access_token(user_id=user_id)
    tampered_token = token[:-4] + "abcd"

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(tampered_token)
    assert exc_info.value.status_code == 401


def test_jwt_expired_token_rejection():
    user_id = "test-user-uuid-123"
    # Create token expired 10 minutes ago
    token, _ = create_access_token(user_id=user_id, expires_delta=timedelta(minutes=-10))

    with pytest.raises(HTTPException) as exc_info:
        decode_access_token(token)
    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


def test_pdf_magic_bytes_signature_validation():
    # Valid PDF signature
    valid_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj"
    validate_pdf_signature(valid_bytes)  # Should not raise

    # Invalid signatures
    invalid_bytes = b"MZ\x90\x00\x03\x00\x00\x00"  # PE/Windows executable header
    with pytest.raises(HTTPException) as exc:
        validate_pdf_signature(invalid_bytes)
    assert exc.value.status_code == 400

    empty_bytes = b""
    with pytest.raises(HTTPException) as exc:
        validate_pdf_signature(empty_bytes)
    assert exc.value.status_code == 400


def test_filename_sanitization():
    # Path traversal attack
    assert sanitize_filename("../../etc/passwd.pdf") == "passwd.pdf"
    assert sanitize_filename("..\\..\\windows\\system32\\calc.pdf") == "calc.pdf"

    # Dangerous characters & null bytes
    assert sanitize_filename("my_exam<script>alert(1)</script>.pdf") == "my_examscriptalert1script.pdf"
    assert sanitize_filename("document\x00evil.pdf") == "documentevil.pdf"

    # Missing extension
    assert sanitize_filename("lecture_notes") == "lecture_notes.pdf"


def test_text_chunking_logic():
    sample_text = (
        "Quantum computing harnesses superposition and entanglement. "
        "A qubit can exist in a linear combination of states. "
        "Shor's algorithm can factor integers in polynomial time. "
        "Grover's algorithm searches unstructured databases in square root time."
    )
    chunks = create_chunks_from_text(sample_text, chunk_size=100, chunk_overlap=20)
    assert len(chunks) >= 2
    for chunk in chunks:
        assert len(chunk) > 0


def test_sliding_window_rate_limiter():
    limiter = SlidingWindowRateLimiter()
    key = "test_client_1"

    # Allow 3 requests
    assert limiter.is_allowed(key, max_requests=3, window_seconds=10)[0] is True
    assert limiter.is_allowed(key, max_requests=3, window_seconds=10)[0] is True
    assert limiter.is_allowed(key, max_requests=3, window_seconds=10)[0] is True

    # 4th request must be rejected
    allowed, wait_time = limiter.is_allowed(key, max_requests=3, window_seconds=10)
    assert allowed is False
    assert wait_time > 0

    # Reset allows again
    limiter.reset_for_key(key)
    assert limiter.is_allowed(key, max_requests=3, window_seconds=10)[0] is True


def test_citation_validation_against_retrieved_chunks():
    retrieved = [
        VectorSearchResult(
            chunk_id="chunk_1",
            document_id="doc_1",
            page_number=1,
            content="Superposition allows qubits to exist in multiple states simultaneously.",
            score=0.9,
        ),
        VectorSearchResult(
            chunk_id="chunk_2",
            document_id="doc_1",
            page_number=2,
            content="Entanglement links quantum states across distances.",
            score=0.85,
        ),
    ]

    # Model references Page 1 and Page 2 correctly
    response = "Superposition enables parallel state evaluation [Page 1]. Entanglement was called spooky action [Page 2]."
    citations = validate_citations(response, retrieved)
    assert len(citations) == 2
    assert citations[0].page_number == 1
    assert citations[0].chunk_id == "chunk_1"
    assert citations[1].page_number == 2
    assert citations[1].chunk_id == "chunk_2"

    # Model hallucinates Page 99 (not retrieved)
    hallucinated_response = "Here is a fabricated claim referencing [Page 99]."
    hallucinated_citations = validate_citations(hallucinated_response, retrieved)
    # Page 99 must NOT be in citations!
    page_nums = [c.page_number for c in hallucinated_citations]
    assert 99 not in page_nums
