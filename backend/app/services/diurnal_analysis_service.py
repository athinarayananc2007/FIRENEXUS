"""
Diurnal Fire Activity Analysis Service
Analyzes hourly acquisition distributions across UTC and local diurnal cycles,
accounting for sun-synchronous satellite equatorial crossing times and orbital sampling limits.
"""

import logging
from typing import Any
from collections import defaultdict
from app.models.observation import FireObservation
from app.services.harmonization_config import SATELLITE_ORBITS

logger = logging.getLogger(__name__)


class DiurnalAnalysisService:
    """Service computing diurnal (hourly) distributions and satellite sampling profiles."""

    @staticmethod
    def compute_hourly_distribution(observations: list[FireObservation]) -> list[dict[str, Any]]:
        """
        Groups observations by UTC acquisition hour (0 to 23) and computes
        detection counts, cumulative FRP, and sensor breakdown.
        """
        hourly_data: dict[int, list[FireObservation]] = defaultdict(list)

        for o in observations:
            # Extract hour from acq_time 'HH:MM' or acq_datetime
            hour = 0
            if o.acq_time and len(o.acq_time) >= 2 and o.acq_time[:2].isdigit():
                hour = int(o.acq_time[:2])
            elif o.acq_datetime:
                hour = o.acq_datetime.hour

            hour = max(0, min(23, hour))
            hourly_data[hour].append(o)

        distribution = []
        for h in range(24):
            obs_list = hourly_data.get(h, [])
            count = len(obs_list)

            modis_count = sum(1 for o in obs_list if "MODIS" in o.sensor.upper())
            viirs_count = sum(1 for o in obs_list if "VIIRS" in o.sensor.upper())

            daytime_count = sum(1 for o in obs_list if o.day_night == "D")
            nighttime_count = sum(1 for o in obs_list if o.day_night == "N")

            total_frp = round(sum(o.frp for o in obs_list), 2)
            avg_frp = round(total_frp / count, 2) if count > 0 else 0.0
            max_frp = round(max((o.frp for o in obs_list), default=0.0), 2)

            distribution.append({
                "utc_hour": h,
                "hour_formatted": f"{h:02d}:00",
                "total_observations": count,
                "modis_count": modis_count,
                "viirs_count": viirs_count,
                "daytime_observations": daytime_count,
                "nighttime_observations": nighttime_count,
                "total_frp_mw": total_frp,
                "avg_frp_mw": avg_frp,
                "max_frp_mw": max_frp,
            })

        return distribution

    @staticmethod
    def get_satellite_sampling_profiles() -> list[dict[str, Any]]:
        """
        Returns documented equator crossing times and nominal sampling windows
        for each spacecraft constellation.
        """
        return [
            {
                "satellite": sat,
                "sensor": meta["sensor"],
                "equator_crossing_lst": meta["equator_crossing_lst"],
                "orbit_type": meta["orbit_type"],
                "sampling_description": (
                    f"{sat} ({meta['sensor']}) observes in sun-synchronous orbit with nominal "
                    f"equator crossing at {meta['equator_crossing_lst']}."
                ),
            }
            for sat, meta in SATELLITE_ORBITS.items()
        ]
