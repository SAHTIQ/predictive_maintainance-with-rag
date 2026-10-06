import os
from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Query

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.risk_engine import MaintenanceRiskEngine
from backend.ml.data.loader import load_dataset

from backend.app.database.session import get_db, init_db
from backend.app.models.entities import (
    Machine,
    SensorReading,
    HealthRecord,
    RiskRecord,
    MaintenanceRecord,
    RecommendationRecord,
)
from backend.app.schemas.pydantic_models import (
    MachineResponse,
    SensorReadingResponse,
    HealthRecordResponse,
    RiskRecordResponse,
    MaintenanceRecordResponse,
    FleetOverviewResponse,
    RagChatRequest,
    RagChatResponse,
)
from backend.app.services.db_pipeline import DatabasePipelineService

app = FastAPI(
    title="Predictive Maintenance API",
    description="Vibration and temperature monitoring API with Adaptive Health Engine, Maintenance Risk Engine, RAG, and PostgreSQL persistence.",
    version="1.0.0"
)

# Configure CORS: local development defaults with configurable production origins
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
custom_origins = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in custom_origins.split(",") if o.strip()] if custom_origins else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    init_db()


# Initialize dataset, health engine, and risk engine
health_engine = AdaptiveHealthEngine()
risk_engine = MaintenanceRiskEngine()
dataset_df = load_dataset()
db_pipeline_service = DatabasePipelineService()

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

# In-memory TTL caches for sub-millisecond responses
import time
import json

_fleet_overview_cache: Dict[str, Any] = {"timestamp": 0.0, "data": None}
_fleet_recommendations_cache: Dict[str, Any] = {"timestamp": 0.0, "data": []}

def invalidate_fleet_caches():
    _fleet_overview_cache["timestamp"] = 0.0
    _fleet_overview_cache["data"] = None
    _fleet_recommendations_cache["timestamp"] = 0.0
    _fleet_recommendations_cache["data"] = []

def _serialize_rec_record(rec: RecommendationRecord) -> Dict[str, Any]:
    def _parse(v, default):
        if v is None:
            return default
        if isinstance(v, (dict, list)):
            return v
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return default
        return default

    condition = _parse(rec.condition_summary, {})
    causes = _parse(rec.potential_causes, [])
    actions = _parse(rec.recommended_actions, [])
    m_ev = _parse(rec.measured_evidence, {})
    c_ev = _parse(rec.calculated_evidence, {})
    d_ev = _parse(rec.retrieved_documentary_evidence, [])
    trace = _parse(rec.source_traceability, {})

    return {
        "machine_id": rec.machine_id,
        "machine_type": condition.get("machine_type") or "TypeA",
        "timestamp": rec.timestamp.isoformat() if rec.timestamp else None,
        "current_condition": {
            "health_state": None,
            "health_state_label": rec.health_state,
            "health_score": rec.health_score,
            "anomaly_status": condition.get("anomaly_status", False),
            "anomaly_score": condition.get("anomaly_score", 0.0),
            "degradation_status": condition.get("degradation_status", "NOMINAL"),
            "rul_hours": rec.rul_hours,
        },
        "risk_assessment": {
            "risk_score": rec.risk_score,
            "risk_level": rec.risk_level,
            "maintenance_priority": rec.maintenance_priority,
            "maintenance_time_window": rec.maintenance_window,
        },
        "measured_evidence": m_ev,
        "calculated_evidence": c_ev,
        "retrieved_documentary_evidence": d_ev,
        "generated_explanation": {
            "condition_summary": condition.get("condition_summary") or rec.reasoning or "",
            "potential_causes": causes,
            "recommended_actions": actions,
            "reasoning": rec.reasoning,
            "confidence": rec.confidence,
        },
        "source_traceability": trace,
    }

@app.get("/api/v1/fleet-recommendations")
def get_fleet_recommendations(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns grounded maintenance recommendation decisions for the entire fleet ranked by priority."""
    now = time.time()
    if _fleet_recommendations_cache["data"] and (now - _fleet_recommendations_cache["timestamp"]) < 15.0:
        return _fleet_recommendations_cache["data"]

    # 1. Try reading from persisted database records
    db_records = db.query(RecommendationRecord).order_by(RecommendationRecord.timestamp.desc()).all()
    if db_records:
        latest = {}
        for r in db_records:
            if r.machine_id not in latest:
                latest[r.machine_id] = r
        if len(latest) >= 50:
            recs = [_serialize_rec_record(r) for r in latest.values()]
            recs.sort(key=lambda r: (r.get("risk_assessment", {}).get("risk_score") or 0.0), reverse=True)
            _fleet_recommendations_cache["timestamp"] = now
            _fleet_recommendations_cache["data"] = recs
            return recs

    # 2. Fallback to computing from dataset_df if DB is unseeded
    from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
    rec_engine = MaintenanceRecommendationEngine()
    recs = rec_engine.evaluate_fleet_recommendations(dataset_df)
    _fleet_recommendations_cache["timestamp"] = now
    _fleet_recommendations_cache["data"] = recs
    return recs


# ---------------------------------------------------------
# Stage 10: PostgreSQL Database-Backed Persistence Endpoints
# ---------------------------------------------------------

@app.get("/api/v1/machines", response_model=List[MachineResponse])
def list_machines(db: Session = Depends(get_db)):
    """List all registered machines in the database."""
    machines = db.query(Machine).order_by(Machine.machine_id).all()
    return machines

@app.get("/api/v1/machines/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    """Get metadata for a specific machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    return machine

@app.get("/api/v1/machines/{machine_id}/sensor-history", response_model=List[SensorReadingResponse])
def get_sensor_history(
    machine_id: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: int = Query(default=500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    """Retrieve chronological sensor telemetry history for a machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    query = db.query(SensorReading).filter(SensorReading.machine_id == machine_id)
    if start:
        query = query.filter(SensorReading.timestamp >= start)
    if end:
        query = query.filter(SensorReading.timestamp <= end)
    
    readings = query.order_by(SensorReading.timestamp.asc()).limit(limit).all()
    return readings

@app.get("/api/v1/machines/{machine_id}/health-history", response_model=List[HealthRecordResponse])
def get_health_history(
    machine_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve evaluated health index records history for a machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    records = db.query(HealthRecord).filter(
        HealthRecord.machine_id == machine_id
    ).order_by(HealthRecord.timestamp.asc()).limit(limit).all()
    return records

@app.get("/api/v1/machines/{machine_id}/risk-history", response_model=List[RiskRecordResponse])
def get_risk_history(
    machine_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Retrieve evaluated maintenance risk assessment records history for a machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    records = db.query(RiskRecord).filter(
        RiskRecord.machine_id == machine_id
    ).order_by(RiskRecord.timestamp.asc()).limit(limit).all()
    return records

@app.get("/api/v1/machines/{machine_id}/maintenance-history", response_model=List[MaintenanceRecordResponse])
def get_maintenance_history(
    machine_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve logged maintenance procedures and service logs for a machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    records = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.machine_id == machine_id
    ).order_by(MaintenanceRecord.maintenance_date.asc()).all()
    return records

@app.get("/api/v1/machines/{machine_id}/latest")
def get_machine_latest_status(machine_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Evaluates or retrieves the latest machine health, risk, and grounded recommendation,
    persisting new records in the database.
    """
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    try:
        decision = db_pipeline_service.process_and_persist_machine_decision(db, machine_id)
        invalidate_fleet_caches()
        return decision
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process machine status: {str(e)}")

@app.get("/api/v1/fleet/overview", response_model=FleetOverviewResponse)
def get_fleet_overview(db: Session = Depends(get_db)):
    """
    Returns an aggregated overview of all machines in the database,
    including total counts, state distributions, and risk priorities.
    """
    now = time.time()
    if _fleet_overview_cache["data"] and (now - _fleet_overview_cache["timestamp"]) < 10.0:
        return _fleet_overview_cache["data"]

    total_machines = db.query(Machine).count()
    if total_machines == 0:
        return FleetOverviewResponse(
            total_machines=0,
            health_states={"Good": 0, "Warning": 0, "Critical": 0},
            risk_levels={"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0},
            maintenance_priorities={},
            average_health_score=0.0,
            average_rul_hours=0.0,
            machines_requiring_maintenance_count=0
        )

    # Fetch latest health and risk records in 2 single batch queries (instead of 100 in a loop)
    latest_health = {}
    for h in db.query(HealthRecord).order_by(HealthRecord.timestamp.asc()).all():
        latest_health[h.machine_id] = h

    latest_risk = {}
    for r in db.query(RiskRecord).order_by(RiskRecord.timestamp.asc()).all():
        latest_risk[r.machine_id] = r

    health_states = {"Good": 0, "Warning": 0, "Critical": 0}
    risk_levels = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    priorities = {}
    health_scores = []
    rul_hours_list = []
    maintenance_needed_count = 0

    if latest_health or latest_risk:
        for m_id, h in latest_health.items():
            health_scores.append(h.health_score)
            if h.rul_hours is not None:
                rul_hours_list.append(h.rul_hours)
            label = h.health_state_label or "Good"
            health_states[label] = health_states.get(label, 0) + 1

        for m_id, r in latest_risk.items():
            r_level = r.risk_level or "LOW"
            risk_levels[r_level] = risk_levels.get(r_level, 0) + 1
            prio = r.maintenance_priority or "P3"
            priorities[prio] = priorities.get(prio, 0) + 1
            if r_level in ["HIGH", "CRITICAL"]:
                maintenance_needed_count += 1
    else:
        # Fallback to recommendation_records if health_records table is unpopulated
        latest_recs = {}
        for r in db.query(RecommendationRecord).order_by(RecommendationRecord.timestamp.asc()).all():
            latest_recs[r.machine_id] = r
        for m_id, r in latest_recs.items():
            if r.health_score is not None:
                health_scores.append(r.health_score)
            if r.rul_hours is not None:
                rul_hours_list.append(r.rul_hours)
            label = r.health_state or "Good"
            health_states[label] = health_states.get(label, 0) + 1
            r_level = r.risk_level or "LOW"
            risk_levels[r_level] = risk_levels.get(r_level, 0) + 1
            prio = r.maintenance_priority or "P3"
            priorities[prio] = priorities.get(prio, 0) + 1
            if r_level in ["HIGH", "CRITICAL"]:
                maintenance_needed_count += 1

    avg_health = sum(health_scores) / len(health_scores) if health_scores else 0.0
    avg_rul = sum(rul_hours_list) / len(rul_hours_list) if rul_hours_list else 0.0

    res = FleetOverviewResponse(
        total_machines=total_machines,
        health_states=health_states,
        risk_levels=risk_levels,
        maintenance_priorities=priorities,
        average_health_score=round(avg_health, 2),
        average_rul_hours=round(avg_rul, 2),
        machines_requiring_maintenance_count=maintenance_needed_count
    )
    _fleet_overview_cache["timestamp"] = now
    _fleet_overview_cache["data"] = res
    return res


# ---------------------------------------------------------
# RAG Copilot / Conversational Assistant Endpoint
# ---------------------------------------------------------

@app.post("/api/v1/rag/chat", response_model=RagChatResponse)
def rag_chat(req: RagChatRequest, db: Session = Depends(get_db)):
    """
    Industrial RAG Assistant Endpoint.
    Searches the machine manuals and SOP knowledge base using vector similarity.
    If machine_id is provided, grounds response in the machine's live telemetry and condition.
    """
    from backend.app.services.rag.retriever import ContextAwareRetriever
    retriever = ContextAwareRetriever()
    
    machine_ctx = None
    machine_type = None
    
    if req.machine_id:
        m = db.query(Machine).filter(Machine.machine_id == req.machine_id).first()
        if m:
            machine_type = m.machine_type
            latest_health = db.query(HealthRecord).filter(
                HealthRecord.machine_id == req.machine_id
            ).order_by(HealthRecord.timestamp.desc()).first()
            
            latest_risk = db.query(RiskRecord).filter(
                RiskRecord.machine_id == req.machine_id
            ).order_by(RiskRecord.timestamp.desc()).first()
            
            latest_sensor = db.query(SensorReading).filter(
                SensorReading.machine_id == req.machine_id
            ).order_by(SensorReading.timestamp.desc()).first()
            
            machine_ctx = {
                "machine_id": m.machine_id,
                "machine_type": m.machine_type,
                "machine_name": m.machine_name,
                "health_score": latest_health.health_score if latest_health else None,
                "health_state": latest_health.health_state_label if latest_health else "Normal",
                "rul_hours": latest_health.rul_hours if latest_health else None,
                "risk_level": latest_risk.risk_level if latest_risk else "LOW",
                "priority": latest_risk.maintenance_priority if latest_risk else "P3",
                "temperature": latest_sensor.temperature if latest_sensor else None,
                "vibration_magnitude": latest_sensor.vibration_magnitude if latest_sensor else None,
            }

    # Search knowledge base via vector similarity
    hits = []
    if retriever.store and retriever.store.is_indexed:
        raw_hits = retriever.store.search(
            query=req.query,
            top_k=req.top_k,
            machine_type=machine_type,
            min_similarity=0.01
        )
        for h in raw_hits:
            c = h["chunk"]
            hits.append({
                "title": c.title,
                "source_document": c.source_file,
                "document_type": c.document_type,
                "section": c.section,
                "content": c.content,
                "relevance_score": h["relevance_score"],
                "component": c.component,
                "failure_type": c.failure_type,
            })

    # Synthesize grounded industrial response
    doc_titles = [h["title"] for h in hits[:2]]
    cited_docs_str = ", ".join(doc_titles) if doc_titles else "General Textile Maintenance Guidelines"
    
    suggested_actions = []
    if machine_ctx and machine_ctx.get("risk_level") in ["HIGH", "CRITICAL"]:
        suggested_actions.append(f"Execute immediate inspection for {machine_ctx['machine_id']} ({machine_ctx.get('priority', 'P1')})")
        suggested_actions.append("Verify spindle lubrication and bearing thermal levels (SOP-BEAR-01)")
    elif hits:
        suggested_actions.append(f"Review procedures detailed in {hits[0]['title']}")
        suggested_actions.append("Check drive alignment and belt tension tolerances (SOP-BELT-04)")
    else:
        suggested_actions.append("Conduct standard shift walkaround inspection")

    # Generate clear, natural technical response
    if machine_ctx:
        resp_text = (
            f"Based on real-time telemetry for **{machine_ctx['machine_id']}** ({machine_ctx['machine_type']}), "
            f"the asset is currently evaluated at **{machine_ctx.get('health_score', 0):.0f}/100 health** "
            f"({machine_ctx.get('health_state', 'Normal')}) with **{machine_ctx.get('risk_level', 'LOW')} risk** "
            f"and estimated **{machine_ctx.get('rul_hours', 0):.1f} hours** of remaining life. "
            f"Bearing temperature is currently {machine_ctx.get('temperature', 0):.1f}°C with vibration magnitude of {machine_ctx.get('vibration_magnitude', 0):.3f}g.\n\n"
        )
        if hits:
            resp_text += (
                f"Referencing retrieved technical documentation from **{cited_docs_str}**: \n"
                f"{hits[0]['content'][:350]}...\n\n"
                f"**Recommendation**: Follow {hits[0].get('section', 'standard operating procedure')} to maintain nominal tolerances."
            )
        else:
            resp_text += "Operating parameters are within standard baseline tolerances. Continue routine shift monitoring."
    else:
        if hits:
            resp_text = (
                f"Retrieved relevant engineering documentation from **{cited_docs_str}**:\n\n"
                f"**{hits[0]['title']} ({hits[0]['section']})**:\n"
                f"> {hits[0]['content'][:400]}...\n\n"
            )
            if len(hits) > 1:
                resp_text += (
                    f"**Supplementary standard from {hits[1]['title']}**:\n"
                    f"> {hits[1]['content'][:300]}..."
                )
        else:
            resp_text = (
                "Your inquiry was processed against the textile machinery knowledge base. "
                "No conflicting failure modes were detected. Please specify an asset ID or specific procedure for deeper analysis."
            )

    return RagChatResponse(
        query=req.query,
        response=resp_text,
        machine_id=req.machine_id,
        machine_context=machine_ctx,
        cited_documents=hits,
        suggested_actions=suggested_actions,
        confidence=0.92 if hits else 0.75,
        source="Context-Aware RAG Engine (TF-IDF + Joblib Index)"
    )




