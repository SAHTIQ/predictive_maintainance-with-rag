import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.rag.retriever import ContextAwareRetriever
from backend.app.services.recommendation.engine import MaintenanceRecommendationEngine
from backend.app.services.recommendation.fallback_engine import DeterministicFallbackEngine
from backend.app.services.recommendation.llm_client import GroundedLLMClient
from backend.app.services.risk_engine import MaintenanceRiskEngine
from backend.ml.data.loader import load_dataset

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

@pytest.fixture(scope="module")
def rec_engine():
    return MaintenanceRecommendationEngine()

@pytest.fixture(scope="module")
def dataset():
    return load_dataset()

# 1. Normal machine
def test_normal_machine_recommendation(rec_engine):
    mock_rag_context = {
        "machine_id": "M_NORMAL",
        "machine_type": "TypeA",
        "timestamp": "2025-01-14T03:30:00",
        "sensor_ml_evidence": {
            "health_score": 96.0,
            "health_state_label": "Good",
            "risk_score": 10.0,
            "risk_level": "VERY_LOW",
            "maintenance_priority": "P5_SCHEDULED_MONITORING",
            "estimated_maintenance_time_window": "Next routine maintenance interval",
            "rul_hours": 250.0,
            "anomaly_status": False,
            "degradation_status": "STABLE",
            "telemetry": {
                "vibration_x": 0.22,
                "vibration_y": 0.25,
                "vibration_z": 0.20,
                "vibration_magnitude": 0.38,
                "temperature": 52.0,
            }
        },
        "retrieved_documentary_evidence": [
            {
                "title": "TypeA Manual",
                "source_document": "knowledge_base/manuals/machine_manuals.md",
                "content": "Normal limits: vibration under 1.1 mm/s, temperature under 70C.",
                "relevance_score": 0.85
            }
        ]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert rec["risk_assessment"]["risk_level"] == "VERY_LOW"
    assert rec["risk_assessment"]["maintenance_priority"] == "P5_SCHEDULED_MONITORING"
    action_text = rec["generated_explanation"]["recommended_actions"][0]["action"].lower()
    assert any(term in action_text for term in ["routine", "standard", "scheduled"])

# 2. Warning machine
def test_warning_machine_recommendation(rec_engine):
    mock_rag_context = {
        "machine_id": "M_WARN",
        "machine_type": "TypeC",
        "sensor_ml_evidence": {
            "health_score": 65.0,
            "health_state_label": "Warning",
            "risk_score": 52.0,
            "risk_level": "MEDIUM",
            "maintenance_priority": "P3_MEDIUM",
            "estimated_maintenance_time_window": "Within 24 - 72 operating hours",
            "rul_hours": 55.0,
            "anomaly_status": False,
            "degradation_status": "MODERATE_DEGRADATION",
            "telemetry": {
                "vibration_magnitude": 1.15,
                "vibration_z": 0.85,
                "temperature": 68.0,
            }
        },
        "retrieved_documentary_evidence": [
            {
                "title": "Shaft Alignment SOP",
                "source_document": "knowledge_base/procedures/maintenance_procedures.md",
                "content": "Laser alignment protocol SOP-ALIGN-02.",
                "relevance_score": 0.80
            }
        ]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert rec["risk_assessment"]["risk_level"] == "MEDIUM"
    assert any("misalignment" in c["cause"].lower() or "bearing" in c["cause"].lower() for c in rec["generated_explanation"]["potential_causes"])

# 3. Critical machine
def test_critical_machine_recommendation(rec_engine):
    mock_rag_context = {
        "machine_id": "M_CRIT",
        "machine_type": "TypeA",
        "sensor_ml_evidence": {
            "health_score": 25.0,
            "health_state_label": "Critical",
            "risk_score": 90.0,
            "risk_level": "CRITICAL",
            "maintenance_priority": "P1_IMMEDIATE",
            "estimated_maintenance_time_window": "Within 0 - 12 operating hours",
            "rul_hours": 4.0,
            "anomaly_status": True,
            "degradation_status": "RAPID_DEGRADATION",
            "telemetry": {
                "vibration_magnitude": 1.55,
                "temperature": 82.0,
            }
        },
        "retrieved_documentary_evidence": [
            {
                "title": "Bearing SOP",
                "source_document": "knowledge_base/procedures/maintenance_procedures.md",
                "content": "Lockout/tagout and bearing replacement SOP-MECH-04.",
                "relevance_score": 0.90
            }
        ]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert rec["risk_assessment"]["risk_level"] == "CRITICAL"
    assert rec["risk_assessment"]["maintenance_priority"] == "P1_IMMEDIATE"
    assert any("LOTO" in a["action"] or "Lockout" in a["action"] for a in rec["generated_explanation"]["recommended_actions"])

# 4. Low RUL condition
def test_low_rul_condition(rec_engine):
    mock_rag_context = {
        "machine_id": "M_LOW_RUL",
        "sensor_ml_evidence": {
            "rul_hours": 5.0,
            "telemetry": {"vibration_magnitude": 1.3, "temperature": 70.0}
        },
        "retrieved_documentary_evidence": [{"title": "Bearing SOP", "content": "SOP-MECH-04", "relevance_score": 0.8}]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert any("SOP-MECH-04" in a["cited_procedure"] for a in rec["generated_explanation"]["recommended_actions"])

# 5. Rapid degradation
def test_rapid_degradation_condition(rec_engine):
    mock_rag_context = {
        "machine_id": "M_RAPID_DEG",
        "sensor_ml_evidence": {
            "degradation_status": "RAPID_DEGRADATION",
            "telemetry": {"vibration_magnitude": 1.25, "temperature": 65.0}
        },
        "retrieved_documentary_evidence": [{"title": "Bearing Guide", "content": "Raceway spalling", "relevance_score": 0.8}]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert "rapid degradation" in rec["generated_explanation"]["reasoning"].lower()

# 6. Anomaly condition
def test_anomaly_condition(rec_engine):
    mock_rag_context = {
        "machine_id": "M_ANO",
        "sensor_ml_evidence": {
            "anomaly_status": True,
            "anomaly_score": 0.65,
            "telemetry": {"vibration_magnitude": 1.2, "temperature": 80.0}
        },
        "retrieved_documentary_evidence": [{"title": "Lubrication", "content": "Thermal breakdown", "relevance_score": 0.85}]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert any("lubricant" in c["cause"].lower() or "bearing" in c["cause"].lower() for c in rec["generated_explanation"]["potential_causes"])

# 7. Relevant RAG evidence
def test_relevant_rag_evidence_utilization(rec_engine):
    mock_rag_context = {
        "machine_id": "M_RAG_TEST",
        "sensor_ml_evidence": {"telemetry": {"vibration_magnitude": 1.4, "temperature": 76.0}},
        "retrieved_documentary_evidence": [
            {"title": "Specific Doc", "source_document": "kb/doc.md", "content": "Perform SOP-MECH-04", "relevance_score": 0.95}
        ]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert len(rec["retrieved_documentary_evidence"]) == 1
    assert rec["retrieved_documentary_evidence"][0]["title"] == "Specific Doc"

# 8. Empty RAG results
def test_empty_rag_results(rec_engine):
    mock_rag_context = {
        "machine_id": "M_EMPTY_RAG",
        "sensor_ml_evidence": {"telemetry": {"vibration_magnitude": 0.5, "temperature": 50.0}},
        "retrieved_documentary_evidence": []
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert "cannot be definitively determined" in rec["generated_explanation"]["potential_causes"][0]["cause"]

# 9. Insufficient evidence
def test_insufficient_evidence_declaration():
    res = DeterministicFallbackEngine.generate_recommendation({"retrieved_documentary_evidence": []})
    assert "cannot be definitively determined" in res["potential_causes"][0]["cause"]
    assert res["confidence"] <= 0.50

# 10. LLM unavailable (Fallback engaged)
def test_llm_unavailable_fallback(rec_engine):
    # Default engine has no external API key, engages fallback
    mock_rag_context = {
        "machine_id": "M_FALLBACK",
        "sensor_ml_evidence": {"telemetry": {"vibration_magnitude": 1.3, "temperature": 78.0}},
        "retrieved_documentary_evidence": [{"title": "Doc", "content": "content", "relevance_score": 0.8}]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert rec["source_traceability"]["generation_source"] == "deterministic_expert_engine"

# 11. Malformed LLM response handling
def test_malformed_llm_response():
    class MockMalformedLLM(GroundedLLMClient):
        def generate(self, ctx):
            return "This is a non-json string response from broken LLM"
            
    engine = MaintenanceRecommendationEngine(llm_client=MockMalformedLLM())
    mock_rag_context = {
        "machine_id": "M_MALFORMED",
        "sensor_ml_evidence": {"telemetry": {"vibration_magnitude": 1.3, "temperature": 78.0}},
        "retrieved_documentary_evidence": [{"title": "Doc", "content": "content", "relevance_score": 0.8}]
    }
    rec = engine.generate_recommendation_from_context(mock_rag_context)
    # Must seamlessly recover using fallback
    assert rec["generated_explanation"]["generation_source"] == "deterministic_expert_engine"
    assert "recommended_actions" in rec["generated_explanation"]

# 12. Source traceability
def test_source_traceability(rec_engine):
    mock_rag_context = {
        "machine_id": "M_TRACE",
        "sensor_ml_evidence": {"telemetry": {}},
        "retrieved_documentary_evidence": [{"title": "Doc 1", "content": "content", "relevance_score": 0.8}],
        "traceability": {"index_version": "1.0.0", "embedding_model": "TFIDF-CosineSimilarity-v1"}
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    assert rec["source_traceability"]["documents_consulted_count"] == 1
    assert rec["source_traceability"]["grounding_verified"] is True

# 13. Evidence separation
def test_evidence_separation(rec_engine):
    mock_rag_context = {
        "machine_id": "M_SEP",
        "sensor_ml_evidence": {
            "health_score": 75.0,
            "telemetry": {"vibration_magnitude": 0.9, "temperature": 60.0}
        },
        "retrieved_documentary_evidence": [{"title": "Doc", "content": "text", "relevance_score": 0.7}]
    }
    rec = rec_engine.generate_recommendation_from_context(mock_rag_context)
    # Ensure 4 distinct top-level keys
    assert "measured_evidence" in rec
    assert "calculated_evidence" in rec
    assert "retrieved_documentary_evidence" in rec
    assert "generated_explanation" in rec

# 14. Deterministic fallback consistency
def test_deterministic_fallback_consistency():
    ctx = {
        "sensor_ml_evidence": {
            "rul_hours": 10.0,
            "telemetry": {"vibration_magnitude": 1.4, "temperature": 72.0}
        },
        "retrieved_documentary_evidence": [{"title": "Doc", "content": "SOP-MECH-04", "relevance_score": 0.8}]
    }
    res1 = DeterministicFallbackEngine.generate_recommendation(ctx)
    res2 = DeterministicFallbackEngine.generate_recommendation(ctx)
    assert res1 == res2

# 15. API Endpoints
def test_api_machine_recommendation(client):
    res = client.get("/api/v1/machines/TXM-001/recommendation")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == "TXM-001"
    assert "measured_evidence" in data
    assert "calculated_evidence" in data
    assert "retrieved_documentary_evidence" in data
    assert "generated_explanation" in data
    assert len(data["generated_explanation"]["recommended_actions"]) > 0

def test_api_fleet_recommendations(client):
    res = client.get("/api/v1/fleet-recommendations")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 50
    assert "machine_id" in data[0]
    assert "generated_explanation" in data[0]
