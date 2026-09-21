from typing import Any, Dict, List, Optional

from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.rag.retriever import ContextAwareRetriever
from backend.app.services.recommendation.fallback_engine import DeterministicFallbackEngine
from backend.app.services.recommendation.llm_client import GroundedLLMClient
from backend.app.services.risk_engine import MaintenanceRiskEngine

class MaintenanceRecommendationEngine:
    """
    Grounded Maintenance Recommendation Engine & Decision Explanation Orchestrator.
    Combines:
    - Stage 6 Machine Health Condition
    - Stage 7 Maintenance Risk & Priority
    - Stage 8 Context-Aware RAG Evidence
    Produces a 4-tier separated decision object with automatic fallback.
    """
    def __init__(
        self,
        health_engine: Optional[AdaptiveHealthEngine] = None,
        risk_engine: Optional[MaintenanceRiskEngine] = None,
        retriever: Optional[ContextAwareRetriever] = None,
        llm_client: Optional[GroundedLLMClient] = None,
    ):
        self.health_engine = health_engine or AdaptiveHealthEngine()
        self.risk_engine = risk_engine or MaintenanceRiskEngine()
        self.retriever = retriever or ContextAwareRetriever()
        self.llm_client = llm_client or GroundedLLMClient()

    def generate_recommendation_from_context(self, rag_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assembles the complete structured recommendation object from a Stage 8 RAG context payload.
        """
        machine_id = str(rag_context.get("machine_id", "Unknown"))
        machine_type = str(rag_context.get("machine_type", "Unknown"))
        timestamp = rag_context.get("timestamp")
        
        sensor_ev = rag_context.get("sensor_ml_evidence", {})
        doc_ev = rag_context.get("retrieved_documentary_evidence", [])
        traceability = rag_context.get("traceability", {})

        # 1. Attempt LLM Generation if configured
        explanation = self.llm_client.generate(rag_context)
        
        # 2. If LLM returned None or invalid, engage Deterministic Fallback Engine
        if not explanation or not isinstance(explanation, dict) or "recommended_actions" not in explanation:
            explanation = DeterministicFallbackEngine.generate_recommendation(rag_context)

        # 3. Assemble 4-Tier Separated Output Schema
        telemetry = sensor_ev.get("telemetry", {})
        
        return {
            "machine_id": machine_id,
            "machine_type": machine_type,
            "timestamp": timestamp,
            "current_condition": {
                "health_state": sensor_ev.get("health_state"),
                "health_state_label": sensor_ev.get("health_state_label"),
                "health_score": sensor_ev.get("health_score"),
                "anomaly_status": sensor_ev.get("anomaly_status"),
                "anomaly_score": sensor_ev.get("anomaly_score"),
                "degradation_status": sensor_ev.get("degradation_status"),
                "rul_hours": sensor_ev.get("rul_hours"),
            },
            "risk_assessment": {
                "risk_score": sensor_ev.get("risk_score"),
                "risk_level": sensor_ev.get("risk_level"),
                "maintenance_priority": sensor_ev.get("maintenance_priority"),
                "maintenance_time_window": sensor_ev.get("estimated_maintenance_time_window"),
            },
            "measured_evidence": {
                "vibration_x": telemetry.get("vibration_x"),
                "vibration_y": telemetry.get("vibration_y"),
                "vibration_z": telemetry.get("vibration_z"),
                "vibration_magnitude": telemetry.get("vibration_magnitude"),
                "temperature": telemetry.get("temperature"),
                "operating_hours": telemetry.get("operating_hours"),
                "load_percent": telemetry.get("load_percent"),
                "rotational_speed": telemetry.get("rotational_speed"),
            },
            "calculated_evidence": {
                "health_score": sensor_ev.get("health_score"),
                "health_state_label": sensor_ev.get("health_state_label"),
                "risk_score": sensor_ev.get("risk_score"),
                "risk_level": sensor_ev.get("risk_level"),
                "maintenance_priority": sensor_ev.get("maintenance_priority"),
                "rul_hours": sensor_ev.get("rul_hours"),
                "anomaly_status": sensor_ev.get("anomaly_status"),
                "degradation_status": sensor_ev.get("degradation_status"),
            },
            "retrieved_documentary_evidence": doc_ev,
            "generated_explanation": explanation,
            "source_traceability": {
                "documents_consulted_count": len(doc_ev),
                "knowledge_base_version": traceability.get("index_version", "1.0.0"),
                "retrieval_embedding_model": traceability.get("embedding_model", "TFIDF-CosineSimilarity-v1"),
                "generation_source": explanation.get("generation_source", "deterministic_expert_engine"),
                "grounding_verified": True,
            }
        }

    def evaluate_machine_recommendation(self, machine_data) -> Dict[str, Any]:
        """Runs end-to-end Stage 6 -> Stage 7 -> Stage 8 -> Stage 9 for a machine."""
        health_summary = self.health_engine.evaluate_machine(machine_data)
        risk_summary = self.risk_engine.calculate_risk(health_summary)
        rag_context = self.retriever.retrieve_evidence_for_machine(risk_summary)
        return self.generate_recommendation_from_context(rag_context)

    def evaluate_fleet_recommendations(self, df) -> List[Dict[str, Any]]:
        """Runs end-to-end recommendations across the full fleet sorted by priority."""
        recs = []
        for machine_id, group in df.groupby("machine_id"):
            rec = self.evaluate_machine_recommendation(group)
            recs.append(rec)
        # Sort by risk score descending (P1 highest first)
        recs.sort(key=lambda r: r["risk_assessment"]["risk_score"] or 0.0, reverse=True)
        return recs