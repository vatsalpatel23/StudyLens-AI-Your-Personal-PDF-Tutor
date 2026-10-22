from pathlib import Path
import pytest
from fastapi.testclient import TestClient

FIXTURES_DIR = Path("backend/tests/fixtures")


def test_unauthenticated_requests_rejected(client: TestClient):
    # Documents listing without token
    res = client.get("/api/documents")
    assert res.status_code == 401

    # Chat without token
    res = client.post("/api/chat/message", json={"document_id": "fake", "message": "hello"})
    assert res.status_code == 401

    # Study tools without token
    res = client.get("/api/study/summary/fake-id")
    assert res.status_code == 401


def test_logout_revokes_token(client: TestClient, alice_token: str):
    headers = {"Authorization": f"Bearer {alice_token}"}

    # Verify token works
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200

    # Logout
    res = client.post("/api/auth/logout", headers=headers)
    assert res.status_code == 200

    # Verify token is now rejected
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
    assert "revoked" in res.json().get("detail", "").lower()


def test_idor_bola_cross_user_isolation(client: TestClient, alice_token: str, bob_token: str):
    """
    Critical Security Test: IDOR / BOLA
    Validates that Bob cannot access, query, download, or delete Alice's documents or study sessions.
    """
    alice_headers = {"Authorization": f"Bearer {alice_token}"}
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    # 1. Alice uploads a study document
    sample_pdf_path = FIXTURES_DIR / "valid_study_doc.pdf"
    with open(sample_pdf_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=alice_headers,
            files={"file": ("quantum_notes.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    alice_doc = res.json()
    alice_doc_id = alice_doc["id"]

    # 2. Bob attempts to access Alice's document metadata
    res = client.get(f"/api/documents/{alice_doc_id}", headers=bob_headers)
    assert res.status_code in [403, 404]

    # 3. Bob attempts to download Alice's physical PDF
    res = client.get(f"/api/documents/{alice_doc_id}/download", headers=bob_headers)
    assert res.status_code in [403, 404]

    # 4. Bob attempts to ask questions about Alice's document
    res = client.post(
        "/api/chat/message",
        headers=bob_headers,
        json={"document_id": alice_doc_id, "message": "Summarize page 1"},
    )
    assert res.status_code in [403, 404]

    # 5. Bob attempts to fetch Alice's flashcards or summary
    res = client.get(f"/api/study/summary/{alice_doc_id}", headers=bob_headers)
    assert res.status_code in [403, 404]

    res = client.get(f"/api/study/flashcards/{alice_doc_id}", headers=bob_headers)
    assert res.status_code in [403, 404]

    # 6. Bob attempts to DELETE Alice's document
    res = client.delete(f"/api/documents/{alice_doc_id}", headers=bob_headers)
    assert res.status_code in [403, 404]

    # 7. Alice verifies her document is intact and accessible to her
    res = client.get(f"/api/documents/{alice_doc_id}", headers=alice_headers)
    assert res.status_code == 200
    assert res.json()["id"] == alice_doc_id

    # 8. Bob lists documents - Bob's list must be empty
    res = client.get("/api/documents", headers=bob_headers)
    assert res.status_code == 200
    assert len(res.json()) == 0
