# System Architecture

## Architecture Overview

The system is a single application with a React and TypeScript frontend, a FastAPI backend, PostgreSQL persistence, and a Python machine-learning pipeline. The frontend communicates with the backend through a REST API. The backend owns authentication, validation, persistence, orchestration, and access control. The ML pipeline is called by the backend when data is analyzed or predictions are generated.

```text
React + TypeScript + Vite frontend
                |
             REST API
                |
        FastAPI backend
          /           \
 PostgreSQL database   Python ML pipeline
```

This design does not introduce microservices. Deployment topology, hosting provider, and production scaling details are **To be decided during implementation**.

## Component Responsibilities

### React + TypeScript + Vite Frontend

- Provides login and role-appropriate navigation.
- Displays machine health, sensor trends, anomalies, RUL, risk, maintenance history, and recommendations.
- Sends validated user actions and filters to the REST API.
- Presents loading, empty, validation, and error states.
- Uses readable labels, units, timestamps, and text in addition to color for status communication.
- Does not calculate authoritative health, risk, or RUL values; it displays backend results.

### FastAPI Backend

- Exposes the documented REST API.
- Authenticates users and applies role-based authorization.
- Validates identifiers, timestamps, units, numeric values, and request structure.
- Stores machines, sensors, readings, maintenance events, and prediction results in PostgreSQL.
- Orchestrates preprocessing and ML inference through the Python pipeline.
- Returns consistent response and error structures.
- Provides filtered results to the frontend and prevents unauthorized machine access.

### PostgreSQL Database

- Stores users, machine metadata, sensor definitions, source readings, maintenance events, and prediction results.
- Preserves source values and data-quality status for traceability.
- Enforces primary keys, foreign keys, uniqueness, required fields, and timestamp conventions.
- Does not store derived data in additional tables in the initial design unless implementation evidence requires it.

### Python ML Pipeline

The pipeline converts validated sensor data into explainable decision-support outputs:

```text
Machine Sensor Data
 -> Data Ingestion & Validation
 -> Preprocessing
 -> Feature Engineering
 -> Adaptive Health Engine
 -> Uncertainty-Aware RUL Prediction
 -> Maintenance Risk Engine
 -> Context-Aware RAG
 -> Maintenance Recommendation
```

The pipeline has these responsibilities:

- **Data ingestion and validation:** accept readings, check required fields, units, timestamps, numeric values, duplicates, and ranges, and mark data-quality problems.
- **Preprocessing:** clean or normalize analysis inputs while retaining the original source data and documenting transformations.
- **Feature engineering:** calculate statistical, FFT, and temporal features.
- **Adaptive Health Engine:** calculate a machine-specific health index, detect anomalies, analyze degradation, and assign a health state.
- **Uncertainty-Aware RUL Prediction:** estimate remaining useful life when enough valid history and an applicable model exist, and report an uncertainty indication or insufficient-data status.
- **Maintenance Risk Engine:** combine health, anomaly, RUL, trend, and data-quality evidence into risk, priority, and a maintenance time window.
- **Context-Aware RAG:** use machine manuals, maintenance history, and failure context to retrieve relevant context for a recommendation. The exact retrieval implementation is **To be decided during implementation**.
- **Maintenance recommendation:** present an understandable suggested action, priority, evidence, and limitations for technician review.

## Feature and Decision Responsibilities

### Feature Engineering

- Statistical features: mean, standard deviation, minimum, maximum, RMS, variance, and peak-to-peak.
- FFT features: dominant frequency, frequency magnitude, and frequency-band energy.
- Temporal features: rolling mean, rolling standard deviation, trend or slope, and previous health value.

### Adaptive Health Engine

- **Machine-specific Health Index:** calibrates interpretation to a machine's available history and operating context where supported.
- **Anomaly Detection:** produces an anomaly score and severity using the configured anomaly model and threshold.
- **Degradation Analysis:** examines trends and changes over time rather than relying only on one reading.
- **Health State:** translates evidence into an understandable state such as normal, warning, or critical. Exact thresholds are **To be decided during implementation** and must be versioned.

### Maintenance Risk Engine

- **Risk:** estimates the current maintenance risk level from available indicators.
- **Priority:** ranks the need for review or action.
- **Maintenance Time Window:** gives a suggested review or maintenance window, not a guaranteed failure time.

## Data and Control Boundaries

- The frontend is an untrusted client and never bypasses backend authorization.
- The backend is the system boundary for validation and persistence.
- The database is the source of retained operational and prediction records.
- The ML pipeline produces versioned results from validated inputs and must identify insufficient data.
- Recommendations support qualified maintenance decisions and do not control or shut down machines.

## Open Decisions

- Deployment environment and process layout.
- Exact authentication token mechanism and token lifetime.
- Whether prediction generation runs synchronously for the pilot or through a later background job.
- RAG retrieval and document indexing details.
- Health, risk, and severity threshold calibration.
- Operational logging, monitoring, backup, and retention settings.
