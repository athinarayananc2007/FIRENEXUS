"""
Tests for FIRENEXUS Observation and Ingestion API Endpoints
Verifies query filters, pagination, summary stats, inspection, and administrative security.
"""

from unittest.mock import patch, MagicMock
import os
from datetime import date, datetime, timezone
from app.extensions import db
from app.models.observation import FireObservation
from app.models.ingestion import IngestionRun


def _seed_observations():
    """Helper to seed sample MODIS and VIIRS records for query testing."""
    obs1 = FireObservation(
        dedup_hash="hash_modis_1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Terra",
        product_type="NRT",
        latitude=-33.8688,
        longitude=151.2093,
        acq_date=date(2026, 5, 1),
        acq_time="04:35",
        acq_datetime=datetime(2026, 5, 1, 4, 35, tzinfo=timezone.utc),
        brightness=312.4,
        bright_secondary=291.2,
        frp=25.5,
        confidence="high",
        confidence_raw="85",
        day_night="D",
        scan=1.1,
        track=1.0,
        raw_data={"test": "modis1"},
    )
    obs2 = FireObservation(
        dedup_hash="hash_viirs_1",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        latitude=-37.8136,
        longitude=144.9631,
        acq_date=date(2026, 5, 2),
        acq_time="13:20",
        acq_datetime=datetime(2026, 5, 2, 13, 20, tzinfo=timezone.utc),
        brightness=345.8,
        bright_secondary=298.0,
        frp=5.2,
        confidence="nominal",
        confidence_raw="n",
        day_night="N",
        scan=0.4,
        track=0.4,
        raw_data={"test": "viirs1"},
    )
    obs3 = FireObservation(
        dedup_hash="hash_viirs_2",
        source_product="VIIRS_NOAA20_NRT",
        sensor="VIIRS",
        satellite="NOAA-20",
        product_type="NRT",
        latitude=40.7128,
        longitude=-74.0060,
        acq_date=date(2026, 5, 3),
        acq_time="18:45",
        acq_datetime=datetime(2026, 5, 3, 18, 45, tzinfo=timezone.utc),
        brightness=360.0,
        bright_secondary=305.0,
        frp=50.0,
        confidence="high",
        confidence_raw="h",
        day_night="D",
        scan=0.4,
        track=0.4,
        raw_data={"test": "viirs2"},
    )
    db.session.add_all([obs1, obs2, obs3])
    db.session.commit()
    return [obs1, obs2, obs3]


def test_get_observations_pagination(client, app):
    """Test pagination defaults and total count."""
    _seed_observations()
    resp = client.get("/api/v1/observations")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["pagination"]["total"] == 3
    assert len(data["data"]) == 3


def test_get_observations_sensor_filter(client, app):
    """Test filtering by sensor (MODIS vs VIIRS)."""
    _seed_observations()

    # MODIS filter
    resp_modis = client.get("/api/v1/observations?sensor=MODIS")
    assert resp_modis.status_code == 200
    modis_data = resp_modis.get_json()["data"]
    assert len(modis_data) == 1
    assert modis_data[0]["sensor"] == "MODIS"

    # VIIRS filter
    resp_viirs = client.get("/api/v1/observations?sensor=VIIRS")
    assert resp_viirs.status_code == 200
    viirs_data = resp_viirs.get_json()["data"]
    assert len(viirs_data) == 2
    assert all(o["sensor"] == "VIIRS" for o in viirs_data)


def test_get_observations_confidence_filter(client, app):
    """Test filtering by confidence level."""
    _seed_observations()
    resp = client.get("/api/v1/observations?confidence=high")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data) == 2
    assert all(o["confidence"] == "high" for o in data)


def test_get_observations_frp_filter(client, app):
    """Test filtering by minimum Fire Radiative Power (MW)."""
    _seed_observations()
    resp = client.get("/api/v1/observations?min_frp=20")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data) == 2
    assert all(o["frp"] >= 20 for o in data)


def test_get_observations_bbox_filter(client, app):
    """Test filtering by geographic bounding box."""
    _seed_observations()
    # Query bounding box for Australia region: min_lat -45, max_lat -10, min_lon 110, max_lon 160
    resp = client.get("/api/v1/observations?min_lat=-45&max_lat=-10&min_lon=110&max_lon=160")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert len(data) == 2  # Sydney & Melbourne records


def test_get_observations_sorting(client, app):
    """Test sorting observations by FRP descending."""
    _seed_observations()
    resp = client.get("/api/v1/observations?sort_by=frp&sort_order=desc")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    frps = [o["frp"] for o in data]
    assert frps == sorted(frps, reverse=True)


def test_get_observations_summary(client, app):
    """Test GET /api/v1/observations/summary aggregate statistics."""
    _seed_observations()
    resp = client.get("/api/v1/observations/summary")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    summary = data["data"]
    assert summary["total_observations"] == 3
    assert summary["modis_records"] == 1
    assert summary["viirs_records"] == 2
    assert summary["high_confidence_records"] == 2
    assert summary["nominal_confidence_records"] == 1
    assert summary["max_frp"] == 50.0


def test_get_observation_by_id(client, app):
    """Test GET /api/v1/observations/<id> for inspection."""
    obs_list = _seed_observations()
    target_id = obs_list[0].id

    # Existing record
    resp = client.get(f"/api/v1/observations/{target_id}")
    assert resp.status_code == 200
    data = resp.get_json()["data"]
    assert data["id"] == target_id
    assert data["sensor"] == "MODIS"
    assert "raw_data" in data

    # Non-existent record
    resp_404 = client.get("/api/v1/observations/nonexistent-id-999")
    assert resp_404.status_code == 404


def test_admin_auth_missing_header(client):
    """Test that POST /api/v1/ingestion/run requires admin credentials."""
    resp = client.post("/api/v1/ingestion/run", json={"source_product": "MODIS_NRT"})
    assert resp.status_code == 401
    assert resp.get_json()["error_code"] == "UNAUTHORIZED"


def test_admin_auth_invalid_header(client):
    """Test that POST /api/v1/ingestion/run rejects incorrect admin key."""
    resp = client.post(
        "/api/v1/ingestion/run",
        headers={"X-Admin-Key": "completely-wrong-key"},
        json={"source_product": "MODIS_NRT"},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error_code"] == "FORBIDDEN"


def test_trigger_ingestion_run_success(client, app, monkeypatch):
    """Test successful administrative triggering of an ingestion run."""
    admin_key = "test-admin-key-secret"
    monkeypatch.setenv("ADMIN_API_KEY", admin_key)

    with patch("app.services.ingestion_service.IngestionService.run_single_batch") as mock_batch:
        mock_run = IngestionRun(
            source_product="MODIS_NRT",
            area="world",
            day_range=1,
            status="completed",
            total_records=10,
            inserted_records=10,
        )
        mock_batch.return_value = mock_run

        resp = client.post(
            "/api/v1/ingestion/run",
            headers={"X-Admin-Key": admin_key},
            json={"source_product": "MODIS_NRT", "day_range": 1},
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert data["data"]["source_product"] == "MODIS_NRT"


def test_ingestion_status_and_logs_endpoints(client, app):
    """Test GET /api/v1/ingestion/status and GET /api/v1/ingestion/logs endpoints."""
    resp_status = client.get("/api/v1/ingestion/status")
    assert resp_status.status_code == 200
    assert resp_status.get_json()["status"] == "success"

    resp_logs = client.get("/api/v1/ingestion/logs")
    assert resp_logs.status_code == 200
    assert resp_logs.get_json()["status"] == "success"
