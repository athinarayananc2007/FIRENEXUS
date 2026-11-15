"""
FIRENEXUS Statistical Analytics & Anomaly Detection Database Models
Stores cross-sensor FRP analyses, calibration regression models, detected anomalies,
temporal activity summaries, and analysis execution audits.
Original raw observations in fire_observations remain strictly unaltered.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint, Index
from app.extensions import db
from .base import BaseModel


ANALYTICS_ALGORITHM_VERSION = "v1.0.0"


class FRPAnalysis(BaseModel):
    """
    Stores statistical distribution metrics for Fire Radiative Power (FRP)
    across satellite sensors, platforms, and date ranges.
    """

    __tablename__ = "frp_analyses"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    sensor = db.Column(db.String(16), nullable=False, default="ALL", index=True)      # 'MODIS' | 'VIIRS' | 'ALL'
    satellite = db.Column(db.String(32), nullable=True, index=True)
    product_type = db.Column(db.String(8), nullable=True, index=True)                # 'NRT' | 'SP'

    # Sample metadata
    sample_size = db.Column(db.Integer, nullable=False, default=0)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    # Parametric statistics
    mean_frp = db.Column(db.Float, nullable=False, default=0.0)
    std_frp = db.Column(db.Float, nullable=False, default=0.0)
    variance_frp = db.Column(db.Float, nullable=False, default=0.0)

    # Non-parametric percentiles (MW)
    min_frp = db.Column(db.Float, nullable=False, default=0.0)
    p10_frp = db.Column(db.Float, nullable=False, default=0.0)
    p25_frp = db.Column(db.Float, nullable=False, default=0.0)
    median_frp = db.Column(db.Float, nullable=False, default=0.0)
    p75_frp = db.Column(db.Float, nullable=False, default=0.0)
    p90_frp = db.Column(db.Float, nullable=False, default=0.0)
    p95_frp = db.Column(db.Float, nullable=False, default=0.0)
    p99_frp = db.Column(db.Float, nullable=False, default=0.0)
    max_frp = db.Column(db.Float, nullable=False, default=0.0)
    iqr_frp = db.Column(db.Float, nullable=False, default=0.0)

    # Audit & algorithm versioning
    algorithm_version = db.Column(db.String(16), nullable=False, default=ANALYTICS_ALGORITHM_VERSION, index=True)
    parameters = db.Column(db.JSON, nullable=True)

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["start_date"] = self.start_date.isoformat() if self.start_date else None
        data["end_date"] = self.end_date.isoformat() if self.end_date else None
        return data


class CalibrationModel(BaseModel):
    """
    Stores empirical regression models relating MODIS and VIIRS Fire Radiative Power.
    Clearly designated as exploratory cross-sensor calibration without modifying raw NASA records.
    """

    __tablename__ = "calibration_models"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    model_name = db.Column(db.String(64), nullable=False, index=True)                # e.g., 'Aqua_MODIS_vs_SNPP_VIIRS_OLS'
    model_type = db.Column(db.String(32), nullable=False, default="linear_ols")     # 'linear_ols', 'zero_intercept', 'power_law'

    # Paired sensors and satellite platforms
    source_sensor = db.Column(db.String(16), nullable=False, default="VIIRS")        # Independent variable X (typically higher-res VIIRS)
    target_sensor = db.Column(db.String(16), nullable=False, default="MODIS")        # Dependent variable Y (MODIS benchmark)
    satellite_pair = db.Column(db.String(64), nullable=False, index=True)            # 'Aqua_Suomi-NPP', 'Terra_NOAA-20'

    # Regression coefficients: Y = slope * X + intercept
    slope = db.Column(db.Float, nullable=False)
    intercept = db.Column(db.Float, nullable=False, default=0.0)

    # Evaluation metrics
    r_squared = db.Column(db.Float, nullable=False)
    rmse = db.Column(db.Float, nullable=False)
    mae = db.Column(db.Float, nullable=False)
    mean_bias = db.Column(db.Float, nullable=False)

    # Sample and training split metadata (preventing data leakage)
    train_count = db.Column(db.Integer, nullable=False)
    test_count = db.Column(db.Integer, nullable=False)
    train_period_start = db.Column(db.Date, nullable=True)
    train_period_end = db.Column(db.Date, nullable=True)
    evaluation_metrics = db.Column(db.JSON, nullable=True)

    algorithm_version = db.Column(db.String(16), nullable=False, default=ANALYTICS_ALGORITHM_VERSION, index=True)
    status = db.Column(db.String(16), nullable=False, default="active", index=True)  # 'active', 'deprecated'

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["train_period_start"] = self.train_period_start.isoformat() if self.train_period_start else None
        data["train_period_end"] = self.train_period_end.isoformat() if self.train_period_end else None
        return data


class AnomalyDetection(BaseModel):
    """
    Records statistical anomalies detected in active fire observations.
    Flags unusual values for scientific review without deleting or altering underlying records.
    """

    __tablename__ = "anomaly_detections"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    observation_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_observations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sensor = db.Column(db.String(16), nullable=False, index=True)                    # 'MODIS' | 'VIIRS'
    satellite = db.Column(db.String(32), nullable=False, index=True)

    # Anomaly classification
    anomaly_type = db.Column(db.String(32), nullable=False, index=True)              # 'high_frp', 'high_brightness', 'spatial_isolation', 'temporal_surge', 'sensor_discrepancy'
    method = db.Column(db.String(32), nullable=False, index=True)                    # 'z_score', 'modified_z_score', 'iqr', 'spatial_isolation_test'

    # Quantitative anomaly score and threshold
    anomaly_score = db.Column(db.Float, nullable=False)                              # e.g., Z-score, MAD ratio, or isolation score
    threshold_applied = db.Column(db.Float, nullable=False)

    # Metric details
    metric_name = db.Column(db.String(32), nullable=False)                           # 'frp', 'brightness', 'distance', 'daily_count'
    metric_value = db.Column(db.Float, nullable=False)
    explanation = db.Column(db.Text, nullable=False)

    algorithm_version = db.Column(db.String(16), nullable=False, default=ANALYTICS_ALGORITHM_VERSION, index=True)

    # Relationships
    observation = db.relationship("FireObservation", backref="anomalies")

    __table_args__ = (
        UniqueConstraint("observation_id", "anomaly_type", "method", "algorithm_version", name="uq_obs_anomaly_ver"),
        Index("ix_anomaly_type_score", "anomaly_type", "anomaly_score"),
    )

    def to_dict(self) -> dict:
        data = super().to_dict()
        return data


class FireActivitySummary(BaseModel):
    """
    Precomputed spatio-temporal activity summaries for fast trend visualization
    across daily, weekly, and monthly intervals.
    """

    __tablename__ = "fire_activity_summaries"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    period_type = db.Column(db.String(16), nullable=False, index=True)               # 'daily', 'weekly', 'monthly'
    period_date = db.Column(db.Date, nullable=False, index=True)                     # Start date of interval

    sensor = db.Column(db.String(16), nullable=False, default="ALL", index=True)      # 'MODIS', 'VIIRS', 'ALL'
    satellite = db.Column(db.String(32), nullable=False, default="ALL", index=True)

    observation_count = db.Column(db.Integer, nullable=False, default=0)
    high_confidence_count = db.Column(db.Integer, nullable=False, default=0)
    active_events_count = db.Column(db.Integer, nullable=False, default=0)

    total_frp_mw = db.Column(db.Float, nullable=False, default=0.0)
    avg_frp_mw = db.Column(db.Float, nullable=False, default=0.0)
    max_frp_mw = db.Column(db.Float, nullable=False, default=0.0)

    algorithm_version = db.Column(db.String(16), nullable=False, default=ANALYTICS_ALGORITHM_VERSION, index=True)

    __table_args__ = (
        UniqueConstraint("period_type", "period_date", "sensor", "satellite", "algorithm_version", name="uq_period_summary_ver"),
        Index("ix_activity_period_sensor", "period_type", "period_date", "sensor"),
    )

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["period_date"] = self.period_date.isoformat() if self.period_date else None
        return data


class AnalysisRun(BaseModel):
    """
    Audit ledger tracking executions of statistical analysis and anomaly detection jobs.
    """

    __tablename__ = "analysis_runs"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_type = db.Column(db.String(32), nullable=False, index=True)             # 'frp_distribution', 'calibration_training', 'anomaly_detection', 'trend_aggregation'
    status = db.Column(db.String(16), nullable=False, default="running", index=True) # 'running', 'completed', 'failed'

    parameters = db.Column(db.JSON, nullable=True)
    records_processed = db.Column(db.Integer, nullable=False, default=0)
    anomalies_flagged = db.Column(db.Integer, nullable=False, default=0)

    error_message = db.Column(db.Text, nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)

    started_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["started_at"] = self.started_at.isoformat() if self.started_at else None
        data["completed_at"] = self.completed_at.isoformat() if self.completed_at else None
        return data
