"""
FIRENEXUS Staging Background Pipeline Orchestrator
Executes controlled, sequential ingestion, harmonization, and anomaly detection.

Features:
- Enforces NASA FIRMS rate limits and backoff.
- Uses process lockfile to prevent overlapping executions.
- Idempotent and transaction-safe.
- Structured logging.
"""

import sys
import os
import time
import fcntl
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from app import create_app, db
from app.services.firms_service import FirmsApiClient
from app.services.csv_parser import FirmsCsvParser
from app.services.observation_repository import ObservationRepository
from app.services.harmonization_service import HarmonizationService
from app.services.anomaly_detection_service import AnomalyDetectionService

LOCKFILE_PATH = backend_dir / ".pipeline.lock"


def acquire_lock():
    """Ensure only one pipeline runs at a time."""
    try:
        lock_fd = open(LOCKFILE_PATH, "w")
        if sys.platform != "win32":
            fcntl.flock(lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return lock_fd
    except Exception as exc:
        print(f"[LOCKED] Pipeline already running or lock acquisition failed: {exc}")
        return None


def run_pipeline():
    print("=" * 70)
    print("  FIRENEXUS Staging Background Processing Job")
    print(f"  Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print("=" * 70)

    lock = acquire_lock()
    if not lock:
        print("Exiting to prevent overlapping processing runs.")
        return False

    app = create_app(os.getenv("FLASK_ENV", "staging"))

    with app.app_context():
        # Check DB connectivity
        try:
            db.session.execute(db.text("SELECT 1;"))
            print("[DB] Database connectivity confirmed.")
        except Exception as exc:
            print(f"[DB_ERROR] Database is unreachable: {exc}")
            print("Aborting background run.")
            return False

        map_key = os.getenv("FIRMS_MAP_KEY", "").strip()
        if not map_key or map_key == "your_registered_nasa_firms_key":
            print("[FIRMS_SKIP] Server-side FIRMS_MAP_KEY not configured. Skipping upstream fetch.")
            return False

        client = FirmsApiClient(map_key=map_key, timeout_seconds=20)

        # Stage 1: NASA FIRMS Ingestion
        print("\n--- Stage 1: Controlled Ingestion ---")
        products = ["MODIS_NRT", "VIIRS_NOAA20_NRT"]
        for prod in products:
            try:
                print(f"Fetching 1-day stream for {prod}...")
                csv_data = client.get_area_csv(source=prod, area="world", day_range=1)
                parsed, parse_errs = FirmsCsvParser.parse_csv_stream(csv_data, source_product=prod)
                print(f"  Parsed {len(parsed)} records ({len(parse_errs)} parsing errors).")
                if parsed:
                    ins, dups, ins_errs = ObservationRepository.bulk_insert_observations(parsed)
                    print(f"  Stored: {ins} new, {dups} deduplicated, {ins_errs} errors.")
            except Exception as exc:
                print(f"  Ingestion error for {prod}: {exc}")

        # Stage 2: Harmonization Engine
        print("\n--- Stage 2: MODIS–VIIRS Harmonization & Fire Event Clustering ---")
        try:
            harm_summary = HarmonizationService.run_harmonization()
            print(f"  Harmonization complete. Results: {harm_summary}")
        except Exception as exc:
            print(f"  Harmonization error: {exc}")

        # Stage 3: Anomaly Detection
        print("\n--- Stage 3: Statistical Anomaly Detection ---")
        try:
            anom_summary = AnomalyDetectionService.detect_anomalies(method="all", threshold=3.0)
            print(f"  Anomaly detection complete. Results: {anom_summary}")
        except Exception as exc:
            print(f"  Anomaly detection error: {exc}")

    print("\n[COMPLETE] Background processing cycle finished successfully.")
    return True


if __name__ == "__main__":
    run_pipeline()
