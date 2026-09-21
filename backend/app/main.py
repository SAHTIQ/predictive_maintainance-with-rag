from typing import Any, Dict, List
from fastapi import FastAPI, HTTPException
import pandas as pd

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.ml.data.loader import load_dataset

app = FastAPI(
    title="Predictive Maintenance API",
    description="Vibration and temperature monitoring API with Adaptive Health Engine and RAG support.",
    version="1.0.0"
)

# Initialize dataset and health engine
health_engine = AdaptiveHealthEngine()
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
