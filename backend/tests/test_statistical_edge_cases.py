"""
FIRENEXUS Statistical Edge-Case Audit Test Suite
Verifies mathematical and statistical robustness under degenerate conditions:
zero reference values in MAPE, constant arrays, small sample sizes, extreme outliers,
data leakage prevention, sensor saturation, and spatial isolation logic.
"""

import pytest
import datetime
from app.services.frp_analysis_service import FRPAnalysisService
from app.services.calibration_service import CalibrationService
from app.services.anomaly_detection_service import AnomalyDetectionService
from app.models.observation import FireObservation


def test_mape_zero_reference_handling():
    """Verify MAPE avoids division-by-zero when reference MODIS FRP is 0.0."""
    modis_frp = [0.0, 0.0, 10.0, 20.0]
    viirs_frp = [5.0, 8.0, 12.0, 22.0]

    res = FRPAnalysisService.compare_paired_frp(modis_frp, viirs_frp)
    assert res["paired_count"] == 4
    mape = res["error_metrics"]["mean_absolute_percentage_error"]
    assert isinstance(mape, float)
    assert mape > 0.0
    assert not (mape == float("inf") or mape != mape)  # Neither inf nor NaN


def test_small_sample_sizes():
    """Verify statistical functions handle N=0, N=1, N=2 without throwing exceptions."""
    # N = 0
    empty_stats = FRPAnalysisService.compute_distribution_metrics([])
    assert empty_stats["sample_size"] == 0
    assert empty_stats["mean"] == 0.0

    # N = 1
    single_stats = FRPAnalysisService.compute_distribution_metrics([42.5])
    assert single_stats["sample_size"] == 1
    assert single_stats["std"] == 0.0
    assert single_stats["variance"] == 0.0

    # N = 2
    pair_stats = FRPAnalysisService.compute_distribution_metrics([10.0, 20.0])
    assert pair_stats["sample_size"] == 2
    assert pair_stats["std"] == 7.07

    # Z-scores on N=1
    assert AnomalyDetectionService.calculate_z_scores([10.0]) == [0.0]
    assert AnomalyDetectionService.calculate_modified_z_scores([10.0]) == [0.0]


def test_constant_value_datasets():
    """Verify constant value arrays (std=0, MAD=0) do not divide by zero."""
    constant_vals = [25.0, 25.0, 25.0, 25.0, 25.0]

    # Z-score on constant data
    z_scores = AnomalyDetectionService.calculate_z_scores(constant_vals)
    assert z_scores == [0.0, 0.0, 0.0, 0.0, 0.0]

    # Modified Z-score (MAD) on constant data
    mad_scores = AnomalyDetectionService.calculate_modified_z_scores(constant_vals)
    assert mad_scores == [0.0, 0.0, 0.0, 0.0, 0.0]

    # Pearson correlation on constant X
    r = FRPAnalysisService.pearson_correlation(constant_vals, [10.0, 20.0, 30.0, 40.0, 50.0])
    assert r == 0.0

    # OLS regression on constant X
    slope, intercept = CalibrationService.fit_linear_ols(constant_vals, [10.0, 20.0, 30.0, 40.0, 50.0])
    assert slope == 1.0
    assert intercept == 0.0


def test_extreme_outlier_behavior():
    """Verify robust Modified Z-score detects extreme 100x outlier while resisting mean-shift masking."""
    # Normal cluster with one massive 100x outlier
    normal_cluster = [15.0, 16.0, 14.5, 15.5, 16.2, 14.8, 15.1, 15.9, 15.3]
    massive_outlier = 1500.0
    vals = normal_cluster + [massive_outlier]

    mad_scores = AnomalyDetectionService.calculate_modified_z_scores(vals)
    outlier_score = mad_scores[-1]
    # The outlier score should be dramatically above the 3.5 MAD threshold
    assert outlier_score > 50.0

    # Normal values remain well below threshold
    assert all(abs(score) < 3.5 for score in mad_scores[:-1])


def test_chronological_train_test_split_leakage_prevention():
    """Verify chronological splitting guarantees no future observations leak into training data."""
    t0 = datetime.datetime(2026, 5, 1, 10, 0, tzinfo=datetime.timezone.utc)
    pairs = [
        {"timestamp": t0 + datetime.timedelta(hours=i), "modis_frp": 10.0 + i, "viirs_frp": 12.0 + i}
        for i in range(10)
    ]

    train, test = CalibrationService.train_test_split_chronological(pairs, train_ratio=0.7)
    assert len(train) == 7
    assert len(test) == 3

    # Verification: maximum timestamp in train <= minimum timestamp in test
    max_train_time = max(p["timestamp"] for p in train)
    min_test_time = min(p["timestamp"] for p in test)
    assert max_train_time <= min_test_time


def test_instrument_saturation_detection():
    """Verify MODIS (>= 500K) and VIIRS (>= 367K) saturation boundaries are detected accurately."""
    today = datetime.date(2026, 5, 1)
    now = datetime.datetime(2026, 5, 1, 12, 0, tzinfo=datetime.timezone.utc)

    # Saturated MODIS (505K) and unsaturated MODIS (490K)
    modis_sat = FireObservation(
        id="modis-sat",
        dedup_hash="h1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.0,
        longitude=-118.0,
        brightness=505.0,
        frp=200.0,
        confidence="high",
    )
    modis_unsat = FireObservation(
        id="modis-unsat",
        dedup_hash="h2",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.0,
        longitude=-118.0,
        brightness=420.0,
        frp=150.0,
        confidence="high",
    )
    # Saturated VIIRS (370K) and unsaturated VIIRS (360K)
    viirs_sat = FireObservation(
        id="viirs-sat",
        dedup_hash="h3",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.0,
        longitude=-118.0,
        brightness=370.0,
        frp=60.0,
        confidence="high",
    )
    viirs_unsat = FireObservation(
        id="viirs-unsat",
        dedup_hash="h4",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.0,
        longitude=-118.0,
        brightness=360.0,
        frp=40.0,
        confidence="high",
    )

    anomalies = AnomalyDetectionService.detect_brightness_anomalies(
        [modis_sat, modis_unsat, viirs_sat, viirs_unsat]
    )
    flagged_ids = [a["observation_id"] for a in anomalies]
    assert "modis-sat" in flagged_ids
    assert "viirs-sat" in flagged_ids
    assert "modis-unsat" not in flagged_ids
    assert "viirs-unsat" not in flagged_ids


def test_spatial_isolation_distinguishes_false_alarm_candidates():
    """Verify spatial isolation flags solitary hotspots > 15km apart while clustered fires are not flagged."""
    today = datetime.date(2026, 5, 1)
    now = datetime.datetime(2026, 5, 1, 12, 0, tzinfo=datetime.timezone.utc)

    # Two clustered fires (< 1km apart)
    c1 = FireObservation(
        id="cluster-1",
        dedup_hash="hc1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.00,
        longitude=-118.00,
        brightness=320.0,
        frp=30.0,
        confidence="nominal",
    )
    c2 = FireObservation(
        id="cluster-2",
        dedup_hash="hc2",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.005,
        longitude=-118.005,
        brightness=325.0,
        frp=35.0,
        confidence="nominal",
    )
    # Solitary fire (30km away)
    solitary = FireObservation(
        id="solitary-1",
        dedup_hash="hs1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=today,
        acq_time="12:00",
        acq_datetime=now,
        latitude=34.35,  # ~38km north
        longitude=-118.00,
        brightness=310.0,
        frp=15.0,
        confidence="nominal",
    )

    anomalies = AnomalyDetectionService.detect_spatial_isolation(
        [c1, c2, solitary], isolation_distance_meters=15000.0
    )
    flagged_ids = [a["observation_id"] for a in anomalies]
    assert "solitary-1" in flagged_ids
    assert "cluster-1" not in flagged_ids
    assert "cluster-2" not in flagged_ids
