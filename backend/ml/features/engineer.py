from typing import List
import numpy as np
import pandas as pd

SENSOR_BASE_COLS = ["vibration_x", "vibration_y", "vibration_z", "temperature"]
META_COLS = ["machine_age_years", "operating_hours", "load_percent", "rotational_speed", "maintenance_count"]
MACHINE_TYPES = ["TypeA", "TypeB", "TypeC", "TypeD", "TypeE"]

def compute_rolling_features(df: pd.DataFrame, window_k: int = 5) -> pd.DataFrame:
    df_sorted = df.sort_values(by=["machine_id", "timestamp"]).copy()
    
    # 1. Vibration Magnitude
    df_sorted["vibration_magnitude"] = np.sqrt(
        df_sorted["vibration_x"]**2 +
        df_sorted["vibration_y"]**2 +
        df_sorted["vibration_z"]**2
    )

    signals_to_roll = SENSOR_BASE_COLS + ["vibration_magnitude"]
    grouped = df_sorted.groupby("machine_id")

    for col in signals_to_roll:
        roll = grouped[col].rolling(window=window_k, min_periods=1)
        
        df_sorted[f"{col}_mean_{window_k}"] = roll.mean().reset_index(drop=True)
        df_sorted[f"{col}_std_{window_k}"] = roll.std().reset_index(drop=True).fillna(0.0)
        df_sorted[f"{col}_min_{window_k}"] = roll.min().reset_index(drop=True)
        df_sorted[f"{col}_max_{window_k}"] = roll.max().reset_index(drop=True)
        
        roll_sq = (df_sorted[col]**2).groupby(df_sorted["machine_id"]).rolling(window=window_k, min_periods=1)
        df_sorted[f"{col}_rms_{window_k}"] = np.sqrt(roll_sq.mean().reset_index(drop=True))
        
        shift_val = grouped[col].shift(window_k - 1)
        first_val = grouped[col].transform("first")
        earliest_in_win = shift_val.fillna(first_val)
        df_sorted[f"{col}_trend_{window_k}"] = df_sorted[col] - earliest_in_win

    for m_type in MACHINE_TYPES:
        df_sorted[f"machine_type_{m_type}"] = (df_sorted["machine_type"] == m_type).astype(float)

    return df_sorted

def get_feature_columns(window_k: int = 5) -> List[str]:
    signals_to_roll = SENSOR_BASE_COLS + ["vibration_magnitude"]
    features = []
    
    features.extend(SENSOR_BASE_COLS)
    features.append("vibration_magnitude")
    
    for col in signals_to_roll:
        features.extend([
            f"{col}_mean_{window_k}",
            f"{col}_std_{window_k}",
            f"{col}_min_{window_k}",
            f"{col}_max_{window_k}",
            f"{col}_rms_{window_k}",
            f"{col}_trend_{window_k}",
        ])
        
    features.extend(META_COLS)
    
    for m_type in MACHINE_TYPES:
        features.append(f"machine_type_{m_type}")
        
    return features
