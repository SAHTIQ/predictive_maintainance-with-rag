import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.database.session import SessionLocal
from backend.app.models.entities import Machine, HealthRecord, RiskRecord, RecommendationRecord
from backend.app.services.db_pipeline import DatabasePipelineService


def main():
    db = SessionLocal()

    try:
        machines = (
            db.query(Machine.machine_id)
            .order_by(Machine.machine_id)
            .all()
        )

        pipeline = DatabasePipelineService()

        processed = 0
        skipped = 0
        failed = 0

        print(f"Found {len(machines)} machines.")

        for (machine_id,) in machines:
            existing_health = (
                db.query(HealthRecord)
                .filter(HealthRecord.machine_id == machine_id)
                .count()
            )

            existing_risk = (
                db.query(RiskRecord)
                .filter(RiskRecord.machine_id == machine_id)
                .count()
            )

            existing_recommendation = (
                db.query(RecommendationRecord)
                .filter(
                    RecommendationRecord.machine_id == machine_id
                )
                .count()
            )

            # Skip machines that already have the complete decision set.
            if (
                existing_health > 0
                and existing_risk > 0
                and existing_recommendation > 0
            ):
                print(f"[SKIP] {machine_id} - decision already exists")
                skipped += 1
                continue

            try:
                print(f"[PROCESS] {machine_id}")

                pipeline.process_and_persist_machine_decision(
                    db,
                    machine_id
                )

                processed += 1
                print(f"[OK] {machine_id}")

            except Exception as exc:
                db.rollback()
                failed += 1
                print(f"[FAILED] {machine_id}: {exc}")

        print("\n========================================")
        print("Processing completed")
        print("========================================")
        print(f"Processed : {processed}")
        print(f"Skipped   : {skipped}")
        print(f"Failed    : {failed}")

    finally:
        db.close()


if __name__ == "__main__":
    main()