import time
import uuid
from pathlib import Path
import concurrent.futures
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.rag_engine import rag_cache
from backend.app.security import rate_limiter
from backend.app.vector_store import vector_store

FIXTURES_DIR = Path("backend/tests/fixtures")


def test_concurrent_user_registrations_and_logins(client: TestClient):
    """
    Verifies that multiple concurrent users can register and authenticate
    simultaneously without database locks, duplicate keys, or race conditions.
    """
    num_users = 8
    user_payloads = [
        {
            "name": f"Concurrent Student {i}",
            "email": f"concurrent_user_{uuid.uuid4().hex[:8]}_{i}@university.edu",
            "password": "Password123!",
        }
        for i in range(num_users)
    ]

    def register_user(args):
        idx, payload = args
        headers = {"X-Forwarded-For": f"198.51.100.{idx + 1}"}
        res = client.post("/api/auth/register", json=payload, headers=headers)
        return res.status_code, res.json()

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
        results = list(executor.map(register_user, enumerate(user_payloads)))

    for status_code, body in results:
        assert status_code == 201
        assert "access_token" in body
        assert "user" in body
        assert body["user"]["is_active"] is True


def test_concurrent_chat_query_caching(client: TestClient, alice_token: str):
    """
    Verifies that concurrent identical queries against the same document
    hit the query cache safely, reducing latency and avoiding duplicate computation.
    """
    headers = {"Authorization": f"Bearer {alice_token}"}
    pdf_bytes = (FIXTURES_DIR / "valid_study_doc.pdf").read_bytes()

    # 1. Upload a test document
    files = {"file": ("test_study_concurrency.pdf", pdf_bytes, "application/pdf")}
    upload_res = client.post("/api/documents/upload", files=files, headers=headers)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    query_payload = {
        "document_id": doc_id,
        "message": "What is the key principle of quantum computing?",
    }

    def send_chat_req(_):
        with rate_limiter._lock:
            rate_limiter._requests.clear()
        start = time.time()
        res = client.post("/api/chat/message", json=query_payload, headers=headers)
        duration_ms = (time.time() - start) * 1000
        return res.status_code, res.json(), duration_ms

    # First request primes the cache
    status1, body1, dur1 = send_chat_req(0)
    assert status1 == 200
    assert "role" in body1 and body1["role"] == "assistant"

    # Send 6 concurrent identical requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        concurrent_results = list(executor.map(send_chat_req, range(6)))

    for status_code, body, duration_ms in concurrent_results:
        assert status_code == 200
        assert body["content"] == body1["content"]
        # Cached requests return almost instantaneously
        assert duration_ms < 500


def test_concurrent_cross_tenant_isolation(client: TestClient, alice_token: str):
    """
    Verifies that under concurrent requests, User A cannot access User B's documents
    or search vectors, proving strict tenant isolation under load.
    """
    headers_a = {"Authorization": f"Bearer {alice_token}"}
    pdf_bytes = (FIXTURES_DIR / "valid_study_doc.pdf").read_bytes()

    # User A document
    files = {"file": ("user_a_doc.pdf", pdf_bytes, "application/pdf")}
    res_a = client.post("/api/documents/upload", files=files, headers=headers_a)
    assert res_a.status_code == 201
    doc_a_id = res_a.json()["id"]

    # Register User B
    b_email = f"user_b_{uuid.uuid4().hex[:8]}@test.edu"
    reg_b = client.post(
        "/api/auth/register",
        json={"name": "User B", "email": b_email, "password": "Password123!"},
    )
    assert reg_b.status_code == 201
    token_b = reg_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    def access_attempt(attempt_id):
        # Even attempts: User A accessing doc A (should succeed: 200)
        # Odd attempts: User B attempting to access doc A (should fail: 404)
        if attempt_id % 2 == 0:
            res = client.get(f"/api/documents/{doc_a_id}", headers=headers_a)
            return res.status_code, 200
        else:
            res = client.get(f"/api/documents/{doc_a_id}", headers=headers_b)
            return res.status_code, 404

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(access_attempt, range(10)))

    for actual_status, expected_status in results:
        assert actual_status == expected_status
