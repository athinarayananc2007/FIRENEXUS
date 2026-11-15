"""
Spatial Matching Service
Provides geodesic distance calculations, sensor footprint intersection analysis,
and geographic proximity evaluation for satellite fire observations.
"""

import math
import logging
from typing import Any
from app.models.observation import FireObservation

logger = logging.getLogger(__name__)

# Mean Earth Radius in meters (WGS84 spherical approximation)
EARTH_RADIUS_METERS = 6371000.0


class SpatialMatchingService:
    """Service evaluating spatial distance and pixel footprint overlap between satellite observations."""

    @staticmethod
    def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates great-circle distance between two geographic coordinates in meters
        using the Haversine formula.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        return round(EARTH_RADIUS_METERS * c, 2)

    @staticmethod
    def estimate_effective_radius_meters(
        sensor: str,
        scan: float | None = None,
        track: float | None = None,
    ) -> float:
        """
        Calculates effective circular footprint radius in meters from along-scan and along-track dimensions.
        """
        if scan and track and scan > 0 and track > 0:
            # Equivalent circular radius: sqrt(scan * track / pi) or half geometric mean
            equivalent_radius_km = math.sqrt(scan * track) / 2.0
            return equivalent_radius_km * 1000.0

        # Fallback to sensor nadir nominal footprint radii
        if "VIIRS" in sensor.upper():
            return 375.0 / 2.0  # ~187.5 meters
        return 1000.0 / 2.0     # ~500.0 meters

    @classmethod
    def calculate_footprint_overlap(
        cls,
        obs1: FireObservation,
        obs2: FireObservation,
        distance_meters: float,
    ) -> float:
        """
        Calculates an estimated spatial footprint overlap ratio between two observations [0.0 to 1.0].
        Accounts for the fact that a larger MODIS pixel often completely encompasses a smaller VIIRS pixel.
        """
        r1 = cls.estimate_effective_radius_meters(obs1.sensor, obs1.scan, obs1.track)
        r2 = cls.estimate_effective_radius_meters(obs2.sensor, obs2.scan, obs2.track)

        max_radius = max(r1, r2)
        min_radius = min(r1, r2)

        # If smaller footprint center is well inside larger footprint
        if distance_meters <= (max_radius - min_radius):
            return 1.0

        # If footprints do not touch
        combined_radius = r1 + r2
        if distance_meters >= combined_radius:
            return 0.0

        # Linear decay approximation between contact and containment
        overlap = (combined_radius - distance_meters) / (2.0 * min_radius)
        return round(max(0.0, min(1.0, overlap)), 4)

    @classmethod
    def evaluate_spatial_match(
        cls,
        obs1: FireObservation,
        obs2: FireObservation,
        max_distance_meters: float = 2000.0,
        use_footprint_geometry: bool = True,
    ) -> tuple[bool, float, float | None]:
        """
        Evaluates spatial correspondence between two observations.
        
        Returns:
            Tuple of (is_match, distance_meters, footprint_overlap_ratio).
        """
        dist = cls.haversine_distance_meters(
            obs1.latitude, obs1.longitude, obs2.latitude, obs2.longitude
        )

        overlap_ratio = None
        if use_footprint_geometry:
            overlap_ratio = cls.calculate_footprint_overlap(obs1, obs2, dist)

        # Primary spatial condition: center distance within threshold
        if dist <= max_distance_meters:
            return True, dist, overlap_ratio

        # Footprint expansion condition: center distance slightly exceeds fixed threshold,
        # but wide off-nadir pixel footprints overlap
        if use_footprint_geometry and overlap_ratio is not None and overlap_ratio > 0.15:
            return True, dist, overlap_ratio

        return False, dist, overlap_ratio
