from pathlib import Path
from typing import Tuple
import pandas as pd

DEFAULT_DATA_PATH = (
    Path(__file__).resolve().parents[3]
    / "data"
    / "processed"
    / "predictive_maintenance_processed.csv"
)

EXPECTED_COLUMNS = [
    "machine_id", "timestamp", "machine_type", "machine_age_years",
    "operating_hours", "load_percent", "rotational_speed", "temperature",
    "vibration_x", "vibration_y", "vibration_z", "maintenance_count",
    "failure_status", "health_state", "rul_hours",
]

def load_dataset(data_path: Path = DEFAULT_DATA_PATH) -> pd.DataFrame:
    if not data_path.exists():
        raise FileNotFoundError(f"Processed dataset not found at {data_path}")

    df = pd.read_csv(data_path, parse_dates=["timestamp"])
    missing_cols = set(EXPECTED_COLUMNS) - set(df.columns)
    if missing_cols:
        raise ValueError(f"Dataset is missing expected columns: {missing_cols}")

    df = df.sort_values(by=["machine_id", "timestamp"]).reset_index(drop=True)
    return df

def split_by_machine(
    df: pd.DataFrame,
    n_train_machines: int = 40,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    unique_machines = sorted(df["machine_id"].unique())
    total_machines = len(unique_machines)

    if n_train_machines >= total_machines or n_train_machines <= 0:
        raise ValueError(
            f"n_train_machines must be between 1 and {total_machines - 1}. Got {n_train_machines}"
        )

    train_machines = set(unique_machines[:n_train_machines])
    test_machines = set(unique_machines[n_train_machines:])

    train_df = df[df["machine_id"].isin(train_machines)].copy().reset_index(drop=True)
    test_df = df[df["machine_id"].isin(test_machines)].copy().reset_index(drop=True)

    return train_df, test_df
