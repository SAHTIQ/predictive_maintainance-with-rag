import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.app.services.risk_engine import MaintenanceRiskEngine
from backend.ml.data.loader import load_dataset

@pytest.fixture(scope="module")
def risk_engine():
    return MaintenanceRiskEngine()

@pytest.fixture(scope="module")
def health_engine():
    return AdaptiveHealthEngine()

@pytest.fixture(scope="module")
def dataset():
    return load_dataset()

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_low_risk_healthy_machine(risk_engine):
    payload = {
        "machine_id": "M_HEALTHY",
        "health_score": 98.0,
        "health_state": 0,
        "anomaly_status": False,
        "anomaly_score": 0.38,
        "degradation_status": "STABLE",
        "rul_hours": 200.0,
    }
    res = risk_engine.calculate_risk(payload)
    assert res["risk_level"] in ["LOW", "VERY_LOW"]
    assert res["maintenance_priority"] in ["P4_LOW", "P5_SCHEDULED_MONITORING"]
    assert res["risk_score"] < 35.0
    assert "Within" in res["estimated_maintenance_time_window"] or "routine" in res["estimated_maintenance_time_window"]

def test_medium_risk_machine(risk_engine):
    payload = {
        "machine_id": "M_MEDIUM",
        "health_score": 65.0,
        "health_state": 1,
        "anomaly_status": False,
        "anomaly_score": 0.44,
        "degradation_status": "MODERATE_DEGRADATION",
        "rul_hours": 60.0,
    }
    res = risk_engine.calculate_risk(payload)
    assert res["risk_level"] in ["MEDIUM", "HIGH"]
    assert res["risk_score"] >= 40.0
    assert "Within" in res["estimated_maintenance_time_window"]

def test_high_risk_machine(risk_engine):
    payload = {
        "machine_id": "M_HIGH",
        "health_score": 45.0,
        "health_state": 1,
        "anomaly_status": True,
        "anomaly_score": 0.58,
        "degradation_status": "RAPID_DEGRADATION",
        "rul_hours": 20.0,
    }
    res = risk_engine.calculate_risk(payload)
    assert res["risk_level"] in ["HIGH", "CRITICAL"]
    assert res["maintenance_priority"] in ["P1_IMMEDIATE", "P2_HIGH"]
    assert res["risk_score"] >= 60.0

def test_critical_urgent_override(risk_engine):
    payload = {
        "machine_id": "M_CRITICAL",
        "health_score": 25.0,
        "health_state": 2, # Critical
        "anomaly_status": True,
        "anomaly_score": 0.65,
        "degradation_status": "RAPID_DEGRADATION",
        "rul_hours": 5.0,
    }
    res = risk_engine.calculate_risk(payload)
    assert res["risk_level"] == "CRITICAL"
    assert res["maintenance_priority"] == "P1_IMMEDIATE"
    assert res["risk_score"] >= 80.0
    assert "0 - 12 operating hours" in res["estimated_maintenance_time_window"]

def test_low_rul_impact(risk_engine):
    base_payload = {
        "machine_id": "M_RUL_TEST",
        "health_score": 75.0,
        "health_state": 0,
        "anomaly_status": False,
        "anomaly_score": 0.40,
        "degradation_status": "STABLE",
    }
    res_high_rul = risk_engine.calculate_risk({**base_payload, "rul_hours": 150.0})
    res_low_rul = risk_engine.calculate_risk({**base_payload, "rul_hours": 10.0})
    
    assert res_low_rul["risk_score"] > res_high_rul["risk_score"]

def test_anomaly_contribution(risk_engine):
    base_payload = {
        "machine_id": "M_ANO_TEST",
        "health_score": 70.0,
        "health_state": 0,
        "degradation_status": "STABLE",
        "rul_hours": 80.0,
    }
    res_normal = risk_engine.calculate_risk({**base_payload, "anomaly_status": False, "anomaly_score": 0.38})
    res_anomaly = risk_engine.calculate_risk({**base_payload, "anomaly_status": True, "anomaly_score": 0.62})
    
    assert res_anomaly["risk_score"] > res_normal["risk_score"]
    assert res_anomaly["risk_factors"]["anomaly_contribution"] > res_normal["risk_factors"]["anomaly_contribution"]

def test_degradation_contribution(risk_engine):
    base_payload = {
        "machine_id": "M_DEG_TEST",
        "health_score": 70.0,
        "health_state": 0,
        "anomaly_status": False,
        "anomaly_score": 0.40,
        "rul_hours": 80.0,
    }
    res_stable = risk_engine.calculate_risk({**base_payload, "degradation_status": "STABLE"})
    res_rapid = risk_engine.calculate_risk({**base_payload, "degradation_status": "RAPID_DEGRADATION"})
    
    assert res_rapid["risk_score"] > res_stable["risk_score"]

def test_safe_handling_invalid_missing_rul(risk_engine):
    base = {
        "machine_id": "M_INVALID_RUL",
        "health_score": 80.0,
        "health_state": 0,
        "anomaly_status": False,
        "anomaly_score": 0.40,
        "degradation_status": "STABLE",
    }
    # Test None
    res_none = risk_engine.calculate_risk({**base, "rul_hours": None})
    assert 0.0 <= res_none["risk_score"] <= 100.0
    
    # Test Negative RUL
    res_neg = risk_engine.calculate_risk({**base, "rul_hours": -15.0})
    assert 0.0 <= res_neg["risk_score"] <= 100.0
    
    # Test Zero RUL
    res_zero = risk_engine.calculate_risk({**base, "rul_hours": 0.0})
    assert res_zero["risk_score"] >= 80.0 # triggers override

def test_boundary_values(risk_engine):
    # Extreme worst case
    worst = {
        "machine_id": "M_WORST",
        "health_score": 0.0,
        "health_state": 2,
        "anomaly_status": True,
        "anomaly_score": 0.90,
        "degradation_status": "RAPID_DEGRADATION",
        "rul_hours": 0.0,
    }
    res_worst = risk_engine.calculate_risk(worst)
    assert res_worst["risk_score"] == 100.0
    assert res_worst["risk_level"] == "CRITICAL"
    
    # Extreme best case
    best = {
        "machine_id": "M_BEST",
        "health_score": 100.0,
        "health_state": 0,
        "anomaly_status": False,
        "anomaly_score": 0.35,
        "degradation_status": "STABLE",
        "rul_hours": 300.0,
    }
    res_best = risk_engine.calculate_risk(best)
    assert res_best["risk_score"] <= 10.0
    assert res_best["risk_level"] == "VERY_LOW"

def test_api_fleet_risk_summary(client):
    res = client.get("/api/v1/risk-summary")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 50
    # Must be sorted descending by risk score
    scores = [d["risk_score"] for d in data]
    assert scores == sorted(scores, reverse=True)
    assert "risk_level" in data[0]
    assert "maintenance_priority" in data[0]
    assert "risk_factors" in data[0]

def test_api_machine_risk(client):
    res = client.get("/api/v1/machines/TXM-001/risk")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == "TXM-001"
    assert "risk_score" in data
    assert "risk_factors" in data
    assert "risk_explanation" in data
    assert "health_summary" in data
