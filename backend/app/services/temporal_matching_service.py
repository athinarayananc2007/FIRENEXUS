"""
Temporal Matching Service
Provides UTC timestamp alignment, time difference calculations, and orbit-aware
temporal matching window evaluation between MODIS and VIIRS observation passes.
"""

import logging
from datetime import datetime, timezone
from typing import Any
from app.models.observation import FireObservation
from app.services.harmonization_config import HarmonizationConfig, SATELLITE_ORBITS

logger = logging.getLogger(__name__)


class TemporalMatchingService:
    """Service evaluating temporal separation and orbital pass alignment between satellite observations."""

    @staticmethod
    def ensure_utc(dt: datetime) -> datetime:
        """Ensures a datetime object is timezone-aware in UTC."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def calculate_time_difference_seconds(cls, dt1: datetime, dt2: datetime) -> float:
        """Calculates absolute time difference in seconds between two timestamps."""
        t1 = cls.ensure_utc(dt1)
        t2 = cls.ensure_utc(dt2)
        delta = abs((t1 - t2).total_seconds())
        return round(delta, 1)

    @staticmethod
    def get_orbit_aware_window_seconds(
        satellite1: str,
        satellite2: str,
        config: HarmonizationConfig,
    ) -> float:
        """
        Determines the scientifically appropriate temporal matching window based on satellite orbits.
        
        - Aqua <-> VIIRS (Both ~13:30 LST ascending): ~15-50 min overpass separation -> 3600s window.
        - Terra <-> VIIRS (Morning ~10:30 LST vs Afternoon ~13:30 LST): ~3 hour separation -> 14400s window.
        - Default: Configurable window (default 7200s / 2 hours).
        """
        orbit1 = SATELLITE_ORBITS.get(satellite1, {}).get("orbit_type", "afternoon")
        orbit2 = SATELLITE_ORBITS.get(satellite2, {}).get("orbit_type", "afternoon")

        if orbit1 == "afternoon" and orbit2 == "afternoon":
            return config.same_orbit_max_time_diff_seconds
        elif (orbit1 == "morning" and orbit2 == "afternoon") or (orbit1 == "afternoon" and orbit2 == "morning"):
            return config.diurnal_max_time_diff_seconds

        return config.default_max_time_diff_seconds

    @classmethod
    def evaluate_temporal_match(
        cls,
        obs1: FireObservation,
        obs2: FireObservation,
        config: HarmonizationConfig | None = None,
    ) -> tuple[bool, float, float]:
        """
        Evaluates temporal correspondence between two observations.
        
        Returns:
            Tuple of (is_match, time_difference_seconds, max_window_seconds).
        """
        cfg = config or HarmonizationConfig()
        time_diff = cls.calculate_time_difference_seconds(obs1.acq_datetime, obs2.acq_datetime)
        window = cls.get_orbit_aware_window_seconds(obs1.satellite, obs2.satellite, cfg)

        # Check day/night match compatibility
        is_same_diurnal_phase = (obs1.day_night == obs2.day_night) if (obs1.day_night and obs2.day_night) else True

        # Candidate match if within orbital window and identical diurnal phase (or cross-orbit diurnal)
        is_match = (time_diff <= window) and is_same_diurnal_phase

        return is_match, time_diff, window
