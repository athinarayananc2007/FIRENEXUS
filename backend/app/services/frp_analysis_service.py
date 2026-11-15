"""
Fire Radiative Power (FRP) Statistical Analysis Service
Provides parametric, non-parametric, and paired cross-sensor statistical analysis
between MODIS and VIIRS satellite active fire observations.
"""

import math
import statistics
import logging
from typing import Any
from app.models.observation import FireObservation
from app.models.harmonization import ObservationMatch
from app.models.analytics import FRPAnalysis, ANALYTICS_ALGORITHM_VERSION

logger = logging.getLogger(__name__)


class FRPAnalysisService:
    """Service computing univariate and bivariate statistical comparisons of Fire Radiative Power."""

    @staticmethod
    def calculate_percentiles(values: list[float], percentiles: list[float] | None = None) -> dict[str, float]:
        """
        Calculates arbitrary percentiles on a list of numeric values using linear interpolation.
        Handles sample sizes >= 1.
        """
        if not values:
            return {}

        sorted_vals = sorted(values)
        n = len(sorted_vals)
        pts = percentiles if percentiles is not None else [10, 25, 50, 75, 90, 95, 99]

        res = {}
        for p in pts:
            if n == 1:
                res[f"p{int(p)}"] = round(sorted_vals[0], 2)
                continue

            # Linear interpolation (method matching NumPy percentile with default linear)
            rank = (p / 100.0) * (n - 1)
            lower_idx = int(math.floor(rank))
            upper_idx = int(math.ceil(rank))
            fraction = rank - lower_idx

            val = sorted_vals[lower_idx] + fraction * (sorted_vals[upper_idx] - sorted_vals[lower_idx])
            res[f"p{int(p)}"] = round(val, 2)

        return res

    @classmethod
    def compute_distribution_metrics(cls, frp_values: list[float]) -> dict[str, Any]:
        """
        Computes comprehensive univariate distribution statistics on a collection of FRP measurements.
        """
        if not frp_values:
            return {
                "sample_size": 0,
                "mean": 0.0,
                "median": 0.0,
                "std": 0.0,
                "variance": 0.0,
                "min": 0.0,
                "max": 0.0,
                "p10": 0.0,
                "p25": 0.0,
                "p50": 0.0,
                "p75": 0.0,
                "p90": 0.0,
                "p95": 0.0,
                "p99": 0.0,
                "iqr": 0.0,
            }

        n = len(frp_values)
        mean_val = round(statistics.mean(frp_values), 2)
        std_val = round(statistics.stdev(frp_values), 2) if n > 1 else 0.0
        var_val = round(statistics.variance(frp_values), 2) if n > 1 else 0.0
        median_val = round(statistics.median(frp_values), 2)
        min_val = round(min(frp_values), 2)
        max_val = round(max(frp_values), 2)

        pcts = cls.calculate_percentiles(frp_values, [10, 25, 50, 75, 90, 95, 99])
        iqr_val = round(pcts.get("p75", 0.0) - pcts.get("p25", 0.0), 2)

        return {
            "sample_size": n,
            "mean": mean_val,
            "median": median_val,
            "std": std_val,
            "variance": var_val,
            "min": min_val,
            "max": max_val,
            "p10": pcts.get("p10", min_val),
            "p25": pcts.get("p25", min_val),
            "p50": pcts.get("p50", median_val),
            "p75": pcts.get("p75", max_val),
            "p90": pcts.get("p90", max_val),
            "p95": pcts.get("p95", max_val),
            "p99": pcts.get("p99", max_val),
            "iqr": iqr_val,
        }

    @staticmethod
    def pearson_correlation(x: list[float], y: list[float]) -> float:
        """Calculates Pearson linear correlation coefficient r."""
        n = len(x)
        if n < 2:
            return 0.0

        mean_x = statistics.mean(x)
        mean_y = statistics.mean(y)

        num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        den_x = sum((xi - mean_x) ** 2 for xi in x)
        den_y = sum((yi - mean_y) ** 2 for yi in y)

        denom = math.sqrt(den_x * den_y)
        if denom == 0.0:
            return 0.0
        return round(num / denom, 4)

    @classmethod
    def spearman_correlation(cls, x: list[float], y: list[float]) -> float:
        """Calculates Spearman rank correlation coefficient rho."""
        n = len(x)
        if n < 2:
            return 0.0

        def get_ranks(seq: list[float]) -> list[float]:
            # Assign fractional ranks for ties
            indexed = sorted(enumerate(seq), key=lambda item: item[1])
            ranks = [0.0] * n
            i = 0
            while i < n:
                j = i
                while j + 1 < n and indexed[j + 1][1] == indexed[j][1]:
                    j += 1
                avg_rank = (i + j + 2) / 2.0
                for k in range(i, j + 1):
                    ranks[indexed[k][0]] = avg_rank
                i = j + 1
            return ranks

        rank_x = get_ranks(x)
        rank_y = get_ranks(y)
        return cls.pearson_correlation(rank_x, rank_y)

    @classmethod
    def compare_paired_frp(
        cls,
        modis_frp_list: list[float],
        viirs_frp_list: list[float],
    ) -> dict[str, Any]:
        """
        Calculates cross-sensor comparison metrics on matched observation pairs:
        - Absolute and relative differences
        - Mean Bias Error (MBE = VIIRS - MODIS)
        - Root Mean Square Error (RMSE)
        - Mean Absolute Error (MAE)
        - Pearson and Spearman correlations
        
        Important:
        Does not assume MODIS and VIIRS FRP are directly interchangeable,
        and includes sample size caveats.
        """
        n = min(len(modis_frp_list), len(viirs_frp_list))
        if n == 0:
            return {
                "paired_count": 0,
                "status": "insufficient_data",
                "message": "No paired observations available for cross-sensor comparison.",
            }

        x = modis_frp_list[:n]
        y = viirs_frp_list[:n]

        # Differences: diff = VIIRS - MODIS
        diffs = [yi - xi for xi, yi in zip(x, y)]
        abs_diffs = [abs(d) for d in diffs]
        rel_diffs = [abs(yi - xi) / max(1.0, xi) for xi, yi in zip(x, y)]  # Relative to MODIS FRP

        mbe = round(statistics.mean(diffs), 3)  # Mean Bias Error
        mae = round(statistics.mean(abs_diffs), 3)
        rmse = round(math.sqrt(sum(d ** 2 for d in diffs) / n), 3)
        mape = round((sum(rel_diffs) / n) * 100.0, 2)  # Mean absolute percentage error

        r = cls.pearson_correlation(x, y)
        rho = cls.spearman_correlation(x, y)

        modis_stats = cls.compute_distribution_metrics(x)
        viirs_stats = cls.compute_distribution_metrics(y)

        # Percentile distribution of absolute differences
        diff_pcts = cls.calculate_percentiles(abs_diffs, [10, 25, 50, 75, 90, 95])

        return {
            "paired_count": n,
            "correlation": {
                "pearson_r": r,
                "spearman_rho": rho,
            },
            "error_metrics": {
                "mean_bias_error_mw": mbe,
                "root_mean_square_error_mw": rmse,
                "mean_absolute_error_mw": mae,
                "mean_absolute_percentage_error": mape,
            },
            "difference_percentiles_mw": diff_pcts,
            "sensor_distributions": {
                "MODIS": modis_stats,
                "VIIRS": viirs_stats,
            },
            "scientific_disclaimer": (
                "MODIS and VIIRS observe thermal energy with different spatial resolutions "
                "(1 km vs 375 m) and saturation limits. These statistical metrics represent "
                "empirical cross-sensor correspondence rather than direct physical equivalence."
            ),
        }
