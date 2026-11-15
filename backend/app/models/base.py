"""
FIRENEXUS Base Database Model
Provides standard primary keys and timestamp tracking for all entities.
"""

from datetime import datetime, date, timezone
from app.extensions import db


class BaseModel(db.Model):
    """Abstract base model adding created_at and updated_at timestamps."""

    __abstract__ = True

    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        """Serializes model attributes to a standard dictionary."""
        result = {}
        for c in self.__table__.columns:
            val = getattr(self, c.name)
            if isinstance(val, (datetime, date)):
                result[c.name] = val.isoformat()
            elif hasattr(val, "data") or type(val).__name__ == "WKBElement":
                result[c.name] = str(val) if val is not None else None
            else:
                result[c.name] = val
        return result

