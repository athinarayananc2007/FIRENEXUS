"""
FIRENEXUS Centralized Error Handling
Provides custom API exception classes and standard JSON error handlers.
"""

from typing import Any
from flask import Flask, jsonify, request
import logging

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base API Exception returning structured JSON."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        payload: dict[str, Any] | None = None,
        error_code: str = "BAD_REQUEST",
    ):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}
        self.error_code = error_code

    def to_dict(self) -> dict[str, Any]:
        rv = {
            "status": "error",
            "code": self.status_code,
            "error_code": self.error_code,
            "message": self.message,
            "path": request.path,
        }
        if self.payload:
            rv["details"] = self.payload
        return rv


def register_error_handlers(app: Flask) -> None:
    """Registers standard HTTP and application error handlers on the Flask app."""

    @app.errorhandler(APIError)
    def handle_api_error(error: APIError):
        logger.warning(
            f"APIError [{error.status_code}] on {request.method} {request.path}: {error.message}"
        )
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(400)
    def bad_request(error):
        return (
            jsonify({
                "status": "error",
                "code": 400,
                "error_code": "BAD_REQUEST",
                "message": getattr(error, "description", "Bad Request"),
                "path": request.path,
            }),
            400,
        )

    @app.errorhandler(404)
    def not_found(error):
        return (
            jsonify({
                "status": "error",
                "code": 404,
                "error_code": "NOT_FOUND",
                "message": getattr(error, "description", "The requested resource was not found on this server."),
                "path": request.path,
            }),
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(error):
        return (
            jsonify({
                "status": "error",
                "code": 405,
                "error_code": "METHOD_NOT_ALLOWED",
                "message": f"Method {request.method} is not allowed for {request.path}.",
                "path": request.path,
            }),
            405,
        )

    try:
        from sqlalchemy.exc import OperationalError
        @app.errorhandler(OperationalError)
        def handle_database_connection_error(error):
            logger.error(f"Database OperationalError on {request.method} {request.path}: {error}")
            return (
                jsonify({
                    "status": "error",
                    "code": 503,
                    "error_code": "DATABASE_UNAVAILABLE",
                    "message": "Database connection is offline or unavailable.",
                    "path": request.path,
                }),
                503,
            )
    except ImportError:
        pass

    @app.errorhandler(500)
    def internal_server_error(error):
        logger.error(f"Internal Server Error on {request.method} {request.path}: {error}", exc_info=True)
        return (
            jsonify({
                "status": "error",
                "code": 500,
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred while processing the request.",
                "path": request.path,
            }),
            500,
        )

