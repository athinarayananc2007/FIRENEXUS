"""
Tests for Anomaly Detection Service
Verifies Z-score, Modified Z-score (MAD), IQR, spatial isolation,
brightness saturation detection, and duplicate anomaly prevention.
"""

from datetime import datetime, timezone, date
import pytest
from app.models.observation import FireObservation
from app.models.analytics import AnomalyDetection
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.services.analytics_repository import AnalyticsRepository
from app.extensions import db


def test_z_score_calculation():
    """Verify standard Z-score calculation."""
    values = [10.0, 10.0, 10.0, 10.0, 100.0]  # 100 is an extreme outlier
    z_scores = AnomalyDetectionService.calculate_z_scores(values)
    assert len(z_scores) == 5
    assert z_scores[-1] > 1.5


def test_modified_z_score_calculation():
    """Verify robust Modified Z-score calculation with Median Absolute Deviation."""
    values = [10.0, 12.0, 11.0, 10.5, 11.5, 12.0, 250.0]  # 250 is an extreme outlier
    mod_z = AnomalyDetectionService.calculate_modified_z_scores(values)
    assert len(mod_z) == 7
    # Outlier must have high Modified Z-score
    assert mod_z[-1] > 3.5


def test_iqr_thresholds_calculation():
    """Verify Interquartile Range upper fence calculation."""
    values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]
    q1, q3, upper_bound = AnomalyDetectionService.calculate_iqr_thresholds(values, multiplier=1.5)
    assert q1 == 30.0
    assert q3 == 70.0
    assert upper_bound == 70.0 + 1.5 * (70.0 - 30.0)  # 130.0


def test_detect_frp_anomalies():
    """Verify flagging of extreme FRP observations grouped by sensor."""
    obs_list = [
        FireObservation(id=f"obs-{i}", sensor="MODIS", satellite="Aqua", frp=20.0 + i)
        for i in range(10)
    ]
    # Add an extreme 800 MW fire observation
    extreme_obs = FireObservation(id="obs-extreme", sensor="MODIS", satellite="Aqua", frp=850.0)
    obs_list.append(extreme_obs)

    anomalies = AnomalyDetectionService.detect_frp_anomalies(obs_list, method="modified_z_score", threshold=3.5)
    assert len(anomalies) == 1
    assert anomalies[0]["observation_id"] == "obs-extreme"
    assert anomalies[0]["anomaly_type"] == "high_frp"
    assert anomalies[0]["anomaly_score"] >= 3.5


def test_detect_brightness_anomalies():
    """Verify detection of brightness temperature saturation thresholds."""
    obs_normal = FireObservation(id="obs-norm", sensor="VIIRS", satellite="Suomi-NPP", brightness=320.0)
    obs_saturated_viirs = FireObservation(id="obs-sat-v", sensor="VIIRS", satellite="Suomi-NPP", brightness=367.0)
    obs_saturated_modis = FireObservation(id="obs-sat-m", sensor="MODIS", satellite="Aqua", brightness=460.0)

    anomalies = AnomalyDetectionService.detect_brightness_anomalies([obs_normal, obs_saturated_viirs, obs_saturated_modis])
    assert len(anomalies) == 2
    flagged_ids = {a["observation_id"] for a in anomalies}
    assert flagged_ids == {"obs-sat-v", "obs-sat-m"}


def test_detect_spatial_isolation():
    """Verify detection of spatially isolated hotspots > 15 km from nearest neighbor."""
    # 2 clustered observations around (-35.0, 149.0)
    obs1 = FireObservation(id="cluster-1", sensor="MODIS", latitude=-35.0, longitude=149.0)
    obs2 = FireObservation(id="cluster-2", sensor="MODIS", latitude=-35.01, longitude=149.01)

    # 1 isolated observation in Sydney (~250 km away)
    obs_iso = FireObservation(id="isolated-1", sensor="VIIRS", latitude=-33.86, longitude=151.20)

    anomalies = AnomalyDetectionService.detect_spatial_isolation([obs1, obs2, obs_iso], isolation_distance_meters=15000.0)
    assert len(anomalies) == 1
    assert anomalies[0]["observation_id"] == "isolated-1"
    assert anomalies[0]["anomaly_type"] == "spatial_isolation"


def test_duplicate_anomaly_prevention(app):
    """Verify that duplicate anomaly insertion is skipped idempotently."""
    obs = FireObservation(
        id="obs-anom-dup",
        dedup_hash="dup_hash_anom_1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc),
        latitude=0.0,
        longitude=0.0,
        brightness=320.0,
        frp=200.0,
        confidence="high",
    )
    db.session.add(obs)
    db.session.commit()

    anomaly_dict = {
        "observation_id": obs.id,
        "sensor": "MODIS",
        "satellite": "Aqua",
        "anomaly_type": "high_frp",
        "method": "modified_z_score",
        "anomaly_score": 4.2,
        "threshold_applied": 3.5,
        "metric_name": "frp",
        "metric_value": 200.0,
        "explanation": "High FRP Z-score",
        "algorithm_version": "v1.0.0",
    }

    # First insert
    ins1, skip1 = AnalyticsRepository.bulk_insert_anomalies([anomaly_dict])
    assert ins1 == 1
    assert skip1 == 0

    # Duplicate insert
    ins2, skip2 = AnalyticsRepository.bulk_insert_anomalies([anomaly_dict])
    assert ins2 == 0
    assert skip2 == 1
