# Predictive Maintenance Vibration & Thermal Monitoring System for MSME Textile Machinery

An end-to-end industrial intelligence platform designed for monitoring vibration and temperature data from MSME textile machinery to provide predictive maintenance decision support with context-aware RAG evidence grounding.

---

## 1. Project Overview & Architecture

The system implements a transparent 12-stage predictive maintenance pipeline:

```text
Machine Sensor Data (Dataset V3: 50 machines, 10,000 observations)
        ↓
Data Ingestion & Validation (Idempotent PostgreSQL Persistence)
        ↓
Preprocessing & Feature Engineering (Rolling Window k=5, Statistical & Temporal)
        ↓
Adaptive Health Engine (Machine-Specific Health Index, Anomaly Detection, Degradation)
        ↓
Remaining Useful Life (RUL) Prediction (RF Regressor in Operating Hours)
        ↓
Maintenance Risk Engine (Prioritized Maintenance Windows P0-P3, Risk Factors)
        ↓
Context-Aware RAG (ISO 10816 Standards, Equipment Manuals, SOP Procedures)
        ↓
LLM Decision Explanation (Strict 4-Tier Grounded Evidence Segregation)
        ↓
PostgreSQL Persistence (ORM Entities & Audit History)
        ↓
FastAPI REST API (Configurable CORS & Structured Endpoints)
        ↓
React + TypeScript Dashboard (Interactive Industrial Operational UI)
```

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript 5.6, Vite 6, Custom Responsive SVG Time-Series Engine.
- **Backend**: Python 3.14 / 3.11+, FastAPI, SQLAlchemy, PostgreSQL (with SQLite fallback).
- **Machine Learning**: Scikit-Learn, Random Forest, Isolation Forest, Joblib, NumPy, Pandas.
- **Testing**: Pytest, TestClient.

---

## 3. Project Structure

```text
frontend/                 React + TypeScript + Vite application
  src/
    components/          FleetDashboard, MachineDetail, TimeSeriesChart, MetricCard
    services/            Typed API service layer (api.ts)
    types/               TypeScript schema models (index.ts)
    main.tsx             Navigation sidebar, breadcrumbs, view routing
    styles.css           Industrial design system & responsive layout
backend/
  app/
    database/            Session & engine configuration (PostgreSQL / SQLite)
    models/              SQLAlchemy ORM entities
    schemas/             Pydantic response models
    services/            Adaptive Health Engine, Risk Engine, RAG Retriever, Recommendation Engine
    main.py              FastAPI application entry point & CORS configuration
  ml/
    data/                Dataset loader & train/test splitters
    features/            Rolling-window statistical & temporal feature extraction
    models/              Persisted ML models (.joblib) & feature_schema.json
  tests/                 Comprehensive test suite (75 passed tests)
data/
  raw/                   Dataset V3 master telemetry file
scripts/
  ingest_dataset_v3.py   Idempotent database ingestion script
docs/                    Architecture specifications & design documentation
```

---

## 4. Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL (optional for production; local development falls back automatically to SQLite)

---

## 5. Environment Configuration

Copy example environment files:

```powershell
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Key environment variables:
- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/predictive_maintenance`).
- `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (defaults to `http://localhost:5173,http://127.0.0.1:5173`).
- `VITE_API_BASE_URL`: Frontend API base URL (leave blank in dev to use the Vite proxy).

---

## 6. Database Setup & Telemetry Ingestion

Initialize tables and ingest Dataset V3 (50 machines, 10,000 observations):

```powershell
python scripts/ingest_dataset_v3.py
```
*Note: Ingestion is strictly idempotent. Running the script multiple times will skip existing records.*

---

## 7. Running the Application

### Backend Service (FastAPI)
From the project root:
```powershell
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation is available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health Check: `http://127.0.0.1:8000/health`

### Frontend Application (React + Vite)
From `frontend/`:
```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 8. API Overview

- `GET /api/v1/fleet/overview`: Fleet KPIs, health state counts, risk distributions, and fleet averages.
- `GET /api/v1/machines`: List of all registered machines.
- `GET /api/v1/machines/{id}`: Metadata for a specific machine.
- `GET /api/v1/machines/{id}/latest`: Runs the intelligence pipeline and returns the latest condition, risk assessment, and recommendation.
- `GET /api/v1/machines/{id}/sensor-history`: Chronological historical telemetry ($T, V_x, V_y, V_z$).
- `GET /api/v1/machines/{id}/health-history`: Historical evaluated Health Index records.
- `GET /api/v1/machines/{id}/risk-history`: Historical operational Risk assessment records.
- `GET /api/v1/machines/{id}/maintenance-history`: Historical logged maintenance interventions.
- `GET /api/v1/fleet-recommendations`: Fleet-wide prioritized recommendations.

---

## 9. Testing & Build Verification

Run backend test suite:
```powershell
pytest backend/tests/ -v
```
Build frontend production bundle:
```powershell
cd frontend
npm run build
```

---

## 10. Known Project Limitations

1. **Synthetic / Prototype Master Dataset**: The current dataset (Dataset V3) is a synthetic benchmark designed to model textile machine degradation patterns. It is not validated industrial field telemetry.
2. **Sampled Telemetry vs. High-Frequency Waveforms**: Sensor readings represent 30-minute interval statistical points. They do not contain raw high-frequency acceleration waveforms (e.g. 10 kHz).
3. **Absence of Waveform FFT**: Meaningful frequency-domain spectral analysis (e.g. bearing defect frequencies BPFO/BPFI) requires high-frequency continuous waveform capture. FFT was intentionally omitted to prevent artificial feature artifacts.
4. **Synthetic Accuracy vs. Industrial Generalization**: High classification and regression scores on prototype data demonstrate pipeline integrity, not certified accuracy on actual factory equipment.
5. **Grounded Explanations**: Generated recommendations are strictly anchored in measured telemetry, calculated metrics, and retrieved documentation. They must be validated by a qualified maintenance engineer prior to equipment intervention.
6. **Expert Verification Required**: Production deployment in textile manufacturing facilities requires domain-specific threshold tuning and field sensor calibration.

---

## Current Development Stage

**Stage 12: End-to-End Validation, Security Hardening & Production Verification Complete.**
Fully verified with 75 passing backend tests, 0 build errors, idempotent database persistence across 50 machines, and multi-machine type end-to-end integration.



