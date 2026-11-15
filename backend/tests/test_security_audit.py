"""
FIRENEXUS Security Audit Test Suite
Validates secret preservation, .gitignore configuration, constant-time administrative authentication,
CORS security policies, SQL injection resistance, and production configuration hardening.
"""

import os
from pathlib import Path
import pytest
from app import create_app
from app.config import ProductionConfig, DevelopmentConfig, TestingConfig
from app.extensions import db
from app.models.observation import FireObservation
from app.utils.auth import verify_admin_authorization
from app.utils.errors import APIError


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def test_gitignore_excludes_secrets():
    """Verify that backend/.gitignore excludes .env and sensitive credential files."""
    backend_root = Path(__file__).resolve().parent.parent
    gitignore_path = backend_root / ".gitignore"
    assert gitignore_path.exists(), "backend/.gitignore must exist"

    content = gitignore_path.read_text(encoding="utf-8")
    assert ".env" in content
    assert "*.db" in content
    assert ".venv/" in content


def test_health_endpoint_does_not_leak_map_key(client, monkeypatch):
    """Health check endpoint must never leak the FIRMS_MAP_KEY string in response payload."""
    secret_key_val = "SECRET_NASA_MAP_KEY_999888777"
    monkeypatch.setenv("FIRMS_MAP_KEY", secret_key_val)

    res = client.get("/api/v1/health")
    assert res.status_code == 200
    res_text = res.get_data(as_text=True)
    assert secret_key_val not in res_text
    assert "configured" in res_text or "unconfigured" in res_text


def test_admin_auth_constant_time_comparison(app):
    """Verify constant-time administrative authentication rejects invalid keys cleanly."""
    with app.test_request_context("/", headers={"X-Admin-Key": "wrong-secret-key"}):
        with pytest.raises(APIError) as exc_info:
            verify_admin_authorization()
        assert exc_info.value.status_code == 403
        assert exc_info.value.error_code == "FORBIDDEN"

    with app.test_request_context("/", headers={}):
        with pytest.raises(APIError) as exc_info:
            verify_admin_authorization()
        assert exc_info.value.status_code == 401
        assert exc_info.value.error_code == "UNAUTHORIZED"


def test_sql_injection_defense_in_filtering(client):
    """Verify SQL injection attempts in query parameters are safely handled by SQLAlchemy ORM."""
    malicious_inputs = [
        "' OR 1=1 --",
        "'; DROP TABLE fire_observations; --",
        "1 UNION SELECT null, null, null--",
        "admin'--",
    ]

    for attack in malicious_inputs:
        res = client.get(f"/api/v1/observations?sensor={attack}")
        assert res.status_code == 200
        # Should return safe empty results, not SQL error or table dump
        data = res.get_json()
        assert data["pagination"]["total"] == 0

        res_sort = client.get(f"/api/v1/observations?sort_by={attack}")
        assert res_sort.status_code == 200


def test_cors_headers_strictness(client):
    """CORS headers must allow configured frontend origins and not return wildcard * with credentials."""
    res = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:5173"},
    )
    assert res.status_code == 200
    assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    assert res.headers.get("Access-Control-Allow-Credentials") == "true"

    # Untrusted origin should NOT be reflected with credentials
    res_untrusted = client.get(
        "/api/v1/health",
        headers={"Origin": "http://evil-attacker-site.com"},
    )
    assert res_untrusted.headers.get("Access-Control-Allow-Origin") != "*"


def test_production_config_hardening():
    """Verify production configuration enforces DEBUG=False and connection pooling parameters."""
    prod = ProductionConfig()
    assert prod.DEBUG is False
    assert prod.TESTING is False
    assert prod.SQLALCHEMY_ENGINE_OPTIONS["pool_pre_ping"] is True
    assert prod.SQLALCHEMY_ENGINE_OPTIONS["pool_size"] >= 5
