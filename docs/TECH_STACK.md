# StudyLens AI — Technology Stack

This document details every major language, framework, database, and library powering **StudyLens AI**, including component versions, rationales for selection, and architectural trade-offs.

---

## 1. Stack Summary Table

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) | 0.159.1 | Asynchronous REST API routing, Pydantic validation, dependency injection |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) | 0.54.0 | High-performance ASGI HTTP server |
| **ORM & Database** | [SQLAlchemy](https://www.sqlalchemy.org/) / SQLite | 2.0.36 | Relational database ORM with WAL mode and foreign key constraints |
| **Password Hashing** | [Argon2-cffi](https://argon2-cffi.readthedocs.io/) | 23.1.0 | OWASP-recommended memory-hard password hashing (Argon2id) |
| **Authentication** | [PyJWT](https://pyjwt.readthedocs.io/) | 2.15.1 | Cryptographically signed JSON Web Tokens with `jti` blocklisting |
| **PDF Extraction** | [PyPDF](https://pypdf.readthedocs.io/) | 6.21.2 | Pure-Python PDF signature validation, metadata parsing, and page extraction |
| **AI / LLM Integration**| Google Gemini / Mock | REST API | Grounded conversational tutor with prompt-injection defense |
| **Frontend Framework** | [React](https://react.dev/) | 18.3.1 | Declarative component UI and interactive study workspace |
| **Build Tool** | [Vite](https://vitejs.dev/) | 6.0.5 | Modern fast frontend bundler, HMR, and TypeScript compilation |
| **Styling & Design** | [Tailwind CSS](https://tailwindcss.com/) | 3.4.17 | Utility-first CSS configured with warm editorial design tokens |
| **Iconography** | [Lucide React](https://lucide.dev/) | 0.469.0 | Minimalist, accessible SVG iconography |
| **HTML Sanitizer** | [DOMPurify](https://github.com/cure53/DOMPurify) | 3.2.3 | Defense against Cross-Site Scripting (XSS) in markdown output |
| **Static Security (SAST)**| [Bandit](https://bandit.readthedocs.io/) | 1.8.0 | Python static security analysis and vulnerability scanner |
| **Testing Framework** | [pytest](https://docs.pytest.org/) | 9.1.1 | Unit, integration, security, and concurrency test suites |

---

## 2. Backend Technologies

### FastAPI (v0.159.1)
- **Why It Was Chosen**: Automatic OpenAPI documentation, native asynchronous request handling, high throughput, and strict request/response data validation via Pydantic v2.
- **Where It Is Used**: `backend/app/main.py`, `backend/app/routers/`.
- **Known Limitations**: Blocking synchronous tasks (like heavy CPU-bound parsing) can block the event loop if not handled in thread pools or background executors.

### SQLAlchemy (v2.0.36) with SQLite WAL Mode
- **Why It Was Chosen**: Type-safe declarative models, automated migrations compatibility, cascading relationship deletions, and parameterized SQL query execution preventing SQL injection.
- **Concurrency Enhancements**: Configured with Write-Ahead Logging (`PRAGMA journal_mode=WAL`), `PRAGMA synchronous=NORMAL`, and a 30-second busy timeout (`connect_args={"timeout": 30.0}`) ensuring multi-user concurrent writes do not collide.
- **Known Limitations**: SQLite is single-writer per database file. For multi-node distributed deployments across Kubernetes, migrate to PostgreSQL (see [Database Documentation](DATABASE.md)).

### Argon2id (`argon2-cffi` v23.1.0)
- **Why It Was Chosen**: Winner of the Password Hashing Competition (PHC) and recommended by OWASP over bcrypt and PBKDF2 due to its resistance against GPU and ASIC side-channel attacks.
- **Configured Parameters**: `time_cost=3`, `memory_cost=65536` (64 MiB RAM), `parallelism=4`.

### PyPDF (v6.21.2)
- **Why It Was Chosen**: Pure-Python implementation with zero system-level C dependencies (unlike poppler or PyMuPDF/fitz), guaranteeing cross-platform installation on Windows, Linux, and macOS without binary compilation errors.
- **Security Role**: Extracts text on a page-by-page basis, rejects encrypted files, and handles malformed documents gracefully in a temporary sandbox.

---

## 3. Frontend Technologies

### React 18 & Vite 6
- **Why It Was Chosen**: Component-driven architecture, instant Hot Module Replacement (HMR), sub-2-second production build times, and tree-shaking producing minimal bundle sizes (<350 KB minified).
- **Component Organization**:
  - `src/components/PdfPreview.tsx`: The Reading Hero canvas with citation flash animation and typography resizing.
  - `src/components/ChatTutor.tsx`: Linear/Notion-style conversation stream with interactive `[Page X]` citation pills.
  - `src/components/SummaryView.tsx`: Executive synthesis, core takeaway cards, and click-to-ask prompts.
  - `src/components/FlashcardsView.tsx`: 3D card flip studio with mastery tracking and desktop keyboard shortcuts (`Space`, `Arrows`, `M`).
  - `src/components/QuizView.tsx`: Self-assessment practice exams with instant feedback and page citations.

### Editorial Typography & Design Tokens
- **Google Fonts Imported**:
  - `Newsreader`: Editorial serif for reading document passages, summaries, and reading cards.
  - `Inter`: High-legibility sans-serif for UI controls, inputs, and buttons.
  - `JetBrains Mono`: Clean monospace for citation tags, page tokens, and keyboard shortcut badges.
- **Color Palette**: Warm paper background (`#F8F7F4`), ink typography (`#1A1C1E`), deep indigo accent (`#4F46E5`), sage green (`#059669`), and crimson (`#DC2626`).

---

## 4. AI & Retrieval-Augmented Generation (RAG)

### In-Memory Sparse Vector Store
- **Algorithm**: Term-Frequency (TF) with sublinear scaling ($1 + \log(\text{tf})$) and L2 unit-norm cosine similarity matching.
- **Tenant Isolation**: Mandatory filtering on `user_id` guarantees that User A's queries physically cannot score or retrieve User B's documents.
- **Cold-Start Durability**: Automatically synchronizes missing vector records from SQLite on demand.

### AI Model Integration
- **Default Mode**: `mock` — Deterministic, zero-cost AI provider returning grounded facts with validated page citations, ideal for local development, CI/CD, and offline testing.
- **Cloud Mode**: `gemini` — Connects directly to Google Gemini 2.0 Flash REST API via HTTPS, featuring transient error retries (exponential backoff with jitter) and prompt-injection safety boundaries.

---

## 5. Security & Testing Tools

- **Bandit (v1.8.0)**: AST-based static security analyzer scanning backend code for security vulnerabilities.
- **pip-audit (v2.10.1)**: Vulnerability scanner auditing third-party Python dependencies against known CVE databases.
- **pytest (v9.1.1)**: Test runner executing 27 unit, integration, authorization, file-security, and concurrency benchmark tests.

---

## 6. Related Documentation
- [System Architecture](ARCHITECTURE.md)
- [Setup & Installation Guide](SETUP.md)
- [Environment Variables](ENVIRONMENT_VARIABLES.md)
