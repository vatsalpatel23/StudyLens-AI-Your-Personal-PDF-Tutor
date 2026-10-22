# Contributing to StudyLens AI

Thank you for your interest in contributing to **StudyLens AI — Your Personal PDF Tutor**! We welcome contributions that improve application reliability, security, accessibility, and documentation.

---

## 1. Prerequisites & Environment Setup

Before contributing code, ensure your environment meets the minimum version requirements:

- **Python**: 3.11+ (Tested and verified on Python 3.13)
- **Node.js**: v18+ (Tested on Node v20/v24)
- **npm**: v9+
- **Git**: For version control

### Clone & Branching Workflow
```bash
git clone https://github.com/<your-username>/StudyLens-AI.git
cd "StudyLens AI"

# Create a scoped feature branch
git checkout -b feat/your-feature-name
# or for bugfixes
git checkout -b fix/issue-description
```

---

## 2. Local Development

### Virtual Environment Setup
```bash
# Windows PowerShell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 3. Coding Standards & Conventions

### Python (Backend)
- Adhere to **PEP 8** style guidelines.
- Always include type hints for function arguments and return types.
- Never write raw SQL strings with user input; always use parameterized SQLAlchemy queries.
- Never log raw passwords, access tokens, or extracted PDF text.
- Wrap blocking or untrusted file operations in defensive exception blocks.

### TypeScript & React (Frontend)
- Adhere to functional React components with strict TypeScript interfaces.
- Avoid inline styles; utilize Tailwind CSS design tokens (`paper`, `ink`, `accent`, `sage`, `crimson`).
- Respect typography rules: use `Newsreader` serif for long-form study passages/summaries, `Inter` for UI controls, and `JetBrains Mono` for badges/metadata.
- Ensure all interactive elements have accessible `aria-label` attributes and keyboard focus rings.

---

## 4. Testing Requirements

Every Pull Request must pass all release gates before merging. Pull requests with failing tests or security warnings will not be accepted.

Run the full verification suite before committing:
```bash
# Run pytest unit, integration, and security tests
pytest

# Run Bandit static security analysis
bandit -r backend/app -ll

# Run frontend type checking & production build
npm run build --prefix frontend

# Run automated release gates
python run_all_tests.py
```

---

## 5. Security & Intellectual Property Policy

1. **Zero Secret Commits**: Never commit `.env` files, actual Gemini API keys, or private document PDFs. Use `.env.example` placeholders only.
2. **Multi-Tenant Boundaries**: Every new API endpoint that accesses or mutates user documents must strictly verify `resource.user_id == current_user.id`.
3. **Defense-in-Depth**: Follow OWASP Top 10 recommendations. Treat all uploaded files as untrusted inputs.

---

## 6. Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against `main`.
3. Describe the change, the motivation, and provide copyable test commands used to verify the fix.
4. Confirm that:
   - [ ] All 27 automated tests pass.
   - [ ] Bandit security scan shows 0 issues.
   - [ ] Frontend builds with 0 errors.
   - [ ] Documentation has been updated to reflect any new endpoints or configuration variables.

Thank you for helping make StudyLens AI a reliable, accessible study assistant!
