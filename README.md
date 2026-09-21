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

Start the FastAPI application from the project root:

```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The health endpoint is available at `http://127.0.0.1:8000/health`.

Run backend tests from the project root:

```powershell
pytest backend/tests/ -v
```

## Environment Configuration

Copy `.env.example` to `.env` and provide local values when needed. Never commit real credentials or secrets.

## Current Development Stage

Stage 11: React Frontend & FastAPI Integration Complete.
The repository contains the React + TypeScript frontend fully connected to the FastAPI + PostgreSQL backend. Features an industrial monitoring layout, fleet overview KPI cards, health and risk distribution charts, searchable & filterable machine table, individual machine diagnostics, latest sensor telemetry snapshot, interactive SVG time-series charts (Temperature, Vibration X/Y/Z, Adaptive Health Index, RUL, and Risk Score), operational risk factor diagnostics, strict 4-tier grounded RAG evidence display (Measured, Calculated, Retrieved Docs, and Generated SOP Recommendations), and maintenance service history. Fully verified with 75/75 passing backend tests and clean TypeScript/Vite production build.


