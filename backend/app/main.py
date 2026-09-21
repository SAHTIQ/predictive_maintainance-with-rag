from typing import Any, Dict, List
from fastapi import FastAPI, HTTPException
import pandas as pd

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.risk_engine import MaintenanceRiskEngine
from backend.ml.data.loader import load_dataset

app = FastAPI(
    title="Predictive Maintenance API",
    description="Vibration and temperature monitoring API with Adaptive Health Engine, Maintenance Risk Engine, and RAG support.",
    version="1.0.0"
)

# Initialize dataset, health engine, and risk engine
health_engine = AdaptiveHealthEngine()
risk_engine = MaintenanceRiskEngine()
dataset_df = load_dataset()

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "healthy"}

@app.get("/api/v1/health-summary")
def get_fleet_health_summary() -> List[Dict[str, Any]]:
    """Returns the latest evaluated health summary for all machines in the fleet."""
    return health_engine.evaluate_fleet(dataset_df)

@app.get("/api/v1/machines/{machine_id}/health")
def get_machine_health(machine_id: str) -> Dict[str, Any]:
    """Returns detailed health score, state, anomaly status, degradation, and RUL for a specific machine."""
    machine_data = dataset_df[dataset_df["machine_id"] == machine_id]
    if machine_data.empty:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found.")
    return health_engine.evaluate_machine(machine_data)

@app.get("/api/v1/risk-summary")
def get_fleet_risk_summary() -> List[Dict[str, Any]]:
    """Returns fleet-wide maintenance risk summary ranked from highest risk to lowest."""
    fleet_health = health_engine.evaluate_fleet(dataset_df)
    return risk_engine.evaluate_fleet_risk(fleet_health)

@app.get("/api/v1/machines/{machine_id}/risk")
def get_machine_risk(machine_id: str) -> Dict[str, Any]:
    """Returns detailed operational risk diagnostics, maintenance priority, window, and factor breakdown."""
    machine_data = dataset_df[dataset_df["machine_id"] == machine_id]
    if machine_data.empty:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found.")
    health_summary = health_engine.evaluate_machine(machine_data)
    return risk_engine.calculate_risk(health_summary)

@app.get("/api/v1/machines/{machine_id}/rag-context")
def get_machine_rag_context(machine_id: str) -> Dict[str, Any]:
    """Returns structured, traceable documentary and sensor evidence for a machine."""
    machine_data = dataset_df[dataset_df["machine_id"] == machine_id]
    if machine_data.empty:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found.")
    health_summary = health_engine.evaluate_machine(machine_data)
    risk_summary = risk_engine.calculate_risk(health_summary)
    
    from backend.app.services.rag.retriever import ContextAwareRetriever
    retriever = ContextAwareRetriever()
    return retriever.retrieve_evidence_for_machine(risk_summary)

@app.get("/api/v1/machines/{machine_id}/recommendation")
def get_machine_recommendation(machine_id: str) -> Dict[str, Any]:
    """Returns the grounded 4-tier maintenance recommendation decision for a specific machine."""
    machine_data = dataset_df[dataset_df["machine_id"] == machine_id]
    if machine_data.empty:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found.")
    
    from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
    rec_engine = MaintenanceRecommendationEngine()
    return rec_engine.evaluate_machine_recommendation(machine_data)

@app.get("/api/v1/fleet-recommendations")
def get_fleet_recommendations() -> List[Dict[str, Any]]:
    """Returns grounded maintenance recommendation decisions for the entire fleet ranked by priority."""
    from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
    rec_engine = MaintenanceRecommendationEngine()
    return rec_engine.evaluate_fleet_recommendations(dataset_df)


