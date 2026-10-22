# StudyLens AI — REST API Reference

The StudyLens AI backend exposes a RESTful API built on FastAPI. All request and response payloads use JSON, with file streams used for PDF downloads.

---

## 1. Authentication & Headers

Protected endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <jwt_access_token>
```

All responses return standard security and observability headers:
- `X-Request-ID`: Unique correlation UUID for request tracing.
- `X-Response-Time-Ms`: Total server processing latency in milliseconds.
- `Content-Security-Policy`: OWASP-compliant CSP directives.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

---

## 2. API Endpoints Summary

| Method | Path | Auth Required | Purpose |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | No | System health, database latency, and vector store metrics |
| `GET` | `/api/health/ready` | No | Kubernetes/Docker readiness probe |
| `POST` | `/api/auth/register` | No | Create student account and issue JWT token |
| `POST` | `/api/auth/login` | No | Authenticate user and issue JWT token |
| `POST` | `/api/auth/logout` | Yes | Invalidate JWT by adding `jti` to token blocklist |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile |
| `POST` | `/api/documents/upload` | Yes | Upload and chunk untrusted PDF |
| `GET` | `/api/documents` | Yes | List authenticated user's documents |
| `GET` | `/api/documents/{id}` | Yes | Get document details and extracted chunks |
| `GET` | `/api/documents/{id}/download` | Yes | Stream original PDF file |
| `DELETE`| `/api/documents/{id}` | Yes | Cascading delete of document, chunks, and storage |
| `POST` | `/api/chat/message` | Yes | Send query to AI tutor with verified citations |
| `GET` | `/api/chat/history/{doc_id}` | Yes | Retrieve chat history for document |
| `DELETE`| `/api/chat/session/{id}` | Yes | Delete chat session history |
| `GET` | `/api/study/summary/{doc_id}` | Yes | Generate/retrieve executive summary & takeaways |
| `GET` | `/api/study/flashcards/{doc_id}` | Yes | Generate/retrieve active recall flashcards |
| `GET` | `/api/study/quiz/{doc_id}` | Yes | Generate/retrieve practice quiz questions |

---

## 3. Endpoint Specifications

### Health & Diagnostics

#### `GET /api/health`
Returns runtime status and database latency.
- **Auth**: None
- **Rate Limit**: Unrestricted
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "app_name": "StudyLens AI — Your Personal PDF Tutor",
  "version": "1.0.0",
  "environment": "development",
  "timestamp": "2026-10-22T16:00:00Z",
  "database": {
    "status": "healthy",
    "latency_ms": 1.15
  },
  "ai_provider": "mock",
  "vector_store": {
    "cached_chunks_in_memory": 12
  },
  "security": {
    "argon2id_enabled": true,
    "jwt_algorithm": "HS256",
    "rate_limiting_active": true,
    "max_upload_size_mb": 20,
    "max_pdf_pages": 100,
    "cors_configured_origins_count": 2
  }
}
```

---

### Authentication

#### `POST /api/auth/register`
Creates a new student account using Argon2id password hashing.
- **Auth**: None
- **Rate Limit**: 5 requests / min / IP
- **Request Body**:
```json
{
  "name": "Marie Curie",
  "email": "marie.curie@sorbonne.edu",
  "password": "Password123!"
}
```
- **Validation Rules**:
  - `name`: 1–255 characters.
  - `email`: Valid RFC 5322 email syntax.
  - `password`: Minimum 8 characters, containing both letters and numbers.
- **Response `201 Created`**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "bearer",
  "expires_in_minutes": 60,
  "user": {
    "id": "e4b2d354-9467-4bb1-805b-80df50198c0b",
    "email": "marie.curie@sorbonne.edu",
    "name": "Marie Curie",
    "is_active": true,
    "is_admin": false,
    "created_at": "2026-10-22T16:00:00Z"
  }
}
```

#### `POST /api/auth/login`
Authenticates user with constant-time password verification.
- **Auth**: None
- **Rate Limit**: 5 requests / min / IP
- **Request Body**:
```json
{
  "email": "marie.curie@sorbonne.edu",
  "password": "Password123!"
}
```
- **Response `200 OK`**: Same schema as `/register`. Returns `401 Unauthorized` on invalid credentials.

#### `POST /api/auth/logout`
Revokes current JWT token by registering its `jti` in the database blocklist.
- **Auth**: Bearer Token
- **Response `200 OK`**:
```json
{
  "message": "Token revoked successfully."
}
```

---

### Document Management

#### `POST /api/documents/upload`
Uploads and indexes a PDF document.
- **Auth**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Parameters**: `file` (binary PDF)
- **Rate Limit**: 10 requests / min / IP
- **Validation**:
  - Magic-bytes header (`%PDF-`).
  - Max size: 20 MB.
  - Max pages: 100 pages.
- **Response `201 Created`**:
```json
{
  "id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "title": "Quantum_Mechanics_Lecture_1.pdf",
  "file_size_bytes": 1048576,
  "page_count": 8,
  "sha256_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "created_at": "2026-10-22T16:05:00Z"
}
```

#### `GET /api/documents`
Lists all documents belonging to the authenticated user.
- **Auth**: Bearer Token
- **Response `200 OK`**: Array of `DocumentResponse` objects.

#### `GET /api/documents/{document_id}`
Retrieves document metadata along with its extracted semantic chunks.
- **Auth**: Bearer Token
- **IDOR Check**: Strictly verifies `doc.user_id == current_user.id`.
- **Response `200 OK`**:
```json
{
  "id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "title": "Quantum_Mechanics_Lecture_1.pdf",
  "file_size_bytes": 1048576,
  "page_count": 8,
  "sha256_hash": "e3b0c44298...",
  "created_at": "2026-10-22T16:05:00Z",
  "chunk_count": 16,
  "chunks": [
    {
      "id": "chunk-1",
      "chunk_index": 0,
      "page_number": 1,
      "content": "Quantum superposition is a fundamental principle of quantum mechanics...",
      "token_count": 65
    }
  ]
}
```

#### `DELETE /api/documents/{document_id}`
Permanently deletes document, physical file on disk, vector records, chat histories, flashcards, and quizzes.
- **Auth**: Bearer Token
- **Response `200 OK`**:
```json
{
  "message": "Document and all associated study materials were permanently deleted."
}
```

---

### Grounded AI Tutoring & RAG Chat

#### `POST /api/chat/message`
Submits a student question to the RAG engine.
- **Auth**: Bearer Token
- **Rate Limit**: 30 requests / min / IP
- **Request Body**:
```json
{
  "document_id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "session_id": "optional-session-uuid",
  "message": "What is the physical significance of superposition?"
}
```
- **Response `200 OK`**:
```json
{
  "id": "msg-88b1",
  "session_id": "session-12a4",
  "role": "assistant",
  "content": "Based on the document [Page 1], quantum superposition is a fundamental principle where a physical system exists in multiple states simultaneously.\n\nRefer to [Page 1] for mathematical proofs.",
  "citations": [
    {
      "chunk_id": "chunk-1",
      "page_number": 1,
      "snippet": "Quantum superposition is a fundamental principle of quantum mechanics where a system exists in a linear combination of states..."
    }
  ],
  "created_at": "2026-10-22T16:06:00Z"
}
```

---

### Study Tools

#### `GET /api/study/summary/{document_id}`
Generates or retrieves executive summary, key takeaways, and suggested discussion questions.
- **Auth**: Bearer Token
- **Response `200 OK`**:
```json
{
  "document_id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "title": "Quantum_Mechanics_Lecture_1.pdf",
  "summary": "StudyLens Executive Summary:\nThis document introduces the foundations of quantum mechanics, state vectors, and operators.",
  "key_takeaways": [
    "Superposition allows linear combinations of basis state vectors.",
    "Operators represent observable physical quantities.",
    "Measurement collapses wavefunctions into eigenstates."
  ],
  "suggested_questions": [
    "How does the measurement postulate affect state evolution?",
    "What mathematical formalisms represent Hermitian operators?"
  ]
}
```

#### `GET /api/study/flashcards/{document_id}`
Retrieves or synthesizes active recall flashcards with verified page citations.
- **Auth**: Bearer Token
- **Response `200 OK`**:
```json
{
  "id": "flashcard-set-1",
  "document_id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "title": "Flashcards: Quantum Mechanics",
  "created_at": "2026-10-22T16:07:00Z",
  "cards": [
    {
      "id": "card_1",
      "question": "What is superposition on Page 1?",
      "answer": "A fundamental principle where a physical system simultaneously occupies multiple quantum states.",
      "page_number": 1
    }
  ]
}
```

#### `GET /api/study/quiz/{document_id}`
Retrieves or synthesizes multiple-choice questions with answer keys and page explanations.
- **Auth**: Bearer Token
- **Response `200 OK`**:
```json
{
  "id": "quiz-set-1",
  "document_id": "3b4f6e10-c419-4a9f-a859-994c69818815",
  "title": "Practice Quiz: Quantum Mechanics",
  "created_at": "2026-10-22T16:08:00Z",
  "questions": [
    {
      "id": "quiz_q_1",
      "question": "Based on Page 1, which statement describes superposition accurately?",
      "options": [
        "A linear combination of basis state vectors.",
        "An irreversible thermodynamic decay.",
        "A classical particle trajectory.",
        "An artifact of experimental noise."
      ],
      "correct_index": 0,
      "explanation": "Refer to Page 1: \"Quantum superposition represents a linear combination of states.\"",
      "page_number": 1
    }
  ]
}
```

---

## 4. Related Documentation
- [Database Schema & Models](DATABASE.md)
- [System Architecture](ARCHITECTURE.md)
- [Security & Threat Model](SECURITY.md)
