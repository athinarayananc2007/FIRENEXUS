"""
FIRENEXUS Health Check Endpoint
Provides real-time system, backend, PostgreSQL/PostGIS database, and NASA FIRMS API status.
"""

import logging
from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.services.firms_service import FirmsApiClient

logger = logging.getLogger(__name__)

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint.
    Verifies that the Flask backend is operational, queries the configured database,
    and checks NASA FIRMS API configuration status.
    
    Returns:
        HTTP 200 with database: connected if database ping succeeds.
        HTTP 503 with database: disconnected if database is offline or unreachable.
    """
    database_status = "disconnected"
    postgis_available = False
    postgis_version = None
    db_error = None

    try:
        # 1. Verify primary database connection with a lightweight ping
        db.session.execute(text("SELECT 1"))
        database_status = "connected"

        # 2. Check PostGIS extension compatibility if connected to PostgreSQL
        try:
            if db.engine.name == "postgresql":
                version_result = db.session.execute(text("SELECT PostGIS_Version()")).scalar()
                if version_result:
                    postgis_available = True
                    postgis_version = str(version_result)
        except Exception as postgis_err:
            logger.debug(f"PostGIS extension check note: {postgis_err}")
            postgis_available = False

    except (SQLAlchemyError, Exception) as err:
        logger.warning(f"Database health verification failed: {err}")
        database_status = "disconnected"
        db_error = str(err)

    # 3. Check NASA FIRMS API Key Configuration
    firms_client = FirmsApiClient()
    firms_status = "configured" if firms_client.is_configured else "unconfigured"

    # Base response payload matching the exact FIRENEXUS specification
    if database_status == "connected":
        response_payload = {
            "status": "success",
            "application": "FIRENEXUS",
            "backend": "running",
            "database": "connected",
            "firms_api": firms_status,
        }
        if postgis_available and postgis_version:
            response_payload["postgis"] = {
                "available": True,
                "version": postgis_version,
            }
        return jsonify(response_payload), 200
    else:
        # Appropriate error status instead of falsely reporting success
        response_payload = {
            "status": "error",
            "application": "FIRENEXUS",
            "backend": "running",
            "database": "disconnected",
            "firms_api": firms_status,
            "message": "Database connection is unavailable or service is offline.",
        }
        if db_error:
            response_payload["details"] = "Could not establish connection to the configured database server."
        return jsonify(response_payload), 503
