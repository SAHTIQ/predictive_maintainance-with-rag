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

Stage 5: Feature Engineering & Machine Learning Pipeline Complete.
The repository contains the data processing pipeline, EDA reports, engineered rolling features (k=5), 40/10 machine-level split, and three trained models (Isolation Forest for anomaly detection, Random Forest Classifier for health state classification at 93.8% accuracy, and Random Forest Regressor for RUL prediction at R²=0.829). All artifacts are persisted in `backend/ml/models/` with zero data leakage.
