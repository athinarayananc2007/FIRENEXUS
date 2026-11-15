"""
Data Availability Service
Manages NASA FIRMS dataset availability discovery, historical boundaries, and caching.
"""

import csv
import io
import logging
from datetime import datetime, date, timezone
from typing import Any
from app.extensions import db
from app.models.availability import DatasetAvailability
from app.services.firms_service import FirmsApiClient, VALID_FIRMS_SOURCES, FirmsApiError

logger = logging.getLogger(__name__)

# Fallback mission baselines documented by NASA FIRMS
MISSION_BASELINES = {
    "MODIS_NRT": {"sensor": "MODIS", "satellite": "Terra/Aqua", "product_type": "NRT", "min_date": "2020-01-01"},
    "MODIS_SP": {"sensor": "MODIS", "satellite": "Terra/Aqua", "product_type": "SP", "min_date": "2000-11-01"},
    "VIIRS_SNPP_NRT": {"sensor": "VIIRS", "satellite": "Suomi-NPP", "product_type": "NRT", "min_date": "2020-01-01"},
    "VIIRS_SNPP_SP": {"sensor": "VIIRS", "satellite": "Suomi-NPP", "product_type": "SP", "min_date": "2012-01-20"},
    "VIIRS_NOAA20_NRT": {"sensor": "VIIRS", "satellite": "NOAA-20", "product_type": "NRT", "min_date": "2020-01-01"},
    "VIIRS_NOAA20_SP": {"sensor": "VIIRS", "satellite": "NOAA-20", "product_type": "SP", "min_date": "2018-01-01"},
    "VIIRS_NOAA21_NRT": {"sensor": "VIIRS", "satellite": "NOAA-21", "product_type": "NRT", "min_date": "2023-01-01"},
    "VIIRS_NOAA21_SP": {"sensor": "VIIRS", "satellite": "NOAA-21", "product_type": "SP", "min_date": "2023-01-01"},
}


class AvailabilityService:
    """Service discovering and tracking availability boundaries across NASA FIRMS instruments."""

    @classmethod
    def refresh_availability(cls, firms_client: FirmsApiClient | None = None) -> list[dict[str, Any]]:
        """
        Queries NASA FIRMS Data Availability API and updates the local database cache.
        Falls back to documented mission baselines if API is unconfigured or unreachable.
        """
        client = firms_client or FirmsApiClient()

        if client.is_configured:
            try:
                csv_text = client.get_data_availability("all")
                return cls._parse_and_store_availability(csv_text)
            except (FirmsApiError, Exception) as err:
                logger.warning(f"Could not refresh live availability from NASA FIRMS ({err}). Using fallback baseline.")

        # Fallback to local baseline initialization
        return cls._seed_baseline_availability()

    @classmethod
    def _parse_and_store_availability(cls, csv_text: str) -> list[dict[str, Any]]:
        """Parses NASA FIRMS data_availability CSV and updates database records."""
        f = io.StringIO(csv_text.strip())
        reader = csv.DictReader(f)

        results = []
        now = datetime.now(timezone.utc)

        for row in reader:
            # NASA returns columns: data_source, min_date, max_date
            src = row.get("data_source") or row.get("source") or row.get("platform")
            if not src or src not in VALID_FIRMS_SOURCES:
                continue

            meta = VALID_FIRMS_SOURCES[src]
            min_date_str = row.get("min_date")
            max_date_str = row.get("max_date")

            min_d = date.fromisoformat(min_date_str) if min_date_str else None
            max_d = date.fromisoformat(max_date_str) if max_date_str else None

            # Upsert into database
            record = (
                db.session.query(DatasetAvailability)
                .filter(DatasetAvailability.source_product == src)
                .first()
            )
            if not record:
                record = DatasetAvailability(
                    source_product=src,
                    sensor=meta["sensor"],
                    satellite=meta["satellite"],
                    product_type=meta["product_type"],
                    min_date=min_d,
                    max_date=max_d,
                    status="available",
                    last_checked_at=now,
                )
                db.session.add(record)
            else:
                record.min_date = min_d
                record.max_date = max_d
                record.status = "available"
                record.last_checked_at = now

            results.append(record.to_dict())

        db.session.commit()
        return results

    @classmethod
    def _seed_baseline_availability(cls) -> list[dict[str, Any]]:
        """Ensures all 8 supported NASA FIRMS sources are seeded with documented mission baselines."""
        results = []
        now = datetime.now(timezone.utc)
        today = date.today()

        for src, baseline in MISSION_BASELINES.items():
            record = (
                db.session.query(DatasetAvailability)
                .filter(DatasetAvailability.source_product == src)
                .first()
            )
            if not record:
                record = DatasetAvailability(
                    source_product=src,
                    sensor=baseline["sensor"],
                    satellite=baseline["satellite"],
                    product_type=baseline["product_type"],
                    min_date=date.fromisoformat(baseline["min_date"]),
                    max_date=today,
                    status="baseline_cached",
                    last_checked_at=now,
                )
                db.session.add(record)
            else:
                record.last_checked_at = now

            results.append(record.to_dict())

        db.session.commit()
        return results

    @classmethod
    def get_all_availability(cls, refresh_if_empty: bool = True) -> list[dict[str, Any]]:
        """Returns all cached availability records, auto-seeding if empty, or fallback if DB unreachable."""
        try:
            records = db.session.query(DatasetAvailability).order_by(DatasetAvailability.sensor, DatasetAvailability.source_product).all()
            if not records and refresh_if_empty:
                return cls._seed_baseline_availability()
            return [r.to_dict() for r in records]
        except Exception as err:
            logger.warning(f"Database unavailable for availability cache ({err}). Returning mission baselines.")
            today = date.today().isoformat()
            return [
                {
                    "source_product": src,
                    "sensor": b["sensor"],
                    "satellite": b["satellite"],
                    "product_type": b["product_type"],
                    "min_date": b["min_date"],
                    "max_date": today,
                    "status": "baseline_cached",
                }
                for src, b in MISSION_BASELINES.items()
            ]
