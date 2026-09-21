from pathlib import Path
import joblib
import pandas as pd
import pytest

from backend.ml.data.loader import load_dataset, split_by_machine
from backend.ml.features.engineer import compute_rolling_features, get_feature_columns
from backend.ml.preprocessing.pipeline import MLDataPipeline

MODELS_DIR = Path(__file__).resolve().parents[1] / "ml" / "models"

@pytest.fixture(scope="module")
def dataset():
    return load_dataset()

def test_loader_shape(dataset):
    assert len(dataset) == 10000
    assert dataset["machine_id"].nunique() == 50

def test_machine_level_split(dataset):
    train_df, test_df = split_by_machine(dataset, n_train_machines=40)
    assert train_df["machine_id"].nunique() == 40
    assert test_df["machine_id"].nunique() == 10
    overlap = set(train_df["machine_id"]).intersection(set(test_df["machine_id"]))
    assert len(overlap) == 0

def test_feature_engineering_no_nans(dataset):
    sample_df = dataset[dataset["machine_id"] == "TXM-001"]
    fe_df = compute_rolling_features(sample_df, window_k=5)
    feature_cols = get_feature_columns(window_k=5)
    
    assert len(fe_df) == len(sample_df)
    assert fe_df[feature_cols].isna().sum().sum() == 0

def test_artifacts_exist():
    expected_artifacts = [
        "anomaly_detector.joblib",
        "anomaly_scaler.joblib",
        "health_classifier.joblib",
        "rul_regressor.joblib",
        "feature_schema.json"
    ]
    for artifact in expected_artifacts:
        assert (MODELS_DIR / artifact).exists(), f"Missing artifact: {artifact}"

def test_pipeline_inference(dataset):
    pipeline = MLDataPipeline.load(
        schema_path=MODELS_DIR / "feature_schema.json",
        scaler_path=MODELS_DIR / "anomaly_scaler.joblib"
    )
    health_clf = joblib.load(MODELS_DIR / "health_classifier.joblib")
    rul_reg = joblib.load(MODELS_DIR / "rul_regressor.joblib")
    anomaly_det = joblib.load(MODELS_DIR / "anomaly_detector.joblib")
    
    sample_df = dataset.head(20)
    X, _ = pipeline.prepare_xy(sample_df, is_train=False)
    X_scaled = pipeline.transform_features(X)
    
    # Anomaly
    ano_pred = anomaly_det.predict(X_scaled)
    assert len(ano_pred) == 20
    
    # Health
    health_pred = health_clf.predict(X)
    assert len(health_pred) == 20
    assert set(health_pred).issubset({0, 1, 2})
    
    # RUL
    rul_pred = rul_reg.predict(X)
    assert len(rul_pred) == 20
    assert (rul_pred >= 0).all()
