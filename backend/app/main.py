from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.middleware import SecurityHeadersMiddleware, SafeErrorHandlingMiddleware
from backend.app.routers import auth, documents, chat, study, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe database initialization
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Secure AI-powered personal PDF tutoring platform with verified citations and multi-tenant isolation.",
    docs_url="/docs" if settings.DEBUG or settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.DEBUG or settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

# 1. Safe Error Handling Middleware (outermost to catch all exceptions)
app.add_middleware(SafeErrorHandlingMiddleware)

# 2. OWASP Security Headers Middleware
app.add_middleware(SecurityHeadersMiddleware)

# 3. Explicit CORS Middleware (Strict origins, prevents unauthorized cross-origin requests)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    max_age=600,
)

# Register Routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(study.router)


@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG or settings.ENVIRONMENT == "development" else "Disabled in production",
        "health": "/api/health",
        "security_policy": "Strict multi-tenant isolation, Argon2id hashing, verified citations, rate limiting enabled.",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
