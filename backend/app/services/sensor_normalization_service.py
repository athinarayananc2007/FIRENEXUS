"""
Sensor Normalization Service
Provides sensor-aware normalization for MODIS and VIIRS thermal anomaly observations.
Calculates pixel footprint geometry, standardizes UTC timestamps, and categorizes confidence
without destroying original raw measurements or fabricating scientific equivalents.
"""

import logging
from datetime import datetime, timezone
from typing import Any
from app.models.observation import FireObservation
from app.models.harmonization import HarmonizedObservation
from app.services.harmonization_config import (
    SENSOR_FOOTPRINTS,
    HARMONIZATION_ALGORITHM_VERSION,
)

logger = logging.getLogger(__name__)


class SensorNormalizationService:
    """Service that standardizes heterogeneous satellite observations into comparable records."""

    @staticmethod
    def calculate_footprint(
        sensor: str,
        scan: float | None = None,
        track: float | None = None,
    ) -> tuple[float, float, float]:
        """
        Estimates along-scan (km), along-track (km), and areal footprint (km^2).
        Falls back to sensor-specific nadir specifications if scan/track are not provided.
        """
        sensor_key = "MODIS" if "MODIS" in sensor.upper() else "VIIRS"
        spec = SENSOR_FOOTPRINTS.get(sensor_key, SENSOR_FOOTPRINTS["MODIS"])

        along_scan = float(scan) if scan is not None and scan > 0 else spec["nadir_scan_km"]
        along_track = float(track) if track is not None and track > 0 else spec["nadir_track_km"]

        # Clamp to physical instrument limits
        along_scan = min(along_scan, spec["max_scan_expansion"])
        along_track = min(along_track, spec["max_track_expansion"])

        area = round(along_scan * along_track, 4)
        return round(along_scan, 3), round(along_track, 3), area

    @staticmethod
    def normalize_confidence(
        sensor: str,
        confidence_str: str | None,
        confidence_raw: str | None = None,
    ) -> tuple[str, float | None]:
        """
        Normalizes confidence into standard category ('low', 'nominal', 'high')
        and extracts numeric score for MODIS (or None for VIIRS).
        
        Crucial scientific distinction:
        MODIS confidence is an algorithmic percentage (0-100%).
        VIIRS confidence is a 3-tier discrete classification ('low', 'nominal', 'high').
        """
        sensor_upper = "MODIS" if "MODIS" in sensor.upper() else "VIIRS"
        raw_val = (confidence_raw or confidence_str or "").strip()

        if sensor_upper == "MODIS":
            try:
                score = float(raw_val)
                score = max(0.0, min(100.0, score))
                if score >= 80.0:
                    category = "high"
                elif score >= 30.0:
                    category = "nominal"
                else:
                    category = "low"
                return category, score
            except (ValueError, TypeError):
                # Fallback if raw was string like 'nominal'
                cat = confidence_str.lower() if confidence_str else "nominal"
                return cat if cat in ("low", "nominal", "high") else "nominal", None
        else:
            # VIIRS has no calibrated 0-100 continuous score in FIRMS
            lowered = raw_val.lower()
            if lowered in ("h", "high"):
                category = "high"
            elif lowered in ("l", "low"):
                category = "low"
            else:
                category = "nominal"
            return category, None

    @classmethod
    def normalize_observation(
        cls,
        obs: FireObservation,
        algorithm_version: str = HARMONIZATION_ALGORITHM_VERSION,
    ) -> dict[str, Any]:
        """
        Transforms a raw FireObservation into normalized attributes for HarmonizedObservation.
        """
        along_scan, along_track, area = cls.calculate_footprint(
            sensor=obs.sensor,
            scan=obs.scan,
            track=obs.track,
        )

        conf_cat, conf_score = cls.normalize_confidence(
            sensor=obs.sensor,
            confidence_str=obs.confidence,
            confidence_raw=obs.confidence_raw,
        )

        # Standardize UTC datetime
        dt = obs.acq_datetime
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)

        return {
            "observation_id": obs.id,
            "source_product": obs.source_product,
            "sensor": obs.sensor,
            "satellite": obs.satellite,
            "product_type": obs.product_type,
            "acq_datetime": dt,
            "latitude": obs.latitude,
            "longitude": obs.longitude,
            "geom": f"SRID=4326;POINT({obs.longitude} {obs.latitude})" if obs.longitude is not None and obs.latitude is not None else None,
            "footprint_along_scan_km": along_scan,
            "footprint_along_track_km": along_track,
            "footprint_area_km2": area,
            "brightness_kelvin": obs.brightness,
            "bright_secondary_kelvin": obs.bright_secondary,
            "frp_mw": obs.frp,
            "confidence_category": conf_cat,
            "confidence_score": conf_score,
            "day_night": obs.day_night,
            "algorithm_version": algorithm_version,
            "normalized_at": datetime.now(timezone.utc),
        }

    @classmethod
    def create_harmonized_instance(
        cls,
        obs: FireObservation,
        algorithm_version: str = HARMONIZATION_ALGORITHM_VERSION,
    ) -> HarmonizedObservation:
        """Creates a HarmonizedObservation model instance from a raw observation."""
        data = cls.normalize_observation(obs, algorithm_version=algorithm_version)
        return HarmonizedObservation(**data)
