"""
Active Fire Anomaly Detection Service
Detects statistical, radiometric, and spatial outliers in satellite fire observations
using Z-scores, Modified Z-scores (MAD), IQR, and spatial isolation tests.
Flags observations for scientific review without modifying or deleting raw records.
"""

import math
import statistics
import logging
from typing import Any
from app.models.observation import FireObservation
from app.models.analytics import AnomalyDetection, ANALYTICS_ALGORITHM_VERSION
from app.services.spatial_matching_service import SpatialMatchingService

logger = logging.getLogger(__name__)


class AnomalyDetectionService:
    """Service detecting statistical and spatial anomalies in thermal anomaly catalogs."""

    @staticmethod
    def calculate_z_scores(values: list[float]) -> list[float]:
        """Calculates standard Z-scores: Z = (x - mean) / std."""
        n = len(values)
        if n < 2:
            return [0.0] * n

        mean_val = statistics.mean(values)
        std_val = statistics.stdev(values)
        if std_val == 0.0:
            return [0.0] * n

        return [round((x - mean_val) / std_val, 3) for x in values]

    @staticmethod
    def calculate_modified_z_scores(values: list[float]) -> list[float]:
        """
        Calculates robust Modified Z-scores using Median Absolute Deviation (MAD):
        M_i = 0.6745 * (x_i - median) / MAD
        """
        n = len(values)
        if n < 2:
            return [0.0] * n

        med = statistics.median(values)
        deviations = [abs(x - med) for x in values]
        mad = statistics.median(deviations)

        if mad == 0.0:
            # When MAD is 0 (many duplicate values), fallback to mean absolute deviation
            mean_ad = statistics.mean(deviations)
            if mean_ad == 0.0:
                return [0.0] * n
            mad = mean_ad

        return [round(0.6745 * (x - med) / mad, 3) for x in values]

    @staticmethod
    def calculate_iqr_thresholds(values: list[float], multiplier: float = 1.5) -> tuple[float, float, float]:
        """
        Calculates Interquartile Range (IQR) and upper/lower fences:
        Returns (Q1, Q3, upper_bound).
        """
        if len(values) < 4:
            return 0.0, max(values) if values else 0.0, max(values) if values else 0.0

        sorted_vals = sorted(values)
        n = len(sorted_vals)
        q1 = sorted_vals[int(n * 0.25)]
        q3 = sorted_vals[int(n * 0.75)]
        iqr = q3 - q1
        upper_bound = q3 + multiplier * iqr
        return round(q1, 2), round(q3, 2), round(upper_bound, 2)

    @classmethod
    def detect_frp_anomalies(
        cls,
        observations: list[FireObservation],
        method: str = "modified_z_score",
        threshold: float = 3.5,
        algorithm_version: str = ANALYTICS_ALGORITHM_VERSION,
    ) -> list[dict[str, Any]]:
        """
        Flags observations with statistically extreme Fire Radiative Power (MW)
        grouped by sensor to avoid penalizing VIIRS's higher sensitivity.
        """
        anomalies = []

        # Process per sensor to ensure sensor-specific distribution modeling
        for sensor_name in ("MODIS", "VIIRS"):
            sensor_obs = [o for o in observations if sensor_name in o.sensor.upper()]
            if len(sensor_obs) < 4:
                continue

            frp_vals = [o.frp for o in sensor_obs]

            if method == "z_score":
                scores = cls.calculate_z_scores(frp_vals)
                for obs, score in zip(sensor_obs, scores):
                    if score >= threshold:
                        anomalies.append({
                            "observation_id": obs.id,
                            "sensor": obs.sensor,
                            "satellite": obs.satellite,
                            "anomaly_type": "high_frp",
                            "method": "z_score",
                            "anomaly_score": score,
                            "threshold_applied": threshold,
                            "metric_name": "frp",
                            "metric_value": obs.frp,
                            "explanation": f"{obs.sensor} FRP ({obs.frp:.1f} MW) has Z-score {score:.2f} >= {threshold}.",
                            "algorithm_version": algorithm_version,
                        })
            elif method == "iqr":
                q1, q3, upper_bound = cls.calculate_iqr_thresholds(frp_vals, multiplier=threshold)
                for obs in sensor_obs:
                    if obs.frp > upper_bound:
                        anomalies.append({
                            "observation_id": obs.id,
                            "sensor": obs.sensor,
                            "satellite": obs.satellite,
                            "anomaly_type": "high_frp",
                            "method": "iqr",
                            "anomaly_score": round((obs.frp - q3) / max(1.0, q3 - q1), 2),
                            "threshold_applied": upper_bound,
                            "metric_name": "frp",
                            "metric_value": obs.frp,
                            "explanation": f"{obs.sensor} FRP ({obs.frp:.1f} MW) exceeds IQR upper fence ({upper_bound:.1f} MW).",
                            "algorithm_version": algorithm_version,
                        })
            else:  # default: modified_z_score
                mod_scores = cls.calculate_modified_z_scores(frp_vals)
                for obs, score in zip(sensor_obs, mod_scores):
                    if score >= threshold:
                        anomalies.append({
                            "observation_id": obs.id,
                            "sensor": obs.sensor,
                            "satellite": obs.satellite,
                            "anomaly_type": "high_frp",
                            "method": "modified_z_score",
                            "anomaly_score": score,
                            "threshold_applied": threshold,
                            "metric_name": "frp",
                            "metric_value": obs.frp,
                            "explanation": f"{obs.sensor} FRP ({obs.frp:.1f} MW) has Modified Z-Score {score:.2f} >= {threshold}.",
                            "algorithm_version": algorithm_version,
                        })

        return anomalies

    @classmethod
    def detect_brightness_anomalies(
        cls,
        observations: list[FireObservation],
        algorithm_version: str = ANALYTICS_ALGORITHM_VERSION,
    ) -> list[dict[str, Any]]:
        """
        Flags observations with extreme brightness temperature approaching or exceeding
        physical channel saturation thresholds (VIIRS Band I4 saturation: ~367K, MODIS Band 21: ~500K).
        """
        anomalies = []
        for o in observations:
            is_viirs = "VIIRS" in o.sensor.upper()
            thresh = 365.0 if is_viirs else 450.0

            if o.brightness >= thresh:
                anomalies.append({
                    "observation_id": o.id,
                    "sensor": o.sensor,
                    "satellite": o.satellite,
                    "anomaly_type": "high_brightness",
                    "method": "saturation_threshold",
                    "anomaly_score": round(o.brightness - thresh, 1),
                    "threshold_applied": thresh,
                    "metric_name": "brightness",
                    "metric_value": o.brightness,
                    "explanation": (
                        f"{o.sensor} 4 µm brightness temperature ({o.brightness:.1f} K) "
                        f"exceeds saturation monitoring threshold ({thresh} K)."
                    ),
                    "algorithm_version": algorithm_version,
                })

        return anomalies

    @classmethod
    def detect_spatial_isolation(
        cls,
        observations: list[FireObservation],
        isolation_distance_meters: float = 15000.0,
        algorithm_version: str = ANALYTICS_ALGORITHM_VERSION,
    ) -> list[dict[str, Any]]:
        """
        Detects spatially isolated hotspots that have zero neighboring detections within
        a specified radius (default 15 km), which often indicate isolated industrial flaring or localized false detections.
        """
        if len(observations) < 2:
            return []

        anomalies = []
        for i, target in enumerate(observations):
            min_dist = float("inf")
            for j, neighbor in enumerate(observations):
                if i == j:
                    continue
                d = SpatialMatchingService.haversine_distance_meters(
                    target.latitude, target.longitude, neighbor.latitude, neighbor.longitude
                )
                if d < min_dist:
                    min_dist = d

            if min_dist > isolation_distance_meters:
                anomalies.append({
                    "observation_id": target.id,
                    "sensor": target.sensor,
                    "satellite": target.satellite,
                    "anomaly_type": "spatial_isolation",
                    "method": "spatial_isolation_test",
                    "anomaly_score": round(min_dist / 1000.0, 2),
                    "threshold_applied": round(isolation_distance_meters / 1000.0, 2),
                    "metric_name": "distance_to_nearest_km",
                    "metric_value": round(min_dist / 1000.0, 2),
                    "explanation": (
                        f"Isolated {target.sensor} detection: nearest neighboring fire detection is "
                        f"{min_dist / 1000.0:.1f} km away (threshold {isolation_distance_meters / 1000.0:.1f} km)."
                    ),
                    "algorithm_version": algorithm_version,
                })

        return anomalies
