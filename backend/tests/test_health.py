"""
Tests for FIRENEXUS Health Check Endpoint
Verifies GET /api/v1/health across connected and disconnected states, and CORS headers.
"""

from unittest.mock import patch
from sqlalchemy.exc import OperationalError


def test_health_endpoint_success(client):
    """
    Test GET /api/v1/health when database is reachable.
    Must return HTTP 200 with all specified fields.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data["status"] == "success"
    assert data["application"] == "FIRENEXUS"
    assert data["backend"] == "running"
    assert data["database"] == "connected"


def test_health_endpoint_db_disconnected(client):
    """
    Test GET /api/v1/health when database is unavailable.
    Must return HTTP 503 and report database: disconnected without crashing.
    """
    with patch("app.extensions.db.session.execute") as mock_execute:
        mock_execute.side_effect = OperationalError("connection refused", {}, None)

        response = client.get("/api/v1/health")
        assert response.status_code == 503

        data = response.get_json()
        assert data is not None
        assert data["status"] == "error"
        assert data["application"] == "FIRENEXUS"
        assert data["backend"] == "running"
        assert data["database"] == "disconnected"


def test_root_index_endpoint(client):
    """Test root GET / returns API metadata and discovery endpoints."""
    response = client.get("/")
    assert response.status_code == 200

    data = response.get_json()
    assert data["application"] == "FIRENEXUS"
    assert data["api_v1"] == "/api/v1"
    assert data["health_endpoint"] == "/api/v1/health"


def test_cors_headers_on_health_check(client):
    """Test CORS preflight and headers for frontend origin (localhost:5173)."""
    headers = {
        "Origin": "http://localhost:5173",
    }
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"

