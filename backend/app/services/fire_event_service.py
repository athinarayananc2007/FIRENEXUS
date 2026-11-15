"""
Fire Event Grouping Service
Clusters proximately and temporally related MODIS and VIIRS satellite observations
into cohesive fire event entities without merging unrelated fires or overwriting raw records.
"""

import math
import uuid
import logging
from datetime import datetime, timezone
from typing import Any
from app.models.observation import FireObservation
from app.models.harmonization import FireEvent, FireEventObservation
from app.services.spatial_matching_service import SpatialMatchingService
from app.services.temporal_matching_service import TemporalMatchingService
from app.services.harmonization_config import HarmonizationConfig, HARMONIZATION_ALGORITHM_VERSION

logger = logging.getLogger(__name__)


class FireEventService:
    """Service clustering satellite observations into aggregated fire events."""

    @staticmethod
    def _generate_event_code(acq_date_str: str, cluster_idx: int) -> str:
        """Generates a structured, human-readable event code, e.g. EVT-20260501-A1B2C3D4."""
        clean_date = acq_date_str.replace("-", "")
        uid_frag = uuid.uuid4().hex[:8].upper()
        return f"EVT-{clean_date}-{uid_frag}"

    @classmethod
    def cluster_observations_into_events(
        cls,
        observations: list[FireObservation],
        config: HarmonizationConfig | None = None,
    ) -> tuple[list[FireEvent], list[FireEventObservation]]:
        """
        Groups observations into distinct fire events using spatiotemporal proximity.
        
        Args:
            observations: List of FireObservation records to group.
            config: Optional HarmonizationConfig with radius and time window settings.
            
        Returns:
            Tuple of (list_of_FireEvent_instances, list_of_FireEventObservation_instances).
        """
        if not observations:
            return [], []

        cfg = config or HarmonizationConfig()
        spatial_radius = cfg.event_spatial_radius_meters
        temporal_window = cfg.event_temporal_window_seconds

        # Sort observations chronologically
        sorted_obs = sorted(observations, key=lambda o: TemporalMatchingService.ensure_utc(o.acq_datetime))

        clusters: list[list[FireObservation]] = []
        assigned = set()

        # Connected component clustering
        for i, obs_i in enumerate(sorted_obs):
            if obs_i.id in assigned:
                continue

            current_cluster = [obs_i]
            assigned.add(obs_i.id)
            queue = [obs_i]

            while queue:
                current_node = queue.pop(0)
                curr_dt = TemporalMatchingService.ensure_utc(current_node.acq_datetime)

                for j, obs_j in enumerate(sorted_obs):
                    if obs_j.id in assigned:
                        continue

                    # Check temporal condition
                    j_dt = TemporalMatchingService.ensure_utc(obs_j.acq_datetime)
                    time_diff = abs((j_dt - curr_dt).total_seconds())
                    if time_diff > temporal_window:
                        continue

                    # Check spatial condition (within neighbor radius AND cluster diameter limit to prevent chaining)
                    dist = SpatialMatchingService.haversine_distance_meters(
                        current_node.latitude, current_node.longitude,
                        obs_j.latitude, obs_j.longitude,
                    )

                    dist_from_seed = SpatialMatchingService.haversine_distance_meters(
                        obs_i.latitude, obs_i.longitude,
                        obs_j.latitude, obs_j.longitude,
                    )

                    if dist <= spatial_radius and dist_from_seed <= cfg.max_event_diameter_meters:
                        assigned.add(obs_j.id)
                        current_cluster.append(obs_j)
                        queue.append(obs_j)

            clusters.append(current_cluster)

        # Build FireEvent and FireEventObservation instances
        events: list[FireEvent] = []
        event_observations: list[FireEventObservation] = []

        now = datetime.now(timezone.utc)

        for idx, cluster in enumerate(clusters):
            # Compute centroid
            lats = [o.latitude for o in cluster]
            lons = [o.longitude for o in cluster]
            centroid_lat = round(sum(lats) / len(lats), 5)
            centroid_lon = round(sum(lons) / len(lons), 5)

            # Compute temporal boundaries
            dts = [TemporalMatchingService.ensure_utc(o.acq_datetime) for o in cluster]
            first_obs = min(dts)
            last_obs = max(dts)
            duration_hours = round(max(0.0, (last_obs - first_obs).total_seconds() / 3600.0), 2)

            # Sensor counts & FRP aggregations
            modis_obs = [o for o in cluster if "MODIS" in o.sensor.upper()]
            viirs_obs = [o for o in cluster if "VIIRS" in o.sensor.upper()]

            modis_frp = round(sum(o.frp for o in modis_obs), 2)
            viirs_frp = round(sum(o.frp for o in viirs_obs), 2)
            total_frp = round(sum(o.frp for o in cluster), 2)
            max_frp = round(max(o.frp for o in cluster), 2)
            avg_frp = round(total_frp / len(cluster), 2)

            # Calculate actual cluster bounding radius
            max_dist_to_centroid = 0.0
            for o in cluster:
                d = SpatialMatchingService.haversine_distance_meters(
                    centroid_lat, centroid_lon, o.latitude, o.longitude
                )
                if d > max_dist_to_centroid:
                    max_dist_to_centroid = d

            event_id = str(uuid.uuid4())
            event_code = cls._generate_event_code(first_obs.strftime("%Y%m%d"), idx)

            event = FireEvent(
                id=event_id,
                event_code=event_code,
                status="active" if duration_hours < 24.0 else "inactive",
                first_observed_at=first_obs,
                last_observed_at=last_obs,
                duration_hours=duration_hours,
                centroid_latitude=centroid_lat,
                centroid_longitude=centroid_lon,
                geom=f"SRID=4326;POINT({centroid_lon} {centroid_lat})",
                spatial_radius_meters=round(max_dist_to_centroid, 1),
                observation_count=len(cluster),
                modis_count=len(modis_obs),
                viirs_count=len(viirs_obs),
                total_frp_mw=total_frp,
                max_frp_mw=max_frp,
                avg_frp_mw=avg_frp,
                modis_frp_mw=modis_frp,
                viirs_frp_mw=viirs_frp,
                algorithm_version=cfg.algorithm_version,
                grouping_criteria=cfg.to_dict(),
                created_at=now,
                updated_at=now,
            )
            events.append(event)

            # Create association records
            for o in cluster:
                dist_to_cent = SpatialMatchingService.haversine_distance_meters(
                    centroid_lat, centroid_lon, o.latitude, o.longitude
                )
                o_dt = TemporalMatchingService.ensure_utc(o.acq_datetime)
                time_offset = round((o_dt - first_obs).total_seconds(), 1)

                assoc = FireEventObservation(
                    id=str(uuid.uuid4()),
                    event_id=event_id,
                    observation_id=o.id,
                    distance_to_centroid_meters=dist_to_cent,
                    time_offset_seconds=time_offset,
                    created_at=now,
                )
                event_observations.append(assoc)

        return events, event_observations
