import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal
from backend.app.models.entities import (
    Machine,
    SensorReading,
    HealthRecord,
    RiskRecord,
    MaintenanceRecord,
    RecommendationRecord,
)


SQLITE_DB = PROJECT_ROOT / "backend" / "predictive_maintenance.db"


def get_sqlite_rows(table):
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(f"SELECT * FROM {table}").fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def migrate():
    print("=" * 60)
    print("SQLite → PostgreSQL Migration")
    print("=" * 60)

    if not SQLITE_DB.exists():
        raise FileNotFoundError(f"SQLite database not found: {SQLITE_DB}")

    db = SessionLocal()

    try:
        # ---------------------------------------------------------
        # 1. Machines
        # ---------------------------------------------------------
        rows = get_sqlite_rows("machines")
        print(f"\nMigrating machines: {len(rows)}")

        for row in rows:
            existing = (
                db.query(Machine)
                .filter(Machine.machine_id == row["machine_id"])
                .first()
            )

            if existing:
                continue

            db.add(
                Machine(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    machine_type=row["machine_type"],
                    machine_name=row["machine_name"],
                    installation_date=row["installation_date"],
                    status=row["status"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                )
            )

        db.commit()
        print("Machines migrated.")

        # ---------------------------------------------------------
        # 2. Sensor readings
        # ---------------------------------------------------------
        rows = get_sqlite_rows("sensor_readings")
        print(f"\nMigrating sensor readings: {len(rows)}")

        for row in rows:
            existing = (
                db.query(SensorReading)
                .filter(SensorReading.id == row["id"])
                .first()
            )

            if existing:
                continue

            db.add(
                SensorReading(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    timestamp=row["timestamp"],
                    temperature=row["temperature"],
                    vibration_x=row["vibration_x"],
                    vibration_y=row["vibration_y"],
                    vibration_z=row["vibration_z"],
                    vibration_magnitude=row["vibration_magnitude"],
                    load_percent=row["load_percent"],
                    rotational_speed=row["rotational_speed"],
                    operating_hours=row["operating_hours"],
                    created_at=row["created_at"],
                )
            )

        db.commit()
        print("Sensor readings migrated.")

        # ---------------------------------------------------------
        # 3. Health records
        # ---------------------------------------------------------
        rows = get_sqlite_rows("health_records")
        print(f"\nMigrating health records: {len(rows)}")

        for row in rows:
            existing = (
                db.query(HealthRecord)
                .filter(HealthRecord.id == row["id"])
                .first()
            )

            if existing:
                continue

            db.add(
                HealthRecord(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    timestamp=row["timestamp"],
                    health_score=row["health_score"],
                    health_state=row["health_state"],
                    health_state_label=row["health_state_label"],
                    anomaly_status=row["anomaly_status"],
                    anomaly_score=row["anomaly_score"],
                    degradation_status=row["degradation_status"],
                    degradation_rate=row["degradation_rate"],
                    rul_hours=row["rul_hours"],
                    created_at=row["created_at"],
                )
            )

        db.commit()
        print("Health records migrated.")

        # ---------------------------------------------------------
        # 4. Risk records
        # ---------------------------------------------------------
        rows = get_sqlite_rows("risk_records")
        print(f"\nMigrating risk records: {len(rows)}")

        for row in rows:
            existing = (
                db.query(RiskRecord)
                .filter(RiskRecord.id == row["id"])
                .first()
            )

            if existing:
                continue

            db.add(
                RiskRecord(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    timestamp=row["timestamp"],
                    risk_score=row["risk_score"],
                    risk_level=row["risk_level"],
                    maintenance_priority=row["maintenance_priority"],
                    maintenance_window=row["maintenance_window"],
                    risk_factors=row["risk_factors"],
                    created_at=row["created_at"],
                )
            )

        db.commit()
        print("Risk records migrated.")

        # ---------------------------------------------------------
        # 5. Maintenance records
        # ---------------------------------------------------------
        rows = get_sqlite_rows("maintenance_records")
        print(f"\nMigrating maintenance records: {len(rows)}")

        for row in rows:
            existing = (
                db.query(MaintenanceRecord)
                .filter(MaintenanceRecord.id == row["id"])
                .first()
            )

            if existing:
                continue

            db.add(
                MaintenanceRecord(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    maintenance_date=row["maintenance_date"],
                    maintenance_type=row["maintenance_type"],
                    component=row["component"],
                    description=row["description"],
                    action_taken=row["action_taken"],
                    sop_code=row["sop_code"],
                    technician_notes=row["technician_notes"],
                    created_at=row["created_at"],
                )
            )

        db.commit()
        print("Maintenance records migrated.")

        # ---------------------------------------------------------
        # 6. Recommendation records
        # ---------------------------------------------------------
        rows = get_sqlite_rows("recommendation_records")
        print(f"\nMigrating recommendation records: {len(rows)}")

        for row in rows:
            existing = (
                db.query(RecommendationRecord)
                .filter(RecommendationRecord.id == row["id"])
                .first()
            )

            if existing:
                continue

            db.add(
                RecommendationRecord(
                    id=row["id"],
                    machine_id=row["machine_id"],
                    timestamp=row["timestamp"],
                    condition_summary=row["condition_summary"],
                    health_score=row["health_score"],
                    health_state=row["health_state"],
                    rul_hours=row["rul_hours"],
                    risk_score=row["risk_score"],
                    risk_level=row["risk_level"],
                    maintenance_priority=row["maintenance_priority"],
                    maintenance_window=row["maintenance_window"],
                    potential_causes=row["potential_causes"],
                    recommended_actions=row["recommended_actions"],
                    reasoning=row["reasoning"],
                    confidence=row["confidence"],
                    measured_evidence=row["measured_evidence"],
                    calculated_evidence=row["calculated_evidence"],
                    retrieved_documentary_evidence=row[
                        "retrieved_documentary_evidence"
                    ],
                    source_traceability=row["source_traceability"],
                    created_at=row["created_at"],
                )
            )

        db.commit()
        print("Recommendation records migrated.")

        # ---------------------------------------------------------
        # Reset PostgreSQL sequences
        # ---------------------------------------------------------
        print("\nResetting PostgreSQL ID sequences...")

        sequence_tables = [
            "machines",
            "sensor_readings",
            "health_records",
            "risk_records",
            "maintenance_records",
            "recommendation_records",
        ]

        for table in sequence_tables:
            db.execute(
                __import__("sqlalchemy").text(
                    f"""
                    SELECT setval(
                        pg_get_serial_sequence('{table}', 'id'),
                        COALESCE((SELECT MAX(id) FROM {table}), 1),
                        true
                    )
                    """
                )
            )

        db.commit()

        print("\n" + "=" * 60)
        print("Migration completed successfully.")
        print("=" * 60)

    except Exception:
        db.rollback()
        print("\nMigration failed. Transaction rolled back.")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    migrate()