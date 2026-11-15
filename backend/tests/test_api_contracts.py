"""
FIRENEXUS API Contract Validation Test Suite
Validates status codes, JSON schema response consistency, pagination, sorting,
filtering, error handling (RFC 7807), and administrative authorization across
every endpoint from Phases 1 to 4.
"""

import pytest
from datetime import date, datetime, timezone
from app import create_app
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import HarmonizedObservation, ObservationMatch, FireEvent, FireEventObservation
from app.models.analytics import FRPAnalysis, CalibrationModel, AnomalyDetection


@pytest.fixture
def app():
    """Create test application instance with in-memory database."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def admin_headers(app):
    key = app.config.get("ADMIN_API_KEY", "firenexus-admin-secret-key")
    return {"X-Admin-Key": key}


@pytest.fixture
def sample_data(app):
    """Seed test database with representative records."""
    today = date(2026, 5, 1)
    now = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)

    # 1. Raw Observations
    modis = FireObservation(
        id="modis-contract-001",
        dedup_hash="hash-modis-contract-001",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="13:30",
        acq_datetime=now,
        latitude=34.05,
        longitude=-118.25,
        brightness=320.0,
        frp=45.0,
        confidence="nominal",
        confidence_raw="80",
        day_night="D",
        country="USA",
    )
    viirs = FireObservation(
        id="viirs-contract-001",
        dedup_hash="hash-viirs-contract-001",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=today,
        acq_time="13:35",
        acq_datetime=now,
        latitude=34.052,
        longitude=-118.251,
        brightness=325.0,
        frp=48.0,
        confidence="nominal",
        confidence_raw="nominal",
        day_night="D",
        country="USA",
    )
    db.session.add_all([modis, viirs])
    db.session.commit()

    # 2. Harmonized Observation
    harm_modis = HarmonizedObservation(
        id="harm-contract-001",
        observation_id=modis.id,
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_datetime=now,
        latitude=34.05,
        longitude=-118.25,
        footprint_along_scan_km=1.0,
        footprint_along_track_km=1.0,
        footprint_area_km2=1.0,
        brightness_kelvin=320.0,
        frp_mw=45.0,
        confidence_category="nominal",
        confidence_score=80.0,
        algorithm_version="v1.0.0-phase3",
    )
    db.session.add(harm_modis)
    db.session.commit()

    # 3. Match
    match = ObservationMatch(
        id="match-contract-001",
        modis_obs_id=modis.id,
        viirs_obs_id=viirs.id,
        match_type="cross_sensor",
        spatial_distance_meters=245.0,
        footprint_overlap_ratio=0.85,
        time_difference_seconds=300.0,
        match_score=0.92,
        algorithm_version="v1.0.0-phase3",
        status="confirmed",
    )
    db.session.add(match)

    # 4. Fire Event
    event = FireEvent(
        id="event-contract-001",
        event_code="EVT-CONTRACT-001",
        status="active",
        first_observed_at=now,
        last_observed_at=now,
        duration_hours=0.1,
        centroid_latitude=34.051,
        centroid_longitude=-118.2505,
        spatial_radius_meters=300.0,
        observation_count=2,
        modis_count=1,
        viirs_count=1,
        total_frp_mw=93.0,
        max_frp_mw=48.0,
        avg_frp_mw=46.5,
        algorithm_version="v1.0.0-phase3",
    )
    db.session.add(event)

    # 5. Anomaly
    anomaly = AnomalyDetection(
        id="anom-contract-001",
        observation_id=modis.id,
        sensor="MODIS",
        satellite="Aqua",
        anomaly_type="high_frp",
        method="z_score",
        anomaly_score=3.2,
        threshold_applied=3.0,
        metric_name="frp",
        metric_value=45.0,
        explanation="Contract test anomaly",
        algorithm_version="v1.0.0",
    )
    db.session.add(anomaly)
    db.session.commit()

    return {"modis_id": modis.id, "viirs_id": viirs.id, "event_id": event.id, "match_id": match.id}


# -----------------------------------------------------------------------------
# 1. Telemetry and Discovery Contracts
# -----------------------------------------------------------------------------

def test_telemetry_headers(client):
    """Every response must return X-Response-Time and X-Request-ID telemetry headers."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert "X-Response-Time" in res.headers
    assert res.headers["X-Response-Time"].endswith("ms")
    assert "X-Request-ID" in res.headers


def test_root_index_contract(client):
    """Root endpoint provides discovery metadata."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.get_json()
    assert data["application"] == "FIRENEXUS"
    assert data["status"] == "online"
    assert "api_v1" in data


def test_health_endpoint_contract(client):
    """Health endpoint contract."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["application"] == "FIRENEXUS"
    assert data["database"] == "connected"
    assert "firms_api" in data


def test_availability_endpoint_contract(client):
    """Dataset availability contract returning 8 FIRMS products."""
    res = client.get("/api/v1/availability")
    assert res.status_code == 200
    data = res.get_json()
    assert "data" in data
    assert len(data["data"]) == 8
    for d in data["data"]:
        assert "source_product" in d
        assert "sensor" in d
        assert "product_type" in d


# -----------------------------------------------------------------------------
# 2. Observations API Contracts
# -----------------------------------------------------------------------------

def test_get_observations_pagination_contract(client, sample_data):
    """Observations list pagination and envelope structure."""
    res = client.get("/api/v1/observations?page=1&page_size=10")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "success"
    assert "data" in body
    assert "pagination" in body
    pagination = body["pagination"]
    for field in ("total", "page", "page_size", "total_pages", "has_next", "has_prev"):
        assert field in pagination
    assert pagination["total"] == 2
    assert len(body["data"]) == 2


def test_get_observations_filters_and_sorting(client, sample_data):
    """Observations filtering and sorting contracts."""
    # Filter by sensor
    res = client.get("/api/v1/observations?sensor=MODIS")
    assert res.status_code == 200
    assert res.get_json()["pagination"]["total"] == 1
    assert res.get_json()["data"][0]["sensor"] == "MODIS"

    # Filter by bounding box
    res = client.get("/api/v1/observations?min_lat=34.0&max_lat=34.1&min_lon=-118.3&max_lon=-118.2")
    assert res.status_code == 200
    assert res.get_json()["pagination"]["total"] == 2

    # Empty bounding box
    res = client.get("/api/v1/observations?min_lat=50.0&max_lat=51.0&min_lon=0.0&max_lon=1.0")
    assert res.status_code == 200
    assert res.get_json()["pagination"]["total"] == 0
    assert res.get_json()["data"] == []


def test_get_observations_summary_contract(client, sample_data):
    """Observations summary structure and single SQL aggregation verification."""
    res = client.get("/api/v1/observations/summary")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "success"
    data = body["data"]
    assert data["total_observations"] == 2
    assert data["modis_records"] == 1
    assert data["viirs_records"] == 1
    assert data["nominal_confidence_records"] == 2
    assert data["daytime_records"] == 2
    assert data["avg_frp"] == 46.5
    assert data["max_frp"] == 48.0


def test_get_observation_by_id_contract(client, sample_data):
    """Individual observation retrieval: 200 for existing, 404 for missing."""
    # Existing
    res = client.get(f"/api/v1/observations/{sample_data['modis_id']}")
    assert res.status_code == 200
    assert res.get_json()["data"]["id"] == sample_data["modis_id"]

    # Non-existing -> 404 RFC 7807
    res = client.get("/api/v1/observations/non-existent-uuid")
    assert res.status_code == 404
    err = res.get_json()
    assert err["status"] == "error"
    assert "message" in err
    assert err["error_code"] in ("NOT_FOUND", "OBSERVATION_NOT_FOUND")


# -----------------------------------------------------------------------------
# 3. Ingestion API Contracts & Administrative Auth
# -----------------------------------------------------------------------------

def test_ingestion_status_and_logs_contracts(client):
    """Ingestion monitoring contracts."""
    res = client.get("/api/v1/ingestion/status")
    assert res.status_code == 200
    assert "data" in res.get_json()

    res = client.get("/api/v1/ingestion/logs")
    assert res.status_code == 200
    assert "data" in res.get_json()


def test_ingestion_admin_auth_contract(client, admin_headers):
    """Ingestion trigger authentication enforcement."""
    # 1. Missing auth -> 401
    res = client.post("/api/v1/ingestion/run", json={"source": "MODIS_NRT"})
    assert res.status_code == 401
    assert res.get_json()["error_code"] == "UNAUTHORIZED"

    # 2. Invalid auth -> 403
    res = client.post(
        "/api/v1/ingestion/run",
        json={"source": "MODIS_NRT"},
        headers={"X-Admin-Key": "wrong-key"},
    )
    assert res.status_code == 403
    assert res.get_json()["error_code"] == "FORBIDDEN"

    # 3. Invalid body with valid auth -> 400
    res = client.post(
        "/api/v1/ingestion/run",
        json={"source": "INVALID_PRODUCT_XYZ"},
        headers=admin_headers,
    )
    assert res.status_code == 400


# -----------------------------------------------------------------------------
# 4. Harmonization API Contracts
# -----------------------------------------------------------------------------

def test_harmonization_status_and_summary_contracts(client, sample_data):
    """Harmonization status and summary envelopes."""
    res = client.get("/api/v1/harmonization/status")
    assert res.status_code == 200

    res = client.get("/api/v1/harmonization/summary")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "success"
    data = body["data"]
    assert "harmonized_observations" in data
    assert "matches" in data
    assert "events" in data
    assert data["matches"]["total"] == 1


def test_harmonization_matches_and_events_contracts(client, sample_data):
    """Paginated matches and events retrieval."""
    res = client.get("/api/v1/harmonization/matches")
    assert res.status_code == 200
    body = res.get_json()
    assert "data" in body
    assert body["pagination"]["total"] == 1

    res = client.get(f"/api/v1/harmonization/matches/{sample_data['match_id']}")
    assert res.status_code == 200
    assert "modis_observation" in res.get_json()["data"]

    res = client.get("/api/v1/harmonization/events")
    assert res.status_code == 200
    assert res.get_json()["pagination"]["total"] == 1

    res = client.get(f"/api/v1/harmonization/events/{sample_data['event_id']}")
    assert res.status_code == 200
    assert "member_observations" in res.get_json()["data"]


# -----------------------------------------------------------------------------
# 5. Analytics API Contracts
# -----------------------------------------------------------------------------

def test_analytics_endpoints_contracts(client, sample_data):
    """Analytics GET endpoints schema contracts."""
    # FRP distributions
    res = client.get("/api/v1/analytics/frp")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "success"
    assert "distribution" in body["data"]

    # FRP comparison
    res = client.get("/api/v1/analytics/frp/comparison")
    assert res.status_code == 200

    # Calibration models list
    res = client.get("/api/v1/analytics/calibration")
    assert res.status_code == 200
    assert isinstance(res.get_json()["data"], list)

    # Anomalies list
    res = client.get("/api/v1/analytics/anomalies")
    assert res.status_code == 200
    body = res.get_json()
    assert "data" in body
    assert body["pagination"]["total"] == 1

    # Trends
    res = client.get("/api/v1/analytics/trends?period=daily")
    assert res.status_code == 200
    assert "trends" in res.get_json()["data"]

    # Diurnal
    res = client.get("/api/v1/analytics/diurnal")
    assert res.status_code == 200
    assert "hourly_distribution" in res.get_json()["data"]

    # Summary
    res = client.get("/api/v1/analytics/summary")
    assert res.status_code == 200
    assert "calibration_models" in res.get_json()["data"]
    assert "anomalies" in res.get_json()["data"]


def test_analytics_admin_auth_contracts(client, app, admin_headers):
    """Protected analytics endpoints require admin key."""
    # Calibration train without auth -> 401
    res = client.post("/api/v1/analytics/calibration/train", json={})
    assert res.status_code == 401

    # Calibration train with Bearer auth in Authorization header (passed auth, validation check reached)
    key = app.config.get("ADMIN_API_KEY", "firenexus-admin-secret-key")
    res = client.post(
        "/api/v1/analytics/calibration/train",
        json={"source_sensor": "VIIRS", "target_sensor": "MODIS"},
        headers={"Authorization": f"Bearer {key}"},
    )
    # Auth succeeds; 400 is raised because sample size < 3
    assert res.status_code == 400
    assert "insufficient" in res.get_json()["message"].lower()

    # Anomaly detect without auth -> 401
    res = client.post("/api/v1/analytics/anomalies/detect", json={})
    assert res.status_code == 401

    # Anomaly detect with valid auth -> 200
    res = client.post(
        "/api/v1/analytics/anomalies/detect",
        json={"method": "all"},
        headers=admin_headers,
    )
    assert res.status_code == 200
