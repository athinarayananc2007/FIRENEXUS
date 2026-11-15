"""
End-to-End Integration Tests for Harmonization Engine Pipeline
Verifies full orchestration: raw observation ingestion -> normalization ->
cross-sensor spatial/temporal correspondence -> NRT/SP provenance -> fire event clustering.
"""

from datetime import datetime, timezone, date
import pytest
from app.extensions import db
from app.models.observation import FireObservation
from app.models.harmonization import (
    HarmonizedObservation,
    ObservationMatch,
    FireEvent,
    FireEventObservation,
    HarmonizationRun,
)
from app.services.harmonization_service import HarmonizationService
from app.services.harmonization_config import HarmonizationConfig


def test_full_harmonization_pipeline_run(app):
    """
    Executes a complete harmonization pipeline run with synthetic observations:
    - 1 Aqua MODIS observation at Canberra (-35.28, 149.13) at 13:30 UTC
    - 2 Suomi-NPP VIIRS observations within 500m of Aqua at 13:45 UTC (co-incident pass)
    - 1 distant VIIRS observation in Sydney (-33.86, 151.20) at 13:45 UTC (unrelated fire)
    - 1 MODIS NRT and 1 MODIS SP observation at exact same location within 60s (reprocessing pair)
    """
    t_aqua = datetime(2026, 5, 1, 13, 30, tzinfo=timezone.utc)
    t_viirs = datetime(2026, 5, 1, 13, 45, tzinfo=timezone.utc)

    # 1. Aqua MODIS observation (1 km resolution)
    obs_aqua = FireObservation(
        id="e2e-aqua-1",
        dedup_hash="e2e_hash_aqua_1",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Aqua",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:30",
        acq_datetime=t_aqua,
        latitude=-35.2809,
        longitude=149.1300,
        brightness=325.0,
        frp=35.0,
        confidence="high",
        confidence_raw="85",
        day_night="D",
        scan=1.2,
        track=1.1,
    )

    # 2. VIIRS observation 1 (375 m resolution, ~250 m from Aqua center)
    obs_viirs1 = FireObservation(
        id="e2e-viirs-1",
        dedup_hash="e2e_hash_viirs_1",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=t_viirs,
        latitude=-35.2820,
        longitude=149.1320,
        brightness=342.0,
        frp=12.0,
        confidence="nominal",
        confidence_raw="n",
        day_night="D",
        scan=0.4,
        track=0.4,
    )

    # 3. VIIRS observation 2 (375 m resolution, ~400 m from Aqua center)
    obs_viirs2 = FireObservation(
        id="e2e-viirs-2",
        dedup_hash="e2e_hash_viirs_2",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=t_viirs,
        latitude=-35.2835,
        longitude=149.1290,
        brightness=338.0,
        frp=8.0,
        confidence="nominal",
        confidence_raw="n",
        day_night="D",
        scan=0.4,
        track=0.4,
    )

    # 4. Distant VIIRS observation in Sydney (~250 km away)
    obs_sydney = FireObservation(
        id="e2e-viirs-syd",
        dedup_hash="e2e_hash_viirs_syd",
        source_product="VIIRS_SNPP_NRT",
        sensor="VIIRS",
        satellite="Suomi-NPP",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="13:45",
        acq_datetime=t_viirs,
        latitude=-33.8688,
        longitude=151.2093,
        brightness=330.0,
        frp=15.0,
        confidence="nominal",
        confidence_raw="n",
        day_night="D",
        scan=0.4,
        track=0.4,
    )

    # 5. Reprocessing pair: Terra MODIS NRT vs Terra MODIS SP (same location, 30s diff)
    obs_terra_nrt = FireObservation(
        id="e2e-terra-nrt",
        dedup_hash="e2e_hash_terra_nrt",
        source_product="MODIS_NRT",
        sensor="MODIS",
        satellite="Terra",
        product_type="NRT",
        acq_date=date(2026, 5, 1),
        acq_time="10:30",
        acq_datetime=datetime(2026, 5, 1, 10, 30, 0, tzinfo=timezone.utc),
        latitude=-20.0,
        longitude=135.0,
        brightness=315.0,
        frp=18.0,
        confidence="nominal",
        day_night="D",
    )
    obs_terra_sp = FireObservation(
        id="e2e-terra-sp",
        dedup_hash="e2e_hash_terra_sp",
        source_product="MODIS_SP",
        sensor="MODIS",
        satellite="Terra",
        product_type="SP",
        acq_date=date(2026, 5, 1),
        acq_time="10:30",
        acq_datetime=datetime(2026, 5, 1, 10, 30, 30, tzinfo=timezone.utc),
        latitude=-20.0,
        longitude=135.0,
        brightness=315.5,
        frp=18.5,
        confidence="nominal",
        day_night="D",
    )

    db.session.add_all([obs_aqua, obs_viirs1, obs_viirs2, obs_sydney, obs_terra_nrt, obs_terra_sp])
    db.session.commit()

    # Execute harmonization run
    config = HarmonizationConfig(max_spatial_distance_meters=2000.0)
    run = HarmonizationService.run_harmonization(
        start_date="2026-05-01",
        end_date="2026-05-01",
        config=config,
    )

    assert run.status == "completed"
    assert run.total_observations_analyzed == 6
    assert run.harmonized_records_created == 6

    # Verify cross-sensor matches: Aqua MODIS matches both sub-pixel VIIRS detections (2 matches)
    cross_matches = (
        db.session.query(ObservationMatch)
        .filter(ObservationMatch.match_type == "cross_sensor")
        .all()
    )
    assert len(cross_matches) == 2
    matched_viirs_ids = {m.viirs_obs_id for m in cross_matches}
    assert matched_viirs_ids == {"e2e-viirs-1", "e2e-viirs-2"}
    # The Sydney observation must NOT have matched Canberra
    assert "e2e-viirs-syd" not in matched_viirs_ids

    # Verify reprocessing provenance match (MODIS Terra NRT <-> SP)
    prov_matches = (
        db.session.query(ObservationMatch)
        .filter(ObservationMatch.match_type == "reprocessing_provenance")
        .all()
    )
    assert len(prov_matches) == 1
    assert prov_matches[0].modis_obs_id == "e2e-terra-nrt"
    assert prov_matches[0].viirs_obs_id == "e2e-terra-sp"

    # Verify fire event clusters:
    # Cluster 1: Canberra fire (Aqua + 2 VIIRS) -> 3 observations
    # Cluster 2: Sydney fire (1 VIIRS) -> 1 observation
    # Cluster 3: Terra fire in NT (Terra NRT + SP) -> 2 observations
    events = db.session.query(FireEvent).all()
    assert len(events) == 3

    canberra_evt = next(e for e in events if e.observation_count == 3)
    assert canberra_evt.modis_count == 1
    assert canberra_evt.viirs_count == 2
    assert canberra_evt.total_frp_mw == 55.0  # 35 + 12 + 8
