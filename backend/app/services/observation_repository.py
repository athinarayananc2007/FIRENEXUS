"""
Observation Repository
Encapsulates high-performance database interactions, transactional bulk insertion,
idempotent deduplication, dynamic spatial-temporal filtering, and analytical aggregations.
"""

import logging
from datetime import date, datetime
from typing import Any
from sqlalchemy import func, desc, asc, case
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.models.observation import FireObservation

logger = logging.getLogger(__name__)


class ObservationRepository:
    """Repository handling all database persistence and queries for satellite fire observations."""

    @classmethod
    def bulk_insert_observations(
        cls,
        records: list[dict[str, Any]],
        ingestion_run_id: str | None = None,
        batch_size: int = 1000,
    ) -> tuple[int, int, int]:
        """
        Idempotently inserts a collection of parsed observation records in batches.
        Detects existing records by dedup_hash to prevent duplicate ingestion.
        
        Returns:
            Tuple of (inserted_count, duplicate_count, error_count).
        """
        if not records:
            return 0, 0, 0

        inserted_count = 0
        duplicate_count = 0
        error_count = 0

        # Process in chunks of batch_size
        for i in range(0, len(records), batch_size):
            chunk = records[i : i + batch_size]
            chunk_hashes = [r["dedup_hash"] for r in chunk]

            try:
                # Query existing dedup_hashes in the database for this chunk
                existing_hashes = set(
                    row[0]
                    for row in db.session.query(FireObservation.dedup_hash)
                    .filter(FireObservation.dedup_hash.in_(chunk_hashes))
                    .all()
                )

                to_insert = []
                seen_in_chunk = set()

                for r in chunk:
                    d_hash = r["dedup_hash"]
                    if d_hash in existing_hashes or d_hash in seen_in_chunk:
                        duplicate_count += 1
                        continue

                    seen_in_chunk.add(d_hash)

                    # Build FireObservation model instance
                    obs = FireObservation(
                        id=r["id"],
                        dedup_hash=d_hash,
                        source_product=r["source_product"],
                        sensor=r["sensor"],
                        satellite=r["satellite"],
                        product_type=r["product_type"],
                        acq_date=r["acq_date"],
                        acq_time=r["acq_time"],
                        acq_datetime=r["acq_datetime"],
                        latitude=r["latitude"],
                        longitude=r["longitude"],
                        geom=r.get("geom") or (f"SRID=4326;POINT({r['longitude']} {r['latitude']})" if r.get("longitude") is not None and r.get("latitude") is not None else None),
                        brightness=r["brightness"],
                        bright_secondary=r.get("bright_secondary"),
                        frp=r["frp"],
                        confidence=r["confidence"],
                        confidence_raw=r.get("confidence_raw"),
                        day_night=r.get("day_night"),
                        scan=r.get("scan"),
                        track=r.get("track"),
                        version=r.get("version"),
                        country=r.get("country"),
                        region=r.get("region"),
                        continent=r.get("continent"),
                        raw_data=r.get("raw_data"),
                        ingestion_run_id=ingestion_run_id,
                    )
                    to_insert.append(obs)

                if to_insert:
                    db.session.bulk_save_objects(to_insert)
                    db.session.commit()
                    inserted_count += len(to_insert)

            except SQLAlchemyError as err:
                db.session.rollback()
                logger.error(f"Error during bulk save chunk {i//batch_size + 1}: {err}")
                error_count += len(chunk)

        logger.info(
            f"Repository bulk insert complete: {inserted_count} inserted, {duplicate_count} skipped duplicates, {error_count} errors."
        )
        return inserted_count, duplicate_count, error_count

    @classmethod
    def get_observations_paginated(
        cls,
        filters: dict[str, Any] | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "acq_datetime",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """
        Queries observations with dynamic filtering, sorting, and pagination.
        """
        filters = filters or {}
        query = db.session.query(FireObservation)

        # 1. Sensor filter (MODIS | VIIRS | ALL)
        sensor = filters.get("sensor") or filters.get("satellite_group")
        if sensor and sensor.upper() != "ALL":
            query = query.filter(FireObservation.sensor == sensor.upper())

        # 2. Specific satellite platform
        satellite = filters.get("satellite")
        if satellite and satellite.upper() != "ALL":
            query = query.filter(FireObservation.satellite == satellite)

        # 3. Source product
        source = filters.get("source_product")
        if source and source.upper() != "ALL":
            query = query.filter(FireObservation.source_product == source)

        # 4. Product type (NRT | SP)
        product_type = filters.get("product_type")
        if product_type and product_type.upper() != "ALL":
            query = query.filter(FireObservation.product_type == product_type.upper())

        # 5. Date range
        start_date = filters.get("start_date")
        if start_date:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date)
            query = query.filter(FireObservation.acq_date >= start_date)

        end_date = filters.get("end_date")
        if end_date:
            if isinstance(end_date, str):
                end_date = date.fromisoformat(end_date)
            query = query.filter(FireObservation.acq_date <= end_date)

        # 6. Confidence rating (single or list)
        confidence = filters.get("confidence")
        if confidence:
            if isinstance(confidence, str) and confidence.lower() != "all":
                confs = [c.strip().lower() for c in confidence.split(",")]
                query = query.filter(FireObservation.confidence.in_(confs))
            elif isinstance(confidence, (list, tuple)):
                query = query.filter(FireObservation.confidence.in_([c.lower() for c in confidence]))

        # 7. Fire Radiative Power (MW) bounds
        min_frp = filters.get("min_frp")
        if min_frp is not None:
            query = query.filter(FireObservation.frp >= float(min_frp))

        max_frp = filters.get("max_frp")
        if max_frp is not None:
            query = query.filter(FireObservation.frp <= float(max_frp))

        # 8. Solar Day / Night
        day_night = filters.get("day_night")
        if day_night and day_night.upper() in ("D", "N"):
            query = query.filter(FireObservation.day_night == day_night.upper())

        # 9. Spatial bounding box (min_lat, max_lat, min_lon, max_lon)
        min_lat = filters.get("min_lat")
        if min_lat is not None:
            query = query.filter(FireObservation.latitude >= float(min_lat))

        max_lat = filters.get("max_lat")
        if max_lat is not None:
            query = query.filter(FireObservation.latitude <= float(max_lat))

        min_lon = filters.get("min_lon")
        if min_lon is not None:
            query = query.filter(FireObservation.longitude >= float(min_lon))

        max_lon = filters.get("max_lon")
        if max_lon is not None:
            query = query.filter(FireObservation.longitude <= float(max_lon))

        # 10. Geographic text search (country / region)
        country = filters.get("country")
        if country:
            query = query.filter(FireObservation.country.ilike(f"%{country}%"))

        # Total count
        total_count = query.count() or 0

        # Sorting
        sort_columns = {
            "acq_datetime": FireObservation.acq_datetime,
            "date": FireObservation.acq_date,
            "frp": FireObservation.frp,
            "brightness": FireObservation.brightness,
            "confidence": FireObservation.confidence,
            "latitude": FireObservation.latitude,
            "longitude": FireObservation.longitude,
            "satellite": FireObservation.satellite,
        }
        order_col = sort_columns.get(sort_by, FireObservation.acq_datetime)
        direction = desc if sort_order.lower() == "desc" else asc
        query = query.order_by(direction(order_col))

        # Pagination calculation
        page = max(1, int(page))
        page_size = max(1, min(1000, int(page_size)))
        total_pages = max(1, (total_count + page_size - 1) // page_size)

        offset = (page - 1) * page_size
        items = query.offset(offset).limit(page_size).all()

        return {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "items": [obs.to_dict() for obs in items],
        }

    @classmethod
    def get_summary_stats(cls, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Computes aggregate metrics across the filtered observation catalog.
        """
        filters = filters or {}
        query = db.session.query(FireObservation)

        # Apply basic date/sensor filters if given
        sensor = filters.get("sensor")
        if sensor and sensor.upper() != "ALL":
            query = query.filter(FireObservation.sensor == sensor.upper())

        start_date = filters.get("start_date")
        if start_date:
            if isinstance(start_date, str):
                start_date = date.fromisoformat(start_date)
            query = query.filter(FireObservation.acq_date >= start_date)

        end_date = filters.get("end_date")
        if end_date:
            if isinstance(end_date, str):
                end_date = date.fromisoformat(end_date)
            query = query.filter(FireObservation.acq_date <= end_date)

        stat_vals = query.with_entities(
            func.count(FireObservation.id),
            func.sum(case((FireObservation.sensor == "MODIS", 1), else_=0)),
            func.sum(case((FireObservation.sensor == "VIIRS", 1), else_=0)),
            func.sum(case((FireObservation.confidence == "high", 1), else_=0)),
            func.sum(case((FireObservation.confidence == "nominal", 1), else_=0)),
            func.sum(case((FireObservation.confidence == "low", 1), else_=0)),
            func.sum(case((FireObservation.day_night == "D", 1), else_=0)),
            func.sum(case((FireObservation.day_night == "N", 1), else_=0)),
            func.avg(FireObservation.frp),
            func.max(FireObservation.frp),
            func.min(FireObservation.acq_date),
            func.max(FireObservation.acq_date),
        ).first()

        total_obs = int(stat_vals[0]) if stat_vals and stat_vals[0] else 0

        if total_obs == 0:
            return {
                "total_observations": 0,
                "modis_records": 0,
                "viirs_records": 0,
                "high_confidence_records": 0,
                "nominal_confidence_records": 0,
                "low_confidence_records": 0,
                "avg_frp": 0.0,
                "max_frp": 0.0,
                "daytime_records": 0,
                "nighttime_records": 0,
                "date_min": None,
                "date_max": None,
            }

        modis_count = int(stat_vals[1] or 0)
        viirs_count = int(stat_vals[2] or 0)
        high_conf = int(stat_vals[3] or 0)
        nom_conf = int(stat_vals[4] or 0)
        low_conf = int(stat_vals[5] or 0)
        day_count = int(stat_vals[6] or 0)
        night_count = int(stat_vals[7] or 0)

        avg_frp = float(stat_vals[8]) if stat_vals[8] is not None else 0.0
        max_frp = float(stat_vals[9]) if stat_vals[9] is not None else 0.0
        min_d = stat_vals[10].isoformat() if stat_vals[10] else None
        max_d = stat_vals[11].isoformat() if stat_vals[11] else None

        return {
            "total_observations": total_obs,
            "modis_records": modis_count,
            "viirs_records": viirs_count,
            "high_confidence_records": high_conf,
            "nominal_confidence_records": nom_conf,
            "low_confidence_records": low_conf,
            "avg_frp": round(avg_frp, 2),
            "max_frp": round(max_frp, 2),
            "daytime_records": day_count,
            "nighttime_records": night_count,
            "date_min": min_d,
            "date_max": max_d,
        }

    @classmethod
    def get_by_id(cls, observation_id: str) -> FireObservation | None:
        """Retrieves a single observation by its unique ID."""
        return db.session.query(FireObservation).filter(FireObservation.id == observation_id).first()

