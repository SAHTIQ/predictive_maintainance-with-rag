import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE, override=False)

DEFAULT_SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "predictive_maintenance.db"
)
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", "") or DEFAULT_SQLITE_URL


def _build_engine(db_url: str):
    c_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {"connect_timeout": 3}
    return create_engine(db_url, pool_pre_ping=True, connect_args=c_args)


engine = _build_engine(DATABASE_URL)

# If a remote/local PostgreSQL URL is configured but unreachable in the current deployment,
# gracefully fall back to the bundled SQLite database so API endpoints never fail with 500.
if not DATABASE_URL.startswith("sqlite"):
    try:
        with engine.connect() as conn:
            pass
    except Exception:
        DATABASE_URL = DEFAULT_SQLITE_URL
        engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def init_db():
    """Create all database tables."""
    from backend.app.models.entities import Machine, SensorReading, HealthRecord, RiskRecord, MaintenanceRecord, RecommendationRecord, User
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency injection session generator for FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
