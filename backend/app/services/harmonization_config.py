"""
FIRENEXUS Harmonization Configuration & Scientific Baselines
Defines spatiotemporal thresholds, footprint estimation models, and algorithm parameters
for MODIS and VIIRS cross-sensor correspondence and fire event grouping.
"""

from dataclasses import dataclass, field
from typing import Any


# Current Harmonization Engine Algorithm Version
HARMONIZATION_ALGORITHM_VERSION = "v1.0.0"

# Sensor Footprint Specifications (Nadir values in km)
SENSOR_FOOTPRINTS = {
    "MODIS": {
        "nadir_scan_km": 1.0,
        "nadir_track_km": 1.0,
        "max_scan_expansion": 4.8,   # Up to ~4.8 km along-scan at swath edge (+-55 deg)
        "max_track_expansion": 2.0,  # Up to ~2.0 km along-track at swath edge
        "nominal_resolution_m": 1000.0,
        "primary_band": "4 µm (Band 21/22)",
        "secondary_band": "11 µm (Band 31)",
        "saturation_temp_k": 500.0,
        "min_detectable_frp_mw": 8.0,
    },
    "VIIRS": {
        "nadir_scan_km": 0.375,
        "nadir_track_km": 0.375,
        "max_scan_expansion": 0.8,   # Constrained to ~0.8 km by onboard aggregation (+-56 deg)
        "max_track_expansion": 0.8,
        "nominal_resolution_m": 375.0,
        "primary_band": "4 µm (Band I4)",
        "secondary_band": "11 µm (Band I5)",
        "saturation_temp_k": 367.0,
        "min_detectable_frp_mw": 0.5,
    },
}

# Orbital Characteristics & Equator Crossing Times (Local Solar Time)
SATELLITE_ORBITS = {
    "Terra": {"sensor": "MODIS", "equator_crossing_lst": "10:30 (descending)", "orbit_type": "morning"},
    "Aqua": {"sensor": "MODIS", "equator_crossing_lst": "13:30 (ascending)", "orbit_type": "afternoon"},
    "Suomi-NPP": {"sensor": "VIIRS", "equator_crossing_lst": "13:30 (ascending)", "orbit_type": "afternoon"},
    "NOAA-20": {"sensor": "VIIRS", "equator_crossing_lst": "13:30 (ascending, 50m offset)", "orbit_type": "afternoon"},
    "NOAA-21": {"sensor": "VIIRS", "equator_crossing_lst": "13:30 (ascending, phased)", "orbit_type": "afternoon"},
}


@dataclass
class HarmonizationConfig:
    """
    Configuration dataclass controlling spatial matching, temporal matching,
    and event grouping behavior.
    """
    # Algorithm version tag
    algorithm_version: str = HARMONIZATION_ALGORITHM_VERSION

    # Spatial matching parameters
    max_spatial_distance_meters: float = 2000.0  # Max center-to-center distance (2.0 km)
    use_footprint_geometry: bool = True           # Use scan/track footprint overlap check
    min_footprint_overlap_ratio: float = 0.05    # Minimum overlap threshold for match candidate

    # Temporal matching parameters
    default_max_time_diff_seconds: float = 7200.0  # 2 hours default temporal window
    same_orbit_max_time_diff_seconds: float = 3600.0  # 1 hour for afternoon pairs (Aqua <-> VIIRS)
    diurnal_max_time_diff_seconds: float = 14400.0   # 4 hours for morning-afternoon (Terra <-> VIIRS)

    # Correspondence confidence scoring weights
    spatial_weight: float = 0.60
    temporal_weight: float = 0.40
    min_match_score: float = 0.25  # Candidates below this score are rejected

    # Fire event grouping parameters
    event_spatial_radius_meters: float = 3000.0   # 3.0 km clustering radius
    event_temporal_window_seconds: float = 43200.0 # 12 hours temporal window
    max_event_diameter_meters: float = 15000.0     # 15.0 km maximum cluster diameter to prevent runaway chaining

    # Processing limits
    batch_size: int = 500

    def to_dict(self) -> dict[str, Any]:
        """Serializes configuration to dictionary for audit logging."""
        return {
            "algorithm_version": self.algorithm_version,
            "max_spatial_distance_meters": self.max_spatial_distance_meters,
            "use_footprint_geometry": self.use_footprint_geometry,
            "min_footprint_overlap_ratio": self.min_footprint_overlap_ratio,
            "default_max_time_diff_seconds": self.default_max_time_diff_seconds,
            "same_orbit_max_time_diff_seconds": self.same_orbit_max_time_diff_seconds,
            "diurnal_max_time_diff_seconds": self.diurnal_max_time_diff_seconds,
            "spatial_weight": self.spatial_weight,
            "temporal_weight": self.temporal_weight,
            "min_match_score": self.min_match_score,
            "event_spatial_radius_meters": self.event_spatial_radius_meters,
            "event_temporal_window_seconds": self.event_temporal_window_seconds,
            "max_event_diameter_meters": self.max_event_diameter_meters,
            "batch_size": self.batch_size,
        }
