# Stage 9 Maintenance Recommendation Engine Report

## 1. Overview
The Maintenance Recommendation Engine connects Stage 6 condition metrics, Stage 7 operational risk diagnostics, and Stage 8 retrieved domain evidence into a structured, grounded decision object.

- Fleet Evaluated: **50 machines**
- Master Dataset: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**
- Evidence Tiers: Strictly separated Measured Evidence, Calculated Evidence, Retrieved Documentary Evidence, and Generated Explanations.

## 2. Priority & Risk Breakdown
- **P1_IMMEDIATE (0 - 12h Window)**: 28 machines
- **P2_HIGH (12 - 24h Window)**: 12 machines
- **P3_MEDIUM (24 - 72h Window)**: 9 machines
- **P4_LOW (72 - 168h Window)**: 1 machines
- **P5_SCHEDULED_MONITORING**: 0 machines

## 3. High Priority Action Plan (Top Critical Machines)
| Machine ID | Type | Priority | Time Window | Potential Cause | Cited Action SOP | Confidence |
|---|---|---|---|---|---|---|
| TXM-001 | TypeA | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-005 | TypeE | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-006 | TypeA | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-008 | TypeC | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-010 | TypeE | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-012 | TypeB | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-013 | TypeC | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-015 | TypeE | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-016 | TypeA | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n| TXM-018 | TypeC | P1_IMMEDIATE | Within 0 - 12 operating hours | Stage 3 Rolling Element Bearing Fatigue ... | SOP-MECH-04 | 0.92 |\n
## 4. Grounding & Fallback Verification
- All documentary claims strictly cite verified knowledge base documents (`SOP-MECH-04`, `SOP-MECH-12`, `SOP-ALIGN-02`, etc.).
- When LLM is absent or returns non-JSON, the deterministic rule-based expert engine produces reliable, validated actions.
- Outputs are saved in `reports/recommendation/fleet_recommendations.json`.
