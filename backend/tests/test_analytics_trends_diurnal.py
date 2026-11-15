"""
Tests for Fire Trend and Diurnal Analysis Services
Verifies daily/weekly/monthly temporal aggregations, event durations,
and 24-hour UTC diurnal distribution modeling.
"""

from datetime import datetime, timezone, date
import pytest
from app.models.observation import FireObservation
from app.models.harmonization import FireEvent
from app.services.fire_trend_service import FireTrendService
from app.services.diurnal_analysis_service import DiurnalAnalysisService


def test_aggregate_trends_by_period():
    """Verify daily and monthly temporal trend aggregations."""
    obs1 = FireObservation(id="o1", sensor="MODIS", acq_date=date(2026, 5, 1), frp=20.0, confidence="high")
    obs2 = FireObservation(id="o2", sensor="VIIRS", acq_date=date(2026, 5, 1), frp=10.0, confidence="nominal")
    obs3 = FireObservation(id="o3", sensor="VIIRS", acq_date=date(2026, 5, 2), frp=15.0, confidence="high")

    # Daily aggregation
    daily_trends = FireTrendService.aggregate_trends_by_period([obs1, obs2, obs3], period="daily")
    assert len(daily_trends) == 2
    assert daily_trends[0]["period"] == "2026-05-01"
    assert daily_trends[0]["total_observations"] == 2
    assert daily_trends[0]["modis_count"] == 1
    assert daily_trends[0]["viirs_count"] == 1
    assert daily_trends[0]["total_frp_mw"] == 30.0

    # Monthly aggregation
    monthly_trends = FireTrendService.aggregate_trends_by_period([obs1, obs2, obs3], period="monthly")
    assert len(monthly_trends) == 1
    assert monthly_trends[0]["period"] == "2026-05-01"
    assert monthly_trends[0]["total_observations"] == 3


def test_analyze_event_durations():
    """Verify categorization of fire events into single pass, short, and extended duration."""
    e1 = FireEvent(id="e1", duration_hours=0.0)    # Single pass
    e2 = FireEvent(id="e2", duration_hours=4.5)    # Under 24h
    e3 = FireEvent(id="e3", duration_hours=48.0)   # Over 24h

    dur_stats = FireTrendService.analyze_event_durations([e1, e2, e3])
    assert dur_stats["total_events"] == 3
    assert dur_stats["average_duration_hours"] == 17.5
    assert dur_stats["duration_classes"]["single_pass_events"] == 1
    assert dur_stats["duration_classes"]["short_duration_under_24h"] == 1
    assert dur_stats["duration_classes"]["extended_over_24h"] == 1


def test_compute_hourly_distribution():
    """Verify 24-hour UTC diurnal distribution bins."""
    obs_10 = FireObservation(id="o10", acq_time="10:30", day_night="D", sensor="MODIS", frp=20.0)
    obs_13 = FireObservation(id="o13", acq_time="13:45", day_night="D", sensor="VIIRS", frp=15.0)

    dist = DiurnalAnalysisService.compute_hourly_distribution([obs_10, obs_13])
    assert len(dist) == 24

    # Hour 10
    h10 = dist[10]
    assert h10["total_observations"] == 1
    assert h10["modis_count"] == 1
    assert h10["total_frp_mw"] == 20.0

    # Hour 13
    h13 = dist[13]
    assert h13["total_observations"] == 1
    assert h13["viirs_count"] == 1
    assert h13["total_frp_mw"] == 15.0

    # Hour 0 (empty)
    assert dist[0]["total_observations"] == 0


def test_satellite_sampling_profiles():
    """Verify nominal equator crossing time metadata for satellite platforms."""
    profiles = DiurnalAnalysisService.get_satellite_sampling_profiles()
    assert len(profiles) >= 5
    sat_names = {p["satellite"] for p in profiles}
    assert "Terra" in sat_names
    assert "Aqua" in sat_names
    assert "Suomi-NPP" in sat_names
