"""
FIRENEXUS Harmonization API Endpoints
Provides endpoints for monitoring harmonization runs, querying cross-sensor matches,
inspecting fire event clusters, and accessing normalized observation data.
"""

import os
from flask import Blueprint, jsonify, request
from app.services.harmonization_service import HarmonizationService
from app.services.harmonization_repository import HarmonizationRepository
from app.services.harmonization_config import HarmonizationConfig
from app.utils.errors import APIError
from app.utils.auth import verify_admin_authorization

harmonization_bp = Blueprint("harmonization", __name__)


@harmonization_bp.route("/harmonization/status", methods=["GET"])
def get_harmonization_status():
    """
    GET /api/v1/harmonization/status
    Retrieves status and history of recent harmonization engine executions.
    """
    limit = int(request.args.get("limit", 20))
    runs = HarmonizationRepository.get_runs_status(limit=limit)

    return jsonify({
        "status": "success",
        "count": len(runs),
        "data": runs,
    }), 200


@harmonization_bp.route("/harmonization/summary", methods=["GET"])
def get_harmonization_summary():
    """
    GET /api/v1/harmonization/summary
    Retrieves aggregated metrics: harmonized observation counts, correspondence matches, and fire events.
    """
    summary = HarmonizationRepository.get_harmonization_summary()

    return jsonify({
        "status": "success",
        "data": summary,
    }), 200


@harmonization_bp.route("/harmonization/matches", methods=["GET"])
def get_matches():
    """
    GET /api/v1/harmonization/matches
    Retrieves paginated, filtered cross-sensor correspondence matches.
    
    Query Parameters:
        match_type: 'cross_sensor' | 'reprocessing_provenance'
        status: 'candidate' | 'confirmed' | 'rejected'
        min_score: Minimum match confidence score (0.0 to 1.0)
        max_distance: Maximum spatial distance in meters
        max_time_diff: Maximum time difference in seconds
        algorithm_version: Filter by algorithm version tag
        page: Page number (default 1)
        page_size: Page size (default 50)
        sort_by: Column to sort by (match_score, spatial_distance_meters, time_difference_seconds, created_at)
        sort_order: 'desc' (default) or 'asc'
    """
    filters = {
        "match_type": request.args.get("match_type"),
        "status": request.args.get("status"),
        "min_score": request.args.get("min_score"),
        "max_distance": request.args.get("max_distance"),
        "max_time_diff": request.args.get("max_time_diff"),
        "algorithm_version": request.args.get("algorithm_version"),
    }

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))
    sort_by = request.args.get("sort_by", "match_score")
    sort_order = request.args.get("sort_order", "desc")

    result = HarmonizationRepository.get_matches_paginated(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return jsonify({
        "status": "success",
        "data": result["items"],
        "pagination": {
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
            "has_next": result["has_next"],
            "has_prev": result["has_prev"],
        },
    }), 200


@harmonization_bp.route("/harmonization/matches/<match_id>", methods=["GET"])
def get_match_detail(match_id: str):
    """
    GET /api/v1/harmonization/matches/<id>
    Inspects full details of an individual match correspondence, including raw observation records.
    """
    match_data = HarmonizationRepository.get_match_by_id(match_id)
    if not match_data:
        raise APIError(
            f"Observation match '{match_id}' not found.",
            status_code=404,
            error_code="NOT_FOUND",
        )

    return jsonify({
        "status": "success",
        "data": match_data,
    }), 200


@harmonization_bp.route("/harmonization/events", methods=["GET"])
def get_events():
    """
    GET /api/v1/harmonization/events
    Retrieves paginated, filtered fire event clusters.
    
    Query Parameters:
        status: 'active' | 'contained' | 'inactive'
        min_obs_count: Minimum member observations
        min_frp: Minimum total FRP (MW)
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        min_lat, max_lat, min_lon, max_lon: Bounding box
        page: Page number (default 1)
        page_size: Page size (default 50)
        sort_by: first_observed_at, total_frp_mw, observation_count, duration_hours
        sort_order: 'desc' (default) or 'asc'
    """
    filters = {
        "status": request.args.get("status"),
        "min_obs_count": request.args.get("min_obs_count"),
        "min_frp": request.args.get("min_frp"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "min_lat": request.args.get("min_lat"),
        "max_lat": request.args.get("max_lat"),
        "min_lon": request.args.get("min_lon"),
        "max_lon": request.args.get("max_lon"),
    }

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))
    sort_by = request.args.get("sort_by", "first_observed_at")
    sort_order = request.args.get("sort_order", "desc")

    result = HarmonizationRepository.get_events_paginated(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return jsonify({
        "status": "success",
        "data": result["items"],
        "pagination": {
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
            "has_next": result["has_next"],
            "has_prev": result["has_prev"],
        },
    }), 200


@harmonization_bp.route("/harmonization/events/<event_id>", methods=["GET"])
def get_event_detail(event_id: str):
    """
    GET /api/v1/harmonization/events/<id>
    Inspects full details of an individual fire event cluster and lists its member observations.
    """
    event_data = HarmonizationRepository.get_event_by_id(event_id)
    if not event_data:
        raise APIError(
            f"Fire event '{event_id}' not found.",
            status_code=404,
            error_code="NOT_FOUND",
        )

    return jsonify({
        "status": "success",
        "data": event_data,
    }), 200


@harmonization_bp.route("/harmonization/observations", methods=["GET"])
def get_harmonized_observations():
    """
    GET /api/v1/harmonization/observations
    Retrieves paginated, filtered normalized observation records.
    
    Query Parameters:
        sensor: 'MODIS' | 'VIIRS' | 'ALL'
        satellite: Specific satellite platform
        confidence: 'high' | 'nominal' | 'low'
        min_frp: Minimum FRP (MW)
        max_frp: Maximum FRP (MW)
        page: Page number (default 1)
        page_size: Page size (default 50)
        sort_by: acq_datetime, frp_mw, brightness_kelvin, footprint_area_km2
        sort_order: 'desc' (default) or 'asc'
    """
    filters = {
        "sensor": request.args.get("sensor"),
        "satellite": request.args.get("satellite"),
        "confidence": request.args.get("confidence") or request.args.get("confidence_category"),
        "min_frp": request.args.get("min_frp"),
        "max_frp": request.args.get("max_frp"),
    }

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))
    sort_by = request.args.get("sort_by", "acq_datetime")
    sort_order = request.args.get("sort_order", "desc")

    result = HarmonizationRepository.get_harmonized_observations_paginated(
        filters=filters,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    return jsonify({
        "status": "success",
        "data": result["items"],
        "pagination": {
            "total": result["total"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"],
            "has_next": result["has_next"],
            "has_prev": result["has_prev"],
        },
    }), 200


@harmonization_bp.route("/harmonization/run", methods=["POST"])
def trigger_harmonization_run():
    """
    POST /api/v1/harmonization/run
    Protected administrative endpoint to trigger a controlled harmonization execution.
    
    Payload:
        start_date: 'YYYY-MM-DD' (optional)
        end_date: 'YYYY-MM-DD' (optional)
        max_spatial_distance_meters: float (optional)
        default_max_time_diff_seconds: float (optional)
    """
    verify_admin_authorization()

    payload = request.get_json(silent=True) or {}
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")

    # Override config if provided
    config = HarmonizationConfig()
    if "max_spatial_distance_meters" in payload:
        config.max_spatial_distance_meters = float(payload["max_spatial_distance_meters"])
    if "default_max_time_diff_seconds" in payload:
        config.default_max_time_diff_seconds = float(payload["default_max_time_diff_seconds"])

    run = HarmonizationService.run_harmonization(
        start_date=start_date,
        end_date=end_date,
        config=config,
    )

    return jsonify({
        "status": "success",
        "message": f"Harmonization run completed with status '{run.status}'.",
        "data": run.to_dict(),
    }), 200
