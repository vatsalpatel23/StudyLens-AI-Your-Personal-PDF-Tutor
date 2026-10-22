import time
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.vector_store import vector_store

router = APIRouter(prefix="/api/health", tags=["Health & Status"])


@router.get("")
def health_check(db: Session = Depends(get_db)):
    """
    Application health, database latency, and security configuration diagnostics.
    Does not expose sensitive credentials, keys, or internal filesystem paths.
    """
    db_status = "healthy"
    db_latency_ms = 0.0
    start_t = time.time()
    try:
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.time() - start_t) * 1000, 2)
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)[:50]}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "status": db_status,
            "latency_ms": db_latency_ms,
        },
        "ai_provider": settings.AI_PROVIDER,
        "vector_store": {
            "cached_chunks_in_memory": len(vector_store._records),
        },
        "security": {
            "argon2id_enabled": True,
            "jwt_algorithm": settings.JWT_ALGORITHM,
            "rate_limiting_active": True,
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024),
            "max_pdf_pages": settings.MAX_PDF_PAGES,
            "cors_configured_origins_count": len(settings.cors_origins),
        },
    }


@router.get("/ready")
def readiness_check(response: Response, db: Session = Depends(get_db)):
    """
    Kubernetes / Docker readiness probe.
    Returns 200 OK if database and storage directories are ready to accept traffic;
    returns 503 SERVICE UNAVAILABLE if dependent services are down.
    """
    errors = []

    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        errors.append(f"Database unavailable: {str(exc)[:40]}")

    # Check storage directory accessibility
    try:
        storage_path = Path(settings.STORAGE_DIR)
        storage_path.mkdir(parents=True, exist_ok=True)
    except Exception as exc:
        errors.append(f"Storage directory inaccessible: {str(exc)[:40]}")

    if errors:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "unready", "reasons": errors}

    return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}
