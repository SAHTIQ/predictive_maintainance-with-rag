# Machine Learning Design

## Goals and Limits

The ML system provides explainable decision support for vibration and temperature monitoring. It does not guarantee failure prediction, replace technicians, or control machines. Neural networks and unnecessarily advanced models are out of scope for the initial implementation.

## Training and Evaluation Pipeline

```text
Raw Data
 -> Validation
 -> Cleaning
 -> EDA
 -> Feature Engineering
 -> Train/Test Split
 -> Training
 -> Evaluation
 -> Joblib Model Storage
```

1. **Raw Data:** load labeled or clearly identified sample/simulated vibration, temperature, machine, and maintenance data.
2. **Validation:** check identifiers, timestamps, units, numeric values, duplicates, missingness, and ranges.
3. **Cleaning:** handle invalid records according to documented rules, preserve source records, and record excluded or imputed values. Exact imputation rules are **To be decided during implementation**.
4. **EDA:** inspect distributions, missingness, machine differences, time trends, class balance, and failure/maintenance context.
5. **Feature Engineering:** build features from windows that end at or before the prediction time.
6. **Train/Test Split:** use a time-aware split or machine-aware strategy appropriate to the available data. Random row splitting must not mix future evidence into training.
7. **Training:** train simple, reproducible models and record configuration and feature schema.
8. **Evaluation:** compare against simple baselines and report task-appropriate metrics.
9. **Joblib Model Storage:** persist trained artifacts together with a version and schema reference.

## Feature Engineering

### Statistical Features

- Mean
- Standard deviation
- Minimum
- Maximum
- RMS
- Variance
- Peak-to-peak

### FFT Features

FFT features are calculated for suitable vibration windows with a documented sampling rate and preprocessing method:

- Dominant frequency
- Frequency magnitude
- Frequency-band energy

The selected window length, frequency bands, and treatment of nonuniform sampling are **To be decided during implementation**.

### Temporal Features

- Rolling mean
- Rolling standard deviation
- Trend or slope
- Previous health value

Features must include their window duration, source signal, unit, and calculation version in the training documentation or metadata.

## Models

### Anomaly Detection: Isolation Forest

- **Input:** validated feature vectors from vibration, temperature, FFT, and temporal windows.
- **Output:** anomaly score and interpreted anomaly severity.
- **Interpretation:** the score is mapped to a documented threshold or ranking rule. Threshold calibration is **To be decided during implementation**.
- **Limit:** unsupervised anomaly detection can flag unusual behavior without proving a failure cause.

### Health Classification: Random Forest Classifier

- **Input:** engineered features and a defined health-state target.
- **Output:** health state such as normal, warning, or critical, plus class probabilities where supported.
- **Health score:** the mapping from model probabilities/features to the displayed health score is **To be decided during implementation** and must be documented and versioned.
- **Limit:** labels may be incomplete or subjective when failure history is limited.

### RUL Prediction: Random Forest Regressor

- **Input:** engineered features and historical outcomes with a defined RUL target.
- **Output:** RUL value, RUL unit, and an uncertainty indication when supported.
- **Insufficient data:** return an explicit unavailable or insufficient-data result rather than an unsupported numeric estimate.
- **Limit:** RUL quality depends strongly on representative run-to-failure or maintenance-history data.

## Model Artifacts

Artifacts are stored under:

```text
backend/ml/models/
- health_classifier.joblib
- rul_regressor.joblib
- anomaly_detector.joblib
- anomaly_scaler.joblib
- feature_schema.json
```

The artifact directory and packaging convention are part of the agreed design. Training scripts and migrations are not created in this stage.

- `health_classifier.joblib`: trained health classifier and required preprocessing state.
- `rul_regressor.joblib`: trained RUL regressor and required preprocessing state.
- `anomaly_detector.joblib`: Isolation Forest model.
- `anomaly_scaler.joblib`: scaler fitted only on training data, when scaling is required.
- `feature_schema.json`: feature names, order, types, units, windows, and schema version.

## Evaluation

Evaluation must define targets before model comparison and report metrics appropriate to each task:

- Anomaly detection: precision/recall or another documented metric when labels exist, plus false-alert review.
- Health classification: precision, recall, F1, confusion matrix, and class balance; accuracy alone is insufficient.
- RUL regression: MAE, RMSE, and error behavior across remaining-life ranges.
- All models: compare with a simple baseline and report results by machine where data allows.

Exact metric thresholds and acceptance criteria are **To be decided during implementation** after data inspection.

## Leakage Prevention and Reproducibility

- Use only values available before the prediction timestamp.
- Fit scalers, imputers, and other transformations on training data only.
- Split time-series data by time or by machine as appropriate; do not let neighboring future windows cross the evaluation boundary.
- Avoid using post-failure maintenance information as an input to an earlier prediction.
- Record dataset period, feature schema, preprocessing configuration, random seed, model parameters, and evaluation results.
- Model version must identify the artifact and feature schema used for each stored prediction.

## Insufficient Data and Uncertainty

The pipeline must identify missing sensors, too few readings, short history, invalid quality, unsupported units, absent labels, and unavailable failure outcomes. In these cases it returns a clear status and reason. It must not invent an RUL value or present a low-confidence model output as certain.

Uncertainty may be represented by a prediction interval, empirical error range, confidence/probability information, or a clear unavailable statement. The specific method for RUL uncertainty is **To be decided during implementation**.

## Explainability and Limitations

Results should expose the main supporting signals, such as increasing RMS, unusual dominant frequency, temperature trend, anomaly score, or recent maintenance context. Feature contribution tooling is **To be decided during implementation**; the initial system can use feature summaries and documented rules. Model outputs remain estimates and require technician review.
