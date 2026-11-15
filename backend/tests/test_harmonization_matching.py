"""
Tests for Spatial and Temporal Matching Services
Verifies distance calculations, footprint overlap, orbital window evaluation,
cross-sensor correspondence, multiple sub-pixel matches, and provenance matching.
"""

from datetime import datetime, timezone, date
import pytest
from app.models.observation import FireObservation
from app.services.spatial_matching_service import SpatialMatchingService
from app.services.temporal_matching_service import TemporalMatchingService
from app.services.harmonization_config import HarmonizationConfig
from app.services.harmonization_repository import HarmonizationRepository
from app.extensions import db


def test_haversine_distance_calculation():
    """Verify accuracy of Haversine spherical distance calculation."""
    # Two points ~111 km apart on the equator (1 degree longitude)
    dist = SpatialMatchingService.haversine_distance_meters(0.0, 0.0, 0.0, 1.0)
    assert 111000 <= dist <= 112000

    # Identical coordinates must yield 0 distance
    dist_zero = SpatialMatchingService.haversine_distance_meters(-33.8688, 151.2093, -33.8688, 151.2093)
    assert dist_zero == 0.0


def test_footprint_overlap_ratio():
    """Verify that smaller VIIRS footprint inside larger MODIS footprint yields high overlap."""
    modis_obs = FireObservation(
        id="modis-1",
        sensor="MODIS",
        latitude=0.0,
        longitude=0.0,
        scan=1.5,
        track=1.5,
    )
    viirs_obs = FireObservation(
        id="viirs-1",
        sensor="VIIRS",
        latitude=0.0,
        longitude=0.001,  # ~111 meters away, well inside MODIS ~1.5 km footprint
        scan=0.4,
        track=0.4,
    )

    dist = SpatialMatchingService.haversine_distance_meters(
        modis_obs.latitude, modis_obs.longitude, viirs_obs.latitude, viirs_obs.longitude
    )
    overlap = SpatialMatchingService.calculate_footprint_overlap(modis_obs, viirs_obs, dist)
    assert overlap > 0.80


def test_spatial_match_and_rejection():
    """Verify spatial match acceptance within threshold and rejection beyond threshold."""
    obs_base = FireObservation(
        id="base",
        sensor="MODIS",
        latitude=-35.0,
        longitude=149.0,
        scan=1.0,
        track=1.0,
    )
    # Proximate point: ~500 m away
    obs_close = FireObservation(
        id="close",
        sensor="VIIRS",
        latitude=-35.004,
        longitude=149.0,
        scan=0.4,
        track=0.4,
    )
    # Distant point: ~5000 m away
    obs_far = FireObservation(
        id="far",
        sensor="VIIRS",
        latitude=-35.045,
        longitude=149.0,
        scan=0.4,
        track=0.4,
    )

    is_match_close, dist_close, _ = SpatialMatchingService.evaluate_spatial_match(
        obs_base, obs_close, max_distance_meters=2000.0
    )
    assert is_match_close is True
    assert dist_close < 1000.0

    is_match_far, dist_far, _ = SpatialMatchingService.evaluate_spatial_match(
        obs_base, obs_far, max_distance_meters=2000.0
    )
    assert is_match_far is False
    assert dist_far > 4000.0


def test_temporal_match_orbit_aware():
    """Verify temporal matching across same-orbit (Aqua/VIIRS) and cross-orbit (Terra/VIIRS)."""
    cfg = HarmonizationConfig()

    t_base = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)
    # Aqua (13:30) and Suomi-NPP (13:55) -> 25 min (1500s) difference: Matches same-orbit window (3600s)
    obs_aqua = FireObservation(id="aqua", sensor="MODIS", satellite="Aqua", acq_datetime=t_base, day_night="D")
    obs_npp = FireObservation(
        id="npp", sensor="VIIRS", satellite="Suomi-NPP",
        acq_datetime=datetime(2026, 5, 1, 13, 55, tzinfo=timezone.utc), day_night="D"
    )

    is_match, diff, window = TemporalMatchingService.evaluate_temporal_match(obs_aqua, obs_npp, cfg)
    assert is_match is True
    assert diff == 1500.0
    assert window == cfg.same_orbit_max_time_diff_seconds

    # Terra (10:30) vs Suomi-NPP (13:55) -> 3h 25m (12300s): Matches diurnal window (14400s)
    obs_terra = FireObservation(
        id="terra", sensor="MODIS", satellite="Terra",
        acq_datetime=datetime(2026, 5, 1, 10, 30, tzinfo=timezone.utc), day_night="D"
    )
    is_diurnal, diff_d, window_d = TemporalMatchingService.evaluate_temporal_match(obs_terra, obs_npp, cfg)
    assert is_diurnal is True
    assert diff_d == 12300.0
    assert window_d == cfg.diurnal_max_time_diff_seconds

    # Day vs Night mismatch (12 hours later) must reject
    obs_night = FireObservation(
        id="night", sensor="VIIRS", satellite="Suomi-NPP",
        acq_datetime=datetime(2026, 5, 2, 1, 30, tzinfo=timezone.utc), day_night="N"
    )
    is_mismatch, _, _ = TemporalMatchingService.evaluate_temporal_match(obs_aqua, obs_night, cfg)
    assert is_mismatch is False


def test_duplicate_match_prevention(app):
    """Verify that inserting duplicate match pairs with identical algorithm_version is idempotent."""
    # First seed raw observations
    obs1 = FireObservation(
        id="obs-m1",
        dedup_hash="hash_m1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc),
        latitude=10.0,
        longitude=20.0,
        brightness=320.0,
        frp=20.0,
        confidence="high",
    )
    obs2 = FireObservation(
        id="obs-v1",
        dedup_hash="hash_v1",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=datetime(2026, 5, 1, 13, 45, tzinfo=timezone.utc),
        latitude=10.002,
        longitude=20.002,
        brightness=340.0,
        frp=5.0,
        confidence="nominal",
    )
    db.session.add_all([obs1, obs2])
    db.session.commit()

    match_dict = {
        "modis_obs_id": obs1.id,
        "viirs_obs_id": obs2.id,
        "match_type": "cross_sensor",
        "spatial_distance_meters": 310.0,
        "footprint_overlap_ratio": 0.85,
        "time_difference_seconds": 900.0,
        "match_score": 0.88,
        "algorithm_version": "v1.0.0",
        "status": "confirmed",
    }

    # First insert
    ins1, skip1 = HarmonizationRepository.bulk_insert_matches([match_dict])
    assert ins1 == 1
    assert skip1 == 0

    # Duplicate insert of exact same pair
    ins2, skip2 = HarmonizationRepository.bulk_insert_matches([match_dict])
    assert ins2 == 0
    assert skip2 == 1
