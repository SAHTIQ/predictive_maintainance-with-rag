from pathlib import Path
import joblib
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor

from backend.ml.data.loader import load_dataset, split_by_machine
from backend.ml.preprocessing.pipeline import MLDataPipeline

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"

def train_models():
    print("--- Starting Stage 5: Model Training ---")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Loading dataset...")
    df = load_dataset()
    print(f"Loaded {len(df)} rows across {df['machine_id'].nunique()} machines.")
    
    print("Splitting dataset by machine (40 train / 10 test)...")
    train_df, test_df = split_by_machine(df, n_train_machines=40)
    print(f"Train machines: {train_df['machine_id'].nunique()} ({len(train_df)} rows)")
    print(f"Test machines:  {test_df['machine_id'].nunique()} ({len(test_df)} rows)")
    
    overlap = set(train_df["machine_id"]).intersection(set(test_df["machine_id"]))
    assert len(overlap) == 0, f"Data leakage detected! Overlapping machines: {overlap}"
    
    print("Extracting features with rolling window k=5...")
    pipeline = MLDataPipeline(window_k=5)
    X_train, y_train_dict = pipeline.prepare_xy(train_df, is_train=True)
    X_test, y_test_dict = pipeline.prepare_xy(test_df, is_train=False)
    
    print(f"Extracted {X_train.shape[1]} features.")
    
    print("Fitting feature scaler on training machines only...")
    pipeline.fit_scaler(X_train)
    X_train_scaled = pipeline.transform_features(X_train)
    
    contamination = max(0.01, float(y_train_dict["anomaly"].mean()))
    print(f"Training Isolation Forest (contamination={contamination:.4f})...")
    anomaly_detector = IsolationForest(
        n_estimators=100,
        contamination=contamination,
        random_state=42,
        n_jobs=-1
    )
    anomaly_detector.fit(X_train_scaled)
    
    print("Training Random Forest Classifier for health state (0, 1, 2)...")
    health_classifier = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    health_classifier.fit(X_train, y_train_dict["health"])
    
    print("Training Random Forest Regressor for RUL hours...")
    rul_regressor = RandomForestRegressor(
        n_estimators=150,
        max_depth=15,
        random_state=42,
        n_jobs=-1
    )
    rul_regressor.fit(X_train, y_train_dict["rul"])
    
    print("Persisting models and schema to backend/ml/models/...")
    joblib.dump(anomaly_detector, MODELS_DIR / "anomaly_detector.joblib")
    pipeline.save_scaler(MODELS_DIR / "anomaly_scaler.joblib")
    joblib.dump(health_classifier, MODELS_DIR / "health_classifier.joblib")
    joblib.dump(rul_regressor, MODELS_DIR / "rul_regressor.joblib")
    pipeline.save_schema(MODELS_DIR / "feature_schema.json")
    
    print("Stage 5 Model Training completed successfully!")
    print(f"Artifacts saved in {MODELS_DIR}")

if __name__ == "__main__":
    train_models()
