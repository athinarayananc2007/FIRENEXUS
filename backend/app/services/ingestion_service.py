"""
NASA FIRMS Data Ingestion Orchestration Service
Orchestrates global satellite observation downloads, batch chunking (max 5 days per NASA API limit),
CSV parsing, idempotent database insertion, progress logging, and error tracking.
"""

import time
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any
from app.extensions import db
from app.models.ingestion import IngestionRun, IngestionLog
from app.services.firms_service import FirmsApiClient, FirmsApiError, VALID_FIRMS_SOURCES
from app.services.csv_parser import FirmsCsvParser
from app.services.observation_repository import ObservationRepository

logger = logging.getLogger(__name__)


class IngestionService:
    """Service orchestrating batch and incremental NASA FIRMS data ingestion runs."""

    @classmethod
    def _create_log(cls, run_id: str | None, source_product: str, level: str, message: str) -> None:
        """Appends an operational log entry associated with an ingestion run."""
        try:
            log_entry = IngestionLog(
                run_id=run_id,
                source_product=source_product,
                level=level,
                message=message,
                created_at=datetime.now(timezone.utc),
            )
            db.session.add(log_entry)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to record ingestion log entry: {e}")

    @classmethod
    def run_single_batch(
        cls,
        source_product: str,
        area: str = "world",
        day_range: int = 1,
        date_str: str | None = None,
        firms_client: FirmsApiClient | None = None,
        max_records: int | None = None,
        dry_run: bool = False,
    ) -> IngestionRun:
        """
        Executes a single FIRMS Area API query (up to 5 days) and ingests observations.
        
        Args:
            source_product: e.g. 'MODIS_NRT', 'VIIRS_SNPP_NRT'
            area: 'world' for global coverage or bounding box
            day_range: 1 to 5 days (NASA constraint)
            date_str: 'YYYY-MM-DD' or None for current day
            firms_client: Optional injected FirmsApiClient
            max_records: Optional cap on observations to persist (useful for controlled staging)
            dry_run: When True, fetches and parses without writing to the database
        """
        if source_product not in VALID_FIRMS_SOURCES:
            raise ValueError(f"Invalid NASA FIRMS source '{source_product}'")

        day_range = max(1, min(5, int(day_range)))
        target_date = date.fromisoformat(date_str) if date_str else date.today()
        start_date = target_date - timedelta(days=day_range - 1)
        end_date = target_date

        start_time = time.time()
        client = firms_client or FirmsApiClient()

        if dry_run:
            logger.info(f"[DRY-RUN] Fetching NASA FIRMS data for {source_product} on {target_date.isoformat()}...")
            csv_text = client.get_area_csv(
                source=source_product,
                area=area,
                day_range=day_range,
                date=target_date.isoformat(),
            )
            valid_records, parse_errors = FirmsCsvParser.parse_csv_stream(csv_text, source_product)
            total_fetched = len(valid_records)
            capped_records = valid_records[:max_records] if (max_records and max_records > 0) else valid_records
            return IngestionRun(
                id=f"dry_run_{int(time.time())}",
                source_product=source_product,
                area=area,
                start_date=start_date,
                end_date=end_date,
                day_range=day_range,
                status="completed_dry_run",
                total_records=total_fetched,
                inserted_records=len(capped_records),
                duplicate_records=0,
                error_records=len(parse_errors),
                duration_seconds=round(time.time() - start_time, 2),
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc),
            )

        # Initialize IngestionRun record
        run = IngestionRun(
            source_product=source_product,
            area=area,
            start_date=start_date,
            end_date=end_date,
            day_range=day_range,
            status="running",
            started_at=datetime.now(timezone.utc),
        )
        db.session.add(run)
        db.session.commit()

        cls._create_log(
            run.id,
            source_product,
            "INFO",
            f"Starting ingestion run for {source_product} ({area}, {day_range} day(s), ending {target_date.isoformat()}).",
        )

        try:
            # 1. Fetch CSV from NASA FIRMS Area API
            csv_text = client.get_area_csv(
                source=source_product,
                area=area,
                day_range=day_range,
                date=target_date.isoformat(),
            )

            # 2. Parse CSV records
            valid_records, parse_errors = FirmsCsvParser.parse_csv_stream(csv_text, source_product)
            total_fetched = len(valid_records)

            if max_records is not None and max_records > 0:
                valid_records = valid_records[:max_records]

            run.total_records = total_fetched
            run.error_records = len(parse_errors)

            if parse_errors:
                cls._create_log(
                    run.id,
                    source_product,
                    "WARNING",
                    f"Parsed CSV with {len(parse_errors)} malformed rows.",
                )

            # 3. Bulk insert observations idempotently
            inserted, duplicates, db_errors = ObservationRepository.bulk_insert_observations(
                valid_records,
                ingestion_run_id=run.id,
                batch_size=1000,
            )

            run.inserted_records = inserted
            run.duplicate_records = duplicates
            run.error_records += db_errors

            # 4. Finalize run status
            run.duration_seconds = round(time.time() - start_time, 2)
            run.completed_at = datetime.now(timezone.utc)
            run.status = "completed" if db_errors == 0 else "partial"

            cls._create_log(
                run.id,
                source_product,
                "INFO",
                f"Completed run: {inserted} inserted, {duplicates} duplicate skipped, {run.error_records} errors ({run.duration_seconds}s).",
            )
            db.session.commit()
            return run

        except (FirmsApiError, Exception) as err:
            try:
                db.session.rollback()
                run.status = "failed"
                run.error_message = str(err)
                run.completed_at = datetime.now(timezone.utc)
                run.duration_seconds = round(time.time() - start_time, 2)
                db.session.commit()

                cls._create_log(
                    run.id,
                    source_product,
                    "ERROR",
                    f"Ingestion run failed: {err}",
                )
            except Exception as db_err:
                logger.error(f"Failed to record failure status for run {run.id}: {db_err}")

            logger.error(f"Ingestion run {run.id} failed: {err}")
            return run

    @classmethod
    def ingest_date_range(
        cls,
        source_product: str,
        start_date: date | str,
        end_date: date | str,
        area: str = "world",
        firms_client: FirmsApiClient | None = None,
    ) -> list[IngestionRun]:
        """
        Ingests an extended date range by automatically chunking into valid batches of <= 5 days
        per the NASA FIRMS Area API constraint.
        """
        if isinstance(start_date, str):
            start_date = date.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date.fromisoformat(end_date)

        if start_date > end_date:
            raise ValueError(f"start_date ({start_date}) cannot be later than end_date ({end_date})")

        runs = []
        current_date = start_date

        while current_date <= end_date:
            # Chunk into up to 5 days
            remaining_days = (end_date - current_date).days + 1
            chunk_days = min(5, remaining_days)
            chunk_end_date = current_date + timedelta(days=chunk_days - 1)

            # NASA Area API takes the end_date and day_range
            run = cls.run_single_batch(
                source_product=source_product,
                area=area,
                day_range=chunk_days,
                date_str=chunk_end_date.isoformat(),
                firms_client=firms_client,
            )
            runs.append(run)

            # Move forward
            current_date = chunk_end_date + timedelta(days=1)

        return runs

    @classmethod
    def get_runs_status(cls, limit: int = 20) -> list[dict[str, Any]]:
        """Lists recent ingestion runs."""
        runs = (
            db.session.query(IngestionRun)
            .order_by(IngestionRun.started_at.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in runs]

    @classmethod
    def get_run_logs(cls, run_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        """Retrieves operational ingestion logs."""
        query = db.session.query(IngestionLog).order_by(IngestionLog.created_at.desc())
        if run_id:
            query = query.filter(IngestionLog.run_id == run_id)
        logs = query.limit(limit).all()
        return [l.to_dict() for l in logs]

