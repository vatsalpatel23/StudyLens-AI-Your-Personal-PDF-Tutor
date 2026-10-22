import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.config import settings
from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import User
from backend.app.security import hash_password, create_access_token, rate_limiter
from backend.app.vector_store import vector_store

# Test database
TEST_DB_PATH = Path("backend/storage/test_studylens.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    # Remove existing test db if any
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass

    Base.metadata.create_all(bind=test_engine)
    yield
    # Cleanup after test suite
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest.fixture(autouse=True)
def reset_test_state():
    """Resets rate limiter counters and clears vector store between test runs."""
    with rate_limiter._lock:
        rate_limiter._requests.clear()
    with vector_store._lock:
        vector_store._records.clear()
    yield


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def user_alice(db_session) -> User:
    user = db_session.query(User).filter(User.email == "alice@example.com").first()
    if not user:
        user = User(
            email="alice@example.com",
            name="Alice Student",
            hashed_password=hash_password("AliceSecurePass123!"),
            is_active=True,
            is_admin=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def user_bob(db_session) -> User:
    user = db_session.query(User).filter(User.email == "bob@example.com").first()
    if not user:
        user = User(
            email="bob@example.com",
            name="Bob Attacker",
            hashed_password=hash_password("BobSecurePass456!"),
            is_active=True,
            is_admin=False,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def user_admin(db_session) -> User:
    user = db_session.query(User).filter(User.email == "admin@example.com").first()
    if not user:
        user = User(
            email="admin@example.com",
            name="Admin System",
            hashed_password=hash_password("AdminSecurePass789!"),
            is_active=True,
            is_admin=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user


@pytest.fixture
def alice_token(user_alice) -> str:
    token, _ = create_access_token(user_id=user_alice.id, is_admin=False)
    return token


@pytest.fixture
def bob_token(user_bob) -> str:
    token, _ = create_access_token(user_id=user_bob.id, is_admin=False)
    return token


@pytest.fixture
def admin_token(user_admin) -> str:
    token, _ = create_access_token(user_id=user_admin.id, is_admin=True)
    return token
