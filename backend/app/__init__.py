"""
FIRENEXUS Flask Application Factory
Initializes extensions, CORS, blueprints, error handling, and structured logging.
"""

import os
from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, cors
from app.utils.errors import register_error_handlers
from app.utils.logger import setup_logging
from app.routes import api_v1_bp
from app.cli import register_cli_commands


def create_app(config_name: str | None = None) -> Flask:
    """
    Application factory pattern.
    
    Args:
        config_name: 'development', 'testing', or 'production'.
                     Defaults to FLASK_ENV environment variable or 'development'.
                     
    Returns:
        Configured Flask application instance.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development").lower()

    app = Flask(__name__)

    # Load configuration
    config_class = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(config_class)

    # Configure structured logging
    setup_logging(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Configure CORS for frontend origins (e.g., http://localhost:5173 for Vite)
    allowed_origins = app.config.get("CORS_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"])
    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
                "supports_credentials": True,
            }
        },
    )

    # Register centralized error handlers
    register_error_handlers(app)

    # Register versioned API v1 blueprint
    app.register_blueprint(api_v1_bp)

    # Register custom CLI commands
    register_cli_commands(app)

    # Root index route providing API discovery information
    @app.route("/", methods=["GET"])
    def index():
        return jsonify({
            "application": "FIRENEXUS",
            "description": "Global Satellite Active Fire Harmonization API",
            "version": "1.0.0",
            "api_v1": "/api/v1",
            "health_endpoint": "/api/v1/health",
            "status": "online",
        }), 200

    return app

