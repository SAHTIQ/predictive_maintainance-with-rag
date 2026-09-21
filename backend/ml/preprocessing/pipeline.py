import json
from pathlib import Path
from typing import Dict, List, Tuple
import joblib
import pandas as pd
from sklearn.preprocessing import StandardScaler

from backend.ml.features.engineer import compute_rolling_features, get_feature_columns

class MLDataPipeline:
    def __init__(self, window_k: int = 5):
        self.window_k = window_k
        self.feature_names: List[str] = get_feature_columns(window_k=window_k)
        self.scaler: StandardScaler = StandardScaler()
        self.is_fitted: bool = False

    def prepare_xy(
        self,
        df: pd.DataFrame,
        is_train: bool = False,
    ) -> Tuple[pd.DataFrame, Dict[str, pd.Series]]:
        fe_df = compute_rolling_features(df, window_k=self.window_k)
        X = fe_df[self.feature_names].copy()
        
        targets = {}
        if "failure_status" in fe_df.columns:
            targets["anomaly"] = fe_df["failure_status"].copy()
        if "health_state" in fe_df.columns:
            targets["health"] = fe_df["health_state"].copy()
        if "rul_hours" in fe_df.columns:
            targets["rul"] = fe_df["rul_hours"].copy()
            
        return X, targets

    def fit_scaler(self, X_train: pd.DataFrame) -> None:
        self.scaler.fit(X_train)
        self.is_fitted = True

    def transform_features(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted:
            raise RuntimeError("Scaler is not fitted yet. Fit on training data first.")
        X_scaled = self.scaler.transform(X)
        return pd.DataFrame(X_scaled, columns=self.feature_names, index=X.index)

    def save_schema(self, output_path: Path) -> None:
        schema = {
            "version": "1.0.0",
            "window_k": self.window_k,
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names,
            "targets": {
                "anomaly": "failure_status (0: Normal, 1: Failure/Anomaly)",
                "health": "health_state (0: Good, 1: Warning, 2: Critical)",
                "rul": "rul_hours (continuous Remaining Useful Life in hours)"
            }
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)

    def save_scaler(self, output_path: Path) -> None:
        joblib.dump(self.scaler, output_path)

    @classmethod
    def load(cls, schema_path: Path, scaler_path: Path) -> "MLDataPipeline":
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        pipeline = cls(window_k=schema.get("window_k", 5))
        pipeline.feature_names = schema["feature_names"]
        pipeline.scaler = joblib.load(scaler_path)
        pipeline.is_fitted = True
        return pipeline
