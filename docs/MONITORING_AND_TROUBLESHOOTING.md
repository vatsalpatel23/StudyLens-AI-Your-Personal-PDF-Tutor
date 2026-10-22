# StudyLens AI — Monitoring & Troubleshooting Guide

This guide provides operational runbooks, diagnostic endpoints, log inspection techniques, and step-by-step troubleshooting procedures for **StudyLens AI**.

---

## 1. Observability & Diagnostic Endpoints

### 1. System Health Check (`GET /api/health`)
Provides live diagnostics on application status, database round-trip latency, and active vector cache size.

```bash
curl -i http://127.0.0.1:8000/api/health
```
**Healthy Response (`200 OK`)**:
```json
{
  "status": "healthy",
  "app_name": "StudyLens AI — Your Personal PDF Tutor",
  "version": "1.0.0",
  "database": {
    "status": "healthy",
    "latency_ms": 1.25
  },
  "vector_store": {
    "cached_chunks_in_memory": 48
  }
}
```

### 2. Readiness Probe (`GET /api/health/ready`)
Designed for Kubernetes pods, Docker Compose health checks, and load balancers. Validates that:
- The database is accepting queries.
- The upload storage directory is writable.

If either dependency is unavailable, it returns `503 Service Unavailable` with specific failure causes.

---

## 2. Request Tracing with Correlation IDs

Every incoming HTTP request is assigned a unique `X-Request-ID` UUID by [`RequestCorrelationMiddleware`](../backend/app/middleware.py).

### Client Response Header
```http
HTTP/1.1 200 OK
X-Request-ID: 8d1f2b4c-83b1-4d32-9b57-61c94b7f83e2
X-Response-Time-Ms: 14.82
```

### Structured Server Log Output
```
INFO:studylens.http:[8d1f2b4c] POST /api/chat/message -> 200 (14.82ms)
```

If a student reports an unexpected error, request their `X-Request-ID` (or `Correlation ID` displayed in the UI toast) and search server logs:
```bash
grep "8d1f2b4c" logs/app.log
```

---

## 3. Common Troubleshooting Runbooks

### Runbook 1: "Unable to extract readable text from this PDF"
- **Symptom**: Student uploads a PDF; upload fails with `400 Bad Request`.
- **Root Cause**: The PDF consists of scanned raster images (e.g., photocopied textbook pages) without an embedded text layer.
- **Diagnosis**: Open the PDF in Acrobat/Chrome and attempt to highlight text with a mouse. If text cannot be selected, the PDF lacks a font/text layer.
- **Resolution**:
  1. The student must use a searchable PDF or run OCR software (e.g. Adobe Acrobat OCR or Tesseract) prior to upload.
  2. OCR background processing is scheduled for StudyLens AI v1.2 (see [Roadmap](ROADMAP.md)).

### Runbook 2: AI Provider Rate Limit (`429 Too Many Requests`)
- **Symptom**: Chat queries take several seconds or return rate limit warnings.
- **Root Cause**: Free tier Google Gemini API quota (15 RPM / 1M TPM) has been exceeded by high concurrent traffic.
- **Resolution**:
  1. StudyLens AI's `GeminiAIProvider` automatically retries up to 3 times using exponential backoff and randomized jitter.
  2. For high-volume production, upgrade to a paid Google AI Studio tier or configure multiple provider keys.
  3. Identical questions are automatically served from `RAGQueryCache` in $<5\text{ ms}$ with 0 external API cost.

### Runbook 3: Cross-Origin Resource Sharing (CORS) Blocked
- **Symptom**: Browser console displays `Access to XMLHttpRequest blocked by CORS policy`.
- **Root Cause**: The frontend is running on a port or domain not listed in `CORS_ALLOWED_ORIGINS`.
- **Resolution**:
  1. Inspect the frontend origin in your browser address bar (e.g. `http://localhost:5174`).
  2. Add the origin to `CORS_ALLOWED_ORIGINS` in `.env`:
     ```ini
     CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173
     ```
  3. Restart the backend server.

### Runbook 4: Database Locked (`sqlite3.OperationalError: database is locked`)
- **Symptom**: Write requests fail during simultaneous document uploads.
- **Root Cause**: SQLite database file is on a network drive, or busy timeout is misconfigured.
- **Resolution**:
  1. Verify the database file is located on local SSD/NVMe storage (never on an NFS/SMB share).
  2. Confirm WAL mode is active:
     ```bash
     sqlite3 backend/storage/studylens.db "PRAGMA journal_mode;"
     ```
     Expected output: `wal`.
  3. Check that `PRAGMA busy_timeout=30000;` is present in `backend/app/database.py`.

---

## 4. Useful Diagnostic Commands

```powershell
# Check database table row counts
sqlite3 backend/storage/studylens.db "SELECT 'Users:', count(*) FROM users UNION SELECT 'Documents:', count(*) FROM documents UNION SELECT 'Chunks:', count(*) FROM document_chunks;"

# Verify vector store and test suite integrity
.\.venv\Scripts\python run_all_tests.py

# Run load test benchmark
.\.venv\Scripts\python backend/tests/load_test_runner.py
```

---

## 5. Related Documentation
- [System Architecture](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Load Testing & Capacity](LOAD_TESTING.md)
