from pathlib import Path

import pandas as pd


PROCESSED_PATH = Path(__file__).resolve().parents[2] / "data" / "processed" / "predictive_maintenance_processed.csv"
EXPECTED_COLUMNS = [
    "machine_id", "timestamp", "machine_type", "machine_age_years",
    "operating_hours", "load_percent", "rotational_speed", "temperature",
    "vibration_x", "vibration_y", "vibration_z", "maintenance_count",
    "failure_status", "health_state", "rul_hours",
]


def load_processed_data() -> pd.DataFrame:
    assert PROCESSED_PATH.exists(), f"Processed dataset does not exist: {PROCESSED_PATH}"
    return pd.read_csv(PROCESSED_PATH, parse_dates=["timestamp"])


def test_dataset_exists() -> None:
    assert PROCESSED_PATH.exists()


def test_schema() -> None:
    assert list(load_processed_data().columns) == EXPECTED_COLUMNS


def test_row_count() -> None:
    assert len(load_processed_data()) == 10000


def test_machine_count() -> None:
    assert load_processed_data()["machine_id"].nunique() == 50


def test_observations_per_machine() -> None:
    assert (load_processed_data().groupby("machine_id").size() == 200).all()


def test_missing_values() -> None:
    assert int(load_processed_data().isna().sum().sum()) == 0


def test_duplicate_rows() -> None:
    assert int(load_processed_data().duplicated().sum()) == 0


def test_timestamp_ordering() -> None:
    data = load_processed_data()
    assert data.groupby("machine_id")["timestamp"].apply(lambda values: values.is_monotonic_increasing).all()


def test_operating_hours_strictly_increasing() -> None:
    data = load_processed_data()
    assert data.groupby("machine_id")["operating_hours"].apply(lambda values: values.is_monotonic_increasing and values.is_unique).all()


def test_maintenance_count_non_decreasing() -> None:
    data = load_processed_data()
    assert data.groupby("machine_id")["maintenance_count"].apply(lambda values: values.is_monotonic_increasing).all()


def test_rul_nonnegative() -> None:
    assert (load_processed_data()["rul_hours"] >= 0).all()


def test_health_state_values() -> None:
    assert load_processed_data()["health_state"].isin([0, 1, 2]).all()


def test_failure_status_values() -> None:
    assert load_processed_data()["failure_status"].isin([0, 1]).all()
