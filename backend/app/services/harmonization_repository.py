"""
Harmonization Repository
Encapsulates high-performance database interactions, transactional bulk insertion,
idempotent match deduplication, and filtered queries for harmonized records, matches, and events.
"""

import logging
from datetime import date, datetime
from typing import Any
from sqlalchemy import func, desc, asc
from sqlalchemy.exc import SQLAlchemyError
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import (
    HarmonizedObservation,
    ObservationMatch,
    FireEvent,
    FireEventObservation,
    HarmonizationRun,
)

logger = logging.getLogger(__name__)


class HarmonizationRepository:
    """Repository handling database persistence and queries for the harmonization engine."""

    # -------------------------------------------------------------------------
    # Bulk Insertions with Deduplication
    # -------------------------------------------------------------------------

    @classmethod
    def bulk_insert_harmonized(
        cls,
        records: list[dict[str, Any]],
        batch_size: int = 500,
    ) -> tuple[int, int]:
        """
        Idempotently inserts normalized observations, skipping any observation_id
        that has already been harmonized.
        
        Returns:
            Tuple of (inserted_count, skipped_count).
        """
        if not records:
            return 0, 0

        inserted = 0
        skipped = 0

        for i in range(0, len(records), batch_size):
            chunk = records[i : i + batch_size]
            obs_ids = [r["observation_id"] for r in chunk]
            ver = chunk[0].get("algorithm_version") if chunk else None

            # Find already harmonized (observation_id, algorithm_version) pairs in chunk
            query = db.session.query(HarmonizedObservation.observation_id).filter(
                HarmonizedObservation.observation_id.in_(obs_ids)
            )
            if ver:
                query = query.filter(HarmonizedObservation.algorithm_version == ver)

            existing_ids = set(row[0] for row in query.all())

            to_insert = []
            seen_in_chunk = set()

            for r in chunk:
                oid = r["observation_id"]
                pair_key = (oid, r.get("algorithm_version"))
                if oid in existing_ids or pair_key in seen_in_chunk:
                    skipped += 1
                    continue

                seen_in_chunk.add(pair_key)
                inst = HarmonizedObservation(**r)
                to_insert.append(inst)

            if to_insert:
                try:
                    db.session.add_all(to_insert)
                    db.session.commit()
                    inserted += len(to_insert)
                except SQLAlchemyError as err:
                    db.session.rollback()
                    logger.error(f"Error bulk inserting harmonized records: {err}")
                    raise

        return inserted, skipped

    @classmethod
    def bulk_insert_matches(
        cls,
        matches: list[dict[str, Any]],
        batch_size: int = 500,
    ) -> tuple[int, int]:
        """
        Idempotently inserts observation matches, skipping duplicates of
        (modis_obs_id, viirs_obs_id, algorithm_version).
        
        Returns:
            Tuple of (inserted_count, skipped_count).
        """
        if not matches:
            return 0, 0

        inserted = 0
        skipped = 0

        for i in range(0, len(matches), batch_size):
            chunk = matches[i : i + batch_size]

            # Batch query existing match pairs for this chunk to avoid N+1 queries
            m_ids = [r["modis_obs_id"] for r in chunk]
            existing_rows = (
                db.session.query(
                    ObservationMatch.modis_obs_id,
                    ObservationMatch.viirs_obs_id,
                    ObservationMatch.algorithm_version,
                )
                .filter(ObservationMatch.modis_obs_id.in_(m_ids))
                .all()
            )
            existing_pairs = set(existing_rows)

            to_insert = []
            seen_in_chunk = set()

            for r in chunk:
                pair_key = (r["modis_obs_id"], r["viirs_obs_id"], r.get("algorithm_version"))
                if pair_key in existing_pairs or pair_key in seen_in_chunk:
                    skipped += 1
                    continue

                seen_in_chunk.add(pair_key)
                inst = ObservationMatch(**r)
                to_insert.append(inst)

            if to_insert:
                try:
                    db.session.add_all(to_insert)
                    db.session.commit()
                    inserted += len(to_insert)
                except SQLAlchemyError as err:
                    db.session.rollback()
                    logger.error(f"Error bulk inserting matches: {err}")
                    raise

        return inserted, skipped

    @classmethod
    def bulk_insert_events(
        cls,
        events: list[FireEvent],
        event_observations: list[FireEventObservation],
    ) -> tuple[int, int]:
        """
        Idempotently inserts fire events and observation associations.
        Skips events whose member observations are already clustered into an existing event.
        
        Returns:
            Tuple of (inserted_events_count, skipped_events_count).
        """
        if not events:
            return 0, 0

        # Query existing observation associations
        all_obs_ids = [eo.observation_id for eo in event_observations]
        existing_associated = set(
            row[0] for row in db.session.query(FireEventObservation.observation_id)
            .filter(FireEventObservation.observation_id.in_(all_obs_ids))
            .all()
        )

        # Build mapping of event_id -> list of observation_ids
        event_to_obs: dict[str, list[str]] = {}
        for eo in event_observations:
            event_to_obs.setdefault(eo.event_id, []).append(eo.observation_id)

        events_to_insert = []
        skipped_events = 0

        for evt in events:
            obs_ids = event_to_obs.get(evt.id, [])
            if obs_ids and all(oid in existing_associated for oid in obs_ids):
                skipped_events += 1
                continue
            events_to_insert.append(evt)

        valid_event_ids = set(e.id for e in events_to_insert)
        assoc_to_insert = [
            eo for eo in event_observations 
            if eo.event_id in valid_event_ids and eo.observation_id not in existing_associated
        ]

        if not events_to_insert:
            return 0, skipped_events

        # Ensure event codes are unique against existing database records and current batch
        existing_codes = set(
            row[0] for row in db.session.query(FireEvent.event_code).all()
        )
        for evt in events_to_insert:
            while evt.event_code in existing_codes:
                clean_date = evt.first_observed_at.strftime("%Y%m%d")
                evt.event_code = f"EVT-{clean_date}-{uuid.uuid4().hex[:8].upper()}"
            existing_codes.add(evt.event_code)

        try:
            db.session.add_all(events_to_insert)
            db.session.flush()

            if assoc_to_insert:
                db.session.add_all(assoc_to_insert)

            db.session.commit()
            return len(events_to_insert), skipped_events
        except SQLAlchemyError as err:
            db.session.rollback()
            logger.error(f"Error inserting fire events: {err}")
            raise

    # -------------------------------------------------------------------------
    # Match Queries
    # -------------------------------------------------------------------------

    @classmethod
    def get_matches_paginated(
        cls,
        filters: dict[str, Any] | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "match_score",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """Retrieves paginated, filtered observation match correspondence records."""
        filters = filters or {}
        page = max(1, page)
        page_size = max(1, min(1000, page_size))

        query = db.session.query(ObservationMatch)

        # Filters
        match_type = filters.get("match_type")
        if match_type:
            query = query.filter(ObservationMatch.match_type == match_type)

        status = filters.get("status")
        if status:
            query = query.filter(ObservationMatch.status == status)

        min_score = filters.get("min_score")
        if min_score is not None:
            try:
                query = query.filter(ObservationMatch.match_score >= float(min_score))
            except (ValueError, TypeError):
                pass

        max_distance = filters.get("max_distance")
        if max_distance is not None:
            try:
                query = query.filter(ObservationMatch.spatial_distance_meters <= float(max_distance))
            except (ValueError, TypeError):
                pass

        max_time_diff = filters.get("max_time_diff")
        if max_time_diff is not None:
            try:
                query = query.filter(ObservationMatch.time_difference_seconds <= float(max_time_diff))
            except (ValueError, TypeError):
                pass

        algorithm_version = filters.get("algorithm_version")
        if algorithm_version:
            query = query.filter(ObservationMatch.algorithm_version == algorithm_version)

        total = query.count() or 0

        # Sorting
        sort_col = getattr(ObservationMatch, sort_by, ObservationMatch.match_score)
        direction = desc if sort_order.lower() == "desc" else asc
        query = query.order_by(direction(sort_col))

        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "items": [m.to_dict() for m in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

    @classmethod
    def get_match_by_id(cls, match_id: str) -> dict[str, Any] | None:
        """Retrieves single match record with populated observation details."""
        m = db.session.query(ObservationMatch).filter(ObservationMatch.id == match_id).first()
        if not m:
            return None

        result = m.to_dict()
        result["modis_observation"] = m.modis_observation.to_dict() if m.modis_observation else None
        result["viirs_observation"] = m.viirs_observation.to_dict() if m.viirs_observation else None
        return result

    # -------------------------------------------------------------------------
    # Fire Event Queries
    # -------------------------------------------------------------------------

    @classmethod
    def get_events_paginated(
        cls,
        filters: dict[str, Any] | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "first_observed_at",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """Retrieves paginated, filtered fire event cluster records."""
        filters = filters or {}
        page = max(1, page)
        page_size = max(1, min(1000, page_size))

        query = db.session.query(FireEvent)

        # Filters
        status = filters.get("status")
        if status:
            query = query.filter(FireEvent.status == status)

        min_obs = filters.get("min_obs_count")
        if min_obs is not None:
            try:
                query = query.filter(FireEvent.observation_count >= int(min_obs))
            except (ValueError, TypeError):
                pass

        min_frp = filters.get("min_frp")
        if min_frp is not None:
            try:
                query = query.filter(FireEvent.total_frp_mw >= float(min_frp))
            except (ValueError, TypeError):
                pass

        start_date = filters.get("start_date")
        if start_date:
            try:
                d = date.fromisoformat(start_date)
                query = query.filter(FireEvent.first_observed_at >= datetime(d.year, d.month, d.day))
            except (ValueError, TypeError):
                pass

        end_date = filters.get("end_date")
        if end_date:
            try:
                d = date.fromisoformat(end_date)
                query = query.filter(FireEvent.last_observed_at <= datetime(d.year, d.month, d.day, 23, 59, 59))
            except (ValueError, TypeError):
                pass

        # Geographic bounding box
        min_lat = filters.get("min_lat")
        max_lat = filters.get("max_lat")
        min_lon = filters.get("min_lon")
        max_lon = filters.get("max_lon")
        if all(v is not None for v in (min_lat, max_lat, min_lon, max_lon)):
            try:
                query = query.filter(
                    FireEvent.centroid_latitude >= float(min_lat),
                    FireEvent.centroid_latitude <= float(max_lat),
                    FireEvent.centroid_longitude >= float(min_lon),
                    FireEvent.centroid_longitude <= float(max_lon),
                )
            except (ValueError, TypeError):
                pass

        total = query.count() or 0

        sort_col = getattr(FireEvent, sort_by, FireEvent.first_observed_at)
        direction = desc if sort_order.lower() == "desc" else asc
        query = query.order_by(direction(sort_col))

        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "items": [e.to_dict() for e in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

    @classmethod
    def get_event_by_id(cls, event_id: str) -> dict[str, Any] | None:
        """Retrieves single fire event record with its member observation IDs."""
        event = db.session.query(FireEvent).filter(FireEvent.id == event_id).first()
        if not event:
            return None

        result = event.to_dict()
        assocs = (
            db.session.query(FireEventObservation)
            .filter(FireEventObservation.event_id == event_id)
            .all()
        )
        result["member_observations"] = [
            {
                "observation_id": a.observation_id,
                "distance_to_centroid_meters": a.distance_to_centroid_meters,
                "time_offset_seconds": a.time_offset_seconds,
            }
            for a in assocs
        ]
        return result

    # -------------------------------------------------------------------------
    # Harmonized Observation Queries
    # -------------------------------------------------------------------------

    @classmethod
    def get_harmonized_observations_paginated(
        cls,
        filters: dict[str, Any] | None = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "acq_datetime",
        sort_order: str = "desc",
    ) -> dict[str, Any]:
        """Retrieves paginated, filtered harmonized observation records."""
        filters = filters or {}
        page = max(1, page)
        page_size = max(1, min(1000, page_size))

        query = db.session.query(HarmonizedObservation)

        sensor = filters.get("sensor")
        if sensor and sensor.upper() != "ALL":
            query = query.filter(HarmonizedObservation.sensor == sensor.upper())

        satellite = filters.get("satellite")
        if satellite:
            query = query.filter(HarmonizedObservation.satellite == satellite)

        confidence = filters.get("confidence") or filters.get("confidence_category")
        if confidence:
            query = query.filter(HarmonizedObservation.confidence_category == confidence.lower())

        min_frp = filters.get("min_frp")
        if min_frp is not None:
            try:
                query = query.filter(HarmonizedObservation.frp_mw >= float(min_frp))
            except (ValueError, TypeError):
                pass

        max_frp = filters.get("max_frp")
        if max_frp is not None:
            try:
                query = query.filter(HarmonizedObservation.frp_mw <= float(max_frp))
            except (ValueError, TypeError):
                pass

        total = query.count() or 0

        sort_col = getattr(HarmonizedObservation, sort_by, HarmonizedObservation.acq_datetime)
        direction = desc if sort_order.lower() == "desc" else asc
        query = query.order_by(direction(sort_col))

        items = query.offset((page - 1) * page_size).limit(page_size).all()
        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return {
            "items": [h.to_dict() for h in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }

    # -------------------------------------------------------------------------
    # Summary Metrics & Auditing
    # -------------------------------------------------------------------------

    @classmethod
    def get_harmonization_summary(cls, filters: dict[str, Any] | None = None) -> dict[str, Any]:
        """Computes summary statistics for harmonized observations, matches, and events, falling back gracefully if DB is offline."""
        try:
            total_harm = db.session.query(HarmonizedObservation).count()
            modis_harm = db.session.query(HarmonizedObservation).filter(HarmonizedObservation.sensor == "MODIS").count()
            viirs_harm = db.session.query(HarmonizedObservation).filter(HarmonizedObservation.sensor == "VIIRS").count()

            total_matches = db.session.query(ObservationMatch).count()
            cross_sensor_matches = db.session.query(ObservationMatch).filter(ObservationMatch.match_type == "cross_sensor").count()
            provenance_matches = db.session.query(ObservationMatch).filter(ObservationMatch.match_type == "reprocessing_provenance").count()

            avg_score_res = db.session.query(func.avg(ObservationMatch.match_score)).first()
            avg_score = round(float(avg_score_res[0]), 3) if avg_score_res and avg_score_res[0] is not None else 0.0

            total_events = db.session.query(FireEvent).count()
            active_events = db.session.query(FireEvent).filter(FireEvent.status == "active").count()

            event_frp_res = db.session.query(func.sum(FireEvent.total_frp_mw)).first()
            total_event_frp = round(float(event_frp_res[0]), 2) if event_frp_res and event_frp_res[0] is not None else 0.0

            return {
                "harmonized_observations": {
                    "total": total_harm,
                    "modis": modis_harm,
                    "viirs": viirs_harm,
                },
                "matches": {
                    "total": total_matches,
                    "cross_sensor": cross_sensor_matches,
                    "reprocessing_provenance": provenance_matches,
                    "average_match_score": avg_score,
                },
                "events": {
                    "total": total_events,
                    "active": active_events,
                    "total_frp_mw": total_event_frp,
                },
            }
        except Exception as err:
            logger.warning(f"Database unavailable for harmonization summary ({err}). Returning zeroed baselines.")
            return {
                "harmonized_observations": {"total": 0, "modis": 0, "viirs": 0},
                "matches": {"total": 0, "cross_sensor": 0, "reprocessing_provenance": 0, "average_match_score": 0.0},
                "events": {"total": 0, "active": 0, "total_frp_mw": 0.0},
            }

    @classmethod
    def get_runs_status(cls, limit: int = 20) -> list[dict[str, Any]]:
        """Retrieves recent HarmonizationRun records."""
        runs = (
            db.session.query(HarmonizationRun)
            .order_by(HarmonizationRun.started_at.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in runs]
