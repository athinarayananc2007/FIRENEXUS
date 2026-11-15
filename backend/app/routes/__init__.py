"""
FIRENEXUS API Routes Registration
Aggregates all route blueprints under the /api/v1 version prefix.
"""

from flask import Blueprint
from .health import health_bp
from .availability import availability_bp
from .ingestion import ingestion_bp
from .observations import observations_bp
from .harmonization import harmonization_bp
from .analytics import analytics_bp

# Create versioned API v1 blueprint
api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")

# Register sub-blueprints
api_v1_bp.register_blueprint(health_bp)
api_v1_bp.register_blueprint(availability_bp)
api_v1_bp.register_blueprint(ingestion_bp)
api_v1_bp.register_blueprint(observations_bp)
api_v1_bp.register_blueprint(harmonization_bp)
api_v1_bp.register_blueprint(analytics_bp)

__all__ = [
    "api_v1_bp",
    "health_bp",
    "availability_bp",
    "ingestion_bp",
    "observations_bp",
    "harmonization_bp",
    "analytics_bp",
]
