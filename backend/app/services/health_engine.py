import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

from backend.ml.features.degradation import compute_degradation_metrics
from backend.ml.preprocessing.pipeline import MLDataPipeline

MODELS_DIR = Path(__file__).resolve().parents[2] / "ml" / "models"

HEALTH_STATE_LABELS = {
    0: "Good",
    1: "Warning",
    2: "Critical"
}

class AdaptiveHealthEngine:
    """
    Adaptive Health Engine that integrates:
    - Random Forest Health Classifier (Good / Warning / Critical) with class probabilities
    - Continuous 0-100 Adaptive Health Index
    - Isolation Forest Anomaly Detection
    - Chronological Degradation Trend Analysis (Time-domain + FFT spectral energy)
    - Uncertainty-Aware Remaining Useful Life (RUL) Regressor
    """
    def __init__(self, models_dir: Path = MODELS_DIR):
        self.models_dir = models_dir
        self._load_artifacts()

    def _load_artifacts(self) -> None:
        schema_path = self.models_dir / "feature_schema.json"
        scaler_path = self.models_dir / "anomaly_scaler.joblib"
        
        if not schema_path.exists() or not scaler_path.exists():
            raise FileNotFoundError(f"Missing model artifacts in {self.models_dir}")
            
        self.pipeline = MLDataPipeline.load(schema_path=schema_path, scaler_path=scaler_path)
        self.health_clf = joblib.load(self.models_dir / "health_classifier.joblib")
        self.rul_reg = joblib.load(self.models_dir / "rul_regressor.joblib")
        self.anomaly_det = joblib.load(self.models_dir / "anomaly_detector.joblib")

    def calculate_health_index(
        self,
        health_probs: np.ndarray,
        anomaly_score: float,
        degradation_metrics: dict,
    ) -> float:
        """
        Calculates a continuous health score from 0.0 to 100.0:
        Base score: P(Good)*100 + P(Warning)*50 + P(Critical)*0
        Penalized adaptively by:
        - High anomaly scores (unusual vibration/temperature patterns)
        - Active degradation status (rate of condition decline and spectral FFT growth)
        """
        p_good = health_probs[0]
        p_warning = health_probs[1] if len(health_probs) > 1 else 0.0
        p_critical = health_probs[2] if len(health_probs) > 2 else 0.0
        
        base_score = (p_good * 100.0) + (p_warning * 50.0) + (p_critical * 0.0)
        
        # Adaptive penalty for degradation
        deg_status = degradation_metrics.get("degradation_status", "STABLE")
        deg_penalty = 0.0
        if deg_status == "RAPID_DEGRADATION":
            deg_penalty = 15.0
        elif deg_status == "MODERATE_DEGRADATION":
            deg_penalty = 7.5
            
        # Adaptive penalty for high anomaly score (> 0.5)
        ano_penalty = max(0.0, (anomaly_score - 0.45) * 25.0)
        
        final_score = base_score - deg_penalty - ano_penalty
        return float(np.clip(round(final_score, 1), 0.0, 100.0))

    def predict_rul_with_uncertainty(self, X_input: pd.DataFrame) -> Dict[str, float]:
        """
        Computes uncertainty-aware Remaining Useful Life (RUL) prediction:
        - Mean predicted hours across trees in the ensemble
        - Prediction variance and standard deviation (sigma)
        - 80% confidence prediction interval [lower_bound, upper_bound]
        - Uncertainty score [0.0 to 1.0] normalized
        """
        # Collect individual estimator tree predictions
        tree_preds = np.array([tree.predict(X_input.values)[0] for tree in self.rul_reg.estimators_])
        mean_hours = float(np.mean(tree_preds))
        std_hours = float(np.std(tree_preds))
        lower_80 = float(max(0.0, np.percentile(tree_preds, 10)))
        upper_80 = float(max(0.0, np.percentile(tree_preds, 90)))
        
        # Normalize relative uncertainty: coefficient of variation or standard error relative to mean
        rel_uncertainty = std_hours / max(mean_hours, 10.0)
        uncertainty_score = float(np.clip(round(rel_uncertainty, 3), 0.05, 0.95))

        return {
            "rul_hours": max(0.0, round(mean_hours, 1)),
            "rul_uncertainty_std": round(std_hours, 2),
            "rul_confidence_lower": round(lower_80, 1),
            "rul_confidence_upper": round(upper_80, 1),
            "rul_uncertainty_score": uncertainty_score,
        }

    def evaluate_machine(self, machine_history_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Evaluates the current health of a single machine given its chronological history up to current timestamp.
        History must be sorted chronologically.
        """
        if machine_history_df.empty:
            raise ValueError("Machine telemetry history is empty.")
            
        df_sorted = machine_history_df.sort_values("timestamp").copy()
        machine_id = str(df_sorted["machine_id"].iloc[-1])
        latest_row = df_sorted.iloc[-1]
        
        # 1. Feature Extraction using rolling pipeline
        X, _ = self.pipeline.prepare_xy(df_sorted, is_train=False)
        X_latest = X.iloc[[-1]]
        X_latest_scaled = self.pipeline.transform_features(X_latest)
        
        # 2. Health Classification & Probabilities
        health_pred = int(self.health_clf.predict(X_latest)[0])
        health_probs = self.health_clf.predict_proba(X_latest)[0]
        
        # Ensure 3 classes represented
        prob_dict = {"good": 0.0, "warning": 0.0, "critical": 0.0}
        classes = list(self.health_clf.classes_)
        for idx, cls_val in enumerate(classes):
            if cls_val == 0:
                prob_dict["good"] = round(float(health_probs[idx]), 3)
            elif cls_val == 1:
                prob_dict["warning"] = round(float(health_probs[idx]), 3)
            elif cls_val == 2:
                prob_dict["critical"] = round(float(health_probs[idx]), 3)
                
        # 3. Anomaly Detection
        raw_ano_pred = self.anomaly_det.predict(X_latest_scaled)[0]
        anomaly_status = bool(raw_ano_pred == -1)
        # Higher score = more anomalous
        anomaly_score = float(-self.anomaly_det.score_samples(X_latest_scaled)[0])
        
        # 4. Degradation Analysis (Statistical & FFT spectral ratios)
        degradation_metrics = compute_degradation_metrics(df_sorted)
        
        # 5. Uncertainty-Aware RUL Prediction
        rul_uncertainty_dict = self.predict_rul_with_uncertainty(X_latest)
        
        # 6. Adaptive Health Score (0 - 100)
        health_score = self.calculate_health_index(
            health_probs=health_probs,
            anomaly_score=anomaly_score,
            degradation_metrics=degradation_metrics,
        )
        
        # Key sensor readings
        vib_x = float(latest_row["vibration_x"])
        vib_y = float(latest_row["vibration_y"])
        vib_z = float(latest_row["vibration_z"])
        vib_mag = float(np.sqrt(vib_x**2 + vib_y**2 + vib_z**2))
        
        return {
            "machine_id": machine_id,
            "machine_type": str(latest_row.get("machine_type", "Unknown")),
            "timestamp": str(latest_row["timestamp"]),
            "health_score": health_score,
            "health_state": health_pred,
            "health_state_label": HEALTH_STATE_LABELS.get(health_pred, "Unknown"),
            "health_probabilities": prob_dict,
            "anomaly_status": anomaly_status,
            "anomaly_score": round(anomaly_score, 4),
            "degradation_status": degradation_metrics["degradation_status"],
            "degradation_rate": degradation_metrics["degradation_rate"],
            "vibration_severity_ratio": degradation_metrics["vibration_severity_ratio"],
            "fft_energy_ratio": degradation_metrics.get("fft_energy_ratio", 1.0),
            "dominant_frequency_hz": degradation_metrics.get("dominant_frequency_hz", 0.0),
            "rul_hours": rul_uncertainty_dict["rul_hours"],
            "rul_uncertainty_std": rul_uncertainty_dict["rul_uncertainty_std"],
            "rul_confidence_lower": rul_uncertainty_dict["rul_confidence_lower"],
            "rul_confidence_upper": rul_uncertainty_dict["rul_confidence_upper"],
            "rul_uncertainty_score": rul_uncertainty_dict["rul_uncertainty_score"],
            "key_sensors": {
                "vibration_x": round(vib_x, 4),
                "vibration_y": round(vib_y, 4),
                "vibration_z": round(vib_z, 4),
                "vibration_magnitude": round(vib_mag, 4),
                "temperature": round(float(latest_row["temperature"]), 2),
                "operating_hours": round(float(latest_row["operating_hours"]), 1),
                "load_percent": round(float(latest_row.get("load_percent", 0.0)), 2),
                "rotational_speed": round(float(latest_row.get("rotational_speed", 0.0)), 1),
            }
        }

    def evaluate_fleet(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Evaluates latest health summary for all machines in the dataset."""
        summaries = []
        for machine_id, group in df.groupby("machine_id"):
            summary = self.evaluate_machine(group)
            summaries.append(summary)
        # Sort by health_score ascending (most critical first)
        summaries.sort(key=lambda s: s["health_score"])
        return summaries
