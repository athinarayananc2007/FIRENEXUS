"""
FIRENEXUS Statistical Analytics & Anomaly Detection API Endpoints
Provides endpoints for cross-sensor FRP comparison, calibration models,
statistical anomaly detection, temporal trends, and diurnal distribution analysis.
"""

import os
import time
from datetime import datetime, timezone, date
from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import ObservationMatch, FireEvent
from app.models.analytics import (
    FRPAnalysis,
    CalibrationModel,
    AnomalyDetection,
    AnalysisRun,
    ANALYTICS_ALGORITHM_VERSION,
)
from app.services.frp_analysis_service import FRPAnalysisService
from app.services.calibration_service import CalibrationService
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.services.fire_trend_service import FireTrendService
from app.services.diurnal_analysis_service import DiurnalAnalysisService
from app.services.analytics_repository import AnalyticsRepository
from app.utils.errors import APIError
from app.utils.auth import verify_admin_authorization

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/analytics/frp", methods=["GET"])
def get_frp_distribution():
    """
    GET /api/v1/analytics/frp
    Retrieves parametric and percentile distribution statistics of Fire Radiative Power (MW).
    
    Query Parameters:
        sensor: 'MODIS' | 'VIIRS' | 'ALL'
        satellite: Specific satellite platform
        product_type: 'NRT' | 'SP'
        start_date: 'YYYY-MM-DD'
        end_date: 'YYYY-MM-DD'
        confidence: 'high' | 'nominal' | 'low'
    """
    sensor = request.args.get("sensor")
    satellite = request.args.get("satellite")
    product_type = request.args.get("product_type")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    confidence = request.args.get("confidence")

    query = db.session.query(FireObservation.frp)

    if sensor and sensor.upper() != "ALL":
        query = query.filter(FireObservation.sensor == sensor.upper())
    if satellite:
        query = query.filter(FireObservation.satellite == satellite)
    if product_type:
        query = query.filter(FireObservation.product_type == product_type.upper())
    if start_date:
        try:
            d = date.fromisoformat(start_date)
            query = query.filter(FireObservation.acq_date >= d)
        except (ValueError, TypeError):
            pass
    if end_date:
        try:
            d = date.fromisoformat(end_date)
            query = query.filter(FireObservation.acq_date <= d)
        except (ValueError, TypeError):
            pass
    if confidence:
        query = query.filter(FireObservation.confidence == confidence.lower())

    frp_vals = [r[0] for r in query.all() if r[0] is not None]
    stats = FRPAnalysisService.compute_distribution_metrics(frp_vals)

    return jsonify({
        "status": "success",
        "data": {
            "filters": {
                "sensor": sensor or "ALL",
                "satellite": satellite,
                "product_type": product_type,
                "start_date": start_date,
                "end_date": end_date,
            },
            "distribution": stats,
        },
    }), 200


@analytics_bp.route("/analytics/frp/comparison", methods=["GET"])
def get_frp_comparison():
    """
    GET /api/v1/analytics/frp/comparison
    Retrieves paired MODIS vs VIIRS FRP comparison metrics (Pearson r, Spearman rho,
    Mean Bias Error, RMSE, MAE, difference percentiles).
    """
    min_score = float(request.args.get("min_score", 0.50))
    match_type = request.args.get("match_type", "cross_sensor")

    matches = (
        db.session.query(ObservationMatch)
        .filter(
            ObservationMatch.match_type == match_type,
            ObservationMatch.match_score >= min_score,
        )
        .all()
    )

    modis_frp_list = []
    viirs_frp_list = []

    for m in matches:
        if m.modis_observation and m.viirs_observation:
            modis_frp_list.append(m.modis_observation.frp)
            viirs_frp_list.append(m.viirs_observation.frp)

    comparison = FRPAnalysisService.compare_paired_frp(modis_frp_list, viirs_frp_list)

    return jsonify({
        "status": "success",
        "data": comparison,
    }), 200


@analytics_bp.route("/analytics/calibration", methods=["GET"])
def get_calibration_models():
    """
    GET /api/v1/analytics/calibration
    Lists trained cross-sensor empirical regression models and evaluation metrics.
    """
    satellite_pair = request.args.get("satellite_pair")
    models = AnalyticsRepository.get_calibration_models(satellite_pair=satellite_pair)

    return jsonify({
        "status": "success",
        "count": len(models),
        "data": models,
    }), 200


@analytics_bp.route("/analytics/calibration/train", methods=["POST"])
def train_calibration_model():
    """
    POST /api/v1/analytics/calibration/train
    Protected administrative endpoint to train a cross-sensor calibration regression model.
    """
    verify_admin_authorization()

    payload = request.get_json(silent=True) or {}
    model_name = payload.get("model_name", "MODIS_vs_VIIRS_FRP_OLS")
    model_type = payload.get("model_type", "linear_ols")
    satellite_pair = payload.get("satellite_pair", "Aqua_Suomi-NPP")
    train_ratio = float(payload.get("train_ratio", 0.70))

    # Fetch paired observations
    matches = (
        db.session.query(ObservationMatch)
        .filter(ObservationMatch.match_type == "cross_sensor")
        .all()
    )

    pairs = []
    for m in matches:
        if m.modis_observation and m.viirs_observation:
            pairs.append({
                "modis_frp": m.modis_observation.frp,
                "viirs_frp": m.viirs_observation.frp,
                "datetime": m.modis_observation.acq_datetime,
                "date": m.modis_observation.acq_date,
            })

    if len(pairs) < 3:
        raise APIError(
            f"Insufficient paired observations for calibration training (found {len(pairs)}, minimum 3 required).",
            status_code=400,
            error_code="INSUFFICIENT_DATA",
        )

    model = CalibrationService.train_model(
        pairs=pairs,
        model_name=model_name,
        model_type=model_type,
        satellite_pair=satellite_pair,
        train_ratio=train_ratio,
    )

    return jsonify({
        "status": "success",
        "message": f"Calibration model '{model.model_name}' trained successfully.",
        "data": model.to_dict(),
    }), 200


@analytics_bp.route("/analytics/anomalies", methods=["GET"])
def get_anomalies():
    """
    GET /api/v1/analytics/anomalies
    Retrieves paginated, filtered active fire observation anomalies.
    
    Query Parameters:
        anomaly_type: 'high_frp' | 'high_brightness' | 'spatial_isolation'
        method: 'z_score' | 'modified_z_score' | 'iqr' | 'spatial_isolation_test'
        sensor: 'MODIS' | 'VIIRS' | 'ALL'
        satellite: Specific satellite platform
        min_score: Minimum anomaly score
        page: Page number (default 1)
        page_size: Items per page (default 50)
        sort_by: Column to sort by (anomaly_score, created_at)
        sort_order: 'desc' (default) or 'asc'
    """
    filters = {
        "anomaly_type": request.args.get("anomaly_type"),
        "method": request.args.get("method"),
        "sensor": request.args.get("sensor"),
        "satellite": request.args.get("satellite"),
        "min_score": request.args.get("min_score"),
    }

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))
    sort_by = request.args.get("sort_by", "anomaly_score")
    sort_order = request.args.get("sort_order", "desc")

    result = AnalyticsRepository.get_anomalies_paginated(
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


@analytics_bp.route("/analytics/anomalies/detect", methods=["POST"])
def run_anomaly_detection():
    """
    POST /api/v1/analytics/anomalies/detect
    Protected administrative endpoint executing anomaly detection algorithms over active fire observations.
    """
    verify_admin_authorization()

    payload = request.get_json(silent=True) or {}
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")
    method = payload.get("method", "modified_z_score")
    threshold = float(payload.get("threshold", 3.5))

    start_time = time.time()
    audit_run = AnalysisRun(
        analysis_type="anomaly_detection",
        status="running",
        parameters=payload,
        started_at=datetime.now(timezone.utc),
    )
    db.session.add(audit_run)
    db.session.commit()

    try:
        query = db.session.query(FireObservation)
        if start_date:
            try:
                query = query.filter(FireObservation.acq_date >= date.fromisoformat(start_date))
            except (ValueError, TypeError):
                pass
        if end_date:
            try:
                query = query.filter(FireObservation.acq_date <= date.fromisoformat(end_date))
            except (ValueError, TypeError):
                pass

        observations = query.all()
        audit_run.records_processed = len(observations)

        detected_anomalies = []

        # 1. FRP anomalies
        frp_anomalies = AnomalyDetectionService.detect_frp_anomalies(
            observations, method=method, threshold=threshold
        )
        detected_anomalies.extend(frp_anomalies)

        # 2. Brightness temperature anomalies
        bright_anomalies = AnomalyDetectionService.detect_brightness_anomalies(observations)
        detected_anomalies.extend(bright_anomalies)

        # 3. Spatial isolation anomalies
        spatial_anomalies = AnomalyDetectionService.detect_spatial_isolation(observations)
        detected_anomalies.extend(spatial_anomalies)

        ins, skip = AnalyticsRepository.bulk_insert_anomalies(detected_anomalies)

        audit_run.anomalies_flagged = ins
        audit_run.status = "completed"
        audit_run.duration_seconds = round(time.time() - start_time, 2)
        audit_run.completed_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Anomaly detection completed: {ins} new anomalies flagged, {skip} duplicate skipped.",
            "data": {
                "records_analyzed": len(observations),
                "anomalies_flagged": ins,
                "duplicates_skipped": skip,
                "duration_seconds": audit_run.duration_seconds,
            },
        }), 200

    except Exception as err:
        db.session.rollback()
        audit_run.status = "failed"
        audit_run.error_message = str(err)
        audit_run.duration_seconds = round(time.time() - start_time, 2)
        audit_run.completed_at = datetime.now(timezone.utc)
        db.session.commit()
        raise APIError(f"Anomaly detection failed: {err}", status_code=500)


@analytics_bp.route("/analytics/trends", methods=["GET"])
def get_fire_trends():
    """
    GET /api/v1/analytics/trends
    Retrieves temporal time-series aggregations (daily, weekly, monthly).
    
    Query Parameters:
        period: 'daily' (default) | 'weekly' | 'monthly'
        start_date: 'YYYY-MM-DD'
        end_date: 'YYYY-MM-DD'
        sensor: 'MODIS' | 'VIIRS' | 'ALL'
    """
    period = request.args.get("period", "daily").lower()
    if period not in ("daily", "weekly", "monthly"):
        period = "daily"

    sensor = request.args.get("sensor")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    query = db.session.query(FireObservation)
    if sensor and sensor.upper() != "ALL":
        query = query.filter(FireObservation.sensor == sensor.upper())
    if start_date:
        try:
            query = query.filter(FireObservation.acq_date >= date.fromisoformat(start_date))
        except (ValueError, TypeError):
            pass
    if end_date:
        try:
            query = query.filter(FireObservation.acq_date <= date.fromisoformat(end_date))
        except (ValueError, TypeError):
            pass

    observations = query.order_by(FireObservation.acq_date.asc()).all()
    trends = FireTrendService.aggregate_trends_by_period(observations, period=period)

    # Event durations
    events = db.session.query(FireEvent).all()
    duration_stats = FireTrendService.analyze_event_durations(events)

    return jsonify({
        "status": "success",
        "data": {
            "period_type": period,
            "trends": trends,
            "event_duration_summary": duration_stats,
        },
    }), 200


@analytics_bp.route("/analytics/diurnal", methods=["GET"])
def get_diurnal_distribution():
    """
    GET /api/v1/analytics/diurnal
    Retrieves hourly acquisition distribution across UTC and sun-synchronous satellite sampling profiles.
    """
    sensor = request.args.get("sensor")
    query = db.session.query(FireObservation)
    if sensor and sensor.upper() != "ALL":
        query = query.filter(FireObservation.sensor == sensor.upper())

    observations = query.all()
    hourly_dist = DiurnalAnalysisService.compute_hourly_distribution(observations)
    sampling_profiles = DiurnalAnalysisService.get_satellite_sampling_profiles()

    return jsonify({
        "status": "success",
        "data": {
            "hourly_distribution": hourly_dist,
            "satellite_sampling_profiles": sampling_profiles,
            "scientific_note": (
                "Hourly observation peaks correspond to sun-synchronous polar orbits "
                "(Terra ~10:30, Aqua and VIIRS ~13:30 local solar time). "
                "Satellite observation time reflects sensor overpass rather than fire ignition time."
            ),
        },
    }), 200


@analytics_bp.route("/analytics/summary", methods=["GET"])
def get_analytics_summary():
    """
    GET /api/v1/analytics/summary
    Retrieves executive overview of anomalies, calibration models, and analysis jobs.
    """
    summary = AnalyticsRepository.get_analytics_summary()
    return jsonify({
        "status": "success",
        "data": summary,
    }), 200


@analytics_bp.route("/analytics/runs", methods=["GET"])
def get_analytics_runs():
    """
    GET /api/v1/analytics/runs
    Retrieves audit history of recent statistical analysis executions.
    """
    limit = int(request.args.get("limit", 20))
    runs = AnalyticsRepository.get_runs_status(limit=limit)

    return jsonify({
        "status": "success",
        "count": len(runs),
        "data": runs,
    }), 200
