"""
Tests for Flask CLI Commands (flask firms)
Verifies command-line execution and parameter handling.
"""

from unittest.mock import patch, MagicMock
from app.models.ingestion import IngestionRun


def test_cli_check_availability(runner):
    """Test flask firms check-availability command."""
    result = runner.invoke(args=["firms", "check-availability"])
    assert result.exit_code == 0
    assert "NASA FIRMS Dataset Availability" in result.output
    assert "MODIS_NRT" in result.output
    assert "VIIRS_SNPP_NRT" in result.output


def test_cli_ingest_without_key(runner, monkeypatch):
    """Test flask firms ingest without FIRMS_MAP_KEY shows notice."""
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    with patch("app.services.firms_service.FirmsApiClient.is_configured", False):
        result = runner.invoke(args=["firms", "ingest", "--source", "MODIS_NRT"])
        assert result.exit_code == 0
        assert "FIRMS_MAP_KEY is not configured" in result.output


def test_cli_ingest_success(runner):
    """Test flask firms ingest command with mocked execution."""
    with patch("app.services.firms_service.FirmsApiClient.is_configured", True), \
         patch("app.services.ingestion_service.IngestionService.run_single_batch") as mock_batch:
        
        mock_run = IngestionRun(
            source_product="MODIS_NRT",
            status="completed",
            total_records=100,
            inserted_records=95,
            duplicate_records=5,
            error_records=0,
            duration_seconds=1.25,
        )
        mock_batch.return_value = mock_run

        result = runner.invoke(args=["firms", "ingest", "--source", "MODIS_NRT", "--days", "2"])
        assert result.exit_code == 0
        assert "Run" in result.output
        assert "COMPLETED" in result.output
        assert "New inserted:    95" in result.output

