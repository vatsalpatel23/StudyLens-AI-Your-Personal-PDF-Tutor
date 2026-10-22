# StudyLens AI — Developer & Contributor Guide

Welcome to the **StudyLens AI** developer guide! This document explains the codebase layout, patterns, and conventions so a new developer can understand, extend, test, and maintain the application with confidence.

---

## 1. Directory Structure

```
StudyLens AI/
├── backend/                        # Python FastAPI backend
│   ├── app/
│   │   ├── routers/                # API route handlers
│   │   │   ├── auth.py             # /api/auth (Register, Login, Logout, Me)
│   │   │   ├── documents.py        # /api/documents (Upload, List, Detail, Download, Delete)
│   │   │   ├── chat.py             # /api/chat (Message, History, Sessions)
│   │   │   ├── study.py            # /api/study (Summary, Flashcards, Quiz)
│   │   │   └── health.py           # /api/health (Health, Latency, Ready probe)
│   │   ├── config.py               # Pydantic BaseSettings (.env reader)
│   │   ├── database.py             # SQLAlchemy engine & SQLite WAL configuration
│   │   ├── main.py                 # FastAPI app entry point & middleware registration
│   │   ├── middleware.py           # OWASP headers, correlation IDs, safe error handling
│   │   ├── models.py               # SQLAlchemy ORM models & database schema
│   │   ├── pdf_processor.py        # PDF validation, PyPDF parser, sliding-window chunker
│   │   ├── rag_engine.py           # RAG prompt builder, citation validator, query cache
│   │   ├── schemas.py              # Pydantic request/response schemas
│   │   ├── security.py             # Argon2id hasher, JWT encoder/decoder, rate limiter
│   │   └── vector_store.py         # Multi-tenant sparse vector store & cold-start recovery
│   ├── storage/                    # Local storage (gitignored except .gitkeep)
│   │   ├── uploads/                # User document files: /uploads/<user_id>/<doc_id>.pdf
│   │   ├── temp/                   # Temporary upload inspection sandbox
│   │   └── studylens.db            # SQLite database file
│   ├── tests/                      # Automated test suite
│   │   ├── fixtures/               # Test PDFs (valid, corrupt, oversized, injection)
│   │   ├── conftest.py             # Pytest fixtures, test database, client setup
│   │   ├── test_unit.py            # Core unit logic tests
│   │   ├── test_file_security.py   # Untrusted PDF upload & sandbox tests
│   │   ├── test_auth_idor.py       # IDOR, authorization, and session tests
│   │   ├── test_rag_security.py    # Citations, injection defense, vector isolation
│   │   ├── test_concurrency_load.py# Multi-user concurrency tests
│   │   ├── test_api_integration.py# API route integration tests
│   │   ├── test_e2e_workflow.py    # Complete student journey test
│   │   └── load_test_runner.py     # Repeatable load test benchmark harness
│   └── requirements.txt            # Locked Python dependencies
├── docs/                           # Technical documentation suite
├── frontend/                       # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.tsx          # Top bar, breadcrumb, segmented mode switcher
│   │   │   ├── PdfPreview.tsx      # Document Viewer hero with citation flash
│   │   │   ├── ChatTutor.tsx       # AI Tutor chat stream & evidence drawer
│   │   │   ├── SummaryView.tsx     # Executive synthesis & core takeaways
│   │   │   ├── FlashcardsView.tsx  # 3D active recall flashcards & shortcuts
│   │   │   ├── QuizView.tsx        # Self-assessment practice quiz
│   │   │   ├── DocumentList.tsx    # Library browser with search & metadata
│   │   │   ├── DocumentUpload.tsx  # Drag-and-drop upload zone
│   │   │   ├── AuthModal.tsx       # Student login & registration dialog
│   │   │   ├── EmptyState.tsx      # SVG geometric empty states
│   │   │   ├── Toast.tsx           # Toast notification banners
│   │   │   └── SecurityBadge.tsx   # Trust verification modal
│   │   ├── services/
│   │   │   └── api.ts              # Typed Axios/Fetch API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces & domain models
│   │   ├── App.tsx                 # Master two-column studio layout
│   │   ├── index.css               # Editorial CSS design tokens & animations
│   │   └── main.tsx                # React DOM mount point
│   ├── tailwind.config.js          # Tailwind theme tokens (paper, ink, accent)
│   ├── tsconfig.json               # Strict TypeScript compiler options
│   └── package.json                # Frontend dependencies & scripts
├── .env.example                    # Sanitized environment variable template
├── .gitignore                      # Git exclusion rules
├── LICENSE                         # MIT License & asset attribution
├── pytest.ini                      # Pytest runner configuration
├── README.md                       # Main repository entry point
└── run_all_tests.py                # Master release gate verification runner
```

---

## 2. Common Development Tasks

### Task A: Adding a New API Endpoint

1. **Define Request/Response Schemas in [`backend/app/schemas.py`](../backend/app/schemas.py)**:
   ```python
   class BookmarkCreateRequest(BaseModel):
       page_number: int = Field(ge=1, description="Page number to bookmark")
       note: Optional[str] = Field(default="", max_length=500)

   class BookmarkResponse(BaseModel):
       id: str
       document_id: str
       page_number: int
       note: str
       created_at: datetime
       model_config = ConfigDict(from_attributes=True)
   ```

2. **Add Endpoint to Appropriate Router (e.g. [`backend/app/routers/documents.py`](../backend/app/routers/documents.py))**:
   ```python
   @router.post("/{document_id}/bookmarks", response_model=BookmarkResponse)
   def create_bookmark(
       document_id: str,
       req: BookmarkCreateRequest,
       db: Session = Depends(get_db),
       current_user: User = Depends(get_current_user),
   ):
       # 1. ALWAYS enforce tenant authorization check (IDOR defense)
       doc = db.query(Document).filter(
           Document.id == document_id, 
           Document.user_id == current_user.id
       ).first()
       if not doc:
           raise HTTPException(status_code=404, detail="Document not found or access denied.")

       # 2. Perform business logic
       ...
   ```

3. **Add Tests in [`backend/tests/`](../backend/tests/)**:
   Write a test verifying both the happy path and that another user cannot create or view bookmarks for this document.

---

### Task B: Updating Database Models

1. Modify or add models in [`backend/app/models.py`](../backend/app/models.py):
   ```python
   class Bookmark(Base):
       __tablename__ = "bookmarks"
       id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
       document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False)
       user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
       page_number = Column(Integer, nullable=False)
       note = Column(Text, default="", nullable=False)
       created_at = Column(DateTime(timezone=True), default=get_utc_now, nullable=False)
   ```
2. In development, `Base.metadata.create_all(bind=engine)` in `main.py` automatically initializes new tables on startup.
3. For existing databases with column alterations, write an Alembic migration script.

---

### Task C: Adding a New Study Tool Component

1. Create the component under `frontend/src/components/MyNewTool.tsx`.
2. Follow the editorial design system:
   - Container: `bg-white rounded-2xl border border-paper-300 shadow-subtle overflow-hidden`
   - Header: `px-6 py-4 border-b border-paper-200 bg-paper-50`
   - Typography: `Newsreader` for academic reading, `Inter` for buttons, `JetBrains Mono` for badges.
3. Wire the tool into the segmented switcher in [`Navbar.tsx`](../frontend/src/components/Navbar.tsx) and [`App.tsx`](../frontend/src/App.tsx).

---

## 3. Running Verification Gates

Before submitting any code changes, execute the unified test runner:

```powershell
# Windows
.\.venv\Scripts\python run_all_tests.py

# Linux / macOS
python run_all_tests.py
```

Ensure all gates report **PASS**:
- [v] Secret & IP Protection Scan: PASS
- [v] Bandit Python SAST Analysis: PASS
- [v] Pytest Unit & Security Test Suite: PASS (27 passed)
- [v] Frontend Vite & TypeScript Production Build: PASS

---

## 4. Related Documentation
- [System Architecture](ARCHITECTURE.md)
- [REST API Reference](API.md)
- [Testing Verification Guide](TESTING.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
