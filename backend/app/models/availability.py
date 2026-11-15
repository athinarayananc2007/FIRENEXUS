"""
FIRENEXUS Dataset Availability Model
Stores sensor availability windows, historical ranges, and operational status.
"""

from datetime import datetime, timezone
from app.extensions import db
from .base import BaseModel


class DatasetAvailability(BaseModel):
    """
    Stores availability time windows for NASA FIRMS sensor products.
    """

    __tablename__ = "dataset_availability"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    source_product = db.Column(db.String(32), unique=True, nullable=False, index=True)  # e.g., 'MODIS_NRT'
    sensor = db.Column(db.String(16), nullable=False, index=True)  # 'MODIS' | 'VIIRS'
    satellite = db.Column(db.String(32), nullable=False)  # 'Terra', 'Aqua', 'Suomi-NPP', 'NOAA-20', 'NOAA-21'
    product_type = db.Column(db.String(8), nullable=False, index=True)  # 'NRT' | 'SP'
    
    min_date = db.Column(db.Date, nullable=True)
    max_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(32), nullable=False, default="available")  # 'available', 'offline', 'pending'
    record_count = db.Column(db.Integer, nullable=False, default=0)
    last_checked_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "source_product": self.source_product,
            "sensor": self.sensor,
            "satellite": self.satellite,
            "product_type": self.product_type,
            "min_date": self.min_date.isoformat() if self.min_date else None,
            "max_date": self.max_date.isoformat() if self.max_date else None,
            "status": self.status,
            "record_count": self.record_count,
            "last_checked_at": self.last_checked_at.isoformat() if self.last_checked_at else None,
        }

