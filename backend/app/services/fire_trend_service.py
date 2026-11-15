"""
Fire Activity Trend Analysis Service
Computes temporal aggregations (daily, weekly, monthly) for fire observation counts,
Fire Radiative Power (FRP), sensor detection ratios, and active event durations.
"""

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any
from collections import defaultdict
from app.models.observation import FireObservation
from app.models.harmonization import FireEvent

logger = logging.getLogger(__name__)


class FireTrendService:
    """Service generating temporal trends and time-series summaries of fire activity."""

    @staticmethod
    def aggregate_trends_by_period(
        observations: list[FireObservation],
        period: str = "daily",  # 'daily', 'weekly', 'monthly'
    ) -> list[dict[str, Any]]:
        """
        Groups observations by period and aggregates counts, FRP metrics,
        and sensor ratios.
        """
        if not observations:
            return []

        buckets: dict[str, list[FireObservation]] = defaultdict(list)

        for o in observations:
            d = o.acq_date
            if period == "monthly":
                key = d.strftime("%Y-%m-01")
            elif period == "weekly":
                # ISO week start date (Monday)
                start_of_week = d - timedelta(days=d.weekday())
                key = start_of_week.isoformat()
            else:  # default 'daily'
                key = d.isoformat()

            buckets[key].append(o)

        trend_results = []
        for period_key in sorted(buckets.keys()):
            obs_list = buckets[period_key]
            total_count = len(obs_list)

            modis_obs = [o for o in obs_list if "MODIS" in o.sensor.upper()]
            viirs_obs = [o for o in obs_list if "VIIRS" in o.sensor.upper()]

            total_frp = round(sum(o.frp for o in obs_list), 2)
            avg_frp = round(total_frp / total_count, 2)
            max_frp = round(max(o.frp for o in obs_list), 2)

            modis_count = len(modis_obs)
            viirs_count = len(viirs_obs)
            modis_frp = round(sum(o.frp for o in modis_obs), 2)
            viirs_frp = round(sum(o.frp for o in viirs_obs), 2)

            # VIIRS to MODIS ratio (typically ~3:1 to 5:1 globally)
            ratio = round(viirs_count / max(1, modis_count), 2) if modis_count > 0 else None

            high_conf = sum(1 for o in obs_list if o.confidence == "high")

            trend_results.append({
                "period": period_key,
                "period_type": period,
                "total_observations": total_count,
                "modis_count": modis_count,
                "viirs_count": viirs_count,
                "viirs_to_modis_ratio": ratio,
                "high_confidence_count": high_conf,
                "total_frp_mw": total_frp,
                "avg_frp_mw": avg_frp,
                "max_frp_mw": max_frp,
                "modis_frp_mw": modis_frp,
                "viirs_frp_mw": viirs_frp,
            })

        return trend_results

    @staticmethod
    def analyze_event_durations(events: list[FireEvent]) -> dict[str, Any]:
        """
        Analyzes active fire event cluster durations (single pass, short-duration <24h,
        medium 1-3 days, long-duration mega-events >3 days).
        """
        if not events:
            return {
                "total_events": 0,
                "average_duration_hours": 0.0,
                "max_duration_hours": 0.0,
                "duration_classes": {"single_pass": 0, "short_duration": 0, "extended": 0},
            }

        durations = [e.duration_hours for e in events]
        avg_dur = round(sum(durations) / len(durations), 2)
        max_dur = round(max(durations), 2)

        single_pass = sum(1 for d in durations if d == 0.0)
        short_dur = sum(1 for d in durations if 0.0 < d < 24.0)
        extended = sum(1 for d in durations if d >= 24.0)

        return {
            "total_events": len(events),
            "average_duration_hours": avg_dur,
            "max_duration_hours": max_dur,
            "duration_classes": {
                "single_pass_events": single_pass,
                "short_duration_under_24h": short_dur,
                "extended_over_24h": extended,
            },
        }
