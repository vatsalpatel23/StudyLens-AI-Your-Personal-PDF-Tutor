from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from backend.app.vector_store import vector_store

FIXTURES_DIR = Path("backend/tests/fixtures")


def test_full_student_study_lifecycle(client: TestClient):
    # 1. Register a new student
    reg_payload = {
        "name": "David Student",
        "email": "david.student@university.edu",
        "password": "SecurePassword123!",
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201
    auth_data = res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Verify /api/auth/me
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == "david.student@university.edu"

    # 3. Upload Study Document (Quantum Computing Notes)
    pdf_path = FIXTURES_DIR / "valid_study_doc.pdf"
    with open(pdf_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("quantum_computing_courseware.pdf", f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    doc_id = doc["id"]
    assert doc["page_count"] == 3
    assert doc["file_size_bytes"] > 0

    # 4. Fetch Document Details and verify chunks
    res = client.get(f"/api/documents/{doc_id}", headers=headers)
    assert res.status_code == 200
    details = res.json()
    assert details["chunk_count"] >= 3
    assert details["chunks"][0]["page_number"] == 1

    # 5. Ask Question: "What are Bell states and quantum entanglement?"
    res = client.post(
        "/api/chat/message",
        headers=headers,
        json={"document_id": doc_id, "message": "What are Bell states and quantum entanglement?"},
    )
    assert res.status_code == 200
    chat_res = res.json()
    assert "entangle" in chat_res["content"].lower() or "bell" in chat_res["content"].lower()
    assert len(chat_res["citations"]) > 0
    assert chat_res["citations"][0]["page_number"] == 2

    # 6. Fetch Chat History
    res = client.get(f"/api/chat/sessions/{doc_id}", headers=headers)
    assert res.status_code == 200
    session_data = res.json()
    assert len(session_data["messages"]) >= 2  # user msg + assistant msg

    # 7. Generate Document Summary & Key Takeaways
    res = client.get(f"/api/study/summary/{doc_id}", headers=headers)
    assert res.status_code == 200
    summary_data = res.json()
    assert len(summary_data["summary"]) > 20
    assert len(summary_data["key_takeaways"]) > 0
    assert len(summary_data["suggested_questions"]) > 0

    # 8. Generate Flashcards
    res = client.get(f"/api/study/flashcards/{doc_id}", headers=headers)
    assert res.status_code == 200
    fc_data = res.json()
    assert len(fc_data["cards"]) > 0
    assert fc_data["cards"][0]["page_number"] in [1, 2, 3]

    # 9. Generate Practice Quiz
    res = client.get(f"/api/study/quiz/{doc_id}", headers=headers)
    assert res.status_code == 200
    quiz_data = res.json()
    assert len(quiz_data["questions"]) > 0
    q1 = quiz_data["questions"][0]
    assert len(q1["options"]) == 4
    assert q1["correct_index"] in [0, 1, 2, 3]
    assert len(q1["explanation"]) > 0

    # 10. Delete Document and check cascading cleanup
    res = client.delete(f"/api/documents/{doc_id}", headers=headers)
    assert res.status_code == 200

    # Verify 404 after deletion
    res = client.get(f"/api/documents/{doc_id}", headers=headers)
    assert res.status_code == 404

    # Verify vector store chunks deleted
    chunks_left = vector_store.search("quantum", user_id=user_id, document_id=doc_id)
    assert len(chunks_left) == 0
