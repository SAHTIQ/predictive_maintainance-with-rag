# Exploratory Data Analysis Report

## 1. Dataset Overview

- Rows: **10000**
- Columns: **15**
- Machines: **50**
- Machine types: **TypeA, TypeB, TypeC, TypeD, TypeE**
- Time range: **2025-01-01 00:00:00** to **2025-01-14 03:30:00**
- Memory usage: **1,320,132 bytes**
- Machines with exactly 200 observations: **50 / 50**

| index | column | data_type |
| --- | --- | --- |
| 0 | machine_id | str |
| 1 | timestamp | datetime64[us] |
| 2 | machine_type | str |
| 3 | machine_age_years | float64 |
| 4 | operating_hours | float64 |
| 5 | load_percent | float64 |
| 6 | rotational_speed | float64 |
| 7 | temperature | float64 |
| 8 | vibration_x | float64 |
| 9 | vibration_y | float64 |
| 10 | vibration_z | float64 |
| 11 | maintenance_count | int64 |
| 12 | failure_status | int64 |
| 13 | health_state | int64 |
| 14 | rul_hours | float64 |

Observations per machine:

| machine_id | observations |
| --- | --- |
| TXM-001 | 200 |
| TXM-002 | 200 |
| TXM-003 | 200 |
| TXM-004 | 200 |
| TXM-005 | 200 |
| TXM-006 | 200 |
| TXM-007 | 200 |
| TXM-008 | 200 |
| TXM-009 | 200 |
| TXM-010 | 200 |
| TXM-011 | 200 |
| TXM-012 | 200 |
| TXM-013 | 200 |
| TXM-014 | 200 |
| TXM-015 | 200 |
| TXM-016 | 200 |
| TXM-017 | 200 |
| TXM-018 | 200 |
| TXM-019 | 200 |
| TXM-020 | 200 |
| TXM-021 | 200 |
| TXM-022 | 200 |
| TXM-023 | 200 |
| TXM-024 | 200 |
| TXM-025 | 200 |
| TXM-026 | 200 |
| TXM-027 | 200 |
| TXM-028 | 200 |
| TXM-029 | 200 |
| TXM-030 | 200 |
| TXM-031 | 200 |
| TXM-032 | 200 |
| TXM-033 | 200 |
| TXM-034 | 200 |
| TXM-035 | 200 |
| TXM-036 | 200 |
| TXM-037 | 200 |
| TXM-038 | 200 |
| TXM-039 | 200 |
| TXM-040 | 200 |
| TXM-041 | 200 |
| TXM-042 | 200 |
| TXM-043 | 200 |
| TXM-044 | 200 |
| TXM-045 | 200 |
| TXM-046 | 200 |
| TXM-047 | 200 |
| TXM-048 | 200 |
| TXM-049 | 200 |
| TXM-050 | 200 |

## 2. Data Quality

- Missing values: **0** total
- Duplicate rows: **0**
- Duplicate machine/timestamp pairs: **0**
- Machines not chronological: **0**
- Machines with non-monotonic operating hours: **0**
- Machines with non-monotonic maintenance counts: **0**
- Invalid health states: **0**
- Invalid failure statuses: **0**
- Negative RUL values: **0**

Negative-value checks:

| index | negative_value_count |
| --- | --- |
| machine_age_years | 0 |
| operating_hours | 0 |
| load_percent | 0 |
| rotational_speed | 0 |
| maintenance_count | 0 |
| rul_hours | 0 |

No values were repaired or removed.

## 3. Statistical Summary

| index | count | mean | std | min | 25% | median | 75% | max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| machine_age_years | 10000.0 | 9.01882 | 4.109499101579971 | 2.036 | 5.313 | 9.315999999999999 | 12.643 | 14.631 |
| operating_hours | 10000.0 | 4328.972802699999 | 2019.426372487844 | 796.68 | 2413.25275 | 4214.8060000000005 | 5795.7792500000005 | 8615.86 |
| load_percent | 10000.0 | 62.488880099999996 | 15.60538783859226 | 20.0 | 50.23925 | 62.3985 | 74.671 | 100.0 |
| rotational_speed | 10000.0 | 2006.5758779 | 388.55433383872105 | 1174.063 | 1668.374 | 2056.4435000000003 | 2336.41375 | 2815.837 |
| temperature | 10000.0 | 59.5437366 | 11.396161540922765 | 35.0 | 50.51975 | 57.6045 | 67.80225 | 92.766 |
| vibration_x | 10000.0 | 0.6310723 | 0.1807705964850627 | 0.1533 | 0.4974 | 0.60965 | 0.753125 | 1.2193 |
| vibration_y | 10000.0 | 0.4765990299999999 | 0.13789120870672997 | 0.06 | 0.377975 | 0.4661 | 0.5668249999999999 | 1.0056 |
| vibration_z | 10000.0 | 0.36097385000000004 | 0.11816225572087394 | 0.05 | 0.2771 | 0.3565 | 0.4421 | 0.7536 |
| maintenance_count | 10000.0 | 1.0774 | 1.0825555101902462 | 0.0 | 0.0 | 1.0 | 2.0 | 3.0 |
| rul_hours | 10000.0 | 74.74155619999999 | 56.85988548678232 | 0.0 | 23.36 | 72.07499999999999 | 118.155 | 229.201 |

Full output: `reports/eda/statistical_summary.csv`.

## 4. Sensor Distribution Analysis

`sensor_distributions.png` contains temperature, vibration axes, load, rotational speed, and RUL distributions.

## 5. Health-State Analysis

| index | health_state | count | percentage |
| --- | --- | --- | --- |
| 0 | Healthy | 7420 | 74.2 |
| 1 | Warning | 1798 | 17.98 |
| 2 | Critical | 782 | 7.82 |

Mean raw values by health state:

| health_state | temperature | vibration_x | vibration_y | vibration_z | rul_hours |
| --- | --- | --- | --- | --- | --- |
| Healthy | 54.24080026954178 | 0.553083409703504 | 0.42503324797843667 | 0.31954946091644204 | 96.89441495956873 |
| Warning | 72.10438876529477 | 0.8133229699666297 | 0.593748275862069 | 0.4617135706340378 | 14.315130144605117 |
| Critical | 80.9807378516624 | 0.9520324808184144 | 0.6965271099744246 | 0.5224047314578005 | 3.4787710997442454 |

Outputs: `health_distribution.png` and `sensor_by_health_state.png`.

## 6. Failure Analysis

- Total failure rows: **100**
- Machines containing failures: **50**

Failures per machine:

| machine_id | failure_rows |
| --- | --- |
| TXM-001 | 2 |
| TXM-002 | 2 |
| TXM-003 | 2 |
| TXM-004 | 2 |
| TXM-005 | 2 |
| TXM-006 | 2 |
| TXM-007 | 2 |
| TXM-008 | 2 |
| TXM-009 | 2 |
| TXM-010 | 2 |
| TXM-011 | 2 |
| TXM-012 | 2 |
| TXM-013 | 2 |
| TXM-014 | 2 |
| TXM-015 | 2 |
| TXM-016 | 2 |
| TXM-017 | 2 |
| TXM-018 | 2 |
| TXM-019 | 2 |
| TXM-020 | 2 |
| TXM-021 | 2 |
| TXM-022 | 2 |
| TXM-023 | 2 |
| TXM-024 | 2 |
| TXM-025 | 2 |
| TXM-026 | 2 |
| TXM-027 | 2 |
| TXM-028 | 2 |
| TXM-029 | 2 |
| TXM-030 | 2 |
| TXM-031 | 2 |
| TXM-032 | 2 |
| TXM-033 | 2 |
| TXM-034 | 2 |
| TXM-035 | 2 |
| TXM-036 | 2 |
| TXM-037 | 2 |
| TXM-038 | 2 |
| TXM-039 | 2 |
| TXM-040 | 2 |
| TXM-041 | 2 |
| TXM-042 | 2 |
| TXM-043 | 2 |
| TXM-044 | 2 |
| TXM-045 | 2 |
| TXM-046 | 2 |
| TXM-047 | 2 |
| TXM-048 | 2 |
| TXM-049 | 2 |
| TXM-050 | 2 |

Failure status by health state (0=Healthy, 1=Warning, 2=Critical):

| failure_status | 0 | 1 | 2 |
| --- | --- | --- | --- |
| 0 | 7408 | 1742 | 750 |
| 1 | 12 | 56 | 32 |

Mean raw sensor values on failure rows:

| index | mean_on_failure_rows |
| --- | --- |
| temperature | 74.06503000000001 |
| vibration_x | 0.8345580000000001 |
| vibration_y | 0.622298 |
| vibration_z | 0.4623439999999999 |

`sensor_trends_near_failure.png` shows raw temperature and vibration-X trends with failure observations marked red. This is descriptive only and uses no future-derived feature.

## 7. RUL Analysis

- Minimum: **0.000 hours**
- Maximum: **229.201 hours**
- Average: **74.742 hours**
- Failure-row average: **0.000 hours** across 100 rows
- Machines with decreasing RUL correlation: **50 / 50**

| health_state | count | mean | min | max |
| --- | --- | --- | --- | --- |
| Healthy | 7420 | 96.89441495956873 | 0.0 | 229.201 |
| Warning | 1798 | 14.315130144605117 | 0.0 | 74.463 |
| Critical | 782 | 3.4787710997442454 | 0.0 | 43.542 |

Outputs: `rul_distribution.png` and `rul_by_health_state.png`. The trajectory check is descriptive and is not an RUL model.

## 8. Machine-Level Degradation

Representative plots: `machine_temperature_trends.png`, `machine_vibration_x_trends.png`, and `machine_rul_hours_trends.png`.

First ten machine averages:

| machine_id | temperature | vibration_x | vibration_y | vibration_z | rul_hours |
| --- | --- | --- | --- | --- | --- |
| TXM-001 | 55.66115 | 0.5696525 | 0.435503 | 0.305901 | 81.81681499999999 |
| TXM-002 | 68.759 | 0.6999335000000001 | 0.5458375 | 0.41147500000000004 | 70.87269500000001 |
| TXM-003 | 56.4534 | 0.55844 | 0.508957 | 0.241178 | 77.57683 |
| TXM-004 | 64.76313 | 0.6921094999999999 | 0.532341 | 0.3862585 | 96.299125 |
| TXM-005 | 47.591 | 0.507098 | 0.3942895 | 0.2565305 | 81.24136 |
| TXM-006 | 60.48959 | 0.6282260000000001 | 0.479345 | 0.32992550000000004 | 52.66147 |
| TXM-007 | 57.958075 | 0.6243124999999999 | 0.555953 | 0.39563699999999996 | 72.58349 |
| TXM-008 | 60.711454999999994 | 0.576315 | 0.4281725 | 0.3086185 | 79.013225 |
| TXM-009 | 62.140190000000004 | 0.7531455 | 0.46602449999999995 | 0.4186055 | 80.217225 |
| TXM-010 | 56.633585000000004 | 0.5280955 | 0.429134 | 0.42546550000000005 | 58.46378 |

Full output: `reports/eda/machine_summary.csv`.

## 9. Correlation Analysis

Requested Pearson correlations:

| index | temperature | vibration_x | vibration_y | vibration_z | operating_hours | load_percent | rotational_speed | rul_hours |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| temperature | 1.0 | 0.8550090397121398 | 0.7766563988148248 | 0.678792165609146 | -0.011566075218668 | 0.19864460916752552 | 0.30395840164686705 | -0.7514023959068946 |
| vibration_x | 0.8550090397121398 | 1.0 | 0.7231328864052409 | 0.6613459783197786 | 0.06380847242292915 | 0.19301509526776742 | 0.33263061832437324 | -0.6594962464169645 |
| vibration_y | 0.7766563988148248 | 0.7231328864052409 | 1.0 | 0.5410600221729569 | -0.047987485832149464 | 0.30968544187423896 | 0.2357056439725389 | -0.5659419367974895 |
| vibration_z | 0.678792165609146 | 0.6613459783197786 | 0.5410600221729569 | 1.0 | 0.022316293666734037 | -0.003911904924230361 | 0.31984425764983215 | -0.5372974764043167 |
| operating_hours | -0.011566075218668 | 0.06380847242292915 | -0.047987485832149464 | 0.022316293666734037 | 1.0 | -0.0002399617643334837 | -0.052277476544191605 | -0.06806376248693635 |
| load_percent | 0.19864460916752552 | 0.19301509526776742 | 0.30968544187423896 | -0.003911904924230361 | -0.0002399617643334837 | 1.0 | 0.03691577544359301 | 0.20276570208633699 |
| rotational_speed | 0.30395840164686705 | 0.33263061832437324 | 0.2357056439725389 | 0.31984425764983215 | -0.052277476544191605 | 0.03691577544359301 | 1.0 | 0.0029125560905297228 |
| rul_hours | -0.7514023959068946 | -0.6594962464169645 | -0.5659419367974895 | -0.5372974764043167 | -0.06806376248693635 | 0.20276570208633699 | 0.0029125560905297228 | 1.0 |

`correlation_matrix.png` reports correlations for interpretation only; no columns were removed.

## 10. Outlier Analysis

IQR-based potential outliers:

| index | feature | lower_bound | upper_bound | outlier_count | outlier_percentage |
| --- | --- | --- | --- | --- | --- |
| 0 | temperature | 24.596000000000004 | 93.726 | 0 | 0.0 |
| 1 | vibration_x | 0.11381249999999993 | 1.1367125000000002 | 9 | 0.09 |
| 2 | vibration_y | 0.09470000000000017 | 0.8500999999999997 | 64 | 0.64 |
| 3 | vibration_z | 0.029600000000000043 | 0.6896 | 17 | 0.16999999999999998 |
| 4 | load_percent | 13.591624999999986 | 111.31862500000003 | 0 | 0.0 |
| 5 | rotational_speed | 666.3143749999998 | 3338.4733750000005 | 0 | 0.0 |
| 6 | rul_hours | -118.8325 | 260.34749999999997 | 0 | 0.0 |

Full output: `reports/eda/outlier_summary.csv`. Outliers were not removed.

## 11. Key Findings

- The dataset contains 10,000 observations from 50 machines.
- Health distribution: Healthy 74.20%, Warning 17.98%, Critical 7.82%.
- There are 100 failure rows across 50 machines.
- RUL decreases by trajectory correlation for 50 of 50 machines.
- Potential IQR outliers are documented, not automatically removed.

## 12. Decision for Next Stage

The dataset is **READY for Stage 4.6 — Processed Dataset** based on the checks above. It is also **READY for later Stage 5 — Preprocessing & Feature Engineering**, subject to decisions documented in that stage. This EDA did not modify V3, randomly split trajectories, train models, or calculate RMS, FFT, rolling features, health indices, anomaly scores, or predictions.
