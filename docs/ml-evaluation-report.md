# Stage 5 Machine Learning Evaluation Report

## 1. Overview & Setup
- **Master Dataset**: `data/processed/predictive_maintenance_processed.csv` (Dataset V3).
- **Split Strategy**: Strict machine-level partition with **zero data leakage**.
  - **Training set**: 40 machines (`TXM-001` through `TXM-040`), 8,000 observations.
  - **Testing set**: 10 unseen machines (`TXM-041` through `TXM-050`), 2,000 observations.
- **Feature Engineering**:
  - Causal rolling window $k=5$ per machine (`min_periods=1`).
  - Extracted **45 features total**: instantaneous sensors (`vibration_x, y, z`, `temperature`), `vibration_magnitude`, rolling mean, std, min, max, RMS, and trend for each signal, plus operational metadata (`machine_age_years`, `operating_hours`, `load_percent`, `rotational_speed`, `maintenance_count`) and one-hot machine type encodings.
- **Leakage Prevention**: Feature scaling and imputations fitted strictly on the 40 training machines only.

---

## 2. Model Performance on Unseen Test Machines

### Model 1: Anomaly Detector (`IsolationForest`)
- **Task**: Unsupervised anomaly detection on scaled continuous features.
- **Contamination**: Set to 0.010 based on training failure incidence.
- **Test Results**:
  - Predicted Anomalies: 54
  - Actual Failure Occurrences: 20
  - Precision: **0.037**
  - Recall: **0.100**
  - F1-Score: **0.054**
- **Observation**: Unsupervised Isolation Forest detects overall statistical deviations rather than ground-truth failure moments, which matches expected behavior documented in `docs/ml-design.md`.

### Model 2: Health State Classifier (`RandomForestClassifier`)
- **Task**: 3-class classification (`0: Good`, `1: Warning`, `2: Critical`).
- **Class Balancing**: Balanced class weights.
- **Test Metrics**:
  - **Accuracy**: **93.75%**
  - **Macro F1-Score**: **0.8955**
  - **Weighted F1-Score**: **0.9377**
- **Per-Class Breakdown**:
  - **Good (0)**: Precision = 0.97, Recall = 0.97, F1 = 0.97 (Support: 1,476)
  - **Warning (1)**: Precision = 0.81, Recall = 0.81, F1 = 0.81 (Support: 334)
  - **Critical (2)**: Precision = 0.87, Recall = 0.94, F1 = 0.90 (Support: 190)
- **Confusion Matrix**:
  - Actual Good: 1,426 predicted Good, 50 predicted Warning, 0 predicted Critical.
  - Actual Warning: 37 predicted Good, 271 predicted Warning, 26 predicted Critical.
  - Actual Critical: 0 predicted Good, 12 predicted Warning, 178 predicted Critical.
  - *Zero critical conditions were incorrectly predicted as Good.*

### Model 3: Remaining Useful Life (RUL) Regressor (`RandomForestRegressor`)
- **Task**: Continuous RUL prediction (hours until failure).
- **Test Metrics**:
  - **$R^2$ Score**: **0.8291**
  - **MAE (Overall)**: **18.19 hours**
  - **RMSE (Overall)**: **23.49 hours**
- **Error Breakdown Across Life Stages**:
  - **Critical Range (0-24h RUL)**: MAE = **11.79 hours** (highest accuracy nearest to failure).
  - **Warning Range (24-72h RUL)**: MAE = **17.94 hours**.
  - **Healthy Range (>72h RUL)**: MAE = **21.72 hours**.

---

## 3. Artifacts Generated

Artifacts are persisted in `backend/ml/models/`:
- `anomaly_detector.joblib`
- `anomaly_scaler.joblib`
- `health_classifier.joblib`
- `rul_regressor.joblib`
- `feature_schema.json`

Evaluation charts and metrics are stored in `reports/ml/`:
- `confusion_matrix_health.png`
- `feature_importances_health.png`
- `feature_importances_rul.png`
- `rul_actual_vs_predicted.png`
- `rul_residuals_distribution.png`
- `anomaly_score_distribution.png`
- `ml_evaluation_metrics.json`
