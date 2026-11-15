"""
Tests for Fire Event Grouping Service
Verifies clustering of satellite detections into events, centroid calculation,
multi-sensor counts, FRP aggregations, and distinct event separation.
"""

from datetime import datetime, timezone, date
import pytest
from app.models.observation import FireObservation
from app.services.fire_event_service import FireEventService
from app.services.harmonization_config import HarmonizationConfig


def test_fire_event_clustering_single_fire():
    """Verify grouping of 1 MODIS and 2 VIIRS observations into a single cohesive FireEvent."""
    t0 = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)
    t1 = datetime(2026, 5, 1, 13, 45, tzinfo=timezone.utc)
    t2 = datetime(2026, 5, 1, 14, 0, tzinfo=timezone.utc)

    # 3 observations clustered around (-35.0, 149.0) within 1 km of each other
    obs1 = FireObservation(
        id="obs-1", sensor="MODIS", satellite="Aqua",
        acq_datetime=t0, latitude=-35.0, longitude=149.0, frp=30.0,
    )
    obs2 = FireObservation(
        id="obs-2", sensor="VIIRS", satellite="Suomi-NPP",
        acq_datetime=t1, latitude=-35.002, longitude=149.002, frp=10.0,
    )
    obs3 = FireObservation(
        id="obs-3", sensor="VIIRS", satellite="NOAA-20",
        acq_datetime=t2, latitude=-35.004, longitude=149.001, frp=15.0,
    )

    events, event_obs = FireEventService.cluster_observations_into_events([obs1, obs2, obs3])

    assert len(events) == 1
    event = events[0]

    assert event.observation_count == 3
    assert event.modis_count == 1
    assert event.viirs_count == 2
    assert event.total_frp_mw == 55.0  # 30 + 10 + 15
    assert event.max_frp_mw == 30.0
    assert event.avg_frp_mw == round(55.0 / 3, 2)
    assert event.modis_frp_mw == 30.0
    assert event.viirs_frp_mw == 25.0
    assert event.duration_hours == 0.5  # 30 minutes = 0.5 hours

    # Verify associations
    assert len(event_obs) == 3
    assert {a.observation_id for a in event_obs} == {"obs-1", "obs-2", "obs-3"}


def test_separation_of_unrelated_distant_fires():
    """Verify that distant fire clusters (e.g. 50 km apart) are strictly partitioned into separate events."""
    t0 = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)

    # Fire cluster A in Canberra
    obs_a1 = FireObservation(id="a1", sensor="MODIS", acq_datetime=t0, latitude=-35.3, longitude=149.1, frp=20.0)
    obs_a2 = FireObservation(id="a2", sensor="VIIRS", acq_datetime=t0, latitude=-35.305, longitude=149.105, frp=5.0)

    # Fire cluster B in Sydney (~250 km away)
    obs_b1 = FireObservation(id="b1", sensor="MODIS", acq_datetime=t0, latitude=-33.8, longitude=151.2, frp=40.0)

    events, _ = FireEventService.cluster_observations_into_events([obs_a1, obs_a2, obs_b1])

    assert len(events) == 2
    event_counts = sorted([e.observation_count for e in events])
    assert event_counts == [1, 2]
