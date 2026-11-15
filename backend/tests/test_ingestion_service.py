"""
Tests for NASA FIRMS Ingestion Orchestration Service
Verifies batch execution, 5-day chunking, deduplication idempotence, and audit logging.
"""

from unittest.mock import MagicMock
import pytest
from app.services.ingestion_service import IngestionService
from app.services.firms_service import FirmsApiClient, FirmsApiError
from app.models.observation import FireObservation
from app.models.ingestion import IngestionRun, IngestionLog
from app.extensions import db


MOCK_MODIS_CSV = """latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
-33.8688,151.2093,312.4,1.1,1.0,2026-05-01,0435,T,MODIS,85,6.1NRT,291.2,14.6,D
-37.8136,144.9631,305.2,1.0,1.0,2026-05-01,0435,A,MODIS,50,6.1NRT,289.0,8.2,D
"""


def test_run_single_batch_success(app):
    """Test successful ingestion of a single batch using mocked API client."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    mock_client.get_area_csv.return_value = MOCK_MODIS_CSV

    run = IngestionService.run_single_batch(
        source_product="MODIS_NRT",
        area="world",
        day_range=1,
        date_str="2026-05-01",
        firms_client=mock_client,
    )

    assert run.status == "completed"
    assert run.total_records == 2
    assert run.inserted_records == 2
    assert run.duplicate_records == 0
    assert run.error_records == 0
    assert run.duration_seconds >= 0

    # Verify observations in database
    obs = db.session.query(FireObservation).all()
    assert len(obs) == 2
    assert {o.latitude for o in obs} == {-33.8688, -37.8136}

    # Verify audit logs created
    logs = IngestionService.get_run_logs(run_id=run.id)
    assert len(logs) >= 2  # Start log + completion log
    assert any("Completed run" in l["message"] for l in logs)


def test_idempotent_deduplication(app):
    """Test that ingesting the identical dataset a second time produces 0 inserts and duplicates."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    mock_client.get_area_csv.return_value = MOCK_MODIS_CSV

    # First run
    run1 = IngestionService.run_single_batch(
        source_product="MODIS_NRT",
        area="world",
        day_range=1,
        date_str="2026-05-01",
        firms_client=mock_client,
    )
    assert run1.inserted_records == 2
    assert run1.duplicate_records == 0

    # Second run with exact same data
    run2 = IngestionService.run_single_batch(
        source_product="MODIS_NRT",
        area="world",
        day_range=1,
        date_str="2026-05-01",
        firms_client=mock_client,
    )
    assert run2.inserted_records == 0
    assert run2.duplicate_records == 2

    # Total in DB must remain exactly 2
    assert db.session.query(FireObservation).count() == 2


def test_ingest_date_range_chunking(app):
    """Test that a 12-day date range is correctly partitioned into chunks of <= 5 days."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    # Return empty CSV for each chunk
    mock_client.get_area_csv.return_value = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight\n"

    # Range: 2026-05-01 to 2026-05-12 = 12 days
    # Expected chunks: [5 days (May 1-5), 5 days (May 6-10), 2 days (May 11-12)]
    runs = IngestionService.ingest_date_range(
        source_product="MODIS_NRT",
        start_date="2026-05-01",
        end_date="2026-05-12",
        firms_client=mock_client,
    )

    assert len(runs) == 3
    assert runs[0].day_range == 5
    assert runs[1].day_range == 5
    assert runs[2].day_range == 2
    assert all(r.day_range <= 5 for r in runs)
    assert mock_client.get_area_csv.call_count == 3


def test_ingest_date_range_invalid_dates(app):
    """Test that start_date > end_date raises ValueError."""
    with pytest.raises(ValueError, match="cannot be later than end_date"):
        IngestionService.ingest_date_range(
            source_product="MODIS_NRT",
            start_date="2026-05-10",
            end_date="2026-05-01",
        )


def test_run_failure_handling(app):
    """Test that upstream API errors update IngestionRun to failed with error message."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    mock_client.get_area_csv.side_effect = FirmsApiError("NASA API 500 Internal Server Error", status_code=500)

    run = IngestionService.run_single_batch(
        source_product="MODIS_NRT",
        area="world",
        day_range=1,
        date_str="2026-05-01",
        firms_client=mock_client,
    )

    assert run.status == "failed"
    assert "NASA API 500" in run.error_message
    assert run.completed_at is not None

    # Check error log
    logs = IngestionService.get_run_logs(run_id=run.id)
    assert any(l["level"] == "ERROR" for l in logs)

