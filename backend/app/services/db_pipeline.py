from datetime import datetime
from typing import Any, Dict, List, Optional
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    HealthRecord, Machine, RecommendationRecord, RiskRecord, SensorReading
)
from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.rag.retriever import ContextAwareRetriever
from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
from backend.app.services.risk_engine import MaintenanceRiskEngine

class DatabasePipelineService:
    """
    Orchestrates the data flow:
    PostgreSQL -> Historical Sensor Telemetry -> Stage 6 (Health) -> Stage 7 (Risk)
               -> Stage 8 (RAG) -> Stage 9 (Recommendation) -> PostgreSQL Persistence
    """
    def __init__(
        self,
        health_engine: Optional[AdaptiveHealthEngine] = None,
        risk_engine: Optional[MaintenanceRiskEngine] = None,
        retriever: Optional[ContextAwareRetriever] = None,
        rec_engine: Optional[MaintenanceRecommendationEngine] = None,
    ):
        self.health_engine = health_engine or AdaptiveHealthEngine()
        self.risk_engine = risk_engine or MaintenanceRiskEngine()
        self.retriever = retriever or ContextAwareRetriever()
        self.rec_engine = rec_engine or MaintenanceRecommendationEngine(
            health_engine=self.health_engine,
            risk_engine=self.risk_engine,
            retriever=self.retriever,
        )

    def load_machine_dataframe(self, db: Session, machine_id: str) -> pd.DataFrame:
        """Loads historical sensor readings for a machine from DB, sorted chronologically."""
        readings = (
            db.query(SensorReading)
            .filter(SensorReading.machine_id == machine_id)
            .order_by(SensorReading.timestamp.asc())
            .all()
        )
        if not readings:
            return pd.DataFrame()

        machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
        machine_type = machine.machine_type if machine else "Unknown"

        rows = []
        for r in readings:
            rows.append({
                "machine_id": r.machine_id,
                "timestamp": r.timestamp,
                "machine_type": machine_type,
                "temperature": r.temperature,
                "vibration_x": r.vibration_x,
                "vibration_y": r.vibration_y,
                "vibration_z": r.vibration_z,
                "vibration_magnitude": r.vibration_magnitude,
                "load_percent": r.load_percent or 0.0,
                "rotational_speed": r.rotational_speed or 0.0,
                "operating_hours": r.operating_hours,
                "machine_age_years": 3.0,
                "maintenance_count": 0,
            })
        return pd.DataFrame(rows)

    def process_and_persist_machine_decision(self, db: Session, machine_id: str) -> Dict[str, Any]:
        """Runs the intelligence pipeline on stored DB telemetry and persists outputs to DB."""
        df = self.load_machine_dataframe(db, machine_id)
        if df.empty:
            raise ValueError(f"No telemetry records found in database for machine {machine_id}")

        # 1. Stage 6 Health Assessment
        health_res = self.health_engine.evaluate_machine(df)

        # 2. Stage 7 Risk Assessment
        risk_res = self.risk_engine.calculate_risk(health_res)

        # 3. Stage 8 Context-Aware RAG
        rag_context = self.retriever.retrieve_evidence_for_machine(risk_res)

        # 4. Stage 9 Recommendation Decision
        rec_decision = self.rec_engine.generate_recommendation_from_context(rag_context)

        # 5. Persist to DB within a managed transaction
        ts_val = df["timestamp"].iloc[-1]
        if isinstance(ts_val, str):
            ts_dt = datetime.fromisoformat(ts_val)
        else:
            ts_dt = ts_val

        # Persist Health
        health_rec = HealthRecord(
            machine_id=machine_id,
            timestamp=ts_dt,
            health_score=health_res["health_score"],
            health_state=health_res["health_state"],
            health_state_label=health_res["health_state_label"],
            anomaly_status=health_res["anomaly_status"],
            anomaly_score=health_res["anomaly_score"],
            degradation_status=health_res["degradation_status"],
            degradation_rate=health_res["degradation_rate"],
            rul_hours=health_res["rul_hours"],
            rul_uncertainty_std=health_res.get("rul_uncertainty_std"),
            rul_confidence_lower=health_res.get("rul_confidence_lower"),
            rul_confidence_upper=health_res.get("rul_confidence_upper"),
            rul_uncertainty_score=health_res.get("rul_uncertainty_score"),
            fft_energy_ratio=health_res.get("fft_energy_ratio"),
            dominant_frequency_hz=health_res.get("dominant_frequency_hz"),
        )
        db.add(health_rec)

        # Persist Risk
        risk_rec = RiskRecord(
            machine_id=machine_id,
            timestamp=ts_dt,
            risk_score=risk_res["risk_score"],
            risk_level=risk_res["risk_level"],
            maintenance_priority=risk_res["maintenance_priority"],
            maintenance_window=risk_res["estimated_maintenance_time_window"],
            risk_factors=risk_res["risk_factors"],
        )
        db.add(risk_rec)

        # Persist Recommendation
        rec_rec = RecommendationRecord(
            machine_id=machine_id,
            timestamp=ts_dt,
            condition_summary=rec_decision["current_condition"],
            health_score=rec_decision["current_condition"]["health_score"],
            health_state=rec_decision["current_condition"]["health_state_label"],
            rul_hours=rec_decision["current_condition"]["rul_hours"],
            risk_score=rec_decision["risk_assessment"]["risk_score"],
            risk_level=rec_decision["risk_assessment"]["risk_level"],
            maintenance_priority=rec_decision["risk_assessment"]["maintenance_priority"],
            maintenance_window=rec_decision["risk_assessment"]["maintenance_time_window"],
            potential_causes=rec_decision["generated_explanation"]["potential_causes"],
            recommended_actions=rec_decision["generated_explanation"]["recommended_actions"],
            reasoning=rec_decision["generated_explanation"]["reasoning"],
            confidence=rec_decision["generated_explanation"]["confidence"],
            measured_evidence=rec_decision["measured_evidence"],
            calculated_evidence=rec_decision["calculated_evidence"],
            retrieved_documentary_evidence=rec_decision["retrieved_documentary_evidence"],
            source_traceability=rec_decision["source_traceability"],
        )
        db.add(rec_rec)
        db.commit()

        return rec_decision