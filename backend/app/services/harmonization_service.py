"""
Harmonization Orchestration Service
Coordinates sensor normalization, spatial and temporal cross-sensor correspondence matching,
and fire event grouping across MODIS and VIIRS satellite observations.
"""

import time
import math
import logging
from datetime import date, datetime, timezone
from typing import Any
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import HarmonizationRun
from app.services.harmonization_config import HarmonizationConfig, HARMONIZATION_ALGORITHM_VERSION
from app.services.sensor_normalization_service import SensorNormalizationService
from app.services.spatial_matching_service import SpatialMatchingService
from app.services.temporal_matching_service import TemporalMatchingService
from app.services.fire_event_service import FireEventService
from app.services.harmonization_repository import HarmonizationRepository

logger = logging.getLogger(__name__)


class HarmonizationService:
    """Service orchestrating end-to-end harmonization runs."""

    @classmethod
    def run_harmonization(
        cls,
        start_date: date | str | None = None,
        end_date: date | str | None = None,
        config: HarmonizationConfig | None = None,
    ) -> HarmonizationRun:
        """
        Executes a complete harmonization run:
        1. Normalizes raw observations.
        2. Performs cross-sensor correspondence matching between MODIS and VIIRS.
        3. Identifies reprocessing provenance correspondence between NRT and SP.
        4. Clusters observations into aggregated fire events.
        
        Args:
            start_date: Optional start date filter (ISO format or date object).
            end_date: Optional end date filter (ISO format or date object).
            config: Optional HarmonizationConfig parameters.
            
        Returns:
            Completed HarmonizationRun instance.
        """
        cfg = config or HarmonizationConfig()
        start_time = time.time()

        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        # Initialize audit run
        run = HarmonizationRun(
            algorithm_version=cfg.algorithm_version,
            parameters=cfg.to_dict(),
            start_date=start_date,
            end_date=end_date,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        db.session.add(run)
        db.session.commit()

        try:
            # 1. Fetch raw observations to harmonize
            query = db.session.query(FireObservation)
            if start_date:
                query = query.filter(FireObservation.acq_date >= start_date)
            if end_date:
                query = query.filter(FireObservation.acq_date <= end_date)

            observations = query.order_by(FireObservation.acq_datetime.asc()).all()
            run.total_observations_analyzed = len(observations)

            if not observations:
                run.status = "completed"
                run.duration_seconds = round(time.time() - start_time, 2)
                run.completed_at = datetime.now(timezone.utc)
                db.session.commit()
                return run

            # 2. Stage 1: Sensor Normalization
            normalized_records = [
                SensorNormalizationService.normalize_observation(
                    obs, algorithm_version=cfg.algorithm_version
                )
                for obs in observations
            ]
            harm_inserted, harm_skipped = HarmonizationRepository.bulk_insert_harmonized(
                normalized_records, batch_size=cfg.batch_size
            )
            run.harmonized_records_created = harm_inserted
            run.duplicates_skipped += harm_skipped

            # 3. Stage 2: Cross-Sensor Correspondence Matching
            # Partition observations by sensor
            modis_obs = [o for o in observations if "MODIS" in o.sensor.upper()]
            viirs_obs = [o for o in observations if "VIIRS" in o.sensor.upper()]

            matches_to_insert = []
            duplicate_matches_skipped = 0

            # Optimize spatial search using coarse grid binning (~0.05 deg ~= 5.5 km)
            # to avoid N * M exhaustive pairwise distance computations
            grid_bins: dict[tuple[int, int], list[FireObservation]] = {}
            for v_obs in viirs_obs:
                bin_key = (math.floor(v_obs.latitude * 20), math.floor(v_obs.longitude * 20))
                grid_bins.setdefault(bin_key, []).append(v_obs)

            # Compare MODIS observations against VIIRS observations in adjacent grid bins
            for m_obs in modis_obs:
                m_bin_lat = math.floor(m_obs.latitude * 20)
                m_bin_lon = math.floor(m_obs.longitude * 20)

                candidate_viirs = []
                for d_lat in (-1, 0, 1):
                    for d_lon in (-1, 0, 1):
                        neighbor_key = (m_bin_lat + d_lat, m_bin_lon + d_lon)
                        if neighbor_key in grid_bins:
                            candidate_viirs.extend(grid_bins[neighbor_key])

                for v_obs in candidate_viirs:
                    # Spatial evaluation
                    is_spatial, dist, overlap_ratio = SpatialMatchingService.evaluate_spatial_match(
                        m_obs, v_obs,
                        max_distance_meters=cfg.max_spatial_distance_meters,
                        use_footprint_geometry=cfg.use_footprint_geometry,
                    )
                    if not is_spatial:
                        continue

                    # Temporal evaluation
                    is_temporal, time_diff, window = TemporalMatchingService.evaluate_temporal_match(
                        m_obs, v_obs, config=cfg
                    )
                    if not is_temporal:
                        continue

                    # Combined algorithmic score
                    s_spatial = max(0.0, 1.0 - (dist / cfg.max_spatial_distance_meters))
                    s_temporal = max(0.0, 1.0 - (time_diff / window)) if window > 0 else 1.0
                    match_score = round(cfg.spatial_weight * s_spatial + cfg.temporal_weight * s_temporal, 3)

                    if match_score < cfg.min_match_score:
                        continue

                    # Determine match classification
                    match_type = "cross_sensor"
                    if m_obs.sensor == v_obs.sensor and m_obs.product_type != v_obs.product_type:
                        match_type = "reprocessing_provenance"

                    matches_to_insert.append({
                        "modis_obs_id": m_obs.id,
                        "viirs_obs_id": v_obs.id,
                        "match_type": match_type,
                        "spatial_distance_meters": dist,
                        "footprint_overlap_ratio": overlap_ratio,
                        "time_difference_seconds": time_diff,
                        "match_score": match_score,
                        "match_criteria": {
                            "max_spatial_threshold_m": cfg.max_spatial_distance_meters,
                            "temporal_window_s": window,
                            "spatial_weight": cfg.spatial_weight,
                            "temporal_weight": cfg.temporal_weight,
                        },
                        "algorithm_version": cfg.algorithm_version,
                        "status": "confirmed" if match_score >= 0.70 else "candidate",
                    })

            # Check NRT vs SP provenance correspondence for homogeneous sensor pairs
            # (e.g. MODIS_NRT <-> MODIS_SP or VIIRS_SNPP_NRT <-> VIIRS_SNPP_SP)
            provenance_pairs = cls._detect_reprocessing_provenance(observations, cfg)
            matches_to_insert.extend(provenance_pairs)

            ins_matches, skip_matches = HarmonizationRepository.bulk_insert_matches(
                matches_to_insert, batch_size=cfg.batch_size
            )
            run.matches_created = ins_matches
            run.duplicates_skipped += skip_matches

            # 4. Stage 3: Fire Event Grouping
            events, event_observations = FireEventService.cluster_observations_into_events(
                observations, config=cfg
            )
            ins_events, skip_events = HarmonizationRepository.bulk_insert_events(events, event_observations)
            run.events_created = ins_events
            run.duplicates_skipped += skip_events

            # 5. Finalize run
            run.status = "completed"
            run.duration_seconds = round(time.time() - start_time, 2)
            run.completed_at = datetime.now(timezone.utc)
            db.session.commit()
            return run

        except Exception as err:
            db.session.rollback()
            logger.error(f"Harmonization run {run.id} failed: {err}")
            run.status = "failed"
            run.error_message = str(err)
            run.duration_seconds = round(time.time() - start_time, 2)
            run.completed_at = datetime.now(timezone.utc)
            db.session.commit()
            return run

    @classmethod
    def _detect_reprocessing_provenance(
        cls,
        observations: list[FireObservation],
        config: HarmonizationConfig,
    ) -> list[dict[str, Any]]:
        """
        Detects potential reprocessing lineage pairs where an NRT observation was subsequently
        reprocessed as a Standard Processing (SP) observation from the same instrument.
        """
        nrt_obs = [o for o in observations if o.product_type == "NRT"]
        sp_obs = [o for o in observations if o.product_type == "SP"]

        provenance_matches = []

        for nrt in nrt_obs:
            for sp in sp_obs:
                # Same sensor and satellite platform required
                if nrt.sensor != sp.sensor or nrt.satellite != sp.satellite:
                    continue

                # Close in time (< 180s) and space (< 500m)
                t_diff = TemporalMatchingService.calculate_time_difference_seconds(
                    nrt.acq_datetime, sp.acq_datetime
                )
                if t_diff > 180.0:
                    continue

                dist = SpatialMatchingService.haversine_distance_meters(
                    nrt.latitude, nrt.longitude, sp.latitude, sp.longitude
                )
                if dist > 500.0:
                    continue

                # Provenance match identified
                # In our schema: modis_obs_id holds observation 1, viirs_obs_id holds observation 2
                provenance_matches.append({
                    "modis_obs_id": nrt.id,
                    "viirs_obs_id": sp.id,
                    "match_type": "reprocessing_provenance",
                    "spatial_distance_meters": dist,
                    "footprint_overlap_ratio": 1.0,
                    "time_difference_seconds": t_diff,
                    "match_score": 0.95,
                    "match_criteria": {"provenance_type": "NRT_to_SP_reprocessing"},
                    "algorithm_version": config.algorithm_version,
                    "status": "confirmed",
                })

        return provenance_matches
