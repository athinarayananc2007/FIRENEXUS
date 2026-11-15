"""
FIRENEXUS Backend Configuration
Defines environment-based configuration classes for development, testing, and production.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend root if present
backend_root = Path(__file__).resolve().parent.parent
env_file = backend_root / '.env'
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    load_dotenv()


def parse_cors_origins(origins_str: str) -> list[str]:
    """Parse comma-separated CORS origins into a list of cleaned strings."""
    if not origins_str:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in origins_str.split(",") if origin.strip()]


def normalize_database_url(url: str | None) -> str:
    """Ensure standard postgresql+psycopg2:// prefix instead of legacy postgres:// or unpinned postgresql://."""
    if not url:
        return "postgresql+psycopg2://postgres:postgres@localhost:5432/firenexus"
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


class BaseConfig:
    """Base application configuration with common defaults."""

    APPLICATION_NAME = "FIRENEXUS"
    API_VERSION = "v1"
    API_PREFIX = "/api/v1"

    # Core Security
    SECRET_KEY = os.getenv("SECRET_KEY", "firenexus-default-insecure-dev-key")
    ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", os.getenv("SECRET_KEY", "firenexus-admin-secret-key"))

    # NASA FIRMS API Credentials
    FIRMS_MAP_KEY = os.getenv("FIRMS_MAP_KEY", "")

    # CORS settings matching the frontend dev server
    CORS_ORIGINS = parse_cors_origins(
        os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173")
    )

    # Database Settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = normalize_database_url(os.getenv("DATABASE_URL"))
    
    # Engine pool options
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,  # Verify connection validity before checking out
        "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "1800")),
    }

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""

    DEBUG = True
    TESTING = False
    ENV = "development"


class TestingConfig(BaseConfig):
    """Configuration for automated test execution."""

    DEBUG = True
    TESTING = True
    ENV = "testing"
    
    # Use SQLite in-memory or a dedicated test DB for lightning-fast hermetic testing
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL", "sqlite:///:memory:")
    
    # SQLite doesn't use pool_recycle the same way
    SQLALCHEMY_ENGINE_OPTIONS = {}


class StagingConfig(BaseConfig):
    """Configuration for staging deployment."""

    DEBUG = False
    TESTING = False
    ENV = "staging"

    # Staging pool tuning
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    }


class ProductionConfig(BaseConfig):
    """Configuration for production deployment."""

    DEBUG = False
    TESTING = False
    ENV = "production"

    # Production pool tuning
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 1800,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "15")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "20")),
    }


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "staging": StagingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
