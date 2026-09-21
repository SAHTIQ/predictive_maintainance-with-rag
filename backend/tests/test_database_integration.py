import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pandas as pd

from backend.app.database.session import Base, get_db
from backend.app.models.entities import (
    Machine,
    SensorReading,
    HealthRecord,
    RiskRecord,
    MaintenanceRecord,
    RecommendationRecord,
)
from backend.app.main import app
from backend.app.services.db_pipeline import DatabasePipelineService

from sqlalchemy.pool import StaticPool

# In-memory SQLite database specifically for test isolation using StaticPool
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    """Provides a pristine database session per test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    """Overrides the FastAPI get_db dependency with test database session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()



def test_db_connection_and_table_creation(db_session):
    """Test 1: Verify tables exist and schema is created correctly."""
    tables = Base.metadata.tables.keys()
    assert "machines" in tables
    assert "sensor_readings" in tables
    assert "health_records" in tables
    assert "risk_records" in tables
    assert "maintenance_records" in tables
    assert "recommendation_records" in tables


def test_machine_creation_and_retrieval(db_session):
    """Test 2: Create a machine record and query it."""
    machine = Machine(
        machine_id="PUMP-TEST-001",
        machine_type="Centrifugal Pump",
        machine_name="Main feedwater pump",
        status="active"
    )
    db_session.add(machine)
    db_session.commit()

    saved = db_session.query(Machine).filter_by(machine_id="PUMP-TEST-001").first()
    assert saved is not None
    assert saved.machine_type == "Centrifugal Pump"
    assert saved.machine_name == "Main feedwater pump"


def test_sensor_reading_insertion_and_foreign_key(db_session):
    """Test 3: Insert sensor readings linked to a machine."""
    machine = Machine(machine_id="COMP-001", machine_type="Compressor")
    db_session.add(machine)
    db_session.commit()

    reading = SensorReading(
        machine_id="COMP-001",
        timestamp=datetime.now(timezone.utc),
        vibration_x=0.45,
        vibration_y=0.55,
        vibration_z=0.65,
        vibration_magnitude=0.96,
        temperature=58.2,
        operating_hours=120.0
    )
    db_session.add(reading)
    db_session.commit()

    retrieved = db_session.query(SensorReading).filter_by(machine_id="COMP-001").first()
    assert retrieved is not None
    assert retrieved.vibration_x == 0.45
    assert retrieved.temperature == 58.2


def test_chronological_sensor_telemetry_ordering(db_session):
    """Test 4: Verify sensor telemetry is returned strictly chronologically."""
    machine = Machine(machine_id="FAN-001", machine_type="Cooling Fan")
    db_session.add(machine)
    
    t0 = datetime.now(timezone.utc)
    readings = [
        SensorReading(machine_id="FAN-001", timestamp=t0 + timedelta(hours=2), vibration_x=0.6, vibration_y=0.6, vibration_z=0.6, vibration_magnitude=1.0, temperature=50.0, operating_hours=10.0),
        SensorReading(machine_id="FAN-001", timestamp=t0, vibration_x=0.2, vibration_y=0.2, vibration_z=0.2, vibration_magnitude=0.34, temperature=40.0, operating_hours=8.0),
        SensorReading(machine_id="FAN-001", timestamp=t0 + timedelta(hours=1), vibration_x=0.4, vibration_y=0.4, vibration_z=0.4, vibration_magnitude=0.69, temperature=45.0, operating_hours=9.0),
    ]
    db_session.add_all(readings)
    db_session.commit()

    sorted_readings = db_session.query(SensorReading).filter_by(machine_id="FAN-001").order_by(SensorReading.timestamp.asc()).all()
    assert len(sorted_readings) == 3
    assert sorted_readings[0].vibration_x == 0.2
    assert sorted_readings[1].vibration_x == 0.4
    assert sorted_readings[2].vibration_x == 0.6


def test_health_record_persistence(db_session):
    """Test 5: Persist evaluated health engine record."""
    machine = Machine(machine_id="M-HLTH-1", machine_type="Motor")
    db_session.add(machine)
    db_session.commit()

    health = HealthRecord(
        machine_id="M-HLTH-1",
        timestamp=datetime.now(timezone.utc),
        health_score=82.5,
        health_state=0,
        health_state_label="Good",
        anomaly_status=False,
        anomaly_score=-0.15,
        degradation_status="HEALTHY",
        degradation_rate=0.002,
        rul_hours=240.0
    )
    db_session.add(health)
    db_session.commit()

    rec = db_session.query(HealthRecord).filter_by(machine_id="M-HLTH-1").first()
    assert rec is not None
    assert rec.health_score == 82.5
    assert rec.health_state == 0
    assert rec.degradation_status == "HEALTHY"


def test_risk_record_persistence(db_session):
    """Test 6: Persist evaluated risk engine record."""
    machine = Machine(machine_id="M-RISK-1", machine_type="Motor")
    db_session.add(machine)
    db_session.commit()

    risk = RiskRecord(
        machine_id="M-RISK-1",
        timestamp=datetime.now(timezone.utc),
        risk_score=78.4,
        risk_level="HIGH",
        maintenance_priority="P1 - URGENT",
        maintenance_window="Within 24 hours",
        risk_factors={"state_factor": 25.0, "rul_factor": 30.0}
    )
    db_session.add(risk)
    db_session.commit()

    rec = db_session.query(RiskRecord).filter_by(machine_id="M-RISK-1").first()
    assert rec is not None
    assert rec.risk_score == 78.4
    assert rec.risk_level == "HIGH"
    assert rec.risk_factors["rul_factor"] == 30.0


def test_recommendation_record_with_evidence_json(db_session):
    """Test 7: Persist recommendation record with 4-tier structured JSON evidence."""
    machine = Machine(machine_id="M-REC-1", machine_type="Motor")
    db_session.add(machine)
    db_session.commit()

    rec = RecommendationRecord(
        machine_id="M-REC-1",
        timestamp=datetime.now(timezone.utc),
        condition_summary={"status": "degraded"},
        health_state="Critical",
        health_score=35.0,
        rul_hours=18.0,
        risk_score=85.0,
        risk_level="CRITICAL",
        maintenance_priority="P0 - IMMEDIATE",
        maintenance_window="Within 12 hours",
        potential_causes=["Fatigue failure"],
        recommended_actions=["Immediate inspection", "Replace drive-end bearing"],
        reasoning="Critical bearing degradation detected.",
        confidence=0.92,
        measured_evidence={"vibration_rms": 2.8},
        calculated_evidence={"risk_score": 85.0},
        retrieved_documentary_evidence=[{"title": "Bearing Procedure"}],
        source_traceability={"manuals": ["Manual_ISO_10816.pdf"]}
    )
    db_session.add(rec)
    db_session.commit()

    saved = db_session.query(RecommendationRecord).filter_by(machine_id="M-REC-1").first()
    assert saved is not None
    assert saved.confidence == 0.92
    assert "Replace drive-end bearing" in saved.recommended_actions
    assert saved.measured_evidence["vibration_rms"] == 2.8
    assert saved.retrieved_documentary_evidence[0]["title"] == "Bearing Procedure"


def test_api_list_machines(client, db_session):
    """Test 8: GET /api/v1/machines endpoint."""
    m1 = Machine(machine_id="M1", machine_type="Pump")
    m2 = Machine(machine_id="M2", machine_type="Fan")
    db_session.add_all([m1, m2])
    db_session.commit()

    response = client.get("/api/v1/machines")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["machine_id"] == "M1"


def test_api_get_machine_by_id(client, db_session):
    """Test 9: GET /api/v1/machines/{machine_id} success and 404."""
    m1 = Machine(machine_id="M100", machine_type="Compressor")
    db_session.add(m1)
    db_session.commit()

    resp = client.get("/api/v1/machines/M100")
    assert resp.status_code == 200
    assert resp.json()["machine_id"] == "M100"

    resp_404 = client.get("/api/v1/machines/NON-EXISTENT")
    assert resp_404.status_code == 404


def test_api_sensor_history(client, db_session):
    """Test 10: GET /api/v1/machines/{machine_id}/sensor-history."""
    m = Machine(machine_id="M-SEN-1", machine_type="Pump")
    db_session.add(m)
    now = datetime.now(timezone.utc)
    r1 = SensorReading(machine_id="M-SEN-1", timestamp=now - timedelta(hours=1), vibration_x=0.1, vibration_y=0.1, vibration_z=0.1, vibration_magnitude=0.17, temperature=40.0, operating_hours=5.0)
    r2 = SensorReading(machine_id="M-SEN-1", timestamp=now, vibration_x=0.2, vibration_y=0.2, vibration_z=0.2, vibration_magnitude=0.34, temperature=42.0, operating_hours=6.0)
    db_session.add_all([r1, r2])
    db_session.commit()

    resp = client.get("/api/v1/machines/M-SEN-1/sensor-history?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["vibration_x"] == 0.1


def test_api_health_and_risk_history(client, db_session):
    """Test 11: GET health and risk history endpoints."""
    m = Machine(machine_id="M-HIST-1", machine_type="Turbine")
    db_session.add(m)
    now = datetime.now(timezone.utc)
    h = HealthRecord(machine_id="M-HIST-1", timestamp=now, health_score=90.0, health_state=0, health_state_label="Good", anomaly_status=False, anomaly_score=0.1, degradation_status="HEALTHY", degradation_rate=0.0, rul_hours=300.0)
    r = RiskRecord(machine_id="M-HIST-1", timestamp=now, risk_score=15.0, risk_level="LOW", maintenance_priority="P3 - ROUTINE", maintenance_window="Within 168 hours", risk_factors={})
    db_session.add_all([h, r])
    db_session.commit()

    resp_h = client.get("/api/v1/machines/M-HIST-1/health-history")
    assert resp_h.status_code == 200
    assert len(resp_h.json()) == 1

    resp_r = client.get("/api/v1/machines/M-HIST-1/risk-history")
    assert resp_r.status_code == 200
    assert len(resp_r.json()) == 1


def test_api_fleet_overview(client, db_session):
    """Test 12: GET /api/v1/fleet/overview aggregations."""
    m1 = Machine(machine_id="FLEET-1", machine_type="Pump")
    m2 = Machine(machine_id="FLEET-2", machine_type="Fan")
    db_session.add_all([m1, m2])
    now = datetime.now(timezone.utc)
    h1 = HealthRecord(machine_id="FLEET-1", timestamp=now, health_score=95.0, health_state=0, health_state_label="Good", anomaly_status=False, anomaly_score=0.1, degradation_status="HEALTHY", degradation_rate=0.0, rul_hours=300.0)
    h2 = HealthRecord(machine_id="FLEET-2", timestamp=now, health_score=40.0, health_state=2, health_state_label="Critical", anomaly_status=True, anomaly_score=-0.5, degradation_status="RAPID", degradation_rate=0.05, rul_hours=24.0)
    r1 = RiskRecord(machine_id="FLEET-1", timestamp=now, risk_score=10.0, risk_level="LOW", maintenance_priority="P3 - ROUTINE", maintenance_window="Within 168 hours", risk_factors={})
    r2 = RiskRecord(machine_id="FLEET-2", timestamp=now, risk_score=85.0, risk_level="CRITICAL", maintenance_priority="P0 - IMMEDIATE", maintenance_window="Within 12 hours", risk_factors={})
    db_session.add_all([h1, h2, r1, r2])
    db_session.commit()

    resp = client.get("/api/v1/fleet/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_machines"] == 2
    assert data["health_states"]["Good"] == 1
    assert data["health_states"]["Critical"] == 1
    assert data["risk_levels"]["CRITICAL"] == 1
    assert data["machines_requiring_maintenance_count"] == 1


def test_database_pipeline_service_full_integration(db_session):
    """Test 13: Execute full DB -> Health -> Risk -> RAG -> Recommendation -> DB persist pipeline."""
    # Seed machine and 10 sequential telemetry readings to satisfy rolling window k=5
    machine = Machine(machine_id="TEST-MACHINE-INTEGRATION", machine_type="Centrifugal Pump")
    db_session.add(machine)
    now = datetime.now(timezone.utc)
    
    readings = []
    for i in range(10):
        readings.append(SensorReading(
            machine_id="TEST-MACHINE-INTEGRATION",
            timestamp=now + timedelta(minutes=30 * i),
            vibration_x=0.4 + 0.05 * i,
            vibration_y=0.4 + 0.05 * i,
            vibration_z=0.4 + 0.05 * i,
            vibration_magnitude=round(((0.4 + 0.05 * i)**2 * 3)**0.5, 4),
            temperature=45.0 + 1.5 * i,
            operating_hours=100.0 + i * 0.5
        ))
    db_session.add_all(readings)
    db_session.commit()

    svc = DatabasePipelineService()
    df = svc.load_machine_dataframe(db_session, "TEST-MACHINE-INTEGRATION")
    assert len(df) == 10
    assert "vibration_x" in df.columns

    decision = svc.process_and_persist_machine_decision(db_session, "TEST-MACHINE-INTEGRATION")
    assert decision is not None
    assert decision["machine_id"] == "TEST-MACHINE-INTEGRATION"
    assert "current_condition" in decision
    assert "risk_assessment" in decision
    assert "retrieved_documentary_evidence" in decision

    # Verify records were persisted into DB
    h_rec = db_session.query(HealthRecord).filter_by(machine_id="TEST-MACHINE-INTEGRATION").first()
    r_rec = db_session.query(RiskRecord).filter_by(machine_id="TEST-MACHINE-INTEGRATION").first()
    rec_rec = db_session.query(RecommendationRecord).filter_by(machine_id="TEST-MACHINE-INTEGRATION").first()

    assert h_rec is not None
    assert r_rec is not None
    assert rec_rec is not None
    assert rec_rec.health_score == decision["current_condition"]["health_score"]

