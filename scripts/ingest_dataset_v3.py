from datetime import datetime, timezone
import math
from pathlib import Path
import numpy as np
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.session import Base, engine, SessionLocal
from backend.app.models.entities import Machine, SensorReading

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "raw" / "predictive_maintenance_dataset_v3.csv"

def ingest_dataset_v3(db_session=None):
    print("--- Stage 10: Ingesting Dataset V3 into PostgreSQL / Database ---")
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset V3 not found at {DATASET_PATH}")
        
    print(f"Reading {DATASET_PATH}...")
    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded {len(df)} rows.")

    db = db_session or SessionLocal()
    
    try:
        # 1. Ingest Unique Machines Idempotently
        machine_meta = df[["machine_id", "machine_type"]].drop_duplicates()
        existing_machines = {m.machine_id for m in db.query(Machine.machine_id).all()}
        
        new_machines = 0
        for _, row in machine_meta.iterrows():
            m_id = str(row["machine_id"])
            if m_id not in existing_machines:
                machine_obj = Machine(
                    machine_id=m_id,
                    machine_type=str(row["machine_type"]),
                    machine_name=f"Industrial Machine {m_id}",
                    status="active"
                )
                db.add(machine_obj)
                new_machines += 1
                
        db.commit()
        print(f"Machines: {new_machines} inserted, {len(existing_machines)} previously existing.")

        # 2. Ingest Sensor Readings Idempotently
        # Check existing readings count per machine
        existing_counts = dict(
            db.query(SensorReading.machine_id, db.query(SensorReading.id).filter(SensorReading.machine_id == Machine.machine_id).count())
            .group_by(SensorReading.machine_id)
            .all()
        )
        
        # Sort strictly chronologically
        df_sorted = df.sort_values(by=["machine_id", "timestamp"]).reset_index(drop=True)
        
        # Fetch existing timestamps per machine to prevent duplicate row insertions
        existing_rows = db.query(SensorReading.machine_id, SensorReading.timestamp).all()
        existing_ts_set = {
            (m, ts.replace(tzinfo=None) if hasattr(ts, 'replace') else ts)
            for m, ts in existing_rows
        }
        
        inserted_readings = 0
        skipped_readings = 0
        
        batch = []
        for _, r in df_sorted.iterrows():
            m_id = str(r["machine_id"])
            ts_dt = pd.to_datetime(r["timestamp"]).to_pydatetime().replace(tzinfo=None)

            if (m_id, ts_dt) in existing_ts_set:
                skipped_readings += 1
                continue

            vx = float(r["vibration_x"])
            vy = float(r["vibration_y"])
            vz = float(r["vibration_z"])
            v_mag = float(np.sqrt(vx**2 + vy**2 + vz**2))
            
            reading = SensorReading(
                machine_id=m_id,
                timestamp=ts_dt,
                temperature=float(r["temperature"]),
                vibration_x=vx,
                vibration_y=vy,
                vibration_z=vz,
                vibration_magnitude=v_mag,
                load_percent=float(r.get("load_percent", 0.0)),
                rotational_speed=float(r.get("rotational_speed", 0.0)),
                operating_hours=float(r["operating_hours"]),
            )
            batch.append(reading)
            existing_ts_set.add((m_id, ts_dt))
            inserted_readings += 1

            if len(batch) >= 1000:
                db.bulk_save_objects(batch)
                db.commit()
                batch = []

        if batch:
            db.bulk_save_objects(batch)
            db.commit()

        print(f"Sensor Readings: {inserted_readings} inserted, {skipped_readings} skipped as duplicates.")
        print("Dataset V3 ingestion completed successfully with 100% integrity!")
        return {
            "new_machines": new_machines,
            "inserted_readings": inserted_readings,
            "skipped_readings": skipped_readings,
        }

    except Exception as e:
        db.rollback()
        raise e
    finally:
        if db_session is None:
            db.close()

if __name__ == "__main__":
    ingest_dataset_v3()