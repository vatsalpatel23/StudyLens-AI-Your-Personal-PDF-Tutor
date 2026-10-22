import os
import sys
import subprocess
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
VENV_PYTHON = ROOT_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
VENV_PYTEST = ROOT_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("pytest.exe" if os.name == "nt" else "pytest")
VENV_BANDIT = ROOT_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("bandit.exe" if os.name == "nt" else "bandit")


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def run_command(cmd, desc: str) -> bool:
    print(f"\n[*] Running: {desc}...")
    start_time = time.time()
    try:
        proc = subprocess.run(cmd, cwd=ROOT_DIR, capture_output=True, text=True, shell=True)
        elapsed = time.time() - start_time
        if proc.returncode == 0:
            print(f"[v] PASS: {desc} completed in {elapsed:.2f}s")
            return True
        else:
            print(f"[!] FAIL: {desc} exited with code {proc.returncode}")
            if proc.stdout:
                print("--- Output ---")
                print(proc.stdout[:1500])
            if proc.stderr:
                print("--- Stderr ---")
                print(proc.stderr[:1500])
            return False
    except Exception as exc:
        print(f"[x] ERROR executing {desc}: {exc}")
        return False


def main():
    print_header("StudyLens AI - Comprehensive Security & Quality Release Gates")

    results = {}

    # 1. Secret Scanner & IP Protection
    results["Secret & IP Protection Scan"] = run_command(
        f'"{VENV_PYTHON}" backend/tests/run_security_scan.py',
        "Gitleaks / Secret Pattern Scanner"
    )

    # 2. Bandit Static Application Security Testing (SAST)
    results["Bandit Python SAST Analysis"] = run_command(
        f'"{VENV_BANDIT}" -r backend/app',
        "Bandit Security Static Analysis"
    )

    # 3. Comprehensive Backend Test Suite
    results["Pytest Unit & Security Test Suite"] = run_command(
        f'"{VENV_PYTEST}" backend/tests -v',
        "Pytest (Unit, File Security, IDOR/BOLA, RAG & E2E Tests)"
    )

    # 4. Frontend TypeScript Check & Production Build
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    results["Frontend Build & Type Check"] = run_command(
        f'{npm_cmd} run build --prefix frontend',
        "Frontend Vite & TypeScript Production Build"
    )

    # Release Gate Summary
    print_header("Release Gate Summary Table")
    all_passed = True
    for gate, passed in results.items():
        status = "PASS" if passed else "FAIL"
        symbol = "[v]" if passed else "[!]"
        print(f"{symbol} {gate:<45}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "-" * 70)
    if all_passed:
        print("[SUCCESS] All mandatory release gates PASSED! Application verified for release.")
        sys.exit(0)
    else:
        print("[FAILURE] One or more critical release gates FAILED. Review issues above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
