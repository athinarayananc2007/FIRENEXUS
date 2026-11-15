"""
Tests for Harmonization REST API Routes
Verifies status, summary, matches, events, normalized observations endpoints,
and administrative trigger security.
"""

from unittest.mock import patch
import os
from datetime import datetime, timezone, date
import pytest
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import (
    HarmonizedObservation,
    ObservationMatch,
    FireEvent,
    FireEventObservation,
    HarmonizationRun,
)


def _seed_harmonization_test_data():
    """Seeds sample observations, matches, and events for route testing."""
    t0 = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)
    t1 = datetime(2026, 5, 1, 13, 50, tzinfo=timezone.utc)

    # 1. Raw observations
    obs_m = FireObservation(
        id="route-obs-m1",
        dedup_hash="route_hash_m1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=t0,
        latitude=-35.0,
        longitude=149.0,
        brightness=320.0,
        frp=25.0,
        confidence="high",
        confidence_raw="85",
        day_night="D",
        scan=1.2,
        track=1.1,
    )
    obs_v = FireObservation(
        id="route-obs-v1",
        dedup_hash="route_hash_v1",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:50",
        acq_datetime=t1,
        latitude=-35.002,
        longitude=149.002,
        brightness=345.0,
        frp=8.0,
        confidence="nominal",
        confidence_raw="n",
        day_night="D",
        scan=0.4,
        track=0.4,
    )
    db.session.add_all([obs_m, obs_v])
    db.session.commit()

    # 2. Harmonized observations
    h_m = HarmonizedObservation(
        id="harm-m1",
        observation_id=obs_m.id,
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_datetime=t0,
        latitude=-35.0,
        longitude=149.0,
        footprint_along_scan_km=1.2,
        footprint_along_track_km=1.1,
        footprint_area_km2=1.32,
        brightness_kelvin=320.0,
        frp_mw=25.0,
        confidence_category="high",
        confidence_score=85.0,
        day_night="D",
    )
    h_v = HarmonizedObservation(
        id="harm-v1",
        observation_id=obs_v.id,
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_datetime=t1,
        latitude=-35.002,
        longitude=149.002,
        footprint_along_scan_km=0.4,
        footprint_along_track_km=0.4,
        footprint_area_km2=0.16,
        brightness_kelvin=345.0,
        frp_mw=8.0,
        confidence_category="nominal",
        confidence_score=None,
        day_night="D",
    )
    db.session.add_all([h_m, h_v])

    # 3. Match correspondence
    match = ObservationMatch(
        id="match-1",
        modis_obs_id=obs_m.id,
        viirs_obs_id=obs_v.id,
        match_type="cross_sensor",
        spatial_distance_meters=280.0,
        footprint_overlap_ratio=0.88,
        time_difference_seconds=1200.0,
        match_score=0.85,
        status="confirmed",
    )
    db.session.add(match)

    # 4. Fire event cluster
    event = FireEvent(
        id="event-1",
        event_code="EVT-20260501-TEST",
        status="active",
        first_observed_at=t0,
        last_observed_at=t1,
        duration_hours=0.33,
        centroid_latitude=-35.001,
        centroid_longitude=149.001,
        spatial_radius_meters=180.0,
        observation_count=2,
        modis_count=1,
        viirs_count=1,
        total_frp_mw=33.0,
        max_frp_mw=25.0,
        avg_frp_mw=16.5,
    )
    db.session.add(event)
    db.session.commit()

    # 5. Event association
    assoc_m = FireEventObservation(
        id="assoc-1", event_id=event.id, observation_id=obs_m.id,
        distance_to_centroid_meters=120.0, time_offset_seconds=0.0
    )
    assoc_v = FireEventObservation(
        id="assoc-2", event_id=event.id, observation_id=obs_v.id,
        distance_to_centroid_meters=120.0, time_offset_seconds=1200.0
    )
    db.session.add_all([assoc_m, assoc_v])
    db.session.commit()


def test_get_harmonization_summary(client, app):
    """Test GET /api/v1/harmonization/summary aggregate metrics."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/summary")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    summary = data["data"]

    assert summary["harmonized_observations"]["total"] == 2
    assert summary["harmonized_observations"]["modis"] == 1
    assert summary["harmonized_observations"]["viirs"] == 1
    assert summary["matches"]["total"] == 1
    assert summary["matches"]["cross_sensor"] == 1
    assert summary["matches"]["average_match_score"] == 0.85
    assert summary["events"]["total"] == 1
    assert summary["events"]["total_frp_mw"] == 33.0


def test_get_matches_endpoint(client, app):
    """Test GET /api/v1/harmonization/matches pagination and filters."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/matches")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["pagination"]["total"] == 1
    assert data["data"][0]["match_type"] == "cross_sensor"

    # Filter with min_score
    resp_filter = client.get("/api/v1/harmonization/matches?min_score=0.90")
    assert resp_filter.status_code == 200
    assert resp_filter.get_json()["pagination"]["total"] == 0


def test_get_match_by_id(client, app):
    """Test GET /api/v1/harmonization/matches/<id> inspection."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/matches/match-1")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["id"] == "match-1"
    assert "modis_observation" in data
    assert "viirs_observation" in data

    resp_404 = client.get("/api/v1/harmonization/matches/nonexistent-match")
    assert resp_404.status_code == 404


def test_get_events_endpoint(client, app):
    """Test GET /api/v1/harmonization/events pagination and filters."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/events")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["pagination"]["total"] == 1
    assert data["data"][0]["event_code"] == "EVT-20260501-TEST"


def test_get_event_by_id(client, app):
    """Test GET /api/v1/harmonization/events/<id> inspection with member observations."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/events/event-1")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["id"] == "event-1"
    assert len(data["member_observations"]) == 2

    resp_404 = client.get("/api/v1/harmonization/events/nonexistent-event")
    assert resp_404.status_code == 404


def test_get_harmonized_observations_endpoint(client, app):
    """Test GET /api/v1/harmonization/observations pagination and sensor filter."""
    _seed_harmonization_test_data()

    resp = client.get("/api/v1/harmonization/observations?sensor=MODIS")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["pagination"]["total"] == 1
    assert data["data"][0]["sensor"] == "MODIS"
    assert data["data"][0]["footprint_along_scan_km"] == 1.2


def test_trigger_harmonization_auth(client):
    """Test admin authentication on POST /api/v1/harmonization/run."""
    # 401 without credentials
    resp_no_auth = client.post("/api/v1/harmonization/run")
    assert resp_no_auth.status_code == 401

    # 403 with invalid credentials
    resp_wrong_auth = client.post(
        "/api/v1/harmonization/run",
        headers={"X-Admin-Key": "wrong-secret-key"}
    )
    assert resp_wrong_auth.status_code == 403


def test_trigger_harmonization_success(client, app, monkeypatch):
    """Test successful execution trigger with valid admin key."""
    admin_key = "test-harmonize-admin-key"
    monkeypatch.setenv("ADMIN_API_KEY", admin_key)

    with patch("app.services.harmonization_service.HarmonizationService.run_harmonization") as mock_run:
        mock_audit = HarmonizationRun(
            algorithm_version="v1.0.0",
            status="completed",
            total_observations_analyzed=10,
            harmonized_records_created=10,
            matches_created=3,
            events_created=2,
            duration_seconds=0.45,
        )
        mock_run.return_value = mock_audit

        resp = client.post(
            "/api/v1/harmonization/run",
            headers={"X-Admin-Key": admin_key},
            json={"max_spatial_distance_meters": 1500},
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert data["data"]["matches_created"] == 3
