from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, TokenBlocklist
from backend.app.schemas import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from backend.app.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user,
    security_bearer,
    rate_limiter,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def get_client_ip(request: Request) -> str:
    """Safely retrieves client IP for rate limiting."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    """
    Registers a new user account with Argon2id password hashing.
    Enforces password complexity, email uniqueness, and rate limiting.
    """
    client_ip = get_client_ip(request)
    allowed, wait_secs = rate_limiter.is_allowed(f"register_{client_ip}", max_requests=settings.RATE_LIMIT_LOGIN_PER_MIN)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Registration rate limit exceeded. Please try again in {wait_secs} seconds.",
        )

    # Check existing email
    existing_user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # Hash password with Argon2id
    hashed = hash_password(req.password)

    new_user = User(
        email=req.email.lower().strip(),
        name=req.name.strip(),
        hashed_password=hashed,
        is_active=True,
        is_admin=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token, _ = create_access_token(user_id=new_user.id, is_admin=new_user.is_admin)

    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticates user using email and password.
    Returns generic error to prevent user enumeration and applies sliding window throttling.
    """
    client_ip = get_client_ip(request)
    allowed, wait_secs = rate_limiter.is_allowed(f"login_{client_ip}", max_requests=settings.RATE_LIMIT_LOGIN_PER_MIN)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait {wait_secs} seconds.",
        )

    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    # Constant time verification even if user does not exist to prevent timing attacks
    dummy_hash = "$argon2id$v=19$m=65536,t=3,p=4$anVzdGFkdW1teXNhbHQ$qq830rB5Z3w3eZ69YcK1C7kO70U18kM4G9hYl7W3R9w"

    if not user:
        verify_password(req.password, dummy_hash)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact support.",
        )

    # Reset rate limit on successful login
    rate_limiter.reset_for_key(f"login_{client_ip}")

    token, _ = create_access_token(user_id=user.id, is_admin=user.is_admin)

    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Invalidates the caller's JWT token by persisting its unique jti in the token blocklist.
    """
    if credentials and credentials.credentials:
        payload = decode_access_token(credentials.credentials)
        jti = payload.get("jti")
        exp_ts = payload.get("exp")
        if jti and exp_ts:
            expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
            block_entry = TokenBlocklist(jti=jti, expires_at=expires_at)
            db.add(block_entry)
            db.commit()

    return {"message": "Successfully logged out. Session has been invalidated."}
