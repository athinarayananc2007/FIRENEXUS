"""
FIRENEXUS Dataset Availability Endpoints
Surfaces temporal coverage, earliest/latest dates, and operational status of all NASA FIRMS sensors.
"""

from flask import Blueprint, jsonify, request
from app.services.availability_service import AvailabilityService

availability_bp = Blueprint("availability", __name__)


@availability_bp.route("/availability", methods=["GET"])
def get_dataset_availability():
    """
    GET /api/v1/availability
    Returns temporal availability metadata across all 8 supported MODIS and VIIRS satellite sensors.
    
    Query Params:
        refresh: 'true' to trigger an upstream check from NASA FIRMS.
    """
    refresh = request.args.get("refresh", "").lower() in ("true", "1", "yes")
    sensor = request.args.get("sensor")

    if refresh:
        data = AvailabilityService.refresh_availability()
    else:
        data = AvailabilityService.get_all_availability()

    if sensor:
        sensor_upper = sensor.strip().upper()
        data = [d for d in data if d.get("sensor", "").upper() == sensor_upper]

    return jsonify({
        "status": "success",
        "count": len(data),
        "data": data,
    }), 200
