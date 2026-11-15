"""
Tests for Analytics REST API Routes
Verifies FRP stats, cross-sensor comparison, calibration, anomaly detection,
trends, diurnal distributions, and administrative security.
"""

from unittest.mock import patch
import os
from datetime import datetime, timezone, date
import pytest
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import ObservationMatch, FireEvent
from app.models.analytics import AnomalyDetection, CalibrationModel


def _seed_analytics_observations():
    """Seeds sample observations and matches for API testing."""
    t0 = datetime(2026, 5, 1, 10, 30, tzinfo=timezone.utc)
    t1 = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)
    t2 = datetime(2026, 5, 1, 13, 45, tzinfo=timezone.utc)

    obs1 = FireObservation(
        id="anom-obs-1",
        dedup_hash="h_anom_1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Terra",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="10:30",
        acq_datetime=t0,
        latitude=-35.0,
        longitude=149.0,
        brightness=320.0,
        frp=30.0,
        confidence="high",
        day_night="D",
    )
    obs2 = FireObservation(
        id="anom-obs-2",
        dedup_hash="h_anom_2",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=t1,
        latitude=-35.002,
        longitude=149.002,
        brightness=330.0,
        frp=40.0,
        confidence="high",
        day_night="D",
    )
    obs3 = FireObservation(
        id="anom-obs-3",
        dedup_hash="h_anom_3",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=t2,
        latitude=-35.003,
        longitude=149.003,
        brightness=370.0,  # Saturated VIIRS
        frp=450.0,        # Extreme FRP anomaly
        confidence="high",
        day_night="D",
    )
    db.session.add_all([obs1, obs2, obs3])
    db.session.commit()

    # Create match
    match = ObservationMatch(
        id="anom-match-1",
        modis_obs_id=obs2.id,
        viirs_obs_id=obs3.id,
        match_type="cross_sensor",
        spatial_distance_meters=150.0,
        time_difference_seconds=900.0,
        match_score=0.88,
    )
    db.session.add(match)
    db.session.commit()


def test_get_frp_distribution_endpoint(client, app):
    """Test GET /api/v1/analytics/frp."""
    _seed_analytics_observations()

    resp = client.get("/api/v1/analytics/frp")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["distribution"]["sample_size"] == 3
    assert data["distribution"]["max"] == 450.0


def test_get_frp_comparison_endpoint(client, app):
    """Test GET /api/v1/analytics/frp/comparison."""
    _seed_analytics_observations()

    resp = client.get("/api/v1/analytics/frp/comparison?min_score=0.50")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["paired_count"] == 1
    assert "correlation" in data
    assert "error_metrics" in data


def test_get_analytics_summary_endpoint(client, app):
    """Test GET /api/v1/analytics/summary."""
    resp = client.get("/api/v1/analytics/summary")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert "anomalies" in data
    assert "calibration_models" in data


def test_detect_anomalies_endpoint_auth(client):
    """Test admin authentication on POST /api/v1/analytics/anomalies/detect."""
    # 401 without auth header
    resp_401 = client.post("/api/v1/analytics/anomalies/detect")
    assert resp_401.status_code == 401

    # 403 with invalid auth header
    resp_403 = client.post(
        "/api/v1/analytics/anomalies/detect",
        headers={"X-Admin-Key": "invalid-secret-key"}
    )
    assert resp_403.status_code == 403


def test_detect_anomalies_endpoint_success(client, app, monkeypatch):
    """Test successful execution of anomaly detection via API."""
    _seed_analytics_observations()
    admin_key = "test-analytics-admin-key"
    monkeypatch.setenv("ADMIN_API_KEY", admin_key)

    resp = client.post(
        "/api/v1/analytics/anomalies/detect",
        headers={"X-Admin-Key": admin_key},
        json={"method": "modified_z_score", "threshold": 3.0},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["data"]["records_analyzed"] == 3


def test_get_trends_endpoint(client, app):
    """Test GET /api/v1/analytics/trends."""
    _seed_analytics_observations()

    resp = client.get("/api/v1/analytics/trends?period=daily")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["period_type"] == "daily"
    assert len(data["trends"]) >= 1


def test_get_diurnal_endpoint(client, app):
    """Test GET /api/v1/analytics/diurnal."""
    _seed_analytics_observations()

    resp = client.get("/api/v1/analytics/diurnal")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data["hourly_distribution"]) == 24
    assert len(data["satellite_sampling_profiles"]) >= 5


def test_get_analytics_runs_endpoint(client, app):
    """Test GET /api/v1/analytics/runs."""
    resp = client.get("/api/v1/analytics/runs")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "success"
