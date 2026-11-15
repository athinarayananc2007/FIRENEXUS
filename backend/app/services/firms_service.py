"""
NASA FIRMS API Client Service
Handles authenticated communication with the NASA FIRMS Area and Data Availability APIs.
Enforces timeout, exponential backoff retries, rate-limiting, and credentials security.
"""

import os
import time
import logging
import re
from typing import Any
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

logger = logging.getLogger(__name__)

# Valid NASA FIRMS Dataset Identifiers
VALID_FIRMS_SOURCES = {
    # MODIS (Terra & Aqua)
    "MODIS_NRT": {"sensor": "MODIS", "satellite": "Terra/Aqua", "product_type": "NRT"},
    "MODIS_SP": {"sensor": "MODIS", "satellite": "Terra/Aqua", "product_type": "SP"},
    # VIIRS (Suomi-NPP)
    "VIIRS_SNPP_NRT": {"sensor": "VIIRS", "satellite": "Suomi-NPP", "product_type": "NRT"},
    "VIIRS_SNPP_SP": {"sensor": "VIIRS", "satellite": "Suomi-NPP", "product_type": "SP"},
    # VIIRS (NOAA-20 / JPSS-1)
    "VIIRS_NOAA20_NRT": {"sensor": "VIIRS", "satellite": "NOAA-20", "product_type": "NRT"},
    "VIIRS_NOAA20_SP": {"sensor": "VIIRS", "satellite": "NOAA-20", "product_type": "SP"},
    # VIIRS (NOAA-21 / JPSS-2)
    "VIIRS_NOAA21_NRT": {"sensor": "VIIRS", "satellite": "NOAA-21", "product_type": "NRT"},
    "VIIRS_NOAA21_SP": {"sensor": "VIIRS", "satellite": "NOAA-21", "product_type": "SP"},
}

BASE_FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api"


class FirmsApiError(Exception):
    """Custom exception raised for NASA FIRMS API communication errors."""

    def __init__(self, message: str, status_code: int | None = None, is_rate_limit: bool = False):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.is_rate_limit = is_rate_limit


class FirmsApiClient:
    """
    Client for interacting with the NASA FIRMS REST APIs.
    """

    def __init__(
        self,
        map_key: str | None = None,
        timeout_seconds: int = 45,
        max_retries: int = 3,
        backoff_factor: float = 1.5,
    ):
        # Read from environment if not explicitly passed
        if map_key is not None:
            self._map_key = map_key.strip()
        else:
            self._map_key = os.getenv("FIRMS_MAP_KEY", "").strip()
        self.timeout = timeout_seconds
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.session = requests.Session()

    @property
    def is_configured(self) -> bool:
        """Checks whether a valid non-empty NASA FIRMS MAP_KEY is provided."""
        if not self._map_key:
            return False
        # MAP_KEY should be 32 hex characters and not a placeholder
        is_placeholder = "your_nasa_firms_map_key" in self._map_key.lower() or "example" in self._map_key.lower()
        return len(self._map_key) >= 16 and not is_placeholder

    def _sanitize(self, text_str: str) -> str:
        """Strips the secret MAP_KEY from any string before logging or raising."""
        if self._map_key and self._map_key in text_str:
            return text_str.replace(self._map_key, "[REDACTED_MAP_KEY]")
        return text_str

    def _request_with_retry(self, url: str) -> str:
        """
        Executes HTTP GET request with exponential backoff for transient failures and rate limits.
        """
        sanitized_url = self._sanitize(url)
        logger.info(f"NASA FIRMS API request: {sanitized_url}")

        attempt = 0
        last_error = None

        while attempt < self.max_retries:
            attempt += 1
            try:
                response = self.session.get(url, timeout=self.timeout)

                # Check for rate limiting (HTTP 429)
                if response.status_code == 429:
                    wait_time = self.backoff_factor ** attempt * 2
                    logger.warning(
                        f"NASA FIRMS rate limit reached (HTTP 429). Backing off for {wait_time:.1f}s (attempt {attempt}/{self.max_retries})"
                    )
                    time.sleep(wait_time)
                    continue

                # Check for bad credentials or invalid key (HTTP 401 / 403 or text message)
                if response.status_code in (401, 403):
                    msg = "NASA FIRMS API authentication failed: Invalid or expired MAP_KEY."
                    logger.error(msg)
                    raise FirmsApiError(msg, status_code=response.status_code)

                # Check for server errors (500, 502, 503, 504)
                if 500 <= response.status_code < 600:
                    wait_time = self.backoff_factor ** attempt
                    logger.warning(
                        f"NASA FIRMS server error (HTTP {response.status_code}). Retrying in {wait_time:.1f}s..."
                    )
                    time.sleep(wait_time)
                    continue

                response.raise_for_status()

                text = response.text

                # NASA FIRMS sometimes returns errors as plain text with HTTP 200:
                # e.g., "Invalid MAP_KEY", "Transaction limit reached", "No data available"
                lowered = text.lower().strip()
                if "invalid map_key" in lowered or "invalid key" in lowered:
                    raise FirmsApiError("Invalid NASA FIRMS MAP_KEY provided.", status_code=403)
                if "transaction limit reached" in lowered or "exceeded" in lowered:
                    raise FirmsApiError(
                        "NASA FIRMS transaction limit exceeded for this MAP_KEY.",
                        status_code=429,
                        is_rate_limit=True,
                    )

                return text

            except Timeout as e:
                last_error = e
                wait_time = self.backoff_factor ** attempt
                logger.warning(f"NASA FIRMS API timeout on attempt {attempt}/{self.max_retries}. Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
            except ConnectionError as e:
                last_error = e
                wait_time = self.backoff_factor ** attempt
                logger.warning(f"NASA FIRMS connection error on attempt {attempt}/{self.max_retries}. Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
            except FirmsApiError:
                raise
            except RequestException as e:
                last_error = e
                sanitized_msg = self._sanitize(str(e))
                logger.error(f"NASA FIRMS HTTP error: {sanitized_msg}")
                raise FirmsApiError(f"HTTP error during FIRMS request: {sanitized_msg}") from e

        # If all retries exhausted
        err_msg = self._sanitize(f"Failed to fetch data from NASA FIRMS after {self.max_retries} attempts: {last_error}")
        logger.error(err_msg)
        raise FirmsApiError(err_msg)

    def get_area_csv(
        self,
        source: str,
        area: str = "world",
        day_range: int = 1,
        date: str | None = None,
    ) -> str:
        """
        Queries NASA FIRMS Area API returning CSV active fire observations.
        
        Args:
            source: Dataset identifier (e.g., 'MODIS_NRT', 'VIIRS_SNPP_NRT')
            area: 'world' for global coverage or 'min_lon,min_lat,max_lon,max_lat'
            day_range: Integer between 1 and 5 (NASA Area API constraint)
            date: Optional acquisition date string in 'YYYY-MM-DD' format
            
        Returns:
            Raw CSV text response from NASA FIRMS.
        """
        if not self.is_configured:
            raise FirmsApiError(
                "NASA FIRMS MAP_KEY is not configured in backend/.env. "
                "Obtain a key at https://firms.modaps.eosdis.nasa.gov/api/map_key/ "
                "and set FIRMS_MAP_KEY in backend/.env."
            )

        if source not in VALID_FIRMS_SOURCES:
            valid_list = ", ".join(VALID_FIRMS_SOURCES.keys())
            raise ValueError(f"Invalid NASA FIRMS source '{source}'. Must be one of: {valid_list}")

        # Enforce NASA API constraint: DAY_RANGE is 1 to 5
        if not (1 <= day_range <= 5):
            raise ValueError(f"NASA FIRMS Area API only supports DAY_RANGE between 1 and 5 (got {day_range}).")

        # Validate date format if provided (YYYY-MM-DD)
        if date and not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            raise ValueError(f"Invalid date format '{date}'. Expected YYYY-MM-DD.")

        # Construct endpoint URL
        # Format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA]/[DAY_RANGE]/[DATE]
        url = f"{BASE_FIRMS_URL}/area/csv/{self._map_key}/{source}/{area}/{day_range}"
        if date:
            url += f"/{date}"

        return self._request_with_retry(url)

    def get_data_availability(self, source: str = "all") -> str:
        """
        Queries NASA FIRMS Data Availability API.
        
        Args:
            source: Specific dataset or 'all' for all available instruments.
            
        Returns:
            Raw CSV text detailing min_date, max_date, and sensor status.
        """
        if not self.is_configured:
            raise FirmsApiError(
                "NASA FIRMS MAP_KEY is not configured in backend/.env."
            )

        # Endpoint: https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/[MAP_KEY]/[SOURCE]
        url = f"{BASE_FIRMS_URL}/data_availability/csv/{self._map_key}/{source}"
        return self._request_with_retry(url)

