import json
from pathlib import Path
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.ml.data.loader import load_dataset

REPORTS_HEALTH_DIR = Path(__file__).resolve().parents[1] / "reports" / "health"
DOCS_DIR = Path(__file__).resolve().parents[1] / "docs"

def main():
    print("--- Running Adaptive Health Engine on Full Fleet (Dataset V3) ---")
    REPORTS_HEALTH_DIR.mkdir(parents=True, exist_ok=True)
    
    df = load_dataset()
    engine = AdaptiveHealthEngine()
    
    fleet_summaries = engine.evaluate_fleet(df)
    print(f"Evaluated {len(fleet_summaries)} machines.")
    
    # Convert to DataFrame for analysis
    rows = []
    for s in fleet_summaries:
        row = {
            "machine_id": s["machine_id"],
            "machine_type": s["machine_type"],
            "timestamp": s["timestamp"],
            "health_score": s["health_score"],
            "health_state": s["health_state"],
            "health_state_label": s["health_state_label"],
            "anomaly_status": s["anomaly_status"],
            "anomaly_score": s["anomaly_score"],
            "degradation_status": s["degradation_status"],
            "degradation_rate": s["degradation_rate"],
            "rul_hours": s["rul_hours"],
            "vibration_magnitude": s["key_sensors"]["vibration_magnitude"],
            "temperature": s["key_sensors"]["temperature"],
            "operating_hours": s["key_sensors"]["operating_hours"],
        }
        rows.append(row)
        
    summary_df = pd.DataFrame(rows)
    
    # Save CSV and JSON
    summary_df.to_csv(REPORTS_HEALTH_DIR / "fleet_health_summary.csv", index=False)
    with open(REPORTS_HEALTH_DIR / "fleet_health_summary.json", "w", encoding="utf-8") as f:
        json.dump(fleet_summaries, f, indent=2)
    print("Saved fleet_health_summary.csv and fleet_health_summary.json")
    
    # 1. Plot Fleet Health Score Distribution
    plt.figure(figsize=(9, 5))
    sns.histplot(summary_df["health_score"], kde=True, bins=20, color="dodgerblue")
    plt.axvline(summary_df["health_score"].median(), color="red", linestyle="--", label=f"Median: {summary_df['health_score'].median():.1f}")
    plt.title("Fleet Health Score Distribution (0 = Critical, 100 = Perfect)")
    plt.xlabel("Adaptive Health Score")
    plt.ylabel("Machine Count")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_HEALTH_DIR / "fleet_health_distribution.png", dpi=300)
    plt.close()
    
    # 2. Plot Degradation Status vs Health State
    plt.figure(figsize=(8, 5))
    sns.countplot(data=summary_df, x="health_state_label", hue="degradation_status", palette="Set2")
    plt.title("Degradation Status by Health State across Fleet")
    plt.xlabel("Assigned Health State")
    plt.ylabel("Machine Count")
    plt.legend(title="Degradation Status")
    plt.tight_layout()
    plt.savefig(REPORTS_HEALTH_DIR / "degradation_overview.png", dpi=300)
    plt.close()
    
    # 3. Generate Docs Report
    state_counts = summary_df["health_state_label"].value_counts().to_dict()
    deg_counts = summary_df["degradation_status"].value_counts().to_dict()
    ano_count = int(summary_df["anomaly_status"].sum())
    
    report_md = f"""# Stage 6 Adaptive Health Engine Report

## 1. Overview
The Adaptive Health Engine evaluates real-time and historical condition data per machine to produce an actionable health score, classification, anomaly flag, degradation rate, and remaining useful life estimate.

- Total Machines Evaluated: **{len(summary_df)}**
- Data Source: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**

## 2. Fleet Health Distribution
- **Good (0)**: {state_counts.get('Good', 0)} machines
- **Warning (1)**: {state_counts.get('Warning', 0)} machines
- **Critical (2)**: {state_counts.get('Critical', 0)} machines

## 3. Degradation Analysis
- **STABLE**: {deg_counts.get('STABLE', 0)} machines
- **MODERATE_DEGRADATION**: {deg_counts.get('MODERATE_DEGRADATION', 0)} machines
- **RAPID_DEGRADATION**: {deg_counts.get('RAPID_DEGRADATION', 0)} machines

## 4. Anomaly Detection
- Machines currently triggering statistical anomalies: **{ano_count} / {len(summary_df)}**

## 5. Machine Health Top Priorities (Lowest Health Scores)
| Machine ID | Health Score | State | Status | RUL (hrs) | Vib Mag (mm/s) | Temp (°C) |
|---|---|---|---|---|---|---|
"""
    for _, r in summary_df.head(10).iterrows():
        report_md += f"| {r['machine_id']} | {r['health_score']:.1f} | {r['health_state_label']} | {r['degradation_status']} | {r['rul_hours']:.1f} | {r['vibration_magnitude']:.2f} | {r['temperature']:.1f} |\n"

    report_md += """
## 6. Artifacts & Outputs
- Fleet Summary CSV: `reports/health/fleet_health_summary.csv`
- Fleet Summary JSON: `reports/health/fleet_health_summary.json`
- Plots: `fleet_health_distribution.png`, `degradation_overview.png`
"""
    (DOCS_DIR / "health-engine-report.md").write_text(report_md, encoding="utf-8")
    print("Generated docs/health-engine-report.md successfully!")

if __name__ == "__main__":
    main()
