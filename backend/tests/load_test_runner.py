"""
StudyLens AI - Repeatable Load Testing & Capacity Benchmark Harness
Simulates concurrent virtual users (VUs) executing typical student workflows.
Records real metrics: p50, p90, p95, p99 latencies, throughput (RPS), error rates.
"""

import sys
import time
import uuid
import statistics
import concurrent.futures
from pathlib import Path
from dataclasses import dataclass, field

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal, get_db
from backend.app.security import rate_limiter

FIXTURES_DIR = Path("backend/tests/fixtures")


@dataclass
class StageResult:
    stage_name: str
    concurrent_users: int
    total_requests: int
    successful_requests: int
    failed_requests: int
    error_rate_pct: float
    duration_seconds: float
    throughput_rps: float
    min_latency_ms: float
    p50_latency_ms: float
    p90_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    max_latency_ms: float


class LoadTestHarness:
    def __init__(self):
        # Override get_db to ensure thread-isolated test sessions
        def override_get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def execute_stage(self, stage_name: str, num_users: int, requests_per_user: int) -> StageResult:
        latencies: list[float] = []
        errors = 0
        successes = 0

        # Pre-create test document to query
        user_uuid = uuid.uuid4().hex[:8]
        user_email = f"loadtest_{user_uuid}@university.edu"
        reg_res = self.client.post(
            "/api/auth/register",
            json={"name": "Load Tester", "email": user_email, "password": "Password123!"},
            headers={"X-Forwarded-For": f"198.51.100.{user_uuid[:2]}"},
        )
        token = reg_res.json().get("access_token")
        auth_headers = {"Authorization": f"Bearer {token}"}

        pdf_bytes = (FIXTURES_DIR / "valid_study_doc.pdf").read_bytes()
        upload_res = self.client.post(
            "/api/documents/upload",
            files={"file": ("study_doc.pdf", pdf_bytes, "application/pdf")},
            headers=auth_headers,
        )
        doc_id = upload_res.json()["id"] if upload_res.status_code == 201 else None

        endpoints = [
            ("GET", "/api/health", None, {}),
            ("GET", "/api/documents", None, auth_headers),
        ]
        if doc_id:
            endpoints.extend([
                ("GET", f"/api/documents/{doc_id}", None, auth_headers),
                ("POST", "/api/chat/message", {"document_id": doc_id, "message": "Explain quantum superposition."}, auth_headers),
                ("GET", f"/api/study/summary/{doc_id}", None, auth_headers),
                ("GET", f"/api/study/flashcards/{doc_id}", None, auth_headers),
                ("GET", f"/api/study/quiz/{doc_id}", None, auth_headers),
            ])

        def simulated_user_task(user_idx: int) -> list[tuple[bool, float]]:
            user_results = []
            ip = f"198.51.100.{(user_idx % 200) + 1}"

            for req_idx in range(requests_per_user):
                method, path, body, headers = endpoints[req_idx % len(endpoints)]
                req_headers = {**headers, "X-Forwarded-For": ip}

                t_start = time.perf_counter()
                try:
                    if method == "GET":
                        res = self.client.get(path, headers=req_headers)
                    elif method == "POST":
                        res = self.client.post(path, json=body, headers=req_headers)
                    else:
                        res = None

                    t_end = time.perf_counter()
                    latency_ms = (t_end - t_start) * 1000.0

                    if res and res.status_code in (200, 201):
                        user_results.append((True, latency_ms))
                    else:
                        user_results.append((False, latency_ms))
                except Exception:
                    t_end = time.perf_counter()
                    user_results.append((False, (t_end - t_start) * 1000.0))

            return user_results

        total_start = time.perf_counter()

        with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
            all_user_results = list(executor.map(simulated_user_task, range(num_users)))

        total_duration = time.perf_counter() - total_start

        for user_res in all_user_results:
            for is_success, lat in user_res:
                latencies.append(lat)
                if is_success:
                    successes += 1
                else:
                    errors += 1

        total_reqs = len(latencies)
        latencies.sort()

        def percentile(p):
            idx = int(len(latencies) * (p / 100.0))
            return latencies[min(idx, len(latencies) - 1)]

        return StageResult(
            stage_name=stage_name,
            concurrent_users=num_users,
            total_requests=total_reqs,
            successful_requests=successes,
            failed_requests=errors,
            error_rate_pct=round((errors / total_reqs) * 100, 2) if total_reqs else 0.0,
            duration_seconds=round(total_duration, 2),
            throughput_rps=round(total_reqs / total_duration, 2) if total_duration else 0.0,
            min_latency_ms=round(min(latencies), 2) if latencies else 0.0,
            p50_latency_ms=round(percentile(50), 2) if latencies else 0.0,
            p90_latency_ms=round(percentile(90), 2) if latencies else 0.0,
            p95_latency_ms=round(percentile(95), 2) if latencies else 0.0,
            p99_latency_ms=round(percentile(99), 2) if latencies else 0.0,
            max_latency_ms=round(max(latencies), 2) if latencies else 0.0,
        )


def run_full_benchmark():
    print("=" * 70)
    print(" StudyLens AI — Concurrent Load & Capacity Benchmark")
    print("=" * 70)

    harness = LoadTestHarness()

    stages = [
        ("Smoke Test", 2, 10),       # 2 VUs x 10 reqs = 20 reqs
        ("Baseline Load", 10, 15),   # 10 VUs x 15 reqs = 150 reqs
        ("Moderate Load", 25, 10),   # 25 VUs x 10 reqs = 250 reqs
    ]

    results: list[StageResult] = []

    for name, vus, reqs_per_vu in stages:
        print(f"\n[*] Executing {name}: {vus} Concurrent VUs ({vus * reqs_per_vu} total requests)...")
        res = harness.execute_stage(name, vus, reqs_per_vu)
        results.append(res)
        print(f"    -> Completed in {res.duration_seconds}s | Throughput: {res.throughput_rps} RPS")
        print(f"    -> Latency: p50={res.p50_latency_ms}ms | p95={res.p95_latency_ms}ms | p99={res.p99_latency_ms}ms")
        print(f"    -> Success: {res.successful_requests}/{res.total_requests} (Error Rate: {res.error_rate_pct}%)")

    print("\n" + "=" * 70)
    print(" Benchmark Summary Table")
    print("=" * 70)
    print(f"{'Stage':<16} | {'VUs':<5} | {'Reqs':<6} | {'RPS':<8} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'Errors':<7}")
    print("-" * 70)
    for r in results:
        print(f"{r.stage_name:<16} | {r.concurrent_users:<5} | {r.total_requests:<6} | {r.throughput_rps:<8} | {r.p50_latency_ms:<9} | {r.p95_latency_ms:<9} | {r.error_rate_pct}%")
    print("=" * 70)

    return results


if __name__ == "__main__":
    run_full_benchmark()
