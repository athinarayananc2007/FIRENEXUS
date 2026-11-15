"""
Tests for Sensor Normalization Service
Verifies attribute normalization, footprint estimation, confidence mapping,
and timestamp standardization across MODIS and VIIRS instruments.
"""

from datetime import datetime, timezone, date
import pytest
from app.models.observation import FireObservation
from app.services.sensor_normalization_service import SensorNormalizationService
from app.services.harmonization_config import SENSOR_FOOTPRINTS, HARMONIZATION_ALGORITHM_VERSION


def test_modis_normalization():
    """Verify MODIS observation normalization with continuous confidence score and footprint."""
    raw_obs = FireObservation(
        id="modis-raw-001",
        dedup_hash="modis_hash_001",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc),
        latitude=-35.2809,
        longitude=149.1300,
        brightness=325.4,
        bright_secondary=295.1,
        frp=35.8,
        confidence="high",
        confidence_raw="85",
        day_night="D",
        scan=1.5,
        track=1.2,
    )

    norm = SensorNormalizationService.normalize_observation(raw_obs)

    assert norm["observation_id"] == "modis-raw-001"
    assert norm["sensor"] == "MODIS"
    assert norm["satellite"] == "Aqua"
    assert norm["footprint_along_scan_km"] == 1.5
    assert norm["footprint_along_track_km"] == 1.2
    assert norm["footprint_area_km2"] == round(1.5 * 1.2, 4)
    assert norm["confidence_category"] == "high"
    assert norm["confidence_score"] == 85.0
    assert norm["brightness_kelvin"] == 325.4
    assert norm["bright_secondary_kelvin"] == 295.1
    assert norm["frp_mw"] == 35.8
    assert norm["algorithm_version"] == HARMONIZATION_ALGORITHM_VERSION


def test_viirs_normalization():
    """Verify VIIRS observation normalization with discrete confidence and smaller footprint."""
    raw_obs = FireObservation(
        id="viirs-raw-001",
        dedup_hash="viirs_hash_001",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=datetime(2026, 5, 1, 13, 45, tzinfo=timezone.utc),
        latitude=-35.2815,
        longitude=149.1310,
        brightness=342.0,
        bright_secondary=298.5,
        frp=6.2,
        confidence="nominal",
        confidence_raw="n",
        day_night="D",
        scan=0.4,
        track=0.4,
    )

    norm = SensorNormalizationService.normalize_observation(raw_obs)

    assert norm["observation_id"] == "viirs-raw-001"
    assert norm["sensor"] == "VIIRS"
    assert norm["satellite"] == "Suomi-NPP"
    assert norm["footprint_along_scan_km"] == 0.4
    assert norm["footprint_along_track_km"] == 0.4
    assert norm["confidence_category"] == "nominal"
    assert norm["confidence_score"] is None  # VIIRS has no continuous 0-100 score in FIRMS
    assert norm["frp_mw"] == 6.2


def test_missing_scan_track_fallback():
    """Verify fallback to sensor nadir nominal footprint when scan/track are None or 0."""
    raw_modis = FireObservation(
        id="modis-no-scan",
        dedup_hash="modis_hash_002",
        source_product="MODIS_SP",
        sensor="MODIS",
        satellite="Terra",
        product_type="SP",
        acq_date=date(2026, 5, 1),
        acq_time="10:30",
        acq_datetime=datetime(2026, 5, 1, 10, 30, tzinfo=timezone.utc),
        latitude=0.0,
        longitude=0.0,
        brightness=310.0,
        frp=15.0,
        confidence="nominal",
        confidence_raw="50",
        scan=None,
        track=None,
    )

    norm = SensorNormalizationService.normalize_observation(raw_modis)
    assert norm["footprint_along_scan_km"] == SENSOR_FOOTPRINTS["MODIS"]["nadir_scan_km"]
    assert norm["footprint_along_track_km"] == SENSOR_FOOTPRINTS["MODIS"]["nadir_track_km"]
    assert norm["footprint_area_km2"] == 1.0


def test_confidence_boundary_categorization():
    """Verify MODIS 3-tier boundary categorization (>=80 high, 30-79 nominal, <30 low)."""
    cat_high, score_high = SensorNormalizationService.normalize_confidence("MODIS", "high", "80")
    assert cat_high == "high"
    assert score_high == 80.0

    cat_nom, score_nom = SensorNormalizationService.normalize_confidence("MODIS", "nominal", "79")
    assert cat_nom == "nominal"
    assert score_nom == 79.0

    cat_low, score_low = SensorNormalizationService.normalize_confidence("MODIS", "low", "29")
    assert cat_low == "low"
    assert score_low == 29.0
