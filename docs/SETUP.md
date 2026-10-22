# StudyLens AI — Setup & Installation Guide

This guide provides instructions to install, configure, verify, and run **StudyLens AI** on Windows, macOS, and Linux systems.

---

## 1. System Prerequisites

Ensure the following runtimes are installed on your machine before beginning:

| Software | Minimum Version | Recommended Version | Verification Command |
| :--- | :--- | :--- | :--- |
| **Python** | 3.11+ | 3.12 or 3.13 | `python --version` |
| **Node.js** | 18.0+ | 20.x or 22.x LTS | `node --version` |
| **npm** | 9.0+ | 10.x+ | `npm --version` |
| **Git** | 2.30+ | Latest | `git --version` |

---

## 2. Step-by-Step Installation

### Step A: Clone the Repository
```bash
git clone https://github.com/<your-username>/StudyLens-AI.git
cd "StudyLens AI"
```

### Step B: Backend Setup (Python Virtual Environment)

#### On Windows (PowerShell):
```powershell
# 1. Create virtual environment
python -m venv .venv

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 3. Upgrade pip & install backend dependencies
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\pip install -r backend/requirements.txt
```

#### On Linux / macOS (bash / zsh):
```bash
# 1. Create virtual environment
python3 -m venv .venv

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Upgrade pip & install backend dependencies
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Step C: Frontend Setup (React & Vite)
```bash
# Navigate to frontend directory and install dependencies
cd frontend
npm install
cd ..
```

---

## 3. Environment Configuration

The application reads configuration from `.env` in the repository root. Create your local `.env` by copying the provided sanitized `.env.example`:

```bash
# Windows
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

### Key Default Values in `.env`
```ini
ENVIRONMENT=development
DEBUG=True
HOST=127.0.0.1
PORT=8000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# JWT secret key (Generate a secure 64-char key for production)
JWT_SECRET_KEY=dev_secret_insecure_only_for_local_testing_replace_in_prod_64char

# SQLite database file
DATABASE_URL=sqlite:///./backend/storage/studylens.db

# AI Provider: Set to "mock" for offline zero-cost testing, or "gemini" for live LLM
AI_PROVIDER=mock
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
```

For full environment documentation, see [Environment Variables](ENVIRONMENT_VARIABLES.md).

---

## 4. Starting the Application

### 1. Launch the Backend Server
```powershell
# Windows
.\.venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Linux / macOS
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API starts on `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

### 2. Launch the Frontend Development Server
In a separate terminal:
```bash
npm run dev --prefix frontend
```
The React frontend starts on `http://localhost:5173`. Open this URL in your web browser.

---

## 5. Verifying the Installation

### 1. Check API Health
Open `http://127.0.0.1:8000/api/health` in your browser or run:
```bash
curl http://127.0.0.1:8000/api/health
```
Expected response:
```json
{
  "status": "healthy",
  "app_name": "StudyLens AI — Your Personal PDF Tutor",
  "version": "1.0.0",
  "database": {
    "status": "healthy",
    "latency_ms": 1.2
  },
  "vector_store": {
    "cached_chunks_in_memory": 0
  }
}
```

### 2. Run the Automated Test Suite & Release Gates
```powershell
# Windows
.\.venv\Scripts\python run_all_tests.py

# Linux / macOS
python run_all_tests.py
```
This single command automatically validates:
1. Gitleaks / Secret pattern scanner (0 leaks)
2. Bandit Python SAST security analysis (0 issues)
3. Pytest suite (27 unit, integration, authorization, file-security, and concurrency tests)
4. Frontend TypeScript and Vite production build (`tsc && vite build`)

---

## 6. Common Installation Issues & Fixes

### Issue: `ExecutionPolicy` error on Windows PowerShell
**Symptom**: `File ... Activate.ps1 cannot be loaded because running scripts is disabled on this system.`  
**Fix**: Run PowerShell as Administrator or execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: Frontend build warns about port `5173` already in use
**Symptom**: Vite starts on port `5174` instead of `5173`.  
**Fix**: Either terminate the existing process running on 5173, or update `CORS_ALLOWED_ORIGINS` in your `.env` to include `http://localhost:5174`.

### Issue: Database locked error (`sqlite3.OperationalError: database is locked`)
**Symptom**: High concurrent write requests collide during database operations.  
**Fix**: StudyLens AI already configures `PRAGMA busy_timeout=30000;` and WAL mode in `backend/app/database.py`. Ensure your database file is on a local filesystem (not a network-mounted drive or SMB share).

---

## 7. Related Documentation
- [Environment Variables Reference](ENVIRONMENT_VARIABLES.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
