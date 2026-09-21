import pytest
from fastapi.testclient import TestClient
import pandas as pd

from backend.app.main import app
from backend.app.services.health_engine import AdaptiveHealthEngine
from backend.ml.data.loader import load_dataset
from backend.ml.features.degradation import compute_degradation_metrics

@pytest.fixture(scope="module")
def dataset():
    return load_dataset()

@pytest.fixture(scope="module")
def engine():
    return AdaptiveHealthEngine()

@pytest.fixture(scope="module")
def client():
    return TestClient(app)

def test_degradation_metrics(dataset):
    sample = dataset[dataset["machine_id"] == "TXM-001"]
    metrics = compute_degradation_metrics(sample)
    
    assert "degradation_status" in metrics
    assert metrics["degradation_status"] in ["STABLE", "MODERATE_DEGRADATION", "RAPID_DEGRADATION"]
    assert "degradation_rate" in metrics
    assert "vibration_severity_ratio" in metrics

def test_evaluate_machine(dataset, engine):
    sample = dataset[dataset["machine_id"] == "TXM-001"]
    summary = engine.evaluate_machine(sample)
    
    assert summary["machine_id"] == "TXM-001"
    assert 0.0 <= summary["health_score"] <= 100.0
    assert summary["health_state"] in [0, 1, 2]
    assert summary["health_state_label"] in ["Good", "Warning", "Critical"]
    assert isinstance(summary["anomaly_status"], bool)
    assert summary["rul_hours"] >= 0.0
    assert "key_sensors" in summary
    assert "vibration_magnitude" in summary["key_sensors"]

def test_evaluate_fleet(dataset, engine):
    summaries = engine.evaluate_fleet(dataset)
    assert len(summaries) == 50
    # Check sorted ascending by health score
    scores = [s["health_score"] for s in summaries]
    assert scores == sorted(scores)

def test_api_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_api_fleet_health_summary(client):
    res = client.get("/api/v1/health-summary")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 50
    assert "health_score" in data[0]

def test_api_machine_health(client):
    res = client.get("/api/v1/machines/TXM-001/health")
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == "TXM-001"
    assert "health_score" in data
    assert "rul_hours" in data

def test_api_machine_not_found(client):
    res = client.get("/api/v1/machines/NON_EXISTENT_ID/health")
    assert res.status_code == 404
