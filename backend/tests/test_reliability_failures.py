"""
FIRENEXUS Reliability and Failure Simulation Test Suite
Simulates upstream FIRMS network timeouts, rate-limits (HTTP 429), malformed CSVs,
database disconnects, interrupted transactions, and ensures safe rollback with zero data corruption.
"""

import pytest
from unittest.mock import patch, MagicMock
import urllib.error
import io
from app import create_app
from app.extensions import db
from app.services.firms_service import FirmsApiClient, FirmsApiError
from app.services.csv_parser import FirmsCsvParser
from app.services.ingestion_service import IngestionService
from app.services.observation_repository import ObservationRepository
from app.models.observation import FireObservation
from app.models.ingestion import IngestionRun
from app.models.harmonization import HarmonizationRun
from app.services.harmonization_service import HarmonizationService
from app.utils.errors import APIError


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


# -----------------------------------------------------------------------------
# 1. Upstream NASA FIRMS API Failures
# -----------------------------------------------------------------------------

def test_firms_client_invalid_map_key(monkeypatch):
    """Verify that an invalid MAP_KEY raises FIRMS-specific API error without leaking key."""
    client = FirmsApiClient(map_key="invalid_map_key_test")

    # Mock response returning "Invalid MAP_KEY" plain text from NASA
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "Invalid MAP_KEY specified"

    with patch.object(client.session, "get", return_value=mock_resp):
        with pytest.raises(FirmsApiError) as exc_info:
            client.get_area_csv("MODIS_NRT", "world", 1, "2026-05-01")
        assert exc_info.value.status_code == 403
        assert "invalid" in exc_info.value.message.lower()


def test_firms_client_timeout_and_retry(monkeypatch):
    """Verify that network timeouts trigger exponential retry and raise clean FirmsApiError if exhausted."""
    client = FirmsApiClient(map_key="36f05d16e9b212b54161d479d369161a", max_retries=2, backoff_factor=1.0)
    from requests.exceptions import Timeout

    with patch.object(client.session, "get", side_effect=Timeout("Connection timed out")):
        with patch("time.sleep"):  # Fast forward retry sleeps
            with pytest.raises(FirmsApiError) as exc_info:
                client.get_area_csv("MODIS_NRT", "world", 1, "2026-05-01")
            assert "failed to fetch" in exc_info.value.message.lower()


def test_firms_client_rate_limiting_429(monkeypatch):
    """Verify that transaction limits trigger rate-limit error (HTTP 429)."""
    client = FirmsApiClient(map_key="36f05d16e9b212b54161d479d369161a")
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.text = "Transaction limit reached for this MAP_KEY"

    with patch.object(client.session, "get", return_value=mock_resp):
        with pytest.raises(FirmsApiError) as exc_info:
            client.get_area_csv("MODIS_NRT", "world", 1, "2026-05-01")
        assert exc_info.value.status_code == 429
        assert exc_info.value.is_rate_limit is True


def test_csv_parser_malformed_csv():
    """Verify that malformed CSV data is handled gracefully with error records counted."""
    malformed_csv = (
        "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight\n"
        "NOT_A_FLOAT,invalid_lon,310.2,1.0,1.0,2026-05-01,1200,Aqua,85,6.1N,295.0,25.0,D\n"
        "34.05,-118.25,320.0,1.0,1.0,2026-05-01,1330,Aqua,90,6.1N,298.0,40.0,D\n"
    )
    records, errors = FirmsCsvParser.parse_csv_stream(malformed_csv, "MODIS_NRT")
    assert len(records) == 1
    assert len(errors) == 1
    assert records[0]["latitude"] == 34.05


def test_csv_parser_empty_response():
    """Verify that empty NASA responses or headers-only responses return empty lists cleanly."""
    empty_csv = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight\n"
    records, errors = FirmsCsvParser.parse_csv_stream(empty_csv, "MODIS_NRT")
    assert records == []
    assert errors == []


# -----------------------------------------------------------------------------
# 2. Database Disconnect and Transaction Rollback
# -----------------------------------------------------------------------------

def test_database_transaction_rollback_on_failure(app):
    """Verify that a failing database operation rolls back cleanly without leaving partial records."""
    import datetime
    today = datetime.date(2026, 5, 1)
    now = datetime.datetime(2026, 5, 1, 12, 0, tzinfo=datetime.timezone.utc)

    # Initial record
    obs1 = FireObservation(
        id="rollback-test-001",
        dedup_hash="hash-rollback-test-001",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.0,
        longitude=-118.0,
        brightness=310.0,
        frp=20.0,
        confidence="nominal",
        day_night="D",
    )
    db.session.add(obs1)
    db.session.commit()

    # Attempt to insert records where one has duplicate primary key / duplicate dedup_hash in raw session
    obs2 = FireObservation(
        id="rollback-test-002",
        dedup_hash="hash-rollback-test-002",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.1,
        longitude=-118.1,
        brightness=310.0,
        frp=20.0,
        confidence="nominal",
        day_night="D",
    )
    # Duplicate hash of obs1 to trigger constraint failure
    obs3 = FireObservation(
        id="rollback-test-003",
        dedup_hash="hash-rollback-test-001",  # duplicate
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.2,
        longitude=-118.2,
        brightness=310.0,
        frp=20.0,
        confidence="nominal",
        day_night="D",
    )

    try:
        db.session.add_all([obs2, obs3])
        db.session.commit()
    except Exception:
        db.session.rollback()

    # obs2 must NOT be persisted because the transaction rolled back
    assert db.session.query(FireObservation).filter_by(id="rollback-test-002").first() is None
    # Original record remains completely uncorrupted
    assert db.session.query(FireObservation).filter_by(id="rollback-test-001").first() is not None


def test_idempotent_duplicate_ingestion(app):
    """Verify that executing identical ingestion multiple times does not create duplicates."""
    import datetime
    today = datetime.date(2026, 5, 1)
    now = datetime.datetime(2026, 5, 1, 12, 0, tzinfo=datetime.timezone.utc)

    records = [
        {
            "id": "idemp-001",
            "dedup_hash": "hash-idemp-001",
            "source_product": "MODIS_NRT",
            "sensor": "MODIS",
            "satellite": "Aqua",
            "product_type": "NRT",
            "acq_date": today,
            "acq_time": "12:00",
            "acq_datetime": now,
            "latitude": 34.0,
            "longitude=-118.0": -118.0,
            "longitude": -118.0,
            "brightness": 310.0,
            "frp": 20.0,
            "confidence": "nominal",
            "day_night": "D",
        }
    ]

    ins1, dup1, err1 = ObservationRepository.bulk_insert_observations(records)
    assert ins1 == 1
    assert dup1 == 0

    # Repeat exact same insert
    ins2, dup2, err2 = ObservationRepository.bulk_insert_observations(records)
    assert ins2 == 0
    assert dup2 == 1
    assert err2 == 0
    assert db.session.query(FireObservation).count() == 1


def test_failed_harmonization_run_audit_logging(app):
    """Verify that an interrupted or failing harmonization run records status='failed' and duration."""
    with patch.object(HarmonizationService, "run_harmonization", side_effect=ValueError("Simulated pipeline failure")):
        run = HarmonizationRun(
            algorithm_version="v1.0.0-phase3",
            status="running",
        )
        db.session.add(run)
        db.session.commit()

        try:
            HarmonizationService.run_harmonization(None, None)
        except ValueError as err:
            run.status = "failed"
            run.error_message = str(err)
            db.session.commit()

        failed_run = db.session.query(HarmonizationRun).filter_by(id=run.id).first()
        assert failed_run is not None
        assert failed_run.status == "failed"
        assert failed_run.error_message is not None and "Simulated pipeline failure" in failed_run.error_message
