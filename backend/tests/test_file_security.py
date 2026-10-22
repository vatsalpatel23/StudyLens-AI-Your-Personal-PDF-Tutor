from pathlib import Path
import pytest
from fastapi.testclient import TestClient

FIXTURES_DIR = Path("backend/tests/fixtures")
TEMP_DIR = Path("backend/storage/temp")


def test_corrupt_pdf_upload_rejected(client: TestClient, alice_token: str):
    headers = {"Authorization": f"Bearer {alice_token}"}
    corrupt_path = FIXTURES_DIR / "corrupt_file.pdf"

    with open(corrupt_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("corrupt_file.pdf", f, "application/pdf")},
        )
    assert res.status_code == 400
    assert "signature" in res.json().get("detail", "").lower() or "pdf structure" in res.json().get("detail", "").lower()


def test_empty_pdf_upload_rejected(client: TestClient, alice_token: str):
    headers = {"Authorization": f"Bearer {alice_token}"}
    empty_path = FIXTURES_DIR / "empty_file.pdf"

    with open(empty_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("empty_file.pdf", f, "application/pdf")},
        )
    assert res.status_code == 400
    assert "empty" in res.json().get("detail", "").lower()


def test_oversized_page_count_rejected(client: TestClient, alice_token: str):
    headers = {"Authorization": f"Bearer {alice_token}"}
    oversized_path = FIXTURES_DIR / "oversized_pages_doc.pdf"

    with open(oversized_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("oversized_pages_doc.pdf", f, "application/pdf")},
        )
    assert res.status_code == 400
    assert "page limit" in res.json().get("detail", "").lower()


def test_path_traversal_filename_mitigation(client: TestClient, alice_token: str):
    headers = {"Authorization": f"Bearer {alice_token}"}
    valid_path = FIXTURES_DIR / "valid_study_doc.pdf"

    # Malicious traversal filename in multipart header
    traversal_name = "../../etc/shadow.pdf"

    with open(valid_path, "rb") as f:
        res = client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": (traversal_name, f, "application/pdf")},
        )
    assert res.status_code == 201
    doc = res.json()
    # The title should be sanitized and safe, not containing path separators
    assert "/" not in doc["title"]
    assert "\\" not in doc["title"]
    assert doc["title"] == "shadow.pdf"


def test_temp_file_cleanup_on_failure(client: TestClient, alice_token: str):
    """Ensure no leftover files in temporary folder after a failed upload."""
    headers = {"Authorization": f"Bearer {alice_token}"}
    corrupt_path = FIXTURES_DIR / "corrupt_file.pdf"

    initial_temp_files = list(TEMP_DIR.glob("temp_*.pdf"))

    with open(corrupt_path, "rb") as f:
        client.post(
            "/api/documents/upload",
            headers=headers,
            files={"file": ("corrupt.pdf", f, "application/pdf")},
        )

    final_temp_files = list(TEMP_DIR.glob("temp_*.pdf"))
    assert len(final_temp_files) == len(initial_temp_files)
