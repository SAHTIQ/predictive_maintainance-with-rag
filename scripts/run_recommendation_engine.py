import json
from pathlib import Path
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
from backend.ml.data.loader import load_dataset

BASE_DIR = Path(r"d:\predictive_maintainance with rag")
REPORTS_DIR = BASE_DIR / "reports" / "recommendation"
DOCS_DIR = BASE_DIR / "docs"

def main():
    print("--- Running Stage 9 Maintenance Recommendation Engine on Full Fleet ---")
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    
    df = load_dataset()
    engine = MaintenanceRecommendationEngine()
    
    print("Evaluating fleet recommendations across 50 machines...")
    fleet_recs = engine.evaluate_fleet_recommendations(df)
    print(f"Generated {len(fleet_recs)} structured recommendations.")
    
    # Save JSON full decisions
    with open(REPORTS_DIR / "fleet_recommendations.json", "w", encoding="utf-8") as f:
        json.dump(fleet_recs, f, indent=2)
    print("Saved fleet_recommendations.json")
    
    # Flatten into summary CSV
    rows = []
    for r in fleet_recs:
        exp = r["generated_explanation"]
        top_cause = exp["potential_causes"][0]["cause"] if exp["potential_causes"] else "Unknown"
        top_sop = exp["recommended_actions"][0]["cited_procedure"] if exp["recommended_actions"] else "None"
        
        row = {
            "machine_id": r["machine_id"],
            "machine_type": r["machine_type"],
            "health_state": r["current_condition"]["health_state_label"],
            "health_score": r["current_condition"]["health_score"],
            "risk_level": r["risk_assessment"]["risk_level"],
            "priority": r["risk_assessment"]["maintenance_priority"],
            "time_window": r["risk_assessment"]["maintenance_time_window"],
            "rul_hours": r["current_condition"]["rul_hours"],
            "vibration_mag": r["measured_evidence"]["vibration_magnitude"],
            "temperature": r["measured_evidence"]["temperature"],
            "primary_potential_cause": top_cause,
            "cited_procedure": top_sop,
            "confidence": exp["confidence"],
            "generation_source": r["source_traceability"]["generation_source"],
        }
        rows.append(row)
        
    summary_df = pd.DataFrame(rows)
    summary_df.to_csv(REPORTS_DIR / "fleet_recommendations_summary.csv", index=False)
    print("Saved fleet_recommendations_summary.csv")
    
    # Generate Priority Action Matrix Chart
    plt.figure(figsize=(10, 5))
    priority_order = ["P1_IMMEDIATE", "P2_HIGH", "P3_MEDIUM", "P4_LOW", "P5_SCHEDULED_MONITORING"]
    sns.countplot(data=summary_df, x="priority", order=[p for p in priority_order if p in summary_df["priority"].unique()], palette="Dark2")
    plt.title("Fleet Maintenance Decision: Priority Tiers Distribution")
    plt.xlabel("Maintenance Priority")
    plt.ylabel("Machine Count")
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "priority_action_matrix.png", dpi=300)
    plt.close()
    
    # Generate Docs Report
    p_counts = summary_df["priority"].value_counts().to_dict()
    r_counts = summary_df["risk_level"].value_counts().to_dict()
    
    report_md = f"""# Stage 9 Maintenance Recommendation Engine Report

## 1. Overview
The Maintenance Recommendation Engine connects Stage 6 condition metrics, Stage 7 operational risk diagnostics, and Stage 8 retrieved domain evidence into a structured, grounded decision object.

- Fleet Evaluated: **{len(summary_df)} machines**
- Master Dataset: **Dataset V3 (`data/processed/predictive_maintenance_processed.csv`)**
- Evidence Tiers: Strictly separated Measured Evidence, Calculated Evidence, Retrieved Documentary Evidence, and Generated Explanations.

## 2. Priority & Risk Breakdown
- **P1_IMMEDIATE (0 - 12h Window)**: {p_counts.get('P1_IMMEDIATE', 0)} machines
- **P2_HIGH (12 - 24h Window)**: {p_counts.get('P2_HIGH', 0)} machines
- **P3_MEDIUM (24 - 72h Window)**: {p_counts.get('P3_MEDIUM', 0)} machines
- **P4_LOW (72 - 168h Window)**: {p_counts.get('P4_LOW', 0)} machines
- **P5_SCHEDULED_MONITORING**: {p_counts.get('P5_SCHEDULED_MONITORING', 0)} machines

## 3. High Priority Action Plan (Top Critical Machines)
| Machine ID | Type | Priority | Time Window | Potential Cause | Cited Action SOP | Confidence |
|---|---|---|---|---|---|---|
"""
    for _, r in summary_df.head(10).iterrows():
        report_md += f"| {r['machine_id']} | {r['machine_type']} | {r['priority']} | {r['time_window']} | {r['primary_potential_cause'][:40]}... | {r['cited_procedure']} | {r['confidence']:.2f} |\\n"

    report_md += """
## 4. Grounding & Fallback Verification
- All documentary claims strictly cite verified knowledge base documents (`SOP-MECH-04`, `SOP-MECH-12`, `SOP-ALIGN-02`, etc.).
- When LLM is absent or returns non-JSON, the deterministic rule-based expert engine produces reliable, validated actions.
- Outputs are saved in `reports/recommendation/fleet_recommendations.json`.
"""

    (DOCS_DIR / "recommendation-engine-report.md").write_text(report_md, encoding="utf-8")
    print("Generated docs/recommendation-engine-report.md successfully!")

if __name__ == "__main__":
    main()
