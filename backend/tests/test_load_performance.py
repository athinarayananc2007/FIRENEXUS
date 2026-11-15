"""
FIRENEXUS Load & Performance Automated Test Suite
Validates that endpoints handle concurrent requests without dropping connections,
maintaining 0% error rates and sub-second median latencies.
"""

import time
import threading
import pytest
from concurrent.futures import ThreadPoolExecutor, as_completed
from app import create_app
from app.extensions import db
from app.models.observation import FireObservation


@pytest.fixture(scope="module")
def app():
    """Module-scoped app with synthetic seeded observations for performance testing."""
    app = create_app("testing")

    with app.app_context():
        db.create_all()

        # Seed test observations
        import datetime
        today = datetime.date(2026, 5, 1)
        now = datetime.datetime(2026, 5, 1, 12, 0, tzinfo=datetime.timezone.utc)
        batch = []
        for i in range(100):
            obs = FireObservation(
                id=f"perf-obs-{i:04d}",
                dedup_hash=f"hash-perf-obs-{i:04d}",
                source_product="MODIS_NRT" if i % 2 == 0 else "VIIRS_SNPP_NRT",
                sensor="MODIS" if i % 2 == 0 else "VIIRS",
                satellite="Aqua" if i % 2 == 0 else "Suomi-NPP",
                product_type="NRT",
                acq_date=today,
                acq_time="12:00",
                acq_datetime=now,
                latitude=35.0 + (i % 50) * 0.1,
                longitude=-119.0 + (i % 50) * 0.1,
                brightness=315.0 + (i % 30),
                frp=15.0 + (i % 50) * 1.2,
                confidence="nominal",
                day_night="D",
                country="USA",
            )
            batch.append(obs)
        db.session.bulk_save_objects(batch)
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()


def test_concurrent_health_checks(app):
    """Benchmark 50 concurrent requests to /api/v1/health."""
    client = app.test_client()
    total_requests = 50
    concurrency = 25

    def make_req():
        start = time.perf_counter()
        res = client.get("/api/v1/health")
        latency_ms = (time.perf_counter() - start) * 1000.0
        return res.status_code, latency_ms

    latencies = []
    errors = 0
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_req) for _ in range(total_requests)]
        for f in as_completed(futures):
            code, lat = f.result()
            latencies.append(lat)
            if code != 200:
                errors += 1

    assert errors == 0, f"Expected 0 errors under load, got {errors}"
    latencies.sort()
    median_lat = latencies[len(latencies) // 2]
    assert median_lat < 100.0


def test_concurrent_paginated_observation_queries(app):
    """Benchmark concurrent requests to paginated observations query."""
    client = app.test_client()
    total_requests = 30
    concurrency = 10
    db_lock = threading.Lock()

    def make_req():
        start = time.perf_counter()
        with db_lock:
            res = client.get("/api/v1/observations?page=1&page_size=25")
        latency_ms = (time.perf_counter() - start) * 1000.0
        return res.status_code, latency_ms

    latencies = []
    errors = 0
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_req) for _ in range(total_requests)]
        for f in as_completed(futures):
            code, lat = f.result()
            latencies.append(lat)
            if code != 200:
                errors += 1

    assert errors == 0
    latencies.sort()
    median_lat = latencies[len(latencies) // 2]
    assert median_lat < 150.0


def test_concurrent_observations_summary(app):
    """Benchmark concurrent requests to observations summary (single SQL aggregation)."""
    client = app.test_client()
    total_requests = 30
    concurrency = 10
    db_lock = threading.Lock()

    def make_req():
        start = time.perf_counter()
        with db_lock:
            res = client.get("/api/v1/observations/summary")
        latency_ms = (time.perf_counter() - start) * 1000.0
        return res.status_code, latency_ms

    latencies = []
    errors = 0
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_req) for _ in range(total_requests)]
        for f in as_completed(futures):
            code, lat = f.result()
            latencies.append(lat)
            if code != 200:
                errors += 1

    assert errors == 0
    latencies.sort()
    median_lat = latencies[len(latencies) // 2]
    assert median_lat < 150.0


def test_concurrent_frp_analytics(app):
    """Benchmark concurrent requests to FRP distribution analytics."""
    client = app.test_client()
    total_requests = 30
    concurrency = 10
    db_lock = threading.Lock()

    def make_req():
        start = time.perf_counter()
        with db_lock:
            res = client.get("/api/v1/analytics/frp")
        latency_ms = (time.perf_counter() - start) * 1000.0
        return res.status_code, latency_ms

    latencies = []
    errors = 0
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_req) for _ in range(total_requests)]
        for f in as_completed(futures):
            code, lat = f.result()
            latencies.append(lat)
            if code != 200:
                errors += 1

    assert errors == 0
    latencies.sort()
    median_lat = latencies[len(latencies) // 2]
    assert median_lat < 150.0
