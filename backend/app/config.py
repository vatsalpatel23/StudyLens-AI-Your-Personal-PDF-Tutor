import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)
    APP_NAME: str = Field(default="StudyLens AI — Your Personal PDF Tutor")
    APP_VERSION: str = Field(default="1.0.0")

    HOST: str = Field(default="127.0.0.1")
    PORT: int = Field(default=8000)

    CORS_ALLOWED_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    # JWT Authentication
    JWT_SECRET_KEY: str = Field(default="dev_secret_insecure_only_for_local_testing_replace_in_prod_64char")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60)

    # Rate Limiting (Requests per minute per IP)
    RATE_LIMIT_LOGIN_PER_MIN: int = Field(default=5)
    RATE_LIMIT_UPLOAD_PER_MIN: int = Field(default=10)
    RATE_LIMIT_CHAT_PER_MIN: int = Field(default=30)

    # File Upload Security Controls
    MAX_UPLOAD_SIZE_BYTES: int = Field(default=20 * 1024 * 1024)  # 20 MB
    MAX_PDF_PAGES: int = Field(default=100)                        # 100 pages DoS boundary
    ALLOWED_MIME_TYPES: str = Field(default="application/pdf")
    STORAGE_DIR: str = Field(default="backend/storage/uploads")
    TEMP_DIR: str = Field(default="backend/storage/temp")

    # Database
    DATABASE_URL: str = Field(default="sqlite:///./backend/storage/studylens.db")

    # AI / LLM Provider ("mock", "gemini")
    AI_PROVIDER: str = Field(default="mock")
    GEMINI_API_KEY: str = Field(default="")
    GEMINI_MODEL: str = Field(default="gemini-2.0-flash")
    AI_REQUEST_TIMEOUT_SECONDS: int = Field(default=30)

    # RAG Vector Store Parameters
    VECTOR_SIMILARITY_THRESHOLD: float = Field(default=0.25)
    TOP_K_CHUNKS: int = Field(default=5)
    CHUNK_SIZE_CHARS: int = Field(default=800)
    CHUNK_OVERLAP_CHARS: int = Field(default=150)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        # In production, disallow insecure or short secret keys
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env == "production" and ("insecure" in v.lower() or len(v) < 32):
            raise ValueError("In production, JWT_SECRET_KEY must be a cryptographically random secret of at least 32 characters.")
        return v

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()

# Ensure directories exist
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
