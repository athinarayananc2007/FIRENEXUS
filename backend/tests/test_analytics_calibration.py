"""
Tests for Cross-Sensor Calibration Service
Verifies regression model fitting, data leakage prevention, model versioning,
and evaluation metrics calculation.
"""

from datetime import datetime, timezone, date
import pytest
from app.services.calibration_service import CalibrationService
from app.models.analytics import CalibrationModel
from app.extensions import db


def test_chronological_train_test_split_leakage_prevention():
    """Verify that train/test split is strictly chronological to prevent temporal data leakage."""
    pairs = [
        {"id": 1, "acq_datetime": datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc), "viirs_frp": 10.0, "modis_frp": 12.0},
        {"id": 2, "acq_datetime": datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc), "viirs_frp": 20.0, "modis_frp": 22.0},
        {"id": 3, "acq_datetime": datetime(2026, 5, 1, 14, 0, tzinfo=timezone.utc), "viirs_frp": 30.0, "modis_frp": 32.0},
        {"id": 4, "acq_datetime": datetime(2026, 5, 1, 16, 0, tzinfo=timezone.utc), "viirs_frp": 40.0, "modis_frp": 42.0},
    ]

    train_data, test_data = CalibrationService.train_test_split_chronological(pairs, train_ratio=0.75)

    assert len(train_data) == 3
    assert len(test_data) == 1

    # Max train timestamp must be <= Min test timestamp
    max_train_time = max(p["acq_datetime"] for p in train_data)
    min_test_time = min(p["acq_datetime"] for p in test_data)
    assert max_train_time <= min_test_time


def test_fit_linear_ols():
    """Verify Ordinary Least Squares regression fitting: y = 2x + 5."""
    x = [10.0, 20.0, 30.0, 40.0]
    y = [25.0, 45.0, 65.0, 85.0]

    slope, intercept = CalibrationService.fit_linear_ols(x, y)
    assert slope == 2.0
    assert intercept == 5.0


def test_fit_zero_intercept():
    """Verify zero-intercept ratio model fitting: y = 1.25x."""
    x = [10.0, 20.0, 40.0]
    y = [12.5, 25.0, 50.0]

    slope = CalibrationService.fit_zero_intercept(x, y)
    assert slope == 1.25


def test_evaluate_regression_metrics():
    """Verify R^2, RMSE, MAE, and Mean Bias calculations."""
    x_test = [10.0, 20.0, 30.0]
    y_test = [20.0, 40.0, 60.0]  # Exact y = 2x

    metrics = CalibrationService.evaluate_regression(x_test, y_test, slope=2.0, intercept=0.0)
    assert metrics["r_squared"] == 1.0
    assert metrics["rmse"] == 0.0
    assert metrics["mae"] == 0.0
    assert metrics["mean_bias"] == 0.0


def test_train_model_persistence(app):
    """Verify training and database persistence of CalibrationModel."""
    pairs = [
        {"date": date(2026, 5, 1), "acq_datetime": datetime(2026, 5, 1, 10, 0, tzinfo=timezone.utc), "viirs_frp": 10.0, "modis_frp": 15.0},
        {"date": date(2026, 5, 1), "acq_datetime": datetime(2026, 5, 1, 12, 0, tzinfo=timezone.utc), "viirs_frp": 20.0, "modis_frp": 26.0},
        {"date": date(2026, 5, 1), "acq_datetime": datetime(2026, 5, 1, 14, 0, tzinfo=timezone.utc), "viirs_frp": 30.0, "modis_frp": 35.0},
        {"date": date(2026, 5, 1), "acq_datetime": datetime(2026, 5, 1, 16, 0, tzinfo=timezone.utc), "viirs_frp": 40.0, "modis_frp": 48.0},
    ]

    model = CalibrationService.train_model(
        pairs=pairs,
        model_name="Aqua_MODIS_vs_SNPP_VIIRS_Test",
        model_type="linear_ols",
        satellite_pair="Aqua_Suomi-NPP",
        train_ratio=0.75,
    )

    assert model.id is not None
    assert model.slope > 0
    assert model.train_count == 3
    assert model.test_count == 1
    assert model.status == "active"

    # Query from DB
    record = db.session.query(CalibrationModel).filter(CalibrationModel.id == model.id).first()
    assert record is not None
    assert record.model_name == "Aqua_MODIS_vs_SNPP_VIIRS_Test"
