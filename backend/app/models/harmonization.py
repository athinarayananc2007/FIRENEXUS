"""
FIRENEXUS Harmonization Data Models
Stores normalized satellite observations, cross-sensor correspondence matches,
fire event groupings, and execution audit history.
Preserves original raw NASA FIRMS observations untouched in fire_observations.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import UniqueConstraint, Index
from app.extensions import db
from .base import BaseModel
from .types import PostGISPoint
from app.services.harmonization_config import HARMONIZATION_ALGORITHM_VERSION


class HarmonizedObservation(BaseModel):
    """
    Harmonized, sensor-comparable representation of a spaceborne thermal detection.
    Linked to the raw FireObservation via foreign key.
    Calculates estimated pixel footprint and standardizes UTC timestamp while
    preserving original sensor-specific radiometric values verbatim.
    """

    __tablename__ = "harmonized_observations"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    observation_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_observations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Instrument metadata
    source_product = db.Column(db.String(32), nullable=False, index=True)
    sensor = db.Column(db.String(16), nullable=False, index=True)          # 'MODIS' | 'VIIRS'
    satellite = db.Column(db.String(32), nullable=False, index=True)       # 'Terra', 'Aqua', 'Suomi-NPP', 'NOAA-20', 'NOAA-21'
    product_type = db.Column(db.String(8), nullable=False, index=True)     # 'NRT' | 'SP'

    # Spatiotemporal attributes
    acq_datetime = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False, index=True)
    longitude = db.Column(db.Float, nullable=False, index=True)
    geom = db.Column(PostGISPoint(), nullable=True)

    # Footprint resolution estimations (km and km^2)
    footprint_along_scan_km = db.Column(db.Float, nullable=False)
    footprint_along_track_km = db.Column(db.Float, nullable=False)
    footprint_area_km2 = db.Column(db.Float, nullable=False)

    # Radiometric measurements
    brightness_kelvin = db.Column(db.Float, nullable=False)
    bright_secondary_kelvin = db.Column(db.Float, nullable=True)
    frp_mw = db.Column(db.Float, nullable=False, index=True)

    # Confidence standardization (without claiming numerical equivalence)
    confidence_category = db.Column(db.String(16), nullable=False, index=True)  # 'low', 'nominal', 'high'
    confidence_score = db.Column(db.Float, nullable=True)                       # 0-100 for MODIS, null for VIIRS
    day_night = db.Column(db.String(2), nullable=True, index=True)

    # Harmonization metadata
    algorithm_version = db.Column(db.String(16), nullable=False, default=HARMONIZATION_ALGORITHM_VERSION, index=True)
    normalized_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    raw_observation = db.relationship("FireObservation", backref=db.backref("harmonized_record", uselist=False))

    __table_args__ = (
        UniqueConstraint("observation_id", "algorithm_version", name="uq_harm_obs_ver"),
        Index("ix_harm_sensor_date", "sensor", "acq_datetime"),
        Index("ix_harm_lat_lon", "latitude", "longitude"),
        Index("ix_harm_frp_conf", "frp_mw", "confidence_category"),
    )

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["acq_datetime"] = self.acq_datetime.isoformat() if self.acq_datetime else None
        data["normalized_at"] = self.normalized_at.isoformat() if self.normalized_at else None
        return data


class ObservationMatch(BaseModel):
    """
    Records a detected correspondence between a MODIS observation and a VIIRS observation,
    or a reprocessing provenance correspondence between NRT and SP records.
    Never modifies or replaces either underlying observation record.
    """

    __tablename__ = "observation_matches"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    modis_obs_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_observations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    viirs_obs_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_observations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Match classification
    match_type = db.Column(db.String(32), nullable=False, default="cross_sensor", index=True)  # 'cross_sensor' | 'reprocessing_provenance'

    # Spatiotemporal match metrics
    spatial_distance_meters = db.Column(db.Float, nullable=False, index=True)
    footprint_overlap_ratio = db.Column(db.Float, nullable=True)
    time_difference_seconds = db.Column(db.Float, nullable=False, index=True)

    # Algorithmic correspondence confidence score (0.0 to 1.0)
    match_score = db.Column(db.Float, nullable=False, index=True)
    match_criteria = db.Column(db.JSON, nullable=True)

    # Audit & algorithm versioning
    algorithm_version = db.Column(db.String(16), nullable=False, default=HARMONIZATION_ALGORITHM_VERSION, index=True)
    status = db.Column(db.String(16), nullable=False, default="candidate", index=True)  # 'candidate', 'confirmed', 'rejected'

    # Relationships
    modis_observation = db.relationship("FireObservation", foreign_keys=[modis_obs_id], backref="modis_matches")
    viirs_observation = db.relationship("FireObservation", foreign_keys=[viirs_obs_id], backref="viirs_matches")

    __table_args__ = (
        UniqueConstraint("modis_obs_id", "viirs_obs_id", "algorithm_version", name="uq_obs_match_pair_ver"),
        Index("ix_match_score_type", "match_score", "match_type"),
    )

    def to_dict(self) -> dict:
        data = super().to_dict()
        return data


class FireEvent(BaseModel):
    """
    Spatiotemporal fire event grouping layer.
    Aggregates proximately and temporally related satellite observations into a cluster
    without assuming ground-truth fire boundaries or overwriting individual observations.
    """

    __tablename__ = "fire_events"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_code = db.Column(db.String(32), unique=True, nullable=False, index=True)  # e.g., 'EVT-20260501-A1B2'
    status = db.Column(db.String(16), nullable=False, default="active", index=True)  # 'active', 'contained', 'inactive'

    # Temporal bounds
    first_observed_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    last_observed_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    duration_hours = db.Column(db.Float, nullable=False, default=0.0)

    # Spatial centroid and coverage
    centroid_latitude = db.Column(db.Float, nullable=False, index=True)
    centroid_longitude = db.Column(db.Float, nullable=False, index=True)
    geom = db.Column(PostGISPoint(), nullable=True)
    spatial_radius_meters = db.Column(db.Float, nullable=False, default=0.0)

    # Multi-sensor observation counts
    observation_count = db.Column(db.Integer, nullable=False, default=0, index=True)
    modis_count = db.Column(db.Integer, nullable=False, default=0)
    viirs_count = db.Column(db.Integer, nullable=False, default=0)

    # Aggregated Fire Radiative Power (MW)
    total_frp_mw = db.Column(db.Float, nullable=False, default=0.0, index=True)
    max_frp_mw = db.Column(db.Float, nullable=False, default=0.0)
    avg_frp_mw = db.Column(db.Float, nullable=False, default=0.0)
    modis_frp_mw = db.Column(db.Float, nullable=False, default=0.0)
    viirs_frp_mw = db.Column(db.Float, nullable=False, default=0.0)

    # Clustering algorithm version & parameters
    algorithm_version = db.Column(db.String(16), nullable=False, default=HARMONIZATION_ALGORITHM_VERSION, index=True)
    grouping_criteria = db.Column(db.JSON, nullable=True)

    # Relationships
    observations = db.relationship("FireEventObservation", backref="fire_event", cascade="all, delete-orphan", lazy="dynamic")

    __table_args__ = (
        Index("ix_event_time_frp", "first_observed_at", "total_frp_mw"),
        Index("ix_event_lat_lon", "centroid_latitude", "centroid_longitude"),
    )

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["first_observed_at"] = self.first_observed_at.isoformat() if self.first_observed_at else None
        data["last_observed_at"] = self.last_observed_at.isoformat() if self.last_observed_at else None
        return data


class FireEventObservation(BaseModel):
    """
    Association table linking a FireObservation to an aggregated FireEvent,
    recording displacement from event centroid and time offset.
    """

    __tablename__ = "fire_event_observations"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_events.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    observation_id = db.Column(
        db.String(64),
        db.ForeignKey("fire_observations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    distance_to_centroid_meters = db.Column(db.Float, nullable=False)
    time_offset_seconds = db.Column(db.Float, nullable=False)

    # Relationships
    observation = db.relationship("FireObservation", backref="event_associations")

    __table_args__ = (
        UniqueConstraint("event_id", "observation_id", name="uq_event_obs"),
    )

    def to_dict(self) -> dict:
        return super().to_dict()


class HarmonizationRun(BaseModel):
    """
    Audit ledger tracking executions of the harmonization engine,
    storing parameters, runtime performance, and record counts.
    """

    __tablename__ = "harmonization_runs"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    algorithm_version = db.Column(db.String(16), nullable=False, default=HARMONIZATION_ALGORITHM_VERSION, index=True)
    status = db.Column(db.String(16), nullable=False, default="running", index=True)  # 'running', 'completed', 'failed'

    parameters = db.Column(db.JSON, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    total_observations_analyzed = db.Column(db.Integer, nullable=False, default=0)
    harmonized_records_created = db.Column(db.Integer, nullable=False, default=0)
    matches_created = db.Column(db.Integer, nullable=False, default=0)
    events_created = db.Column(db.Integer, nullable=False, default=0)
    duplicates_skipped = db.Column(db.Integer, nullable=False, default=0)

    error_message = db.Column(db.Text, nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)

    started_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["started_at"] = self.started_at.isoformat() if self.started_at else None
        data["completed_at"] = self.completed_at.isoformat() if self.completed_at else None
        data["start_date"] = self.start_date.isoformat() if self.start_date else None
        data["end_date"] = self.end_date.isoformat() if self.end_date else None
        return data
