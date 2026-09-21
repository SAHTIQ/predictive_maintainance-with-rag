import json
from pathlib import Path
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.risk_engine import MaintenanceRiskEngine
from backend.ml.data.loader import load_dataset

REPORTS_RISK_DIR = Path(__file__).resolve().parents[1] / "reports" / "risk"
DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"

def main():
    print("--- Running Maintenance Risk Engine on Full Fleet (Dataset V3) ---")
    REPORTS_RISK_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Run Stage 6 Health Engine
    df = load_dataset()
    health_engine = AdaptiveHealthEngine()
    fleet_health = health_engine.evaluate_fleet(df)
    
    # 2. Run Stage 7 Risk Engine
    risk_engine = MaintenanceRiskEngine()
    fleet_risk = risk_engine.evaluate_fleet_risk(fleet_health)
    print(f"Evaluated risk for {len(fleet_risk)} machines.")
    
    # Flatten into DataFrame
    rows = []
    for r in fleet_risk:
        hs = r["health_summary"]
        row = {
            "machine_id": r["machine_id"],
            "machine_type": r["machine_type"],
            "risk_score": r["risk_score"],
            "risk_level": r["risk_level"],
            "maintenance_priority": r["maintenance_priority"],
            "estimated_maintenance_time_window": r["estimated_maintenance_time_window"],
            "health_score": hs["health_score"],
            "health_state_label": hs["health_state_label"],
            "rul_hours": hs["rul_hours"],
            "degradation_status": hs["degradation_status"],
            "anomaly_status": hs["anomaly_status"],
            "vibration_magnitude": hs["key_sensors"]["vibration_magnitude"],
            "temperature": hs["key_sensors"]["temperature"],
            "risk_explanation": r["risk_explanation"]
        }
        rows.append(row)
        
    risk_df = pd.DataFrame(rows)
    
    # Save CSV and JSON
    risk_df.to_csv(REPORTS_RISK_DIR / "fleet_risk_summary.csv", index=False)
    with open(REPORTS_RISK_DIR / "fleet_risk_summary.json", "w", encoding="utf-8") as f:
        json.dump(fleet_risk, f, indent=2)
    print("Saved fleet_risk_summary.csv and fleet_risk_summary.json")
    
    # 1. Plot Risk Score Distribution
    plt.figure(figsize=(9, 5))
    sns.histplot(risk_df["risk_score"], kde=True, bins=20, color="crimson")
    plt.axvline(risk_df["risk_score"].mean(), color="black", linestyle="--", label=f"Mean: {risk_df['risk_score'].mean():.1f}")
    plt.title("Fleet Maintenance Risk Score Distribution (0 = Lowest Risk, 100 = Highest)")
    plt.xlabel("Maintenance Risk Score")
    plt.ylabel("Machine Count")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_RISK_DIR / "risk_score_distribution.png", dpi=300)
    plt.close()
    
    # 2. Plot Risk Level & Priority Matrix
    plt.figure(figsize=(8, 5))
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "VERY_LOW"]
    sns.countplot(data=risk_df, x="risk_level", order=[o for o in order if o in risk_df["risk_level"].unique()], palette="Reds_r")
    plt.title("Fleet Machine Distribution across Risk Levels")
    plt.xlabel("Risk Level")
    plt.ylabel("Machine Count")
    plt.tight_layout()
    plt.savefig(REPORTS_RISK_DIR / "risk_level_priority_matrix.png", dpi=300)
    plt.close()
    
    # 3. Generate Docs Report
    risk_counts = risk_df["risk_level"].value_counts().to_dict()
    priority_counts = risk_df["maintenance_priority"].value_counts().to_dict()
    
    report_md = f"""# Stage 7 Maintenance Risk Engine Report

## 1. Overview
The Maintenance Risk Engine synthesizes the Stage 6 Adaptive Health Engine outputs into operational risk scores, categorical priority tiers, and actionable maintenance windows.

- Master Dataset: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**
- Total Machines Evaluated: **{len(risk_df)}**

## 2. Risk Formula & Weights
The engine computes risk via an explainable, weighted multi-criteria formula:
$$\\text{{Risk Score}} = 100 \\times (0.25 I_{{health}} + 0.25 I_{{rul}} + 0.20 I_{{state}} + 0.15 I_{{degradation}} + 0.15 I_{{anomaly}})$$

- **Health Deficit ($I_{{health}}$ - 25%)**: Normalized health deficit $(100 - \\text{{health\\_score}}) / 100$.
- **RUL Urgency ($I_{{rul}}$ - 25%)**: Safe piece-wise urgent penalty mapped from Remaining Useful Life in hours.
- **Health State ($I_{{state}}$ - 20%)**: Good (0.0), Warning (0.5), Critical (1.0).
- **Degradation Severity ($I_{{degradation}}$ - 15%)**: Stable (0.0), Moderate (0.5), Rapid (1.0).
- **Anomaly Severity ($I_{{anomaly}}$ - 15%)**: Scaled from continuous anomaly score and boolean flag.

## 3. Fleet Risk Distribution
- **CRITICAL (Score 80-100)**: {risk_counts.get('CRITICAL', 0)} machines
- **HIGH (Score 60-79.9)**: {risk_counts.get('HIGH', 0)} machines
- **MEDIUM (Score 40-59.9)**: {risk_counts.get('MEDIUM', 0)} machines
- **LOW (Score 20-39.9)**: {risk_counts.get('LOW', 0)} machines
- **VERY_LOW (Score 0-19.9)**: {risk_counts.get('VERY_LOW', 0)} machines

## 4. Maintenance Priority Distribution
- **P1_IMMEDIATE (0 - 12h window)**: {priority_counts.get('P1_IMMEDIATE', 0)} machines
- **P2_HIGH (12 - 24h window)**: {priority_counts.get('P2_HIGH', 0)} machines
- **P3_MEDIUM (24 - 72h window)**: {priority_counts.get('P3_MEDIUM', 0)} machines
- **P4_LOW (72 - 168h window)**: {priority_counts.get('P4_LOW', 0)} machines
- **P5_SCHEDULED_MONITORING**: {priority_counts.get('P5_SCHEDULED_MONITORING', 0)} machines

## 5. Highest Risk Machines (Immediate Attention Required)
| Machine ID | Risk Score | Risk Level | Priority | Time Window | Health Score | RUL (hrs) | Vib Mag (mm/s) |
|---|---|---|---|---|---|---|---|
"""
    for _, r in risk_df.head(10).iterrows():
        report_md += f"| {r['machine_id']} | {r['risk_score']:.1f} | {r['risk_level']} | {r['maintenance_priority']} | {r['estimated_maintenance_time_window']} | {r['health_score']:.1f} | {r['rul_hours']:.1f} | {r['vibration_magnitude']:.2f} |\n"

    report_md += """
## 6. Artifacts & Outputs
- Fleet Risk CSV: `reports/risk/fleet_risk_summary.csv`
- Fleet Risk JSON: `reports/risk/fleet_risk_summary.json`
- Charts: `reports/risk/risk_score_distribution.png`, `reports/risk/risk_level_priority_matrix.png`
"""
    (DOCS_DIR / "risk-engine-report.md").write_text(report_md, encoding="utf-8")
    print("Generated docs/risk-engine-report.md successfully!")

if __name__ == "__main__":
    main()
