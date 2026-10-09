import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.session import get_db, SessionLocal
from backend.app.models.entities import Machine, MaintenanceRecord, SensorReading

client = TestClient(app)

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    yield db
    db.close()

def test_check_machine_id_availability():
    """Verify machine ID uniqueness checking endpoint."""
    # Existing machine should not be available
    res = client.get("/api/v1/machines/check-id/TXM-001")
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is False
    assert "already registered" in data["message"].lower()

    # Brand new machine ID should be available
    res_avail = client.get("/api/v1/machines/check-id/TXM-TEST-UNIQUE-999")
    assert res_avail.status_code == 200
    data_avail = res_avail.json()
    assert data_avail["available"] is True
    assert "available" in data_avail["message"].lower()

    # Empty or whitespace ID should fail
    res_empty = client.get("/api/v1/machines/check-id/%20%20")
    assert res_empty.status_code == 400

def test_machine_registration_lifecycle():
    """Verify registering a complete machine with 6-step specifications, operational limits, and initial logs."""
    test_id = "TXM-REG-TEST-001"
    
    # Cleanup if leftover from previous test run
    db = SessionLocal()
    existing = db.query(Machine).filter(Machine.machine_id == test_id).first()
    if existing:
        db.query(MaintenanceRecord).filter(MaintenanceRecord.machine_id == test_id).delete()
        db.query(SensorReading).filter(SensorReading.machine_id == test_id).delete()
        db.delete(existing)
        db.commit()
    db.close()

    payload = {
        "machine_id": test_id,
        "machine_name": "Precision Airjet Loom 101",
        "machine_type": "Airjet Loom",
        "manufacturer": "Tsudakoma Corp",
        "model_number": "ZAX9200i",
        "serial_number": "TK-2026-9901",
        "plant": "North Plant",
        "production_line": "Weaving Line 3",
        "location": "Bay 04 - Sector C",
        "description": "High-speed airjet loom weaving fine yarn count cotton.",
        "specifications": {
            "rated_power_kw": 4.5,
            "max_speed_rpm": 950,
            "voltage_v": 400,
            "motor_type": "Permanent Magnet Synchronous Motor",
            "bearings_spec": "SKF Explorer 6208 Deep Groove"
        },
        "operational_settings": {
            "target_temp": 65.0,
            "warning_temp": 75.0,
            "critical_temp": 85.0,
            "vibration_warning": 3.0,
            "vibration_critical": 4.5
        },
        "sensor_config": {
            "channels": ["vibration_rms", "vibration_x", "vibration_y", "vibration_z", "temperature", "motor_speed"],
            "sampling_rate_hz": 100,
            "telemetry_protocol": "MQTT / Modbus-TCP"
        },
        "initial_maintenance_records": [
            {
                "maintenance_date": "2026-09-01T10:00:00",
                "maintenance_type": "Commissioning & Alignment",
                "component": "Main Drive & Spindle",
                "description": "Factory installation and laser shaft alignment verification.",
                "action_taken": "Aligned motor coupling within 0.03mm tolerance; applied baseline ISO VG 100 lubricant.",
                "sop_code": "SOP-MECH-01",
                "technician_notes": "All initial tolerances within OEM specifications."
            }
        ]
    }

    # 1. Register new machine
    reg_res = client.post("/api/v1/machines", json=payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["machine_id"] == test_id
    assert reg_data["machine_name"] == "Precision Airjet Loom 101"
    assert reg_data["manufacturer"] == "Tsudakoma Corp"
    assert reg_data["monitoring_readiness"] == "Awaiting Data"
    assert reg_data["total_readings"] == 0

    # 2. Test duplicate ID rejection (Conflict 409)
    dup_res = client.post("/api/v1/machines", json=payload)
    assert dup_res.status_code == 409
    assert "already exists" in dup_res.json()["detail"].lower()

    # 3. Test duplicate Serial Number rejection (Conflict 409)
    dup_sn_payload = dict(payload)
    dup_sn_payload["machine_id"] = "TXM-DIFF-ID-999"
    dup_sn_res = client.post("/api/v1/machines", json=dup_sn_payload)
    assert dup_sn_res.status_code == 409
    assert "serial number" in dup_sn_res.json()["detail"].lower()

    # 4. Verify machine appears in GET /api/v1/machines
    list_res = client.get("/api/v1/machines")
    assert list_res.status_code == 200
    machines_list = list_res.json()
    found = next((m for m in machines_list if m["machine_id"] == test_id), None)
    assert found is not None
    assert found["monitoring_readiness"] == "Awaiting Data"

    # 5. Verify maintenance records were saved
    maint_res = client.get(f"/api/v1/machines/{test_id}/maintenance-history")
    assert maint_res.status_code == 200
    maint_records = maint_res.json()
    assert len(maint_records) == 1
    assert maint_records[0]["component"] == "Main Drive & Spindle"
    assert maint_records[0]["sop_code"] == "SOP-MECH-01"

    # 6. Verify machine starts in truthful Awaiting Data state without hallucinated predictions
    latest_res = client.get(f"/api/v1/machines/{test_id}/latest")
    assert latest_res.status_code == 200
    latest_data = latest_res.json()
    assert latest_data["monitoring_readiness"] == "Awaiting Data"
    assert latest_data["current_condition"]["health_state_label"] == "Awaiting Data"
    assert latest_data["current_condition"]["rul_hours"] is None
    assert latest_data["risk_assessment"]["risk_level"] == "PENDING"
    assert latest_data["measured_evidence"]["vibration_magnitude"] is None
    assert latest_data["measured_evidence"]["temperature"] is None

    # 7. Test PUT /api/v1/machines/{machine_id} update
    update_res = client.put(f"/api/v1/machines/{test_id}", json={
        "machine_name": "Precision Airjet Loom 101 - Upgraded",
        "location": "Bay 05 - Sector D"
    })
    assert update_res.status_code == 200
    assert update_res.json()["machine_name"] == "Precision Airjet Loom 101 - Upgraded"
    assert update_res.json()["location"] == "Bay 05 - Sector D"

    # 8. Test CSV Ingestion with invalid file
    bad_file = ("telemetry.txt", io.BytesIO(b"hello world"), "text/plain")
    bad_upload = client.post(f"/api/v1/machines/{test_id}/import-readings-csv", files={"file": bad_file})
    assert bad_upload.status_code in [400, 422]

    # 9. Test CSV Ingestion with valid sensor telemetry
    csv_content = (
        "timestamp,temperature,vibration_magnitude,vibration_x,vibration_y,vibration_z,load_percent,rotational_speed\n"
        "2026-10-09T10:00:00,64.2,1.15,0.45,0.65,0.78,85,950\n"
        "2026-10-09T10:01:00,64.5,1.18,0.46,0.67,0.80,85,950\n"
        "2026-10-09T10:02:00,64.8,1.20,0.47,0.68,0.81,86,951\n"
        "2026-10-09T10:03:00,65.0,1.22,0.48,0.70,0.83,86,950\n"
        "2026-10-09T10:04:00,65.1,1.21,0.47,0.69,0.82,85,950\n"
        "2026-10-09T10:05:00,65.3,1.24,0.49,0.71,0.84,85,950\n"
        "2026-10-09T10:06:00,65.4,1.23,0.48,0.70,0.83,85,950\n"
        "2026-10-09T10:07:00,65.6,1.25,0.50,0.72,0.85,86,952\n"
        "2026-10-09T10:08:00,65.7,1.27,0.51,0.73,0.86,86,951\n"
        "2026-10-09T10:09:00,65.9,1.26,0.50,0.72,0.85,85,950\n"
        "2026-10-09T10:10:00,66.0,1.28,0.52,0.74,0.87,86,950\n"
    )
    csv_file = ("sensor_readings.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")
    csv_upload = client.post(f"/api/v1/machines/{test_id}/import-readings-csv", files={"file": csv_file})
    assert csv_upload.status_code == 200
    upload_res = csv_upload.json()
    assert upload_res["imported_readings"] == 11
    assert upload_res["pipeline_executed"] is True
    assert upload_res["monitoring_status"] == "Monitoring Active"

    # 10. Check that machine is now updated to Monitoring Active with 11 readings
    detail_res = client.get(f"/api/v1/machines/{test_id}")
    assert detail_res.status_code == 200
    updated_machine = detail_res.json()
    assert updated_machine["total_readings"] == 11
    assert updated_machine["monitoring_readiness"] == "Monitoring Active"

    # Clean up test machine from database
    db = SessionLocal()
    m_to_clean = db.query(Machine).filter(Machine.machine_id == test_id).first()
    if m_to_clean:
        db.query(MaintenanceRecord).filter(MaintenanceRecord.machine_id == test_id).delete()
        db.query(SensorReading).filter(SensorReading.machine_id == test_id).delete()
        db.delete(m_to_clean)
        db.commit()
    db.close()
