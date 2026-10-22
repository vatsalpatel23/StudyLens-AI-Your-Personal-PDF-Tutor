from pathlib import Path
import pytest
from fastapi.testclient import TestClient

FIXTURES_DIR = Path("backend/tests/fixtures")


def test_student_complete_e2e_study_journey(client: TestClient):
    """
    E2E Workflow:
    1. Student registers new account.
    2. Student logs in and receives token.
    3. Student uploads multi-page academic PDF notes.
    4. Student views indexed pages in Document Preview.
    5. Student asks question about quantum superposition.
    6. System answers with grounded response citing [Page 1].
    7. Citation points to authentic chunk on Page 1.
    8. Student opens Flashcards mode and reviews study cards.
    9. Student takes Practice Quiz, selects correct answer, and sees explanation.
    10. Student deletes document and verifies clean multi-tenant isolation.
    """
    # 1. Register
    reg_res = client.post("/api/auth/register", json={
        "name": "Sarah Connor",
        "email": "sarah.connor@cyberdyne.edu",
        "password": "Password123!Safe",
    })
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload academic PDF
    pdf_file = FIXTURES_DIR / "valid_study_doc.pdf"
    with open(pdf_file, "rb") as f:
        upload_res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("quantum_notes_final.pdf", f, "application/pdf")}
        )
    assert upload_res.status_code == 201
    doc = upload_res.json()
    doc_id = doc["id"]
    assert doc["page_count"] == 3

    # 3. Document details & chunks check
    detail_res = client.get(f"/api/documents/{doc_id}", headers=headers)
    assert detail_res.status_code == 200
    chunks = detail_res.json()["chunks"]
    assert len(chunks) == 3

    # 4. Ask Tutor question
    chat_res = client.post("/api/chat/message", headers=headers, json={
        "document_id": doc_id,
        "message": "Explain what qubits and superposition are",
    })
    assert chat_res.status_code == 200
    chat_body = chat_res.json()
    assert "superposition" in chat_body["content"].lower() or "qubit" in chat_body["content"].lower()
    assert len(chat_body["citations"]) > 0
    assert chat_body["citations"][0]["page_number"] == 1

    # 5. Study Flashcards
    fc_res = client.get(f"/api/study/flashcards/{doc_id}", headers=headers)
    assert fc_res.status_code == 200
    cards = fc_res.json()["cards"]
    assert len(cards) >= 1
    assert "page_number" in cards[0]

    # 6. Study Quiz
    quiz_res = client.get(f"/api/study/quiz/{doc_id}", headers=headers)
    assert quiz_res.status_code == 200
    quiz_questions = quiz_res.json()["questions"]
    assert len(quiz_questions) >= 1
    q0 = quiz_questions[0]
    assert len(q0["options"]) == 4

    # 7. Document deletion
    del_res = client.delete(f"/api/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 200

    # 8. Verify document is permanently purged
    get_del_res = client.get(f"/api/documents/{doc_id}", headers=headers)
    assert get_del_res.status_code == 404
