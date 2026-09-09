import os

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    DATABASE_URL = "postgresql+psycopg://user:password@localhost:5432/predictive_maintenance"
