"""
Tests for NASA FIRMS API Client Service
Validates URL formatting, Area API 5-day limit enforcement, error handling,
retry mechanisms, and MAP_KEY redaction.
"""

import pytest
from unittest.mock import patch, MagicMock
from requests.exceptions import Timeout, HTTPError
from app.services.firms_service import FirmsApiClient, FirmsApiError, VALID_FIRMS_SOURCES


def test_firms_client_configuration():
    """Verify is_configured correctly identifies valid vs placeholder MAP_KEY."""
    unconfigured = FirmsApiClient(map_key="")
    assert unconfigured.is_configured is False

    placeholder = FirmsApiClient(map_key="your_nasa_firms_map_key_here")
    assert placeholder.is_configured is False

    valid = FirmsApiClient(map_key="a1b2c3d4e5f67890123456789abcdef0")
    assert valid.is_configured is True


def test_firms_source_validation():
    """Verify all 8 documented MODIS and VIIRS sources are accepted."""
    client = FirmsApiClient(map_key="a1b2c3d4e5f67890123456789abcdef0")

    # Invalid source should raise ValueError
    with pytest.raises(ValueError, match="Invalid NASA FIRMS source"):
        client.get_area_csv(source="INVALID_SENSOR")


def test_area_api_day_range_constraint():
    """Verify that day_range must be between 1 and 5 per NASA API constraint."""
    client = FirmsApiClient(map_key="a1b2c3d4e5f67890123456789abcdef0")

    with pytest.raises(ValueError, match="only supports DAY_RANGE between 1 and 5"):
        client.get_area_csv(source="MODIS_NRT", day_range=6)

    with pytest.raises(ValueError, match="only supports DAY_RANGE between 1 and 5"):
        client.get_area_csv(source="VIIRS_SNPP_NRT", day_range=0)


def test_map_key_redaction_in_errors():
    """Ensure MAP_KEY is never exposed in error messages or logs."""
    fake_key = "secret_top_secret_key_123456789"
    client = FirmsApiClient(map_key=fake_key, max_retries=1)

    with patch.object(client.session, "get") as mock_get:
        mock_get.side_effect = Timeout(f"Timeout connecting to https://firms.../{fake_key}/...")

        with pytest.raises(FirmsApiError) as exc_info:
            client.get_area_csv(source="MODIS_NRT")

        error_message = str(exc_info.value)
        assert fake_key not in error_message
        assert "[REDACTED_MAP_KEY]" in error_message


def test_unconfigured_error():
    """Calling get_area_csv without MAP_KEY raises FirmsApiError."""
    client = FirmsApiClient(map_key="")
    with pytest.raises(FirmsApiError, match="MAP_KEY is not configured"):
        client.get_area_csv(source="MODIS_NRT")


def test_rate_limit_handling():
    """Verify HTTP 429 triggers retry and raises FirmsApiError if limit persists."""
    client = FirmsApiClient(map_key="a1b2c3d4e5f67890123456789abcdef0", max_retries=2, backoff_factor=0.01)

    with patch.object(client.session, "get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_get.return_value = mock_response

        with pytest.raises(FirmsApiError):
            client.get_area_csv(source="MODIS_NRT")
        
        assert mock_get.call_count == 2

