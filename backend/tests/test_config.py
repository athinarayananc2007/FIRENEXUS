"""
Tests for FIRENEXUS Configuration Loading
"""

from app.config import (
    DevelopmentConfig,
    TestingConfig,
    ProductionConfig,
    parse_cors_origins,
    normalize_database_url,
    config_by_name,
)


def test_cors_origins_parser():
    """Test parsing comma-separated CORS origins."""
    origins = parse_cors_origins("http://localhost:5173, http://127.0.0.1:5173 , http://preview:4173")
    assert origins == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://preview:4173",
    ]

    # Empty string fallback
    fallback = parse_cors_origins("")
    assert "http://localhost:5173" in fallback


def test_database_url_normalization():
    """Test postgres:// is converted to postgresql+psycopg2://."""
    url = normalize_database_url("postgres://user:pass@localhost:5432/db")
    assert url == "postgresql+psycopg2://user:pass@localhost:5432/db"

    standard_url = normalize_database_url("postgresql://user:pass@localhost:5432/db")
    assert standard_url == "postgresql+psycopg2://user:pass@localhost:5432/db"


def test_config_environments():
    """Verify development, testing, and production config values."""
    dev = config_by_name["development"]
    assert dev.DEBUG is True
    assert dev.TESTING is False

    test = config_by_name["testing"]
    assert test.TESTING is True
    assert "sqlite" in test.SQLALCHEMY_DATABASE_URI

    prod = config_by_name["production"]
    assert prod.DEBUG is False
    assert prod.TESTING is False
