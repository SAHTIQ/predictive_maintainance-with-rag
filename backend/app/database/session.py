import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ENV_FILE)

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    # Use robust local SQLite database when PostgreSQL URL is not provided in environment
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "predictive_maintenance.db")
    DATABASE_URL = f"sqlite:///{db_path}"

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def init_db():
    """Create all database tables."""
    from backend.app.models.entities import Machine, SensorReading, HealthRecord, RiskRecord, MaintenanceRecord, RecommendationRecord
    Base.metadata.create_all(bind=engine)

def get_db():
    """Dependency injection session generator for FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
