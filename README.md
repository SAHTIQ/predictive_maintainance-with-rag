# Predictive Maintenance Vibration Monitoring System

A student-focused foundation for monitoring machine vibration and temperature data for predictive maintenance decision support. The system architecture is documented in `docs/`; application features are not implemented yet.

## Technology Stack

- Frontend: React, TypeScript, Vite
- Backend: Python, FastAPI, SQLAlchemy, PostgreSQL
- ML: Pandas, NumPy, scikit-learn, joblib
- Testing: Pytest, Vitest

## Project Structure

```text
frontend/                 React + TypeScript + Vite application
  src/                   Frontend source directories
  public/                Static assets
backend/
  app/                   FastAPI application and future domain modules
  ml/                    ML pipeline directories
  tests/                 Backend tests
data/
  raw/                   Original input datasets
  processed/             Cleaned/transformed datasets
scripts/                 Development scripts
docs/                    Project and system design documentation
```

## Frontend Setup

From `frontend/`, install the declared dependencies with npm:

```powershell
npm install
```

The current minimal application can then be started with:

```powershell
npm run dev
```

The Vite development server prints its local URL when it starts.

## Backend Setup

Create and activate a virtual environment from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Start the minimal API from the `backend/` directory:

```powershell
cd backend
uvicorn app.main:app --reload
```

The health endpoint is available at `http://127.0.0.1:8000/health`.

Run the backend test from `backend/`:

```powershell
pytest
```

## Environment Configuration

Copy `.env.example` to `.env` and provide local values when needed. Never commit real credentials or secrets. The database configuration currently establishes the connection structure only; application tables and migrations are intentionally not part of this stage.

## Current Development Stage

Stage 10: PostgreSQL Persistence & Backend Integration Complete.
The repository contains the complete PostgreSQL database persistence layer with SQLAlchemy ORM entities for machines, sensor readings, health records, risk records, maintenance logs, and 4-tier explainable recommendations. Includes an idempotent Dataset V3 ingestion script (`scripts/ingest_dataset_v3.py`), a chronological DB-to-Engine pipeline orchestrator (`DatabasePipelineService`), and REST API endpoints (`/api/v1/machines`, `/sensor-history`, `/health-history`, `/risk-history`, `/maintenance-history`, `/latest`, `/fleet/overview`). Fully verified with 75/75 passing backend tests. Ready for Stage 11 Frontend Development & Dashboard Integration.

