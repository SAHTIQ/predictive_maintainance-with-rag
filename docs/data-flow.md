# Data Flow

## End-to-End Flow

```text
Sensor/Dataset
 -> Data Ingestion
 -> Validation
 -> PostgreSQL
 -> Preprocessing
 -> Feature Engineering
 -> Health Engine
 -> RUL Prediction
 -> Risk Engine
 -> Recommendation/RAG
 -> Prediction Result
 -> PostgreSQL
 -> FastAPI
 -> React Dashboard
```

## Step-by-Step Behavior

### 1. Sensor/Dataset

Timestamped vibration and temperature data arrives from a sensor source or an imported dataset. Each record should identify the machine, sensor, timestamp, measurement type, value, unit, and source. Sample or simulated data is labeled as non-production data.

### 2. Data Ingestion

The FastAPI backend accepts individual records or a supported batch import. It parses the request, records the source, and prepares records for validation. Import summaries must identify accepted and rejected records.

### 3. Validation

The backend validates required fields, machine and sensor identifiers, machine-sensor association, timestamps, units, numeric values, duplicate conditions, and expected ranges. Invalid or suspicious records are reported with a data-quality status; source data is not silently changed. Records that cannot be stored under the implementation's policy are rejected with a reason.

### 4. PostgreSQL: Source Storage

Accepted readings and their quality status are stored in `sensor_readings`. Machine and sensor metadata provide the relationships needed for later queries. The original source and ingestion timestamp remain available for traceability.

### 5. Preprocessing

For analysis, the Python pipeline selects the requested machine and time window, orders readings by UTC timestamp, checks quality, aligns compatible signals, and applies documented cleaning or normalization. The pipeline records when data is missing, irregular, or insufficient. Preprocessing must not use future data relative to the prediction time.

### 6. Feature Engineering

The pipeline creates statistical, FFT, and temporal features from valid analysis windows:

- Statistical: mean, standard deviation, minimum, maximum, RMS, variance, and peak-to-peak.
- FFT: dominant frequency, frequency magnitude, and frequency-band energy.
- Temporal: rolling mean, rolling standard deviation, trend/slope, and previous health value.

Feature names, units, windows, and schema version are associated with the model input.

### 7. Health Engine

The Adaptive Health Engine uses machine-specific context where available. It runs anomaly detection, calculates or predicts a health index, analyzes degradation trends, and assigns a health state. It produces supporting indicators and data-quality information so the result can be interpreted.

### 8. RUL Prediction

The RUL model estimates remaining useful life when the available history, features, and model support a meaningful estimate. It returns the value, unit, estimate timestamp, model version, and uncertainty indication. If data is insufficient, it returns an explicit unavailable/insufficient-data result.

### 9. Risk Engine

The Maintenance Risk Engine combines health state, anomaly score/severity, degradation evidence, RUL availability, data quality, and other documented indicators. It produces risk level, risk score, maintenance priority, and a suggested maintenance time window. These outputs are recommendations for review, not guarantees.

### 10. Recommendation/RAG

Context-Aware RAG retrieves relevant context from machine manuals, maintenance history, and failure context. That context is combined with the calculated health, anomaly, RUL, and risk evidence to produce an understandable maintenance recommendation. Retrieval/indexing details are **To be decided during implementation**.

### 11. Prediction Result

The backend assembles the health, anomaly, RUL, risk, priority, maintenance window, model version, and limitation information into a prediction result. The result identifies the machine and prediction timestamp and preserves enough evidence for the user to understand why it was produced.

### 12. PostgreSQL: Result Storage

The prediction result is stored in `predictions` and associated with the machine. The source readings and maintenance history remain separately available, allowing the result to be reviewed against its inputs and context.

### 13. FastAPI

FastAPI authenticates the requester, checks machine permissions, queries the stored result and related data, applies response shaping, and returns structured JSON. It exposes dedicated endpoints for health, trends, anomalies, risk, predictions, maintenance, and readings.

### 14. React Dashboard

The React frontend requests authorized data and presents it through the Dashboard, Machine Details, Analytics, Prediction, and History pages. It shows current state, trends, evidence, limitations, and recommended next actions. Loading, empty, validation, error, and insufficient-data states are explicit.

## Timing and Consistency Notes

A prediction is associated with the data window and timestamp used to generate it, not merely the time a user viewed it. The UI displays the result's generated time and data freshness. Whether the pilot generates predictions synchronously during `POST /predictions` or through a later background process is **To be decided during implementation**.

## Data Protection Boundaries

- Authentication and authorization occur before protected reads or writes.
- User input is validated before database or ML processing.
- Database credentials and model artifacts are not exposed to the browser.
- Recommendations remain decision support and do not send machine-control commands.
