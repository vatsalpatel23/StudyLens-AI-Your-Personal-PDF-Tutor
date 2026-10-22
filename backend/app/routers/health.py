from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database import get_db

router = APIRouter(prefix="/api/health", tags=["Health & Status"])


@router.get("")
def health_check(db: Session = Depends(get_db)):
    """
    Application health and security configuration diagnostics.
    Does not expose sensitive credentials, keys, or filesystem paths.
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)[:50]}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "ai_provider": settings.AI_PROVIDER,
        "security": {
            "argon2id_enabled": True,
            "jwt_algorithm": settings.JWT_ALGORITHM,
            "rate_limiting_active": True,
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024),
            "max_pdf_pages": settings.MAX_PDF_PAGES,
            "cors_configured_origins_count": len(settings.cors_origins),
        },
    }
