"""
FIRENEXUS Fire Observation Model
Stores MODIS and VIIRS satellite active fire observations with PostGIS spatial geometry
and deterministic duplicate prevention.
"""

import uuid
from app.extensions import db
from .base import BaseModel
from .types import PostGISPoint


class FireObservation(BaseModel):
    """
    FireObservation represents a spaceborne thermal anomaly observation.
    Schema maps NASA FIRMS standard attributes with PostGIS geometry indexing
    and deterministic deduplication.
    """

    __tablename__ = "fire_observations"

    # Unique record identifier
    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Deterministic SHA256 deduplication hash:
    # sha256(source_product + lat + lon + date + time + satellite + scan + track)
    dedup_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)

    # NASA FIRMS Source Information
    source_product = db.Column(db.String(32), nullable=False, index=True)  # e.g., 'MODIS_NRT', 'VIIRS_SNPP_NRT'
    sensor = db.Column(db.String(16), nullable=False, index=True)          # 'MODIS' | 'VIIRS'
    satellite = db.Column(db.String(32), nullable=False, index=True)       # 'Terra', 'Aqua', 'Suomi-NPP', 'NOAA-20', 'NOAA-21'
    product_type = db.Column(db.String(8), nullable=False, index=True)     # 'NRT' | 'SP'

    # Spatiotemporal Coordinates
    acq_date = db.Column(db.Date, nullable=False, index=True)
    acq_time = db.Column(db.String(8), nullable=False)                     # Normalized 'HH:MM'
    acq_datetime = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False, index=True)
    longitude = db.Column(db.Float, nullable=False, index=True)

    # PostGIS Spatial Geometry (SRID 4326 Point: lon, lat)
    geom = db.Column(PostGISPoint(), nullable=True)

    # Radiometric Measurements
    brightness = db.Column(db.Float, nullable=False)                       # 4 µm brightness temp (Kelvin)
    bright_secondary = db.Column(db.Float, nullable=True)                 # 11 µm brightness temp (Kelvin)
    frp = db.Column(db.Float, nullable=False, index=True)                  # Fire Radiative Power (MW)

    # Detection Quality & Environment
    confidence = db.Column(db.String(16), nullable=False, index=True)      # Normalized: 'low', 'nominal', 'high'
    confidence_raw = db.Column(db.String(16), nullable=True)               # Raw: '85', 'nominal', 'l', etc.
    day_night = db.Column(db.String(2), nullable=True, index=True)         # 'D' | 'N'

    # Instrument Footprint & Algorithm Version
    scan = db.Column(db.Float, nullable=True)                              # Along-scan pixel footprint (km)
    track = db.Column(db.Float, nullable=True)                             # Along-track pixel footprint (km)
    version = db.Column(db.String(16), nullable=True)                      # Algorithm version (e.g., '6.1N', '2.0NRT')

    # Geographic Demarcation (Optional metadata)
    country = db.Column(db.String(64), nullable=True, index=True)
    region = db.Column(db.String(64), nullable=True)
    continent = db.Column(db.String(32), nullable=True, index=True)

    # Raw NASA Record Preservation (Verbatim dictionary)
    raw_data = db.Column(db.JSON, nullable=True)

    # Ingestion Batch Association
    ingestion_run_id = db.Column(
        db.String(36),
        db.ForeignKey("ingestion_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        db.Index("ix_obs_sensor_date", "sensor", "acq_date"),
        db.Index("ix_obs_lat_lon", "latitude", "longitude"),
        db.Index("ix_obs_date_frp", "acq_date", "frp"),
        db.Index("ix_obs_satellite_conf", "satellite", "confidence"),
    )

    def to_dict(self) -> dict:
        """Serializes observation to standard FIRENEXUS API schema."""
        return {
            "id": self.id,
            "dedup_hash": self.dedup_hash,
            "source_product": self.source_product,
            "sensor": self.sensor,
            "satellite": self.satellite,
            "product_type": self.product_type,
            "date": self.acq_date.isoformat() if self.acq_date else None,
            "time": self.acq_time,
            "datetime": self.acq_datetime.isoformat() if self.acq_datetime else None,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "brightness": self.brightness,
            "bright_secondary": self.bright_secondary,
            "frp": self.frp,
            "confidence": self.confidence,
            "confidence_raw": self.confidence_raw,
            "day_night": self.day_night,
            "scan": self.scan,
            "track": self.track,
            "version": self.version,
            "country": self.country,
            "region": self.region,
            "continent": self.continent,
            "raw_data": self.raw_data,
        }

    def __repr__(self) -> str:
        return f"<FireObservation {self.id} {self.source_product} {self.acq_date} {self.frp}MW>"
