"""
Cross-Sensor Calibration Service
Explores empirical regression relationships between paired MODIS and VIIRS active fire observations.
Uses chronological train/test separation to prevent data leakage and preserves original measurements.
"""

import math
import statistics
import logging
from datetime import datetime, timezone, date
from typing import Any
from app.extensions import db
from app.models.analytics import CalibrationModel, ANALYTICS_ALGORITHM_VERSION

logger = logging.getLogger(__name__)


class CalibrationService:
    """Service training and evaluating cross-sensor empirical regression models."""

    @staticmethod
    def train_test_split_chronological(
        pairs: list[dict[str, Any]],
        train_ratio: float = 0.70,
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """
        Splits paired observation records chronologically to prevent temporal data leakage.
        Earlier observations form the training set; later observations form the test set.
        """
        if not pairs:
            return [], []

        # Sort by timestamp
        sorted_pairs = sorted(
            pairs,
            key=lambda p: p.get("datetime") or p.get("acq_datetime") or datetime.min.replace(tzinfo=timezone.utc)
        )

        n_train = max(1, int(len(sorted_pairs) * train_ratio))
        # Ensure at least 1 test sample if len >= 2
        if len(sorted_pairs) >= 2 and n_train == len(sorted_pairs):
            n_train = len(sorted_pairs) - 1

        train_data = sorted_pairs[:n_train]
        test_data = sorted_pairs[n_train:]
        return train_data, test_data

    @staticmethod
    def fit_linear_ols(x: list[float], y: list[float]) -> tuple[float, float]:
        """
        Fits Ordinary Least Squares (OLS) linear model: y = slope * x + intercept.
        """
        n = len(x)
        if n < 2:
            return 1.0, 0.0

        mean_x = statistics.mean(x)
        mean_y = statistics.mean(y)

        den = sum((xi - mean_x) ** 2 for xi in x)
        if den == 0.0:
            return 1.0, 0.0

        num = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
        slope = num / den
        intercept = mean_y - slope * mean_x
        return round(slope, 4), round(intercept, 4)

    @staticmethod
    def fit_zero_intercept(x: list[float], y: list[float]) -> float:
        """
        Fits zero-intercept scaling ratio model: y = slope * x.
        """
        den = sum(xi ** 2 for xi in x)
        if den == 0.0:
            return 1.0
        num = sum(xi * yi for xi, yi in zip(x, y))
        return round(num / den, 4)

    @classmethod
    def evaluate_regression(
        cls,
        x_test: list[float],
        y_test: list[float],
        slope: float,
        intercept: float = 0.0,
    ) -> dict[str, Any]:
        """
        Evaluates a regression model on holdout test observations.
        Calculates R^2, RMSE, MAE, Mean Bias, and residual statistics.
        """
        n = len(x_test)
        if n == 0:
            return {"r_squared": 0.0, "rmse": 0.0, "mae": 0.0, "mean_bias": 0.0}

        y_pred = [slope * xi + intercept for xi in x_test]
        residuals = [y_hat - yi for y_hat, yi in zip(y_pred, y_test)]

        # Mean bias: mean(y_pred - y_test)
        mean_bias = round(statistics.mean(residuals), 3)
        mae = round(statistics.mean([abs(r) for r in residuals]), 3)
        rmse = round(math.sqrt(sum(r ** 2 for r in residuals) / n), 3)

        # R^2 calculation on test set
        mean_y = statistics.mean(y_test)
        ss_tot = sum((yi - mean_y) ** 2 for yi in y_test)
        ss_res = sum(r ** 2 for r in residuals)

        r_squared = round(max(0.0, 1.0 - (ss_res / ss_tot)), 4) if ss_tot > 0 else 0.0

        # Residual distribution analysis
        res_mean = round(statistics.mean(residuals), 3)
        res_std = round(statistics.stdev(residuals), 3) if n > 1 else 0.0

        return {
            "r_squared": r_squared,
            "rmse": rmse,
            "mae": mae,
            "mean_bias": mean_bias,
            "residuals": {
                "mean": res_mean,
                "std": res_std,
                "min": round(min(residuals), 3),
                "max": round(max(residuals), 3),
            },
        }

    @classmethod
    def train_model(
        cls,
        pairs: list[dict[str, Any]],
        model_name: str = "MODIS_vs_VIIRS_FRP_OLS",
        model_type: str = "linear_ols",
        satellite_pair: str = "Aqua_Suomi-NPP",
        train_ratio: float = 0.70,
        algorithm_version: str = ANALYTICS_ALGORITHM_VERSION,
    ) -> CalibrationModel:
        """
        Orchestrates chronological data splitting, model training, test evaluation,
        and database model persistence.
        """
        if len(pairs) < 3:
            raise ValueError(f"At least 3 paired observations required for calibration modeling (got {len(pairs)})")

        train_set, test_set = cls.train_test_split_chronological(pairs, train_ratio=train_ratio)

        x_train = [p["viirs_frp"] for p in train_set]
        y_train = [p["modis_frp"] for p in train_set]

        # Fit model
        if model_type == "zero_intercept":
            slope = cls.fit_zero_intercept(x_train, y_train)
            intercept = 0.0
        else:
            slope, intercept = cls.fit_linear_ols(x_train, y_train)

        # Evaluate on test set (or train set if test is empty)
        eval_set = test_set if test_set else train_set
        x_eval = [p["viirs_frp"] for p in eval_set]
        y_eval = [p["modis_frp"] for p in eval_set]

        metrics = cls.evaluate_regression(x_eval, y_eval, slope, intercept)

        # Dates
        dates = [p.get("date") for p in train_set if p.get("date")]
        d_min = min(dates) if dates else None
        d_max = max(dates) if dates else None

        calib_record = CalibrationModel(
            model_name=model_name,
            model_type=model_type,
            source_sensor="VIIRS",
            target_sensor="MODIS",
            satellite_pair=satellite_pair,
            slope=slope,
            intercept=intercept,
            r_squared=metrics["r_squared"],
            rmse=metrics["rmse"],
            mae=metrics["mae"],
            mean_bias=metrics["mean_bias"],
            train_count=len(train_set),
            test_count=len(test_set),
            train_period_start=d_min,
            train_period_end=d_max,
            evaluation_metrics=metrics,
            algorithm_version=algorithm_version,
            status="active",
        )

        db.session.add(calib_record)
        db.session.commit()
        return calib_record
