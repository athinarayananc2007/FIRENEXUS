"""
FIRENEXUS Structured Logging & Request Telemetry
Sets up application logging format, distributed request tracing (X-Request-ID),
and response latency tracking (X-Response-Time).
"""

import logging
import time
import uuid
from flask import Flask, request, g


def setup_logging(app: Flask) -> None:
    """Configures structured application logging and telemetry middleware."""
    log_level = getattr(logging, app.config.get("LOG_LEVEL", "INFO").upper(), logging.INFO)

    log_format = "[%(asctime)s] [%(levelname)s] [%(name)s in %(filename)s:%(lineno)d] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure root logger
    logging.basicConfig(level=log_level, format=log_format, datefmt=date_format)

    logger = logging.getLogger("firenexus")
    logger.setLevel(log_level)

    # Request telemetry middleware
    @app.before_request
    def record_start_time():
        g.start_time = time.time()
        # Propagate or generate request correlation ID
        g.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]

    @app.after_request
    def log_response_info(response):
        # Calculate latency
        latency_ms = 0.0
        if hasattr(g, "start_time"):
            latency_ms = (time.time() - g.start_time) * 1000.0

        # Inject telemetry headers
        response.headers["X-Response-Time"] = f"{latency_ms:.2f}ms"
        if hasattr(g, "request_id"):
            response.headers["X-Request-ID"] = g.request_id

        # Don't clutter logs with static asset queries if any
        if not request.path.startswith("/static"):
            req_id = getattr(g, "request_id", "none")
            msg = (
                f"[{req_id}] {request.remote_addr} - \"{request.method} {request.path}\" "
                f"{response.status_code} ({latency_ms:.1f}ms)"
            )
            if latency_ms > 1000.0:
                logger.warning(f"SLOW REQUEST: {msg}")
            else:
                logger.info(msg)
        return response
