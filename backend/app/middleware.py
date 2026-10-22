import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from backend.app.config import settings

logger = logging.getLogger("studylens.security")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies defense-in-depth OWASP recommended security headers to all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Content-Security-Policy
        csp_directives = [
            "default-src 'self'",
            "img-src 'self' data: blob:",
            "style-src 'self' 'unsafe-inline'",
            "script-src 'self' 'unsafe-inline'",
            "connect-src 'self' " + " ".join(settings.cors_origins),
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Clickjacking mitigation
        response.headers["X-Frame-Options"] = "DENY"

        # Cross-Site Scripting filter for legacy browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer policy to prevent URI leakages
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy to disable unnecessary browser APIs
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        # HSTS in production
        if settings.ENVIRONMENT.lower() == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        return response


class SafeErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Intercepts unhandled server exceptions to prevent detailed stack traces,
    database errors, and internal filesystem paths from leaking to client responses.
    """
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            correlation_id = str(uuid.uuid4())
            # Log with correlation id - do NOT log private user tokens or sensitive data
            logger.error(f"[CorrelationID: {correlation_id}] Unhandled error at {request.method} {request.url.path}: {str(exc)}")

            if settings.DEBUG:
                # In debug mode only, provide more context for developer
                detail = f"Internal server error: {str(exc)} (Correlation ID: {correlation_id})"
            else:
                detail = f"An unexpected internal error occurred. (Correlation ID: {correlation_id})"

            return JSONResponse(
                status_code=500,
                content={"detail": detail, "correlation_id": correlation_id}
            )
