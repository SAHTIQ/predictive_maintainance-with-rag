import json
from pathlib import Path
import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)

from backend.ml.data.loader import load_dataset, split_by_machine
from backend.ml.preprocessing.pipeline import MLDataPipeline

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
REPORTS_DIR = Path(__file__).resolve().parents[3] / "reports" / "ml"

def evaluate_models():
    print("--- Starting Stage 5: Model Evaluation on Unseen Test Machines ---")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    print("Loading models and preprocessors from backend/ml/models/...")
    anomaly_detector = joblib.load(MODELS_DIR / "anomaly_detector.joblib")
    health_classifier = joblib.load(MODELS_DIR / "health_classifier.joblib")
    rul_regressor = joblib.load(MODELS_DIR / "rul_regressor.joblib")
    
    pipeline = MLDataPipeline.load(
        schema_path=MODELS_DIR / "feature_schema.json",
        scaler_path=MODELS_DIR / "anomaly_scaler.joblib"
    )
    
    df = load_dataset()
    _, test_df = split_by_machine(df, n_train_machines=40)
    print(f"Evaluating on {test_df['machine_id'].nunique()} unseen machines ({len(test_df)} records).")
    
    X_test, y_test_dict = pipeline.prepare_xy(test_df, is_train=False)
    X_test_scaled = pipeline.transform_features(X_test)
    
    metrics_summary = {}

    # 1. Anomaly Detector Evaluation
    print("\n--- Evaluating Anomaly Detector (Isolation Forest) ---")
    raw_anomaly_pred = anomaly_detector.predict(X_test_scaled)
    anomaly_pred = (raw_anomaly_pred == -1).astype(int)
    anomaly_scores = -anomaly_detector.score_samples(X_test_scaled)
    y_anomaly_true = y_test_dict["anomaly"]
    
    ano_precision = precision_score(y_anomaly_true, anomaly_pred, zero_division=0)
    ano_recall = recall_score(y_anomaly_true, anomaly_pred, zero_division=0)
    ano_f1 = f1_score(y_anomaly_true, anomaly_pred, zero_division=0)
    
    print(f"Anomaly Precision: {ano_precision:.4f}")
    print(f"Anomaly Recall:    {ano_recall:.4f}")
    print(f"Anomaly F1-Score:  {ano_f1:.4f}")
    
    metrics_summary["anomaly_detection"] = {
        "precision": float(ano_precision),
        "recall": float(ano_recall),
        "f1_score": float(ano_f1),
        "test_anomalies_actual": int(y_anomaly_true.sum()),
        "test_anomalies_predicted": int(anomaly_pred.sum())
    }
    
    plt.figure(figsize=(8, 5))
    sns.histplot(data=pd.DataFrame({"anomaly_score": anomaly_scores, "failure_status": y_anomaly_true}),
                 x="anomaly_score", hue="failure_status", kde=True, bins=30, palette="viridis")
    plt.title("Anomaly Score Distribution by Failure Status (Unseen Machines)")
    plt.xlabel("Anomaly Score (Higher indicates more anomalous)")
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "anomaly_score_distribution.png", dpi=300)
    plt.close()

    # 2. Health Classifier Evaluation
    print("\n--- Evaluating Health Classifier (Random Forest) ---")
    y_health_true = y_test_dict["health"]
    health_pred = health_classifier.predict(X_test)
    
    h_acc = accuracy_score(y_health_true, health_pred)
    h_f1_macro = f1_score(y_health_true, health_pred, average="macro")
    h_f1_weighted = f1_score(y_health_true, health_pred, average="weighted")
    
    print(f"Health Accuracy:    {h_acc:.4f}")
    print(f"Health F1 Macro:    {h_f1_macro:.4f}")
    print(f"Health F1 Weighted: {h_f1_weighted:.4f}")
    print("\nClassification Report:\n", classification_report(y_health_true, health_pred, target_names=["Good (0)", "Warning (1)", "Critical (2)"]))
    
    cm = confusion_matrix(y_health_true, health_pred)
    metrics_summary["health_classification"] = {
        "accuracy": float(h_acc),
        "f1_macro": float(h_f1_macro),
        "f1_weighted": float(h_f1_weighted),
        "confusion_matrix": cm.tolist()
    }
    
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Good (0)", "Warning (1)", "Critical (2)"],
                yticklabels=["Good (0)", "Warning (1)", "Critical (2)"])
    plt.title("Health State Confusion Matrix (Unseen Test Machines)")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "confusion_matrix_health.png", dpi=300)
    plt.close()
    
    top_health_features = pd.Series(health_classifier.feature_importances_, index=pipeline.feature_names).nlargest(15)
    plt.figure(figsize=(10, 6))
    top_health_features.plot(kind="barh", color="teal")
    plt.title("Top 15 Feature Importances - Health State Classifier")
    plt.xlabel("Relative Importance")
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "feature_importances_health.png", dpi=300)
    plt.close()

    # 3. RUL Regressor Evaluation
    print("\n--- Evaluating RUL Regressor (Random Forest Regressor) ---")
    y_rul_true = y_test_dict["rul"]
    rul_pred = rul_regressor.predict(X_test)
    
    rul_mae = mean_absolute_error(y_rul_true, rul_pred)
    rul_rmse = np.sqrt(mean_squared_error(y_rul_true, rul_pred))
    rul_r2 = r2_score(y_rul_true, rul_pred)
    
    print(f"RUL MAE:  {rul_mae:.2f} hours")
    print(f"RUL RMSE: {rul_rmse:.2f} hours")
    print(f"RUL R2:   {rul_r2:.4f}")
    
    range_0_24 = (y_rul_true <= 24)
    range_24_72 = (y_rul_true > 24) & (y_rul_true <= 72)
    range_72_plus = (y_rul_true > 72)
    
    mae_0_24 = float(mean_absolute_error(y_rul_true[range_0_24], rul_pred[range_0_24])) if range_0_24.sum() > 0 else 0.0
    mae_24_72 = float(mean_absolute_error(y_rul_true[range_24_72], rul_pred[range_24_72])) if range_24_72.sum() > 0 else 0.0
    mae_72_plus = float(mean_absolute_error(y_rul_true[range_72_plus], rul_pred[range_72_plus])) if range_72_plus.sum() > 0 else 0.0
    
    metrics_summary["rul_regression"] = {
        "mae_hours": float(rul_mae),
        "rmse_hours": float(rul_rmse),
        "r2_score": float(rul_r2),
        "mae_critical_range_0_24h": mae_0_24,
        "mae_warning_range_24_72h": mae_24_72,
        "mae_healthy_range_72h_plus": mae_72_plus
    }
    
    plt.figure(figsize=(8, 6))
    plt.scatter(y_rul_true, rul_pred, alpha=0.3, color="darkorange", edgecolors="none")
    plt.plot([y_rul_true.min(), y_rul_true.max()], [y_rul_true.min(), y_rul_true.max()], "k--", lw=2, label="Ideal Fit")
    plt.title(f"RUL Prediction: Actual vs Predicted (R² = {rul_r2:.3f}, MAE = {rul_mae:.1f}h)")
    plt.xlabel("Actual RUL (hours)")
    plt.ylabel("Predicted RUL (hours)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "rul_actual_vs_predicted.png", dpi=300)
    plt.close()
    
    residuals = rul_pred - y_rul_true
    plt.figure(figsize=(8, 5))
    sns.histplot(residuals, kde=True, bins=35, color="purple")
    plt.title(f"RUL Residuals Distribution (Mean Error: {residuals.mean():.2f}h, Std: {residuals.std():.2f}h)")
    plt.xlabel("Residual (Predicted - Actual RUL in hours)")
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "rul_residuals_distribution.png", dpi=300)
    plt.close()
    
    top_rul_features = pd.Series(rul_regressor.feature_importances_, index=pipeline.feature_names).nlargest(15)
    plt.figure(figsize=(10, 6))
    top_rul_features.plot(kind="barh", color="coral")
    plt.title("Top 15 Feature Importances - RUL Regressor")
    plt.xlabel("Relative Importance")
    plt.gca().invert_yaxis()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "feature_importances_rul.png", dpi=300)
    plt.close()

    with open(REPORTS_DIR / "ml_evaluation_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)
        
    print(f"\nEvaluation completed! Plots and metrics saved in {REPORTS_DIR}")

if __name__ == "__main__":
    evaluate_models()
