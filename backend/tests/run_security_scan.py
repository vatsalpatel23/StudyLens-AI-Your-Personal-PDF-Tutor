import os
import re
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent.parent

# Sensitive secret signatures to scan
SECRET_PATTERNS = [
    (r"AIza[0-9A-Za-z-_]{35}", "Google API Key"),
    (r"sk-[a-zA-Z0-9]{32,}", "OpenAI API Key"),
    (r"ghp_[0-9a-zA-Z]{36}", "GitHub Personal Access Token"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----", "Private Cryptographic Key"),
    (r"postgres(?:ql)?:\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9_.-]+", "Database URI with Credentials"),
]

EXCLUDE_DIRS = {
    ".venv", "venv", "node_modules", ".git", ".pytest_cache", "dist", "build",
    ".idea", ".vscode", "__pycache__", "storage"
}

EXCLUDE_FILES = {
    "run_security_scan.py", ".env.example", "package-lock.json"
}


def scan_workspace():
    print("=" * 70)
    print("StudyLens AI - Repository Secret & Intellectual Property Scanner")
    print("=" * 70)

    findings = []
    files_scanned = 0

    for root, dirs, files in os.walk(ROOT_DIR):
        # Exclude directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        for file in files:
            if file in EXCLUDE_FILES or file.endswith((".pdf", ".png", ".jpg", ".pyc", ".db", ".sqlite")):
                continue

            file_path = Path(root) / file
            files_scanned += 1

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                for pattern, name in SECRET_PATTERNS:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        line_no = content[:match.start()].count("\n") + 1
                        findings.append({
                            "file": str(file_path.relative_to(ROOT_DIR)),
                            "line": line_no,
                            "type": name,
                        })
            except Exception as err:
                print(f"Warning: Could not read {file_path}: {err}")

    print(f"\n[+] Total workspace files scanned: {files_scanned}")
    if findings:
        print(f"[!] CRITICAL: Found {len(findings)} potential exposed secrets:")
        for f in findings:
            print(f"    - {f['file']}:{f['line']} -> {f['type']}")
        print("\nScan Result: FAIL (Secrets detected in workspace)")
        return False
    else:
        print("[v] Clean repository: Zero exposed credentials, private keys, or API tokens detected.")
        print("Scan Result: PASS")
        return True


if __name__ == "__main__":
    passed = scan_workspace()
    sys.exit(0 if passed else 1)
