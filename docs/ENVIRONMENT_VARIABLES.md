# StudyLens AI — Environment Variables Reference

This document provides a reference for all environment variables supported by **StudyLens AI**.

> [!CAUTION]
> **Zero Credential Exposure**: Never commit your actual `.env` file containing live API keys or signing secrets to version control. The repository `.gitignore` automatically excludes all `.env` files. Only commit the sanitized `.env.example` template with placeholder values.

---

## 1. Variable Inventory Table

| Variable Name | Required? | Default Value | Service | Description |
| :--- | :---: | :--- | :---: | :--- |
| `ENVIRONMENT` | Optional | `development` | Backend | Current environment (`development`, `staging`, `production`). In production, OpenAPI `/docs` are disabled and HSTS is enforced. |
| `DEBUG` | Optional | `False` | Backend | Toggles debug mode. When `True`, returns detailed exception messages and enables API docs. Always set to `False` in production. |
| `APP_NAME` | Optional | `StudyLens AI — Your Personal PDF Tutor` | Backend | Display name of the application. |
| `APP_VERSION` | Optional | `1.0.0` | Backend | Application semantic version. |
| `HOST` | Optional | `127.0.0.1` | Backend | Interface to bind ASGI server (`127.0.0.1` for local, `0.0.0.0` for Docker/cloud). |
| `PORT` | Optional | `8000` | Backend | Port for backend ASGI server. |
| `CORS_ALLOWED_ORIGINS` | **Required** | `http://localhost:5173,http://127.0.0.1:5173` | Backend | Comma-delimited list of allowed frontend origins for CORS. |
| `JWT_SECRET_KEY` | **Required** | `dev_secret_...` | Backend | High-entropy signing key for JWT session tokens. Must be $\ge 32$ characters. In production, weak keys are rejected on startup. |
| `JWT_ALGORITHM` | Optional | `HS256` | Backend | Cryptographic algorithm for JWT signing. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Optional | `60` | Backend | Lifetime of user access tokens before requiring re-authentication. |
| `RATE_LIMIT_LOGIN_PER_MIN` | Optional | `5` | Backend | Max authentication attempts per minute per IP address. |
| `RATE_LIMIT_UPLOAD_PER_MIN` | Optional | `10` | Backend | Max PDF uploads per minute per IP address. |
| `RATE_LIMIT_CHAT_PER_MIN` | Optional | `30` | Backend | Max chat tutoring queries per minute per IP address. |
| `MAX_UPLOAD_SIZE_BYTES` | Optional | `20971520` (20 MB) | Backend | Absolute maximum PDF upload file size in bytes. |
| `MAX_PDF_PAGES` | Optional | `100` | Backend | Maximum page count allowed per uploaded PDF to prevent CPU exhaustion. |
| `MAX_CONCURRENT_UPLOADS` | Optional | `5` | Backend | Bounded concurrency semaphore controlling simultaneous PDF extractions to prevent RAM spikes. |
| `STORAGE_DIR` | Optional | `backend/storage/uploads` | Backend | Local directory where user-isolated PDF files are securely stored. |
| `TEMP_DIR` | Optional | `backend/storage/temp` | Backend | Temporary sandbox directory for PDF inspection before permanent move. |
| `DATABASE_URL` | **Required** | `sqlite:///./backend/storage/studylens.db` | Backend | Database connection URL. Supports SQLite and PostgreSQL (`postgresql://<user>:<password>@<host>/<dbname>`). |
| `AI_PROVIDER` | **Required** | `mock` | Backend | Active AI provider (`mock` for zero-cost offline development/CI, `gemini` for live Google Gemini LLM). |
| `GEMINI_API_KEY` | Conditional | `""` | Backend | Google AI Studio Gemini API Key. Required only when `AI_PROVIDER=gemini`. |
| `GEMINI_MODEL` | Optional | `gemini-2.0-flash` | Backend | Specific Gemini model identifier to call. |
| `AI_REQUEST_TIMEOUT_SECONDS` | Optional | `30` | Backend | Network timeout in seconds for requests to external AI providers. |
| `VECTOR_SIMILARITY_THRESHOLD` | Optional | `0.25` | Backend | Minimum cosine similarity score for a chunk to be considered relevant context. |
| `TOP_K_CHUNKS` | Optional | `5` | Backend | Maximum number of chunks retrieved per question for prompt augmentation. |
| `CHUNK_SIZE_CHARS` | Optional | `800` | Backend | Target character count per text chunk during PDF ingestion. |
| `CHUNK_OVERLAP_CHARS` | Optional | `150` | Backend | Overlap character count between consecutive chunks to maintain context across boundaries. |

---

## 2. Frontend Environment Variables

The React frontend utilizes Vite environment variables prefixed with `VITE_`:

| Variable Name | Required? | Default Value | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Optional | `http://127.0.0.1:8000` | Base URL of the backend FastAPI service. |

---

## 3. Generating a Secure Production `JWT_SECRET_KEY`

In production, never use the default development key. Generate a cryptographically secure 64-character secret using Python:

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy the generated string into your production `.env` or deployment secrets vault.

---

## 4. Switching AI Providers

### Offline Development & CI Mode (Default)
```ini
AI_PROVIDER=mock
GEMINI_API_KEY=
```
- Operates 100% offline with zero external network calls.
- Deterministic answers and guaranteed valid page citations.
- Used by automated tests and CI/CD pipelines to prevent flaky tests or API billing charges.

### Live Production Mode (Google Gemini)
```ini
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyYourRealGeminiKeyHere
GEMINI_MODEL=gemini-2.0-flash
AI_REQUEST_TIMEOUT_SECONDS=30
```
- Direct integration with Gemini 2.0 Flash via HTTPS.
- Automatic transient error retries (exponential backoff with jitter).
- System safety instructions deflecting prompt injections.

---

## 5. Related Documentation
- [Setup & Installation Guide](SETUP.md)
- [System Architecture](ARCHITECTURE.md)
- [Security & Threat Model](SECURITY.md)
