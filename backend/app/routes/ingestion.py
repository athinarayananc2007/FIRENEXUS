"""
FIRENEXUS Ingestion Tracking and Administration Endpoints
Provides endpoints for monitoring ingestion status, retrieving audit logs, and running protected batch ingestions.
"""

import os
from flask import Blueprint, jsonify, request
from app.services.ingestion_service import IngestionService
from app.services.firms_service import VALID_FIRMS_SOURCES
from app.utils.errors import APIError
from app.utils.auth import verify_admin_authorization

ingestion_bp = Blueprint("ingestion", __name__)


@ingestion_bp.route("/ingestion/status", methods=["GET"])
def get_ingestion_status():
    """
    GET /api/v1/ingestion/status
    Retrieves the status of recent ingestion runs.
    """
    limit = int(request.args.get("limit", 20))
    runs = IngestionService.get_runs_status(limit=limit)

    return jsonify({
        "status": "success",
        "count": len(runs),
        "data": runs,
    }), 200


@ingestion_bp.route("/ingestion/logs", methods=["GET"])
def get_ingestion_logs():
    """
    GET /api/v1/ingestion/logs
    Retrieves audit logs from data ingestion executions.
    """
    run_id = request.args.get("run_id")
    limit = int(request.args.get("limit", 100))
    logs = IngestionService.get_run_logs(run_id=run_id, limit=limit)

    return jsonify({
        "status": "success",
        "count": len(logs),
        "data": logs,
    }), 200


@ingestion_bp.route("/ingestion/run", methods=["POST"])
def trigger_ingestion_run():
    """
    POST /api/v1/ingestion/run
    Protected administrative endpoint to trigger controlled NASA FIRMS data ingestion.
    
    Payload:
        source_product: e.g., 'MODIS_NRT', 'VIIRS_SNPP_NRT' (required)
        area: 'world' or bbox (default 'world')
        day_range: 1 to 5 (default 1)
        date: 'YYYY-MM-DD' (optional)
        start_date: 'YYYY-MM-DD' (optional, for date range ingestion)
        end_date: 'YYYY-MM-DD' (optional, for date range ingestion)
    """
    verify_admin_authorization()

    payload = request.get_json(silent=True) or {}
    source = payload.get("source_product")
    if not source:
        raise APIError(
            "Field 'source_product' is required. Example: 'MODIS_NRT', 'VIIRS_SNPP_NRT'",
            status_code=400,
            error_code="MISSING_PARAMETER",
        )

    if source not in VALID_FIRMS_SOURCES:
        valid_sources = ", ".join(VALID_FIRMS_SOURCES.keys())
        raise APIError(
            f"Invalid source_product '{source}'. Must be one of: {valid_sources}",
            status_code=400,
            error_code="INVALID_PARAMETER",
        )

    area = payload.get("area", "world")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")

    # If date range is specified
    if start_date and end_date:
        try:
            runs = IngestionService.ingest_date_range(
                source_product=source,
                start_date=start_date,
                end_date=end_date,
                area=area,
            )
            return jsonify({
                "status": "success",
                "message": f"Date range ingestion completed for {source}",
                "runs_executed": len(runs),
                "data": [r.to_dict() for r in runs],
            }), 200
        except Exception as e:
            raise APIError(f"Date range ingestion error: {e}", status_code=500)

    # Single batch execution (up to 5 days)
    day_range = int(payload.get("day_range", 1))
    target_date = payload.get("date")

    run = IngestionService.run_single_batch(
        source_product=source,
        area=area,
        day_range=day_range,
        date_str=target_date,
    )

    return jsonify({
        "status": "success" if run.status in ("completed", "partial") else "error",
        "message": f"Ingestion run finished with status: {run.status}",
        "data": run.to_dict(),
    }), 200 if run.status != "failed" else 500

