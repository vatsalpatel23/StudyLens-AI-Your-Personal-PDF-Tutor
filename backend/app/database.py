from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# Create engine with parameterized query support and concurrency resilience
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30.0  # 30-second busy timeout to prevent database locked errors under load

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,  # Never leak query parameters in production logs
)

# Enable SQLite Write-Ahead Logging (WAL), foreign keys, and busy timeout for concurrent safety
if settings.DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")  # High performance with crash safety
        cursor.execute("PRAGMA busy_timeout=30000")  # Wait up to 30s for write locks
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a clean SQLAlchemy session per request and closes it safely."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
