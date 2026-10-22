import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict
import threading

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHash
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User, TokenBlocklist

# Argon2id password hasher with recommended secure memory and time parameters
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16
)

# HTTP Bearer scheme
security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash with constant-time verification."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHash):
        return False


def create_access_token(user_id: str, is_admin: bool = False, expires_delta: Optional[timedelta] = None) -> tuple[str, str]:
    """Create a signed JWT token containing user_id and unique jti. Returns (token, jti)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "is_admin": is_admin,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "studylens-api",
    }

    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti


def decode_access_token(token: str) -> dict:
    """Decode and strictly verify a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["sub", "exp", "jti", "iat", "iss"], "verify_iss": True, "verify_exp": True},
            issuer="studylens-api"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    Authenticate the request and enforce resource authorization.
    Verifies token presence, signature, expiration, database existence, and revocation blocklist.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check revocation blocklist (prevent use of logged-out tokens)
    revoked = db.query(TokenBlocklist).filter(TokenBlocklist.jti == jti).first()
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Enforce server-side role check for privileged admin endpoints."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required.",
        )
    return current_user


# ---------------------------------------------------------
# Sliding Window In-Memory Rate Limiter
# Thread-safe, protects login, upload, and LLM routes from abuse
# ---------------------------------------------------------

class SlidingWindowRateLimiter:
    def __init__(self):
        self._requests = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, client_key: str, max_requests: int, window_seconds: int = 60) -> tuple[bool, int]:
        """
        Check if request is within rate limit window.
        Returns (is_allowed, seconds_to_wait).
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Periodic memory hygiene: prune inactive keys when tracking table grows
            if len(self._requests) > 200:
                dead_keys = [k for k, ts in self._requests.items() if not ts or ts[-1] <= window_start]
                for k in dead_keys:
                    del self._requests[k]

            # Clean up older timestamps
            timestamps = [t for t in self._requests[client_key] if t > window_start]
            if len(timestamps) >= max_requests:
                earliest = timestamps[0]
                seconds_to_wait = max(1, int(window_seconds - (now - earliest)))
                self._requests[client_key] = timestamps
                return False, seconds_to_wait

            timestamps.append(now)
            self._requests[client_key] = timestamps
            return True, 0

    def reset_for_key(self, client_key: str):
        with self._lock:
            if client_key in self._requests:
                del self._requests[client_key]


rate_limiter = SlidingWindowRateLimiter()
