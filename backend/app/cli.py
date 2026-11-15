"""
FIRENEXUS Flask CLI Commands
Provides command-line commands for data availability checks and controlled NASA FIRMS ingestion.
"""

import click
from flask import Flask
from app.services.firms_service import FirmsApiClient, VALID_FIRMS_SOURCES
from app.services.availability_service import AvailabilityService
from app.services.ingestion_service import IngestionService


def register_cli_commands(app: Flask) -> None:
    """Registers Click CLI commands on the Flask application."""

    @app.cli.group("firms")
    def firms_cli():
        """NASA FIRMS API integration and ingestion commands."""
        pass

    @firms_cli.command("check-availability")
    @click.option("--refresh", is_flag=True, help="Force refresh from upstream NASA FIRMS API.")
    def check_availability(refresh: bool):
        """Displays data availability dates for all supported satellite sensors."""
        click.echo("=" * 70)
        click.echo("  NASA FIRMS Dataset Availability")
        click.echo("=" * 70)

        client = FirmsApiClient()
        if not client.is_configured:
            click.secho("  Notice: FIRMS_MAP_KEY is not configured in .env. Showing cached baseline.", fg="yellow")

        if refresh:
            click.echo("  Refreshing availability from NASA FIRMS upstream...")
            records = AvailabilityService.refresh_availability()
        else:
            records = AvailabilityService.get_all_availability()

        for r in records:
            sensor_color = "cyan" if r["sensor"] == "VIIRS" else "yellow"
            click.secho(f"  [{r['sensor']:5s}] {r['source_product']:16s} ({r['satellite']:10s})", fg=sensor_color, nl=False)
            click.echo(f"  Min: {r['min_date']}  |  Max: {r['max_date']}  [{r['status']}]")

        click.echo("=" * 70)

    @firms_cli.command("ingest")
    @click.option("--source", default="MODIS_NRT", type=click.Choice(list(VALID_FIRMS_SOURCES.keys())), help="Dataset source identifier")
    @click.option("--area", default="world", help="Area identifier ('world' or bbox 'min_lon,min_lat,max_lon,max_lat')")
    @click.option("--days", default=1, type=click.IntRange(1, 5), help="Number of days (1-5 per NASA API constraint)")
    @click.option("--date", default=None, help="End date in YYYY-MM-DD format (defaults to today)")
    @click.option("--limit", default=None, type=int, help="Optional maximum number of records to ingest (for bounded staging)")
    @click.option("--dry-run", is_flag=True, help="Fetch and parse NASA data without committing to database")
    def ingest_single(source: str, area: str, days: int, date: str | None, limit: int | None, dry_run: bool):
        """Executes a single controlled NASA FIRMS ingestion batch (1-5 days)."""
        mode_str = "[DRY-RUN] " if dry_run else ""
        limit_str = f", limit: {limit}" if limit else ""
        click.echo(f"{mode_str}Initiating controlled ingestion for {source} (area: {area}, days: {days}, date: {date or 'today'}{limit_str})...")
        client = FirmsApiClient()
        if not client.is_configured:
            click.secho("Error: FIRMS_MAP_KEY is not configured in backend/.env. Cannot contact live NASA API.", fg="red")
            return

        run = IngestionService.run_single_batch(
            source_product=source,
            area=area,
            day_range=days,
            date_str=date,
            max_records=limit,
            dry_run=dry_run,
        )

        status_color = "green" if "completed" in run.status else "yellow" if run.status == "partial" else "red"
        click.secho(f"Run {run.id} finished with status: {run.status.upper()}", fg=status_color)
        click.echo(f"  Total processed: {run.total_records}")
        click.echo(f"  New inserted:    {run.inserted_records}")
        click.echo(f"  Duplicates:      {run.duplicate_records}")
        click.echo(f"  Errors:          {run.error_records}")
        click.echo(f"  Duration:        {run.duration_seconds}s")

    @firms_cli.command("ingest-range")
    @click.option("--source", default="VIIRS_SNPP_NRT", type=click.Choice(list(VALID_FIRMS_SOURCES.keys())), help="Dataset source identifier")
    @click.option("--start", required=True, help="Start date (YYYY-MM-DD)")
    @click.option("--end", required=True, help="End date (YYYY-MM-DD)")
    @click.option("--area", default="world", help="Area identifier ('world' or bbox)")
    def ingest_range(source: str, start: str, end: str, area: str):
        """Ingests an extended date range with automatic 5-day chunking."""
        click.echo(f"Initiating date-range ingestion for {source} from {start} to {end}...")
        client = FirmsApiClient()
        if not client.is_configured:
            click.secho("Error: FIRMS_MAP_KEY is not configured in backend/.env. Cannot contact live NASA API.", fg="red")
            return

        runs = IngestionService.ingest_date_range(
            source_product=source,
            start_date=start,
            end_date=end,
            area=area,
        )

        total_ins = sum(r.inserted_records for r in runs)
        total_dup = sum(r.duplicate_records for r in runs)
        click.secho(f"Completed {len(runs)} chunk batches: {total_ins} inserted, {total_dup} duplicates.", fg="green")

    @app.cli.group("harmonize")
    def harmonize_cli():
        """MODIS and VIIRS satellite observation harmonization commands."""
        pass

    @harmonize_cli.command("run")
    @click.option("--start", default=None, help="Start date (YYYY-MM-DD)")
    @click.option("--end", default=None, help="End date (YYYY-MM-DD)")
    @click.option("--max-dist", default=2000.0, type=float, help="Max spatial distance in meters (default 2000)")
    @click.option("--max-time", default=7200.0, type=float, help="Default max time difference in seconds (default 7200)")
    def harmonize_run(start: str | None, end: str | None, max_dist: float, max_time: float):
        """Executes a controlled harmonization run over satellite observations."""
        from app.services.harmonization_service import HarmonizationService
        from app.services.harmonization_config import HarmonizationConfig

        click.echo("=" * 70)
        click.echo("  FIRENEXUS MODIS–VIIRS Harmonization Engine")
        click.echo("=" * 70)
        click.echo(f"  Start Date:      {start or 'All available'}")
        click.echo(f"  End Date:        {end or 'All available'}")
        click.echo(f"  Spatial Window:  {max_dist} m")
        click.echo(f"  Temporal Window: {max_time} s")
        click.echo("  Executing normalization, correspondence matching, and event clustering...")

        config = HarmonizationConfig(
            max_spatial_distance_meters=max_dist,
            default_max_time_diff_seconds=max_time,
        )

        run = HarmonizationService.run_harmonization(
            start_date=start,
            end_date=end,
            config=config,
        )

        status_color = "green" if run.status == "completed" else "red"
        click.secho(f"  Run Finished with Status: {run.status.upper()}", fg=status_color)
        click.echo(f"  Observations Analyzed:     {run.total_observations_analyzed}")
        click.echo(f"  Harmonized Records Built:  {run.harmonized_records_created}")
        click.echo(f"  Correspondence Matches:    {run.matches_created}")
        click.echo(f"  Fire Events Formed:        {run.events_created}")
        click.echo(f"  Duplicates Skipped:        {run.duplicates_skipped}")
        click.echo(f"  Duration:                  {run.duration_seconds}s")
        click.echo("=" * 70)

    @harmonize_cli.command("summary")
    def harmonize_summary():
        """Displays summary statistics of harmonized records, matches, and events."""
        from app.services.harmonization_repository import HarmonizationRepository

        summary = HarmonizationRepository.get_harmonization_summary()

        click.echo("=" * 70)
        click.echo("  FIRENEXUS Harmonization Summary")
        click.echo("=" * 70)
        h = summary["harmonized_observations"]
        click.echo(f"  Harmonized Observations:   Total: {h['total']} (MODIS: {h['modis']} | VIIRS: {h['viirs']})")
        m = summary["matches"]
        click.echo(f"  Correspondence Matches:    Total: {m['total']} (Cross-Sensor: {m['cross_sensor']} | Provenance: {m['reprocessing_provenance']})")
        click.echo(f"  Average Match Score:       {m['average_match_score']}")
        e = summary["events"]
        click.echo(f"  Fire Event Clusters:       Total: {e['total']} (Active: {e['active']})")
        click.echo(f"  Total Aggregated FRP:      {e['total_frp_mw']} MW")
        click.echo("=" * 70)

    @app.cli.group("analytics")
    def analytics_cli():
        """Statistical calibration and anomaly detection commands."""
        pass

    @analytics_cli.command("summary")
    def analytics_summary():
        """Displays summary of statistical anomalies and calibration models."""
        from app.services.analytics_repository import AnalyticsRepository

        summary = AnalyticsRepository.get_analytics_summary()

        click.echo("=" * 70)
        click.echo("  FIRENEXUS Statistical Analytics Summary")
        click.echo("=" * 70)
        a = summary["anomalies"]
        click.echo(f"  Detected Anomalies:        Total: {a['total']} (High FRP: {a['high_frp']} | Brightness: {a['high_brightness']} | Isolated: {a['spatial_isolation']})")
        c = summary["calibration_models"]
        click.echo(f"  Calibration Models:        Total: {c['total']} (Active: {c['active']})")
        click.echo(f"  Average Model R^2:         {c['average_r_squared']}")
        click.echo(f"  Analysis Runs Completed:   {summary['analysis_runs_count']}")
        click.echo("=" * 70)

    @analytics_cli.command("detect-anomalies")
    @click.option("--method", default="modified_z_score", type=click.Choice(["z_score", "modified_z_score", "iqr"]), help="Detection algorithm")
    @click.option("--threshold", default=3.5, type=float, help="Score threshold (default 3.5)")
    def detect_anomalies_cmd(method: str, threshold: float):
        """Executes anomaly detection across satellite fire observations."""
        from app.extensions import db
        from app.models.observation import FireObservation
        from app.services.anomaly_detection_service import AnomalyDetectionService
        from app.services.analytics_repository import AnalyticsRepository

        click.echo("=" * 70)
        click.echo(f"  Detecting Fire Hotspot Anomalies ({method}, threshold={threshold})...")
        click.echo("=" * 70)

        observations = db.session.query(FireObservation).all()
        if not observations:
            click.echo("  Notice: No fire observations found in database to analyze.")
            return

        anomalies = []
        anomalies.extend(AnomalyDetectionService.detect_frp_anomalies(observations, method=method, threshold=threshold))
        anomalies.extend(AnomalyDetectionService.detect_brightness_anomalies(observations))
        anomalies.extend(AnomalyDetectionService.detect_spatial_isolation(observations))

        ins, skip = AnalyticsRepository.bulk_insert_anomalies(anomalies)
        click.secho(f"  Detection Complete: {ins} new anomalies flagged, {skip} duplicate skipped.", fg="green")
        click.echo("=" * 70)

