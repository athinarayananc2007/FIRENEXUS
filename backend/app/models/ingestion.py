"""
FIRENEXUS Ingestion Tracking Models
Records batch ingestion runs, status, metrics, and detailed operational logs.
"""

import uuid
from datetime import datetime, timezone
from app.extensions import db
from .base import BaseModel


class IngestionRun(BaseModel):
    """
    Tracks an automated or manual ingestion execution from NASA FIRMS.
    """

    __tablename__ = "ingestion_runs"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    source_product = db.Column(db.String(32), nullable=False, index=True)  # e.g., 'MODIS_NRT', 'VIIRS_SNPP_NRT'
    area = db.Column(db.String(64), nullable=False, default="world")  # 'world' or bbox string
    start_date = db.Column(db.Date, nullable=False, index=True)
    end_date = db.Column(db.Date, nullable=False, index=True)
    day_range = db.Column(db.Integer, nullable=False, default=1)  # 1 to 5 per NASA API constraint
    status = db.Column(db.String(16), nullable=False, default="pending", index=True)  # 'pending', 'running', 'completed', 'failed', 'partial'

    total_records = db.Column(db.Integer, nullable=False, default=0)
    inserted_records = db.Column(db.Integer, nullable=False, default=0)
    duplicate_records = db.Column(db.Integer, nullable=False, default=0)
    error_records = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.Text, nullable=True)

    started_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)

    # Relationships
    logs = db.relationship("IngestionLog", backref="run", cascade="all, delete-orphan", lazy="dynamic")
    observations = db.relationship("FireObservation", backref="ingestion_run", lazy="dynamic")

    def to_dict(self) -> dict:
        data = super().to_dict()
        data["started_at"] = self.started_at.isoformat() if self.started_at else None
        data["completed_at"] = self.completed_at.isoformat() if self.completed_at else None
        data["start_date"] = self.start_date.isoformat() if self.start_date else None
        data["end_date"] = self.end_date.isoformat() if self.end_date else None
        return data


class IngestionLog(BaseModel):
    """
    Detailed operational log message for an ingestion run.
    """

    __tablename__ = "ingestion_logs"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    run_id = db.Column(db.String(36), db.ForeignKey("ingestion_runs.id", ondelete="CASCADE"), nullable=True, index=True)
    source_product = db.Column(db.String(32), nullable=True, index=True)
    level = db.Column(db.String(16), nullable=False, default="INFO")  # 'INFO', 'WARNING', 'ERROR'
    message = db.Column(db.Text, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "run_id": self.run_id,
            "source_product": self.source_product,
            "level": self.level,
            "message": self.message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

