"""
FIRENEXUS Observation Service Layer
Encapsulates database querying, filtering, and cross-satellite harmonization logic.
"""

import logging
from typing import Any
from app.extensions import db
from app.models.observation import FireObservation

logger = logging.getLogger(__name__)


class ObservationService:
    """Service class handling observation queries, stats, and spatial-temporal lookups."""

    @staticmethod
    def get_total_count() -> int:
        """Returns the total number of fire observations stored."""
        try:
            return db.session.query(FireObservation).count()
        except Exception as err:
            logger.warning(f"Error querying observation count: {err}")
            return 0

    @staticmethod
    def query_observations(
        satellite: str | None = None,
        confidence: str | None = None,
        limit: int = 100,
    ) -> list[FireObservation]:
        """Queries observations matching basic filter criteria."""
        query = db.session.query(FireObservation)
        if satellite and satellite.upper() != "ALL":
            query = query.filter(FireObservation.satellite == satellite.upper())
        if confidence:
            query = query.filter(FireObservation.confidence == confidence.lower())
        return query.limit(limit).all()

