# Data Processing Report

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
| Rows | 10,000 | 10,000 |
| Columns | 15 | 15 |
| Machines | 50 | 50 |
| Missing values | 0 | 0 |
| Duplicates | 0 | 0 |

## 4. Data Integrity

- Every machine has 200 observations: **True**
- Timestamps are chronological per machine: **True**
- Operating hours are increasing per machine: **True**
- Maintenance count is nondecreasing per machine: **True**
- RUL is nonnegative: **True**

## 5. Output Dataset

The processed dataset is saved at `data/processed/predictive_maintenance_processed.csv` with all original 15 columns.

## 6. Conclusion

The processed dataset is **READY FOR THE NEXT STAGE**. It preserves all 10,000 observations and 50 machine trajectories, with no derived ML features added. Stage 5 preprocessing and feature engineering remains separate.
