import os
from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File, status
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
    User,
)
from backend.app.schemas.pydantic_models import (
    MachineCreate,
    MachineUpdate,
    MachineResponse,
    MachineIdCheckResponse,
    SensorReadingResponse,
    HealthRecordResponse,
    RiskRecordResponse,
    MaintenanceRecordResponse,
    FleetOverviewResponse,
    RagChatRequest,
    RagChatResponse,
    UserResponse,
    UserProfileUpdate,
    UserPreferencesUpdate,
    ChangePasswordRequest,
)
from backend.app.services.db_pipeline import DatabasePipelineService
from backend.app.utils.security import hash_password, verify_password

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

@app.get("/api/v1/machines/check-id/{machine_id}", response_model=MachineIdCheckResponse)
def check_machine_id_availability(machine_id: str, db: Session = Depends(get_db)):
    """Check if a machine identifier is unique and available for registration."""
    mid = machine_id.strip()
    if not mid:
        raise HTTPException(status_code=400, detail="Machine ID cannot be empty.")
    
    existing = db.query(Machine).filter(Machine.machine_id == mid).first()
    if existing:
        return MachineIdCheckResponse(
            machine_id=mid,
            available=False,
            message=f"Machine ID '{mid}' is already registered in the system."
        )
    return MachineIdCheckResponse(
        machine_id=mid,
        available=True,
        message=f"Machine ID '{mid}' is available."
    )

@app.get("/api/v1/machines", response_model=List[MachineResponse])
def list_machines(db: Session = Depends(get_db)):
    """List all registered machines in the database with monitoring readiness summary."""
    machines = db.query(Machine).order_by(Machine.machine_id).all()
    results = []
    for m in machines:
        # Determine actual monitoring readiness
        reading_count = db.query(SensorReading).filter(SensorReading.machine_id == m.machine_id).count()
        if m.status in ["inactive", "Inactive", "Under Maintenance"]:
            readiness = "Inactive"
        elif reading_count >= 10:
            readiness = "Monitoring Active"
        elif reading_count > 0:
            readiness = "Ready for Analysis"
        else:
            readiness = "Awaiting Data"
            
        res = MachineResponse.from_orm(m)
        res.total_readings = reading_count
        res.monitoring_readiness = readiness
        results.append(res)
    return results

@app.post("/api/v1/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def register_machine(payload: MachineCreate, db: Session = Depends(get_db)):
    """
    Register and onboard a new industrial machine.
    Enforces unique machine ID, validates technical and operational parameters,
    and initializes machine metadata transactionally.
    """
    clean_id = payload.machine_id.strip().upper()
    if not clean_id:
        raise HTTPException(status_code=422, detail="Machine ID cannot be empty.")
    
    # 1. Uniqueness check
    existing = db.query(Machine).filter(Machine.machine_id == clean_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Machine with ID '{clean_id}' already exists in the system."
        )

    # 2. Check serial number uniqueness if provided
    if payload.serial_number and payload.serial_number.strip():
        sn = payload.serial_number.strip()
        existing_sn = db.query(Machine).filter(Machine.serial_number == sn).first()
        if existing_sn:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A machine with serial number '{sn}' is already registered ({existing_sn.machine_id})."
            )

    try:
        # 3. Create machine record with appropriate onboarding status
        new_machine = Machine(
            machine_id=clean_id,
            machine_type=payload.machine_type.strip(),
            machine_name=payload.machine_name.strip() if payload.machine_name else f"{payload.machine_type} {clean_id}",
            installation_date=payload.installation_date,
            status=payload.status or "Awaiting Data",
            manufacturer=payload.manufacturer.strip() if payload.manufacturer else None,
            model_number=payload.model_number.strip() if payload.model_number else None,
            serial_number=payload.serial_number.strip() if payload.serial_number else None,
            plant=payload.plant.strip() if payload.plant else None,
            production_line=payload.production_line.strip() if payload.production_line else None,
            location=payload.location.strip() if payload.location else None,
            description=payload.description.strip() if payload.description else None,
            specifications=payload.specifications or {},
            operational_settings=payload.operational_settings or {},
            sensor_config=payload.sensor_config or {},
        )
        db.add(new_machine)
        db.flush()

        # 4. Save any initial maintenance history records provided during wizard
        maint_list = payload.initial_maintenance_history or payload.initial_maintenance_records
        if maint_list:
            for item in maint_list:
                m_date_raw = item.get("maintenance_date")
                if m_date_raw:
                    try:
                        m_date = datetime.fromisoformat(str(m_date_raw))
                    except Exception:
                        m_date = datetime.now()
                else:
                    m_date = datetime.now()

                m_rec = MaintenanceRecord(
                    machine_id=clean_id,
                    maintenance_date=m_date,
                    maintenance_type=item.get("maintenance_type", "PREVENTIVE"),
                    component=item.get("component", "General System"),
                    description=item.get("description", "Commissioning baseline recorded during machine registration."),
                    action_taken=item.get("action_taken", "Inspection and verification"),
                    sop_code=item.get("sop_code", "SOP-COMMISSIONING-01"),
                    technician_notes=item.get("technician_notes"),
                )
                db.add(m_rec)

        db.commit()
        db.refresh(new_machine)

        # Invalidate fleet-level overview caches so new machine reflects immediately
        invalidate_fleet_caches()

        response = MachineResponse.from_orm(new_machine)
        response.total_readings = 0
        response.monitoring_readiness = "Awaiting Data"
        return response

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register machine: {str(e)}"
        )

@app.put("/api/v1/machines/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: str, payload: MachineUpdate, db: Session = Depends(get_db)):
    """Update metadata and technical configuration for an existing machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")

    for field, val in payload.dict(exclude_unset=True).items():
        if val is not None:
            setattr(machine, field, val)

    machine.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(machine)
    invalidate_fleet_caches()
    return machine

@app.post("/api/v1/machines/{machine_id}/import-readings-csv")
async def import_machine_sensor_csv(
    machine_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Import historical sensor telemetry CSV for a registered machine.
    Validates CSV schema (timestamp, vibration, temperature) and populates sensor_readings.
    Triggers predictive health pipeline once data threshold is satisfied.
    """
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found.")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="Only CSV files are supported.")

    try:
        import io
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        # Check required columns
        required_cols = {"temperature", "vibration_magnitude"}
        if not required_cols.issubset(set(df.columns)):
            # Check for alternative vibration columns (e.g. vibration_x, y, z)
            if not ("vibration_x" in df.columns or "vibration" in df.columns):
                raise HTTPException(
                    status_code=422,
                    detail=f"CSV is missing required sensor columns. Required: temperature and vibration_magnitude (or vibration_x)."
                )

        imported_count = 0
        for _, row in df.iterrows():
            ts_val = row.get("timestamp")
            if pd.isna(ts_val):
                ts = datetime.utcnow()
            else:
                try:
                    ts = datetime.fromisoformat(str(ts_val))
                except Exception:
                    ts = datetime.utcnow()

            temp = float(row.get("temperature", 65.0))
            vx = float(row.get("vibration_x", 0.0))
            vy = float(row.get("vibration_y", 0.0))
            vz = float(row.get("vibration_z", 0.0))
            vm = float(row.get("vibration_magnitude", (vx**2 + vy**2 + vz**2)**0.5 if (vx or vy or vz) else 1.2))

            reading = SensorReading(
                machine_id=machine_id,
                timestamp=ts,
                temperature=temp,
                vibration_x=vx,
                vibration_y=vy,
                vibration_z=vz,
                vibration_magnitude=vm,
                load_percent=float(row.get("load_percent", 75.0)) if "load_percent" in row and not pd.isna(row["load_percent"]) else None,
                rotational_speed=float(row.get("rotational_speed", 1450.0)) if "rotational_speed" in row and not pd.isna(row["rotational_speed"]) else None,
                operating_hours=float(row.get("operating_hours", 100.0 + imported_count)),
            )
            db.add(reading)
            imported_count += 1

        db.commit()

        # Update machine status to Active/Monitoring
        machine.status = "active"
        db.commit()

        # If we have at least 10 readings, automatically run predictive analysis pipeline
        pipeline_executed = False
        try:
            if imported_count >= 10:
                db_pipeline_service.process_and_persist_machine_decision(db, machine_id)
                pipeline_executed = True
        except Exception:
            pass

        invalidate_fleet_caches()

        return {
            "machine_id": machine_id,
            "imported_readings": imported_count,
            "pipeline_executed": pipeline_executed,
            "monitoring_status": "Monitoring Active" if pipeline_executed else "Ready for Analysis",
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to parse and import CSV: {str(e)}")

@app.get("/api/v1/machines/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    """Get metadata for a specific machine."""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found in database.")
    
    reading_count = db.query(SensorReading).filter(SensorReading.machine_id == machine_id).count()
    res = MachineResponse.from_orm(machine)
    res.total_readings = reading_count
    res.monitoring_readiness = "Monitoring Active" if reading_count >= 10 else "Ready for Analysis" if reading_count > 0 else "Awaiting Data"
    return res

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
    
    reading_count = db.query(SensorReading).filter(SensorReading.machine_id == machine_id).count()
    if reading_count == 0:
        return {
            "machine_id": machine.machine_id,
            "machine_type": machine.machine_type,
            "timestamp": datetime.utcnow().isoformat(),
            "monitoring_readiness": "Awaiting Data",
            "current_condition": {
                "health_score": 100.0,
                "health_state": None,
                "health_state_label": "Awaiting Data",
                "anomaly_status": False,
                "anomaly_score": None,
                "degradation_status": "Insufficient history",
                "degradation_rate": None,
                "rul_hours": None,
                "temperature_mean": None,
                "vibration_magnitude_mean": None,
            },
            "risk_assessment": {
                "risk_score": 0.0,
                "risk_level": "PENDING",
                "maintenance_priority": "None",
                "maintenance_time_window": "Awaiting initial readings",
                "risk_factors": {},
            },
            "measured_evidence": {
                "temperature": None,
                "vibration_x": None,
                "vibration_y": None,
                "vibration_z": None,
                "vibration_magnitude": None,
                "operational_hours": 0.0,
                "load_percent": None,
                "rotational_speed": None,
            },
            "calculated_evidence": {
                "health_score": 100.0,
                "health_state_label": "Awaiting Data",
                "anomaly_detected": False,
                "anomaly_score": None,
                "degradation_status": "Insufficient history",
                "degradation_slope": None,
                "rul_hours": None,
                "risk_score": 0.0,
                "risk_level": "PENDING",
                "maintenance_priority": "None",
                "estimated_maintenance_time_window": "Awaiting telemetry",
            },
            "retrieved_documentary_evidence": [],
            "generated_explanation": {
                "summary": f"Machine {machine.machine_id} ({machine.machine_type}) is registered and awaiting initial sensor telemetry.",
                "key_findings": ["No telemetry stream ingested yet. Machine is in initial provisioning."],
                "recommended_action": "Attach telemetry streaming sensors or upload a baseline CSV to initiate real-time predictive monitoring.",
            }
        }

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

    # 1. Fetch fleet-wide context for fleet-level questions
    critical_machines_list = []
    fleet_summary = None
    try:
        # Get latest records ordered by timestamp and score, deduplicate by machine_id
        critical_records = db.query(RiskRecord).filter(
            RiskRecord.risk_level.in_(["CRITICAL", "HIGH"])
        ).order_by(RiskRecord.timestamp.desc(), RiskRecord.risk_score.desc()).limit(30).all()
        seen_ids = set()
        for r in critical_records:
            if r.machine_id in seen_ids:
                continue
            seen_ids.add(r.machine_id)
            h = db.query(HealthRecord).filter(
                HealthRecord.machine_id == r.machine_id
            ).order_by(HealthRecord.timestamp.desc()).first()
            s = db.query(SensorReading).filter(
                SensorReading.machine_id == r.machine_id
            ).order_by(SensorReading.timestamp.desc()).first()
            critical_machines_list.append({
                "machine_id": r.machine_id,
                "risk_level": r.risk_level,
                "risk_score": r.risk_score,
                "priority": r.maintenance_priority,
                "time_window": r.maintenance_window,
                "health_score": h.health_score if h else None,
                "rul_hours": h.rul_hours if h else None,
                "vibration_magnitude": s.vibration_magnitude if s else None,
                "temperature": s.temperature if s else None,
            })
    except Exception:
        pass

    # If DB was empty, fallback to dataset evaluation
    if not critical_machines_list and not dataset_df.empty:
        try:
            fl_health = health_engine.evaluate_fleet(dataset_df)
            fl_risk = risk_engine.evaluate_fleet_risk(fl_health)
            seen_df_ids = set()
            for r in fl_risk:
                m_id = r.get("machine_id")
                if not m_id or m_id in seen_df_ids:
                    continue
                if r.get("risk_level") in ["CRITICAL", "HIGH"]:
                    seen_df_ids.add(m_id)
                    hs = r.get("health_summary", {})
                    ks = hs.get("key_sensors", {})
                    critical_machines_list.append({
                        "machine_id": m_id,
                        "risk_level": r["risk_level"],
                        "risk_score": r["risk_score"],
                        "priority": r["maintenance_priority"],
                        "time_window": r["estimated_maintenance_time_window"],
                        "health_score": hs.get("health_score"),
                        "rul_hours": hs.get("rul_hours"),
                        "vibration_magnitude": ks.get("vibration_magnitude"),
                        "temperature": ks.get("temperature"),
                    })
        except Exception:
            pass

    # Sort machines by risk_score descending
    critical_machines_list.sort(key=lambda x: x.get("risk_score") or 0, reverse=True)

    # 2. Try LLM Generation (Hugging Face / Gemini)
    from backend.app.services.recommendation.llm_client import GroundedLLMClient
    llm_client = GroundedLLMClient()
    llm_result = llm_client.generate_chat_response(
        query=req.query,
        machine_context=machine_ctx,
        retrieved_documents=hits,
        fleet_overview=fleet_summary,
        top_critical_machines=critical_machines_list,
    )

    suggested_actions = []

    if llm_result:
        resp_text = llm_result["text"]
        model_source = llm_result["model_used"]
        if critical_machines_list:
            suggested_actions.append(f"Inspect {critical_machines_list[0]['machine_id']} ({critical_machines_list[0]['priority']})")
            suggested_actions.append("Review bearing disassembly procedure (SOP-MECH-04)")
        else:
            suggested_actions.append("Conduct standard shift inspection")
    else:
        # High-Fidelity Domain Expert Reasoning Engine
        model_source = "Industrial RAG Rule Engine"
        q_clean = req.query.strip().lower()

        # Check Intent Categories
        is_greeting = q_clean in ["hi", "hello", "hey", "good morning", "good afternoon", "greetings", "help", "who are you", "what can you do"] or any(q_clean.startswith(w) for w in ["hi ", "hello ", "hey "])
        is_fleet_query = any(k in q_clean for k in ["attention", "which machine", "first", "average", "urgent", "critical", "overview", "fleet", "all machines", "hours left", "status of machines", "who needs"])
        
        # Check if query specifically targets a machine code like TXM-xxx
        import re
        machine_match = re.search(r"TXM-\d{3}", req.query, re.IGNORECASE)
        targeted_machine_id = machine_match.group(0).upper() if machine_match else None

        if is_greeting:
            crit_count = len(critical_machines_list)
            top_m = critical_machines_list[0] if critical_machines_list else None
            top_summary = f"**{top_m['machine_id']}** is currently highest priority ({top_m['vibration_magnitude']:.2f} mm/s vibration, {top_m['temperature']:.1f}\u00b0C)." if top_m else "All monitored machines are within baseline parameters."

            resp_text = (
                f"### Factory Floor Assistant Active\n\n"
                f"Hello! I am RESONEX AI, monitoring real-time telemetry across the factory floor.\n\n"
                f"**Current Status:**\n"
                f"- **{crit_count} machines** currently require maintenance attention.\n"
                f"- {top_summary}\n\n"
                f"**Quick things you can ask me:**\n"
                f"- *\"Which machines need attention first?\"* — see ranked priority list.\n"
                f"- Select any machine in the dropdown above to view its health score and live telemetry.\n"
                f"- *\"What are the safe vibration thresholds under ISO 10816?\"* — see tolerance standards.\n"
                f"- *\"How do I replace spindle bearings?\"* — see step-by-step repair guide (SOP-MECH-04)."
            )
            suggested_actions = [
                "Which machines need attention first?",
                "What are safe vibration limits in ISO 10816?",
                "How do I replace spindle bearings (SOP-MECH-04)?"
            ]

        elif is_fleet_query and critical_machines_list:
            top_lines = []
            for i, m in enumerate(critical_machines_list[:4], 1):
                top_lines.append(
                    f"{i}. **{m['machine_id']}** — **{m['risk_level']} ({m['priority']})**\n"
                    f"   - **Health**: {m['health_score']:.0f}/100 | **Time Left**: ~{m['rul_hours']:.0f} hours\n"
                    f"   - **Telemetry**: Vibration: **{m['vibration_magnitude']:.2f} mm/s** \u00b7 Temp: **{m['temperature']:.1f}\u00b0C**"
                )
            top_machines_str = "\n\n".join(top_lines)

            resp_text = (
                f"### Shift Maintenance Priorities\n\n"
                f"Currently, **{len(critical_machines_list)} unique machines** require maintenance attention before the current shift ends.\n\n"
                f"{top_machines_str}\n\n"
                f"**Recommended Shift Actions:**\n"
                f"1. **Primary**: Dispatch a technician to **{critical_machines_list[0]['machine_id']}** to inspect spindle bearing acoustics and lubrication (SOP-MECH-04).\n"
                f"2. **Secondary**: Check thermal readings and airflow on **{critical_machines_list[1]['machine_id'] if len(critical_machines_list) > 1 else 'flagged units'}** to prevent thermal seizure.\n"
                f"3. Select any machine in the context menu above for a deep-dive sensor breakdown."
            )
            suggested_actions = [
                f"Dispatch technician to {critical_machines_list[0]['machine_id']} (P1 Immediate)",
                "Review spindle bearing disassembly guide (SOP-MECH-04)",
                "Verify cooling airflow and temperature on flagged units"
            ]

        elif machine_ctx:
            doc_info = f"\n\n**Applicable Standard ({hits[0]['title']})**:\n> {hits[0]['content'][:300]}..." if hits else ""
            resp_text = (
                f"### Diagnostic Report: {machine_ctx['machine_id']} ({machine_ctx['machine_type']})\n\n"
                f"- **Condition State**: **{machine_ctx.get('health_state', 'Normal').upper()}** (Health Score: **{machine_ctx.get('health_score', 0):.1f} / 100**)\n"
                f"- **Operational Risk**: **{machine_ctx.get('risk_level', 'LOW')}** (Priority: **{machine_ctx.get('priority', 'P3')}**)\n"
                f"- **Estimated Time Remaining**: **~{machine_ctx.get('rul_hours', 0):.1f} hours** until maintenance required\n"
                f"- **Live Telemetry**: Vibration: **{machine_ctx.get('vibration_magnitude', 0):.2f} mm/s** \u00b7 Temperature: **{machine_ctx.get('temperature', 0):.1f}\u00b0C**\n"
                f"{doc_info}\n\n"
                f"**Recommended Technician Actions:**\n"
                f"1. Check bearing housing for excessive heat or abnormal acoustic rattling.\n"
                f"2. Verify grease condition and replenish using ISO VG 100 grease (SOP-LUB-02).\n"
                f"3. If vibration exceeds 1.1 mm/s after lubrication, schedule bearing replacement (SOP-MECH-04)."
            )
            suggested_actions = [
                f"Inspect bearing lubrication on {machine_ctx['machine_id']} (SOP-LUB-02)",
                "Conduct stethoscope acoustic vibration check",
                "Review bearing replacement guide (SOP-MECH-04)"
            ]

        elif hits and any(k in q_clean for k in ["how", "procedure", "sop", "step", "bearing", "replace", "vibration", "limit", "iso", "standard", "guide"]):
            primary_doc = hits[0]
            resp_text = (
                f"### Procedure: {primary_doc['title']}\n\n"
                f"**Source**: `{primary_doc['source_document']}` — Section: *{primary_doc['section']}*\n\n"
                f"{primary_doc['content']}\n\n"
            )
            if len(hits) > 1:
                resp_text += (
                    f"**Supplementary Specification ({hits[1]['title']})**:\n"
                    f"{hits[1]['content'][:300]}...\n\n"
                )
            resp_text += "**Safety Reminder**: Always complete Lockout/Tagout (LOTO) and verify zero stored mechanical energy before maintenance."
            suggested_actions = [
                f"Follow procedures in {primary_doc['title']}",
                "Review ISO 10816 vibration severity limits",
                "Ensure Lockout/Tagout (LOTO) compliance"
            ]

        else:
            resp_text = (
                f"### Resonex AI Maintenance Copilot\n\n"
                f"I am ready to assist with real-time equipment diagnostics, maintenance scheduling, and factory repair guides.\n\n"
                f"**You can ask me:**\n"
                f"- *\"Which machines need attention first?\"* — see the shift's urgent machines.\n"
                f"- *\"What are the bearing replacement steps?\"* — view standard repair procedures.\n"
                f"- *\"What are the vibration limits under ISO 10816?\"* — inspect threshold criteria.\n\n"
                f"You can also select any specific asset from the dropdown above to analyze its live sensor telemetry."
            )
            suggested_actions = [
                "Which machines need attention first?",
                "What are safe vibration limits in ISO 10816?",
                "Review spindle bearing disassembly guide (SOP-MECH-04)"
            ]

    return RagChatResponse(
        query=req.query,
        response=resp_text,
        machine_id=req.machine_id,
        machine_context=machine_ctx,
        cited_documents=hits,
        suggested_actions=suggested_actions,
        confidence=0.95 if critical_machines_list or hits else 0.85,
        source=model_source
    )


# ---------------------------------------------------------
# User Profile & Account Management API Endpoints
# ---------------------------------------------------------

def get_or_create_default_user(db: Session) -> User:
    """
    Retrieves the active user session or seeds the default shift supervisor
    profile if the users table is unpopulated.
    """
    user = db.query(User).order_by(User.id.asc()).first()
    if not user:
        user = User(
            email="mark.jenkins@resonex.internal",
            full_name="Mark Jenkins",
            display_name="Operator Jenkins",
            phone_number="+1 (555) 382-9401",
            job_title="Lead Monitorer / Shift Supervisor",
            department="Predictive Maintenance & Reliability Engineering",
            plant_assignment="Plant Alpha (Sector C Machining & Spinning)",
            preferred_language="en",
            role="Shift Supervisor",
            account_status="Active",
            avatar_url="/operations_manager_avatar.png",
            hashed_password=hash_password("Operator@2026!"),
            auth_provider="Resonex Local Identity",
            preferences={
                "theme": "dark",
                "preferred_dashboard": "/overview",
                "language": "en",
                "timezone": "UTC+05:30 (Asia/Kolkata)",
                "email_alerts": True,
                "sms_alerts": False,
                "critical_push": True,
                "sound_effects": True,
            },
            last_login=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_current_user(db: Session = Depends(get_db)) -> User:
    """Authentication dependency returning the verified current user session."""
    return get_or_create_default_user(db)


@app.get("/api/v1/users/me", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile and account information."""
    return current_user


@app.patch("/api/v1/users/me", response_model=UserResponse)
def update_user_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update permitted fields on the authenticated user's profile.
    Prevents mass assignment of privileged fields (role, account_status, id).
    Enforces email uniqueness if email is changed.
    """
    # 1. Validate email uniqueness if changing email
    if payload.email is not None:
        clean_email = payload.email.strip().lower()
        if not clean_email or "@" not in clean_email:
            raise HTTPException(status_code=400, detail="Invalid email address format.")
        
        if clean_email != current_user.email.lower():
            existing = db.query(User).filter(User.email.ilike(clean_email), User.id != current_user.id).first()
            if existing:
                raise HTTPException(status_code=409, detail=f"Email '{clean_email}' is already registered to another account.")
            current_user.email = clean_email

    # 2. Update editable personal information
    if payload.full_name is not None:
        val = payload.full_name.strip()
        if len(val) < 2:
            raise HTTPException(status_code=400, detail="Full name must be at least 2 characters.")
        current_user.full_name = val

    if payload.display_name is not None:
        current_user.display_name = payload.display_name.strip() or None

    if payload.phone_number is not None:
        current_user.phone_number = payload.phone_number.strip() or None

    if payload.job_title is not None:
        current_user.job_title = payload.job_title.strip() or None

    if payload.department is not None:
        current_user.department = payload.department.strip() or None

    if payload.plant_assignment is not None:
        current_user.plant_assignment = payload.plant_assignment.strip() or None

    if payload.preferred_language is not None:
        current_user.preferred_language = payload.preferred_language.strip() or "en"

    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() or None

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/api/v1/users/me/preferences")
def get_user_preferences(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    """Retrieve individual account preferences for the authenticated operator."""
    return current_user.preferences or {}


@app.patch("/api/v1/users/me/preferences")
def update_user_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Update and persist personal account preferences (theme, notification toggles, language, dashboard)."""
    current_prefs = dict(current_user.preferences or {})
    
    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        if val is not None:
            current_prefs[key] = val

    current_user.preferences = current_prefs
    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user.preferences


@app.post("/api/v1/users/me/change-password")
def change_user_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Secure password change endpoint.
    Verifies current password on the server against stored salted PBKDF2 hash.
    Enforces minimum 8-character length and matching confirmation.
    """
    if req.new_password != req.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation password do not match.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    # Verify existing password
    if current_user.hashed_password:
        if not verify_password(req.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="The current password you entered is incorrect.")

    # Hash new password securely with random salt and 100,000 PBKDF2 iterations
    current_user.hashed_password = hash_password(req.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Password changed successfully. Your account is secured with the new credentials."
    }


@app.post("/api/v1/users/me/sign-out")
def sign_out_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sign out the current active session."""
    current_user.last_login = datetime.utcnow()
    db.commit()
    return {
        "success": True,
        "message": "Session ended successfully. You have been signed out."
    }





