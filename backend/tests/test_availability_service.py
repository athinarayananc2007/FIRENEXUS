"""
Tests for NASA FIRMS Availability Service & Availability Route
Verifies discovery, caching, baseline fallback, and API endpoints.
"""

from unittest.mock import MagicMock
from app.services.availability_service import AvailabilityService, MISSION_BASELINES
from app.services.firms_service import FirmsApiClient, FirmsApiError


MOCK_AVAILABILITY_CSV = """data_source,min_date,max_date
MODIS_NRT,2021-01-01,2026-11-14
MODIS_SP,2000-11-01,2024-12-31
VIIRS_SNPP_NRT,2021-01-01,2026-11-14
VIIRS_SNPP_SP,2012-01-20,2024-12-31
VIIRS_NOAA20_NRT,2021-01-01,2026-11-14
VIIRS_NOAA20_SP,2018-01-01,2024-12-31
VIIRS_NOAA21_NRT,2023-01-01,2026-11-14
VIIRS_NOAA21_SP,2023-01-01,2024-12-31
"""


def test_baseline_seeding(app):
    """Test that baseline availability records are seeded for all 8 supported products."""
    records = AvailabilityService.get_all_availability()
    assert len(records) == 8
    sources = {r["source_product"] for r in records}
    for expected_src in MISSION_BASELINES:
        assert expected_src in sources

    # Verify fields on one of them
    modis_nrt = next(r for r in records if r["source_product"] == "MODIS_NRT")
    assert modis_nrt["sensor"] == "MODIS"
    assert modis_nrt["min_date"] == "2020-01-01"


def test_refresh_with_mocked_firms_client(app):
    """Test refreshing availability with live data returned by mocked FirmsApiClient."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    mock_client.get_data_availability.return_value = MOCK_AVAILABILITY_CSV

    updated = AvailabilityService.refresh_availability(firms_client=mock_client)
    assert len(updated) == 8

    records = AvailabilityService.get_all_availability()
    modis_sp = next(r for r in records if r["source_product"] == "MODIS_SP")
    assert modis_sp["min_date"] == "2000-11-01"
    assert modis_sp["max_date"] == "2024-12-31"
    assert modis_sp["status"] == "available"


def test_refresh_failure_falls_back_to_baseline(app):
    """Test that when FirmsApiClient raises an error, fallback baseline is used."""
    mock_client = MagicMock(spec=FirmsApiClient)
    mock_client.is_configured = True
    mock_client.get_data_availability.side_effect = FirmsApiError("Connection timed out", status_code=504)

    records = AvailabilityService.refresh_availability(firms_client=mock_client)
    assert len(records) == 8
    assert all(r["status"] == "baseline_cached" for r in records)


def test_availability_route(client):
    """Test GET /api/v1/availability endpoint."""
    resp = client.get("/api/v1/availability")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "data" in data
    assert len(data["data"]) == 8

    # Test sensor filter on endpoint
    resp_modis = client.get("/api/v1/availability?sensor=MODIS")
    assert resp_modis.status_code == 200
    modis_data = resp_modis.get_json()["data"]
    assert all(r["sensor"] == "MODIS" for r in modis_data)
    assert len(modis_data) == 2  # MODIS_NRT and MODIS_SP

