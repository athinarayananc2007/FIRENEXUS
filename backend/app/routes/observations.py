"""
FIRENEXUS Active Fire Observations API Endpoints
Provides filtered, sorted, paginated observations queries, analytical summaries, and single record inspections.
"""

from flask import Blueprint, jsonify, request
from app.services.observation_repository import ObservationRepository
from app.utils.errors import APIError

observations_bp = Blueprint("observations", __name__)


@observations_bp.route("/observations", methods=["GET"])
def get_observations():
    """
    GET /api/v1/observations
    Retrieves paginated, filtered active fire observations from MODIS and VIIRS satellite sensors.
    
    Query Parameters:
        sensor: 'MODIS' | 'VIIRS' | 'ALL'
        satellite: Specific satellite platform ('Terra', 'Aqua', 'Suomi-NPP', 'NOAA-20', 'NOAA-21')
        source_product: e.g. 'MODIS_NRT', 'VIIRS_SNPP_NRT'
        product_type: 'NRT' | 'SP'
        start_date: 'YYYY-MM-DD'
        end_date: 'YYYY-MM-DD'
        confidence: 'high' | 'nominal' | 'low' (or comma-separated)
        min_frp: Minimum Fire Radiative Power (MW)
        max_frp: Maximum Fire Radiative Power (MW)
        day_night: 'D' (Daytime) | 'N' (Nighttime)
        min_lat, max_lat, min_lon, max_lon: Geographic bounding box bounds
        country: Country substring filter
        page: Page number (default 1)
        page_size: Number of items per page (default 50, max 1000)
        sort_by: Column to sort by (acq_datetime, date, frp, brightness, confidence, latitude, longitude)
        sort_order: 'desc' (default) or 'asc'
    """
    # Extract filter parameters
    filters = {
        "sensor": request.args.get("sensor") or request.args.get("satellite_group"),
        "satellite": request.args.get("satellite"),
        "source_product": request.args.get("source_product"),
        "product_type": request.args.get("product_type"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "confidence": request.args.get("confidence"),
        "min_frp": request.args.get("min_frp"),
        "max_frp": request.args.get("max_frp"),
        "day_night": request.args.get("day_night"),
        "min_lat": request.args.get("min_lat"),
        "max_lat": request.args.get("max_lat"),
        "min_lon": request.args.get("min_lon"),
        "max_lon": request.args.get("max_lon"),
        "country": request.args.get("country"),
    }

    page = int(request.args.get("page", 1))
    page_size_arg = request.args.get("page_size") or request.args.get("limit") or request.args.get("per_page")
    page_size = int(page_size_arg) if page_size_arg is not None else 1000
    sort_by = request.args.get("sort_by", "acq_datetime")
    sort_order = request.args.get("sort_order", "desc")

    result = ObservationRepository.get_observations_paginated(
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


@observations_bp.route("/observations/summary", methods=["GET"])
def get_observations_summary():
    """
    GET /api/v1/observations/summary
    Retrieves aggregate observational metrics, sensor distribution, and energy statistics.
    """
    filters = {
        "sensor": request.args.get("sensor"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
    }

    summary = ObservationRepository.get_summary_stats(filters=filters)

    return jsonify({
        "status": "success",
        "data": summary,
    }), 200


@observations_bp.route("/observations/<observation_id>", methods=["GET"])
def get_observation_detail(observation_id: str):
    """
    GET /api/v1/observations/<observation_id>
    Retrieves full details and raw telemetry of an active fire observation by its ID.
    """
    obs = ObservationRepository.get_by_id(observation_id)
    if not obs:
        raise APIError(
            f"Observation with ID '{observation_id}' not found.",
            status_code=404,
            error_code="OBSERVATION_NOT_FOUND",
        )

    return jsonify({
        "status": "success",
        "data": obs.to_dict(),
    }), 200

