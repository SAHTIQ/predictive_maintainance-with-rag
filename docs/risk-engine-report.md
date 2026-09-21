# Stage 7 Maintenance Risk Engine Report

## 1. Overview
The Maintenance Risk Engine synthesizes the Stage 6 Adaptive Health Engine outputs into operational risk scores, categorical priority tiers, and actionable maintenance windows.

- Master Dataset: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**
- Total Machines Evaluated: **50**

## 2. Risk Formula & Weights
The engine computes risk via an explainable, weighted multi-criteria formula:
$$\text{Risk Score} = 100 \times (0.25 I_{health} + 0.25 I_{rul} + 0.20 I_{state} + 0.15 I_{degradation} + 0.15 I_{anomaly})$$

- **Health Deficit ($I_{health}$ - 25%)**: Normalized health deficit $(100 - \text{health\_score}) / 100$.
- **RUL Urgency ($I_{rul}$ - 25%)**: Safe piece-wise urgent penalty mapped from Remaining Useful Life in hours.
- **Health State ($I_{state}$ - 20%)**: Good (0.0), Warning (0.5), Critical (1.0).
- **Degradation Severity ($I_{degradation}$ - 15%)**: Stable (0.0), Moderate (0.5), Rapid (1.0).
- **Anomaly Severity ($I_{anomaly}$ - 15%)**: Scaled from continuous anomaly score and boolean flag.

## 3. Fleet Risk Distribution
- **CRITICAL (Score 80-100)**: 28 machines
- **HIGH (Score 60-79.9)**: 12 machines
- **MEDIUM (Score 40-59.9)**: 9 machines
- **LOW (Score 20-39.9)**: 1 machines
- **VERY_LOW (Score 0-19.9)**: 0 machines

## 4. Maintenance Priority Distribution
- **P1_IMMEDIATE (0 - 12h window)**: 28 machines
- **P2_HIGH (12 - 24h window)**: 12 machines
- **P3_MEDIUM (24 - 72h window)**: 9 machines
- **P4_LOW (72 - 168h window)**: 1 machines
- **P5_SCHEDULED_MONITORING**: 0 machines

## 5. Highest Risk Machines (Immediate Attention Required)
| Machine ID | Risk Score | Risk Level | Priority | Time Window | Health Score | RUL (hrs) | Vib Mag (mm/s) |
|---|---|---|---|---|---|---|---|
| TXM-001 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 34.0 | 3.4 | 1.22 |
| TXM-013 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 59.7 | 9.8 | 1.26 |
| TXM-024 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 61.7 | 10.5 | 1.23 |
| TXM-037 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 61.8 | 11.5 | 1.38 |
| TXM-021 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 62.0 | 6.4 | 1.14 |
| TXM-033 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 63.3 | 1.0 | 1.28 |
| TXM-008 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 63.4 | 5.0 | 1.17 |
| TXM-026 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 64.0 | 11.9 | 1.22 |
| TXM-012 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 64.4 | 11.8 | 1.24 |
| TXM-018 | 90.0 | CRITICAL | P1_IMMEDIATE | Within 0 - 12 operating hours | 64.7 | 11.5 | 1.09 |

## 6. Artifacts & Outputs
- Fleet Risk CSV: `reports/risk/fleet_risk_summary.csv`
- Fleet Risk JSON: `reports/risk/fleet_risk_summary.json`
- Charts: `reports/risk/risk_score_distribution.png`, `reports/risk/risk_level_priority_matrix.png`
