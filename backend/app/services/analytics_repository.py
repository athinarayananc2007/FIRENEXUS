"""
Analytics Repository
Encapsulates database persistence, transactional bulk insertion, deduplication,
and filtered queries for FRP analyses, calibration models, anomalies, and activity summaries.
"""

import logging
from typing import Any
from sqlalchemy import func, desc, asc
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.models.analytics import (
    FRPAnalysis,
    CalibrationModel,
    AnomalyDetection,
    FireActivitySummary,
    AnalysisRun,
)

logger = logging.getLogger(__name__)


class AnalyticsRepository:
    """Repository handling database persistence and queries for statistical analytics."""

    # -------------------------------------------------------------------------
    # Anomaly Persistence & Queries
    # -------------------------------------------------------------------------

    @classmethod
    def bulk_insert_anomalies(
        cls,
        anomalies: list[dict[str, Any]],
        batch_size: int = 500,
    ) -> tuple[int, int]:
        """
        Idempotently inserts detected anomalies, skipping duplicate combinations
        of (observation_id, anomaly_type, method, algorithm_version).
        
        Returns:
            Tuple of (inserted_count, skipped_count).
        """
        if not anomalies:
            return 0, 0

        inserted = 0
        skipped = 0

        for i in range(0, len(anomalies), batch_size):
            chunk = anomalies[i : i + batch_size]

            # Query existing anomaly tuples in chunk
            obs_ids = [a["observation_id"] for a in chunk]
            existing_rows = (
                db.session.query(
                    AnomalyDetection.observation_id,
                    AnomalyDetection.anomaly_type,
                    AnomalyDetection.method,
                    AnomalyDetection.algorithm_version,
                )
                .filter(AnomalyDetection.observation_id.in_(obs_ids))
                .all()
            )
            existing_set = set(existing_rows)

            to_insert = []
            seen_in_chunk = set()

            for a in chunk:
                key = (
                    a["observation_id"],
                    a["anomaly_type"],
                    a["method"],
                    a.get("algorithm_version", "v1.0.0"),
                )
                if key in existing_set or key in seen_in_chunk:
                    skipped += 1
                    continue

                seen_in_chunk.add(key)
                inst = AnomalyDetection(**a)
                to_insert.append(inst)

            if to_insert:
                try:
                    db.session.add_all(to_insert)
                    db.session.commit()
                    inserted += len(to_insert)
                except SQLAlchemyError as err:
                    db.session.rollback()
                    logger.error(f"Error bulk inserting anomalies: {err}")
                    raise

        return inserted, skipped

    @classmethod
    def get_anomalies_paginated(
        cls,
        filters: dict[str, Any] | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "anomaly_score",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """Retrieves paginated, filtered anomaly detections."""
        filters = filters or {}
        page = max(1, page)
        page_size = max(1, min(1000, page_size))

        query = db.session.query(AnomalyDetection)

        # Filters
        anomaly_type = filters.get("anomaly_type")
        if anomaly_type:
            query = query.filter(AnomalyDetection.anomaly_type == anomaly_type)

        method = filters.get("method")
        if method:
            query = query.filter(AnomalyDetection.method == method)

        sensor = filters.get("sensor")
        if sensor and sensor.upper() != "ALL":
            query = query.filter(AnomalyDetection.sensor == sensor.upper())

        satellite = filters.get("satellite")
        if satellite:
            query = query.filter(AnomalyDetection.satellite == satellite)

        min_score = filters.get("min_score")
        if min_score is not None:
            try:
                query = query.filter(AnomalyDetection.anomaly_score >= float(min_score))
            except (ValueError, TypeError):
                pass

        total = query.count() or 0

        sort_col = getattr(AnomalyDetection, sort_by, AnomalyDetection.anomaly_score)
        direction = desc if sort_order.lower() == "desc" else asc
        query = query.order_by(direction(sort_col))

        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "items": [a.to_dict() for a in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

    # -------------------------------------------------------------------------
    # Calibration Models
    # -------------------------------------------------------------------------

    @classmethod
    def get_calibration_models(cls, satellite_pair: str | None = None) -> list[dict[str, Any]]:
        """Retrieves trained calibration models."""
        query = db.session.query(CalibrationModel).order_by(CalibrationModel.created_at.desc())
        if satellite_pair:
            query = query.filter(CalibrationModel.satellite_pair == satellite_pair)
        models = query.all()
        return [m.to_dict() for m in models]

    # -------------------------------------------------------------------------
    # Executive Summary & Audits
    # -------------------------------------------------------------------------

    @classmethod
    def get_analytics_summary(cls) -> dict[str, Any]:
        """Computes summary statistics for anomalies, models, and runs."""
        try:
            total_anomalies = db.session.query(AnomalyDetection).count()
            high_frp_anomalies = db.session.query(AnomalyDetection).filter(AnomalyDetection.anomaly_type == "high_frp").count()
            brightness_anomalies = db.session.query(AnomalyDetection).filter(AnomalyDetection.anomaly_type == "high_brightness").count()
            isolated_anomalies = db.session.query(AnomalyDetection).filter(AnomalyDetection.anomaly_type == "spatial_isolation").count()

            models_count = db.session.query(CalibrationModel).count()
            active_models = db.session.query(CalibrationModel).filter(CalibrationModel.status == "active").count()

            avg_r2_res = db.session.query(func.avg(CalibrationModel.r_squared)).first()
            avg_r2 = round(float(avg_r2_res[0]), 3) if avg_r2_res and avg_r2_res[0] is not None else 0.0

            runs_count = db.session.query(AnalysisRun).count()

            return {
                "anomalies": {
                    "total": total_anomalies,
                    "high_frp": high_frp_anomalies,
                    "high_brightness": brightness_anomalies,
                    "spatial_isolation": isolated_anomalies,
                },
                "calibration_models": {
                    "total": models_count,
                    "active": active_models,
                    "average_r_squared": avg_r2,
                },
                "analysis_runs_count": runs_count,
            }
        except Exception as err:
            logger.warning(f"Database unavailable for analytics summary ({err}). Returning zeroed baselines.")
            return {
                "anomalies": {"total": 0, "high_frp": 0, "high_brightness": 0, "spatial_isolation": 0},
                "calibration_models": {"total": 0, "active": 0, "average_r_squared": 0.0},
                "analysis_runs_count": 0,
            }

    @classmethod
    def get_runs_status(cls, limit: int = 20) -> list[dict[str, Any]]:
        """Retrieves recent AnalysisRun executions."""
        runs = (
            db.session.query(AnalysisRun)
            .order_by(AnalysisRun.started_at.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in runs]
