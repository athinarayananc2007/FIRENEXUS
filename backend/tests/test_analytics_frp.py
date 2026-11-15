"""
Tests for FRP Statistical Analysis Service
Verifies univariate distribution calculations, percentiles, correlation metrics,
and paired cross-sensor comparisons between MODIS and VIIRS.
"""

import pytest
from app.services.frp_analysis_service import FRPAnalysisService


def test_distribution_metrics_calculation():
    """Verify mean, median, standard deviation, IQR, and percentiles."""
    values = [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0]
    metrics = FRPAnalysisService.compute_distribution_metrics(values)

    assert metrics["sample_size"] == 10
    assert metrics["mean"] == 55.0
    assert metrics["median"] == 55.0
    assert metrics["min"] == 10.0
    assert metrics["max"] == 100.0
    assert metrics["std"] > 0
    assert metrics["iqr"] > 0
    assert metrics["p10"] == 19.0
    assert metrics["p50"] == 55.0
    assert metrics["p90"] == 91.0


def test_distribution_metrics_empty_and_single():
    """Verify safe handling of empty and single-element inputs."""
    empty_res = FRPAnalysisService.compute_distribution_metrics([])
    assert empty_res["sample_size"] == 0
    assert empty_res["mean"] == 0.0

    single_res = FRPAnalysisService.compute_distribution_metrics([42.5])
    assert single_res["sample_size"] == 1
    assert single_res["mean"] == 42.5
    assert single_res["std"] == 0.0
    assert single_res["p50"] == 42.5


def test_pearson_and_spearman_correlation():
    """Verify Pearson and Spearman correlation coefficients."""
    # Perfectly correlated series
    x = [10.0, 20.0, 30.0, 40.0, 50.0]
    y = [20.0, 40.0, 60.0, 80.0, 100.0]

    r = FRPAnalysisService.pearson_correlation(x, y)
    rho = FRPAnalysisService.spearman_correlation(x, y)

    assert r == 1.0
    assert rho == 1.0

    # Inversely correlated series
    y_inv = [100.0, 80.0, 60.0, 40.0, 20.0]
    r_inv = FRPAnalysisService.pearson_correlation(x, y_inv)
    assert r_inv == -1.0


def test_compare_paired_frp():
    """Verify cross-sensor comparison: bias, RMSE, MAE, difference percentiles."""
    modis_frp = [25.0, 50.0, 75.0, 100.0]
    viirs_frp = [20.0, 45.0, 80.0, 95.0]

    res = FRPAnalysisService.compare_paired_frp(modis_frp, viirs_frp)

    assert res["paired_count"] == 4
    assert "correlation" in res
    assert "error_metrics" in res
    assert res["correlation"]["pearson_r"] > 0.95
    assert res["error_metrics"]["root_mean_square_error_mw"] > 0
    assert res["error_metrics"]["mean_absolute_error_mw"] == 5.0
    assert "scientific_disclaimer" in res


def test_compare_paired_frp_empty():
    """Verify handling when no paired observations exist."""
    res = FRPAnalysisService.compare_paired_frp([], [])
    assert res["paired_count"] == 0
    assert res["status"] == "insufficient_data"
