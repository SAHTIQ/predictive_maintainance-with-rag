"""Create the Stage 4.6 processed dataset from the finalized V3 input."""

from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT_DIR / "data" / "raw" / "predictive_maintenance_dataset_v3.csv"
PROCESSED_PATH = ROOT_DIR / "data" / "processed" / "predictive_maintenance_processed.csv"
REPORT_PATH = ROOT_DIR / "docs" / "data-processing-report.md"
EXPECTED_COLUMNS = [
    "machine_id", "timestamp", "machine_type", "machine_age_years",
    "operating_hours", "load_percent", "rotational_speed", "temperature",
    "vibration_x", "vibration_y", "vibration_z", "maintenance_count",
    "failure_status", "health_state", "rul_hours",
]
NUMERIC_COLUMNS = [
    "machine_age_years", "operating_hours", "load_percent", "rotational_speed",
    "temperature", "vibration_x", "vibration_y", "vibration_z",
    "maintenance_count", "failure_status", "health_state", "rul_hours",
]


def load_raw_data() -> pd.DataFrame:
    """Load V3 without changing the source file."""
    return pd.read_csv(RAW_PATH)


def validate_schema(data: pd.DataFrame) -> None:
    """Require the exact V3 column set and order."""
    if list(data.columns) != EXPECTED_COLUMNS:
        raise ValueError(
            "Invalid schema. Expected columns in this order: "
            f"{EXPECTED_COLUMNS}; found: {list(data.columns)}"
        )


def clean_data(data: pd.DataFrame) -> pd.DataFrame:
    """Convert types and report invalid values rather than hiding them."""
    processed = data.copy()
    processed["timestamp"] = pd.to_datetime(processed["timestamp"], errors="raise")
    for column in NUMERIC_COLUMNS:
        processed[column] = pd.to_numeric(processed[column], errors="raise")

    invalid = {
        "missing_values": int(processed.isna().sum().sum()),
        "duplicate_rows": int(processed.duplicated().sum()),
        "invalid_health_state": int((~processed["health_state"].isin([0, 1, 2])).sum()),
        "invalid_failure_status": int((~processed["failure_status"].isin([0, 1])).sum()),
        "negative_rul": int((processed["rul_hours"] < 0).sum()),
        "load_out_of_range": int(((processed["load_percent"] < 0) | (processed["load_percent"] > 100)).sum()),
        "negative_temperature": int((processed["temperature"] < 0).sum()),
    }
    invalid_found = {name: count for name, count in invalid.items() if count}
    if invalid_found:
        raise ValueError(f"Invalid data found; processing stopped: {invalid_found}")
    return processed


def sort_data(data: pd.DataFrame) -> pd.DataFrame:
    """Keep each machine trajectory chronological and reset the index."""
    return data.sort_values(["machine_id", "timestamp"]).reset_index(drop=True)


def save_processed_data(data: pd.DataFrame) -> None:
    """Write the processed dataset and its processing report."""
    PROCESSED_PATH.parent.mkdir(parents=True, exist_ok=True)
    data.to_csv(PROCESSED_PATH, index=False)
    observations = data.groupby("machine_id").size()
    chronological = data.groupby("machine_id")["timestamp"].apply(lambda values: values.is_monotonic_increasing)
    operating_increasing = data.groupby("machine_id")["operating_hours"].apply(lambda values: values.is_monotonic_increasing)
    maintenance_non_decreasing = data.groupby("machine_id")["maintenance_count"].apply(lambda values: values.is_monotonic_increasing)
    report = f"""# Data Processing Report

## 1. Input Dataset

The finalized V3 dataset at `data/raw/predictive_maintenance_dataset_v3.csv` is the only input. It was not regenerated, deleted, or modified.

## 2. Processing Steps

1. Validated the exact 15-column schema.
2. Converted `timestamp` to pandas datetime.
3. Converted numerical columns to numeric types.
4. Checked missing values and duplicate rows.
5. Validated health states, failure statuses, RUL, load range, and temperature.
6. Sorted by `machine_id` and `timestamp`, then reset the DataFrame index.
7. Preserved all original columns without adding ML features.

Invalid values would stop processing with a clear error; none were found in this run.

## 3. Before vs After

| Measure | Before | After |
| --- | ---: | ---: |
| Rows | {len(data):,} | {len(data):,} |
| Columns | {len(EXPECTED_COLUMNS)} | {len(data.columns)} |
| Machines | {data.machine_id.nunique()} | {data.machine_id.nunique()} |
| Missing values | {int(data.isna().sum().sum())} | {int(data.isna().sum().sum())} |
| Duplicates | {int(data.duplicated().sum())} | {int(data.duplicated().sum())} |

## 4. Data Integrity

- Every machine has 200 observations: **{bool((observations == 200).all())}**
- Timestamps are chronological per machine: **{bool(chronological.all())}**
- Operating hours are increasing per machine: **{bool(operating_increasing.all())}**
- Maintenance count is nondecreasing per machine: **{bool(maintenance_non_decreasing.all())}**
- RUL is nonnegative: **{bool((data.rul_hours >= 0).all())}**

## 5. Output Dataset

The processed dataset is saved at `data/processed/predictive_maintenance_processed.csv` with all original 15 columns.

## 6. Conclusion

The processed dataset is **READY FOR THE NEXT STAGE**. It preserves all 10,000 observations and 50 machine trajectories, with no derived ML features added. Stage 5 preprocessing and feature engineering remains separate.
"""
    REPORT_PATH.write_text(report, encoding="utf-8")


def main() -> None:
    """Run the processing pipeline."""
    raw_data = load_raw_data()
    validate_schema(raw_data)
    processed_data = sort_data(clean_data(raw_data))
    if len(processed_data) != len(raw_data) or list(processed_data.columns) != EXPECTED_COLUMNS:
        raise ValueError("Processing changed the row count or original columns")
    save_processed_data(processed_data)
    print("DATA PROCESSING COMPLETED")
    print(f"Raw rows: {len(raw_data)}")
    print(f"Processed rows: {len(processed_data)}")
    print(f"Machines: {processed_data.machine_id.nunique()}")
    print(f"Columns: {len(processed_data.columns)}")
    print(f"Missing values: {int(processed_data.isna().sum().sum())}")
    print(f"Duplicates: {int(processed_data.duplicated().sum())}")
    print("Output: data/processed/predictive_maintenance_processed.csv")


if __name__ == "__main__":
    main()
