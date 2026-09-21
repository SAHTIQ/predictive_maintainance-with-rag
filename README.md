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

Stage 6: Adaptive Health Engine + Machine Health Scoring Complete.
The repository contains the complete Adaptive Health Engine, degradation analysis, continuous health score calculation (0-100), health state classification (Good/Warning/Critical), RUL estimation, and Isolation Forest anomaly tracking. Evaluated across all 50 machines in Dataset V3 with REST API endpoints available at `/api/v1/health-summary` and `/api/v1/machines/{machine_id}/health`. Ready for Stage 7 Risk Engine.
