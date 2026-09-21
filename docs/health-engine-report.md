# Stage 6 Adaptive Health Engine Report

## 1. Overview
The Adaptive Health Engine evaluates real-time and historical condition data per machine to produce an actionable health score, classification, anomaly flag, degradation rate, and remaining useful life estimate.

- Total Machines Evaluated: **50**
- Data Source: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**

## 2. Fleet Health Distribution
- **Good (0)**: 49 machines
- **Warning (1)**: 1 machines
- **Critical (2)**: 0 machines

## 3. Degradation Analysis
- **STABLE**: 0 machines
- **MODERATE_DEGRADATION**: 4 machines
- **RAPID_DEGRADATION**: 46 machines

## 4. Anomaly Detection
- Machines currently triggering statistical anomalies: **0 / 50**

## 5. Machine Health Top Priorities (Lowest Health Scores)
| Machine ID | Health Score | State | Status | RUL (hrs) | Vib Mag (mm/s) | Temp (°C) |
|---|---|---|---|---|---|---|
| TXM-001 | 34.0 | Warning | RAPID_DEGRADATION | 3.4 | 1.22 | 75.2 |
| TXM-013 | 59.7 | Good | RAPID_DEGRADATION | 9.8 | 1.26 | 82.0 |
| TXM-044 | 60.0 | Good | RAPID_DEGRADATION | 19.9 | 1.39 | 81.9 |
| TXM-022 | 60.2 | Good | RAPID_DEGRADATION | 17.1 | 1.33 | 82.9 |
| TXM-007 | 60.7 | Good | RAPID_DEGRADATION | 18.0 | 1.33 | 79.2 |
| TXM-017 | 60.7 | Good | RAPID_DEGRADATION | 15.6 | 1.30 | 82.2 |
| TXM-039 | 60.7 | Good | RAPID_DEGRADATION | 16.4 | 1.31 | 80.7 |
| TXM-032 | 60.9 | Good | RAPID_DEGRADATION | 25.6 | 1.44 | 85.3 |
| TXM-004 | 61.0 | Good | RAPID_DEGRADATION | 19.8 | 1.30 | 81.6 |
| TXM-036 | 61.0 | Good | RAPID_DEGRADATION | 19.4 | 1.30 | 90.8 |

## 6. Artifacts & Outputs
- Fleet Summary CSV: `reports/health/fleet_health_summary.csv`
- Fleet Summary JSON: `reports/health/fleet_health_summary.json`
- Plots: `fleet_health_distribution.png`, `degradation_overview.png`
