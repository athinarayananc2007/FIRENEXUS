"""Initial schema with PostGIS spatial support and 14 relational tables (Explicit Alembic DDL)

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-11-14 18:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

try:
    from geoalchemy2 import Geometry
    has_geoalchemy = True
except ImportError:
    Geometry = None
    has_geoalchemy = False

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    is_postgres = (bind.dialect.name == 'postgresql')

    # PostGIS geometry type: 2D Point WGS 84 (SRID 4326) on PostgreSQL, String(64) on SQLite
    # spatial_index=False prevents GeoAlchemy2 event hooks from duplicating the explicit op.create_index below
    geom_type = Geometry(geometry_type='POINT', srid=4326, spatial_index=False) if (is_postgres and has_geoalchemy and Geometry is not None) else sa.String(64)

    # 1. PostGIS Extension (idempotent, safe on PostgreSQL)
    if is_postgres:
        op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS postgis;"))

    # 2. Table: analysis_runs
    op.create_table(
        'analysis_runs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('analysis_type', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='running'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('records_processed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('anomalies_flagged', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_analysis_runs_analysis_type', 'analysis_runs', ['analysis_type'])
    op.create_index('ix_analysis_runs_status', 'analysis_runs', ['status'])

    # 3. Table: calibration_models
    op.create_table(
        'calibration_models',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_type', sa.String(length=32), nullable=False, server_default='linear_ols'),
        sa.Column('source_sensor', sa.String(length=16), nullable=False, server_default='VIIRS'),
        sa.Column('target_sensor', sa.String(length=16), nullable=False, server_default='MODIS'),
        sa.Column('satellite_pair', sa.String(length=64), nullable=False),
        sa.Column('slope', sa.Float(), nullable=False),
        sa.Column('intercept', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('r_squared', sa.Float(), nullable=False),
        sa.Column('rmse', sa.Float(), nullable=False),
        sa.Column('mae', sa.Float(), nullable=False),
        sa.Column('mean_bias', sa.Float(), nullable=False),
        sa.Column('train_count', sa.Integer(), nullable=False),
        sa.Column('test_count', sa.Integer(), nullable=False),
        sa.Column('train_period_start', sa.Date(), nullable=True),
        sa.Column('train_period_end', sa.Date(), nullable=True),
        sa.Column('evaluation_metrics', sa.JSON(), nullable=True),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_calibration_models_model_name', 'calibration_models', ['model_name'])
    op.create_index('ix_calibration_models_satellite_pair', 'calibration_models', ['satellite_pair'])
    op.create_index('ix_calibration_models_algorithm_version', 'calibration_models', ['algorithm_version'])
    op.create_index('ix_calibration_models_status', 'calibration_models', ['status'])

    # 4. Table: dataset_availability
    op.create_table(
        'dataset_availability',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('source_product', sa.String(length=32), nullable=False),
        sa.Column('sensor', sa.String(length=16), nullable=False),
        sa.Column('satellite', sa.String(length=32), nullable=False),
        sa.Column('product_type', sa.String(length=8), nullable=False),
        sa.Column('min_date', sa.Date(), nullable=True),
        sa.Column('max_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='available'),
        sa.Column('record_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('source_product', name='uq_dataset_availability_source_product'),
    )
    op.create_index('ix_dataset_availability_source_product', 'dataset_availability', ['source_product'], unique=True)
    op.create_index('ix_dataset_availability_sensor', 'dataset_availability', ['sensor'])
    op.create_index('ix_dataset_availability_product_type', 'dataset_availability', ['product_type'])

    # 5. Table: fire_activity_summaries
    op.create_table(
        'fire_activity_summaries',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('period_type', sa.String(length=16), nullable=False),
        sa.Column('period_date', sa.Date(), nullable=False),
        sa.Column('sensor', sa.String(length=16), nullable=False, server_default='ALL'),
        sa.Column('satellite', sa.String(length=32), nullable=False, server_default='ALL'),
        sa.Column('observation_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('high_confidence_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('active_events_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('max_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('period_type', 'period_date', 'sensor', 'satellite', 'algorithm_version', name='uq_period_summary_ver'),
    )
    op.create_index('ix_fire_activity_summaries_period_type', 'fire_activity_summaries', ['period_type'])
    op.create_index('ix_fire_activity_summaries_period_date', 'fire_activity_summaries', ['period_date'])
    op.create_index('ix_fire_activity_summaries_sensor', 'fire_activity_summaries', ['sensor'])
    op.create_index('ix_fire_activity_summaries_satellite', 'fire_activity_summaries', ['satellite'])
    op.create_index('ix_fire_activity_summaries_algorithm_version', 'fire_activity_summaries', ['algorithm_version'])
    op.create_index('ix_activity_period_sensor', 'fire_activity_summaries', ['period_type', 'period_date', 'sensor'])

    # 6. Table: fire_events
    op.create_table(
        'fire_events',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('event_code', sa.String(length=32), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
        sa.Column('first_observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_observed_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_hours', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('centroid_latitude', sa.Float(), nullable=False),
        sa.Column('centroid_longitude', sa.Float(), nullable=False),
        sa.Column('geom', geom_type, nullable=True),
        sa.Column('spatial_radius_meters', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('observation_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('modis_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('viirs_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('max_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('avg_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('modis_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('viirs_frp_mw', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('grouping_criteria', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('event_code', name='uq_fire_events_event_code'),
    )
    op.create_index('ix_fire_events_event_code', 'fire_events', ['event_code'], unique=True)
    op.create_index('ix_fire_events_status', 'fire_events', ['status'])
    op.create_index('ix_fire_events_first_observed_at', 'fire_events', ['first_observed_at'])
    op.create_index('ix_fire_events_last_observed_at', 'fire_events', ['last_observed_at'])
    op.create_index('ix_fire_events_centroid_latitude', 'fire_events', ['centroid_latitude'])
    op.create_index('ix_fire_events_centroid_longitude', 'fire_events', ['centroid_longitude'])
    op.create_index('ix_fire_events_observation_count', 'fire_events', ['observation_count'])
    op.create_index('ix_fire_events_total_frp_mw', 'fire_events', ['total_frp_mw'])
    op.create_index('ix_fire_events_algorithm_version', 'fire_events', ['algorithm_version'])
    op.create_index('ix_event_time_frp', 'fire_events', ['first_observed_at', 'total_frp_mw'])
    op.create_index('ix_event_lat_lon', 'fire_events', ['centroid_latitude', 'centroid_longitude'])

    # 7. Table: frp_analyses
    op.create_table(
        'frp_analyses',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('sensor', sa.String(length=16), nullable=False, server_default='ALL'),
        sa.Column('satellite', sa.String(length=32), nullable=True),
        sa.Column('product_type', sa.String(length=8), nullable=True),
        sa.Column('sample_size', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('mean_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('std_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('variance_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('min_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p10_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p25_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('median_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p75_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p90_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p95_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('p99_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('max_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('iqr_frp', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_frp_analyses_sensor', 'frp_analyses', ['sensor'])
    op.create_index('ix_frp_analyses_satellite', 'frp_analyses', ['satellite'])
    op.create_index('ix_frp_analyses_product_type', 'frp_analyses', ['product_type'])
    op.create_index('ix_frp_analyses_algorithm_version', 'frp_analyses', ['algorithm_version'])

    # 8. Table: harmonization_runs
    op.create_table(
        'harmonization_runs',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='running'),
        sa.Column('parameters', sa.JSON(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('end_date', sa.Date(), nullable=True),
        sa.Column('total_observations_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('harmonized_records_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('matches_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('events_created', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duplicates_skipped', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_harmonization_runs_algorithm_version', 'harmonization_runs', ['algorithm_version'])
    op.create_index('ix_harmonization_runs_status', 'harmonization_runs', ['status'])

    # 9. Table: ingestion_runs
    op.create_table(
        'ingestion_runs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('source_product', sa.String(length=32), nullable=False),
        sa.Column('area', sa.String(length=64), nullable=False, server_default='world'),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('day_range', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='pending'),
        sa.Column('total_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('inserted_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('duplicate_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_records', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ingestion_runs_source_product', 'ingestion_runs', ['source_product'])
    op.create_index('ix_ingestion_runs_start_date', 'ingestion_runs', ['start_date'])
    op.create_index('ix_ingestion_runs_end_date', 'ingestion_runs', ['end_date'])
    op.create_index('ix_ingestion_runs_status', 'ingestion_runs', ['status'])

    # 10. Table: fire_observations
    op.create_table(
        'fire_observations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('dedup_hash', sa.String(length=64), nullable=False),
        sa.Column('source_product', sa.String(length=32), nullable=False),
        sa.Column('sensor', sa.String(length=16), nullable=False),
        sa.Column('satellite', sa.String(length=32), nullable=False),
        sa.Column('product_type', sa.String(length=8), nullable=False),
        sa.Column('acq_date', sa.Date(), nullable=False),
        sa.Column('acq_time', sa.String(length=8), nullable=False),
        sa.Column('acq_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('geom', geom_type, nullable=True),
        sa.Column('brightness', sa.Float(), nullable=False),
        sa.Column('bright_secondary', sa.Float(), nullable=True),
        sa.Column('frp', sa.Float(), nullable=False),
        sa.Column('confidence', sa.String(length=16), nullable=False),
        sa.Column('confidence_raw', sa.String(length=16), nullable=True),
        sa.Column('day_night', sa.String(length=2), nullable=True),
        sa.Column('scan', sa.Float(), nullable=True),
        sa.Column('track', sa.Float(), nullable=True),
        sa.Column('version', sa.String(length=16), nullable=True),
        sa.Column('country', sa.String(length=64), nullable=True),
        sa.Column('region', sa.String(length=64), nullable=True),
        sa.Column('continent', sa.String(length=32), nullable=True),
        sa.Column('raw_data', sa.JSON(), nullable=True),
        sa.Column('ingestion_run_id', sa.String(length=36), sa.ForeignKey('ingestion_runs.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('dedup_hash', name='uq_fire_observations_dedup_hash'),
    )
    op.create_index('ix_fire_observations_dedup_hash', 'fire_observations', ['dedup_hash'], unique=True)
    op.create_index('ix_fire_observations_source_product', 'fire_observations', ['source_product'])
    op.create_index('ix_fire_observations_sensor', 'fire_observations', ['sensor'])
    op.create_index('ix_fire_observations_satellite', 'fire_observations', ['satellite'])
    op.create_index('ix_fire_observations_product_type', 'fire_observations', ['product_type'])
    op.create_index('ix_fire_observations_acq_date', 'fire_observations', ['acq_date'])
    op.create_index('ix_fire_observations_acq_datetime', 'fire_observations', ['acq_datetime'])
    op.create_index('ix_fire_observations_latitude', 'fire_observations', ['latitude'])
    op.create_index('ix_fire_observations_longitude', 'fire_observations', ['longitude'])
    op.create_index('ix_fire_observations_frp', 'fire_observations', ['frp'])
    op.create_index('ix_fire_observations_confidence', 'fire_observations', ['confidence'])
    op.create_index('ix_fire_observations_day_night', 'fire_observations', ['day_night'])
    op.create_index('ix_fire_observations_country', 'fire_observations', ['country'])
    op.create_index('ix_fire_observations_continent', 'fire_observations', ['continent'])
    op.create_index('ix_fire_observations_ingestion_run_id', 'fire_observations', ['ingestion_run_id'])
    op.create_index('ix_obs_sensor_date', 'fire_observations', ['sensor', 'acq_date'])
    op.create_index('ix_obs_lat_lon', 'fire_observations', ['latitude', 'longitude'])
    op.create_index('ix_obs_date_frp', 'fire_observations', ['acq_date', 'frp'])
    op.create_index('ix_obs_satellite_conf', 'fire_observations', ['satellite', 'confidence'])

    # 11. Table: ingestion_logs
    op.create_table(
        'ingestion_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('run_id', sa.String(length=36), sa.ForeignKey('ingestion_runs.id', ondelete='CASCADE'), nullable=True),
        sa.Column('source_product', sa.String(length=32), nullable=True),
        sa.Column('level', sa.String(length=16), nullable=False, server_default='INFO'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ingestion_logs_run_id', 'ingestion_logs', ['run_id'])
    op.create_index('ix_ingestion_logs_source_product', 'ingestion_logs', ['source_product'])

    # 12. Table: anomaly_detections
    op.create_table(
        'anomaly_detections',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('observation_id', sa.String(length=64), sa.ForeignKey('fire_observations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sensor', sa.String(length=16), nullable=False),
        sa.Column('satellite', sa.String(length=32), nullable=False),
        sa.Column('anomaly_type', sa.String(length=32), nullable=False),
        sa.Column('method', sa.String(length=32), nullable=False),
        sa.Column('anomaly_score', sa.Float(), nullable=False),
        sa.Column('threshold_applied', sa.Float(), nullable=False),
        sa.Column('metric_name', sa.String(length=32), nullable=False),
        sa.Column('metric_value', sa.Float(), nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('observation_id', 'anomaly_type', 'method', 'algorithm_version', name='uq_obs_anomaly_ver'),
    )
    op.create_index('ix_anomaly_detections_observation_id', 'anomaly_detections', ['observation_id'])
    op.create_index('ix_anomaly_detections_sensor', 'anomaly_detections', ['sensor'])
    op.create_index('ix_anomaly_detections_satellite', 'anomaly_detections', ['satellite'])
    op.create_index('ix_anomaly_detections_anomaly_type', 'anomaly_detections', ['anomaly_type'])
    op.create_index('ix_anomaly_detections_method', 'anomaly_detections', ['method'])
    op.create_index('ix_anomaly_detections_algorithm_version', 'anomaly_detections', ['algorithm_version'])
    op.create_index('ix_anomaly_type_score', 'anomaly_detections', ['anomaly_type', 'anomaly_score'])

    # 13. Table: fire_event_observations
    op.create_table(
        'fire_event_observations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('event_id', sa.String(length=64), sa.ForeignKey('fire_events.id', ondelete='CASCADE'), nullable=False),
        sa.Column('observation_id', sa.String(length=64), sa.ForeignKey('fire_observations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('distance_to_centroid_meters', sa.Float(), nullable=False),
        sa.Column('time_offset_seconds', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('event_id', 'observation_id', name='uq_event_obs'),
    )
    op.create_index('ix_fire_event_observations_event_id', 'fire_event_observations', ['event_id'])
    op.create_index('ix_fire_event_observations_observation_id', 'fire_event_observations', ['observation_id'])

    # 14. Table: harmonized_observations
    op.create_table(
        'harmonized_observations',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('observation_id', sa.String(length=64), sa.ForeignKey('fire_observations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_product', sa.String(length=32), nullable=False),
        sa.Column('sensor', sa.String(length=16), nullable=False),
        sa.Column('satellite', sa.String(length=32), nullable=False),
        sa.Column('product_type', sa.String(length=8), nullable=False),
        sa.Column('acq_datetime', sa.DateTime(timezone=True), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('geom', geom_type, nullable=True),
        sa.Column('footprint_along_scan_km', sa.Float(), nullable=False),
        sa.Column('footprint_along_track_km', sa.Float(), nullable=False),
        sa.Column('footprint_area_km2', sa.Float(), nullable=False),
        sa.Column('brightness_kelvin', sa.Float(), nullable=False),
        sa.Column('bright_secondary_kelvin', sa.Float(), nullable=True),
        sa.Column('frp_mw', sa.Float(), nullable=False),
        sa.Column('confidence_category', sa.String(length=16), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('day_night', sa.String(length=2), nullable=True),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('normalized_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('observation_id', 'algorithm_version', name='uq_harm_obs_ver'),
    )
    op.create_index('ix_harmonized_observations_observation_id', 'harmonized_observations', ['observation_id'])
    op.create_index('ix_harmonized_observations_source_product', 'harmonized_observations', ['source_product'])
    op.create_index('ix_harmonized_observations_sensor', 'harmonized_observations', ['sensor'])
    op.create_index('ix_harmonized_observations_satellite', 'harmonized_observations', ['satellite'])
    op.create_index('ix_harmonized_observations_product_type', 'harmonized_observations', ['product_type'])
    op.create_index('ix_harmonized_observations_acq_datetime', 'harmonized_observations', ['acq_datetime'])
    op.create_index('ix_harmonized_observations_latitude', 'harmonized_observations', ['latitude'])
    op.create_index('ix_harmonized_observations_longitude', 'harmonized_observations', ['longitude'])
    op.create_index('ix_harmonized_observations_frp_mw', 'harmonized_observations', ['frp_mw'])
    op.create_index('ix_harmonized_observations_confidence_category', 'harmonized_observations', ['confidence_category'])
    op.create_index('ix_harmonized_observations_day_night', 'harmonized_observations', ['day_night'])
    op.create_index('ix_harmonized_observations_algorithm_version', 'harmonized_observations', ['algorithm_version'])
    op.create_index('ix_harm_sensor_date', 'harmonized_observations', ['sensor', 'acq_datetime'])
    op.create_index('ix_harm_lat_lon', 'harmonized_observations', ['latitude', 'longitude'])
    op.create_index('ix_harm_frp_conf', 'harmonized_observations', ['frp_mw', 'confidence_category'])

    # 15. Table: observation_matches
    op.create_table(
        'observation_matches',
        sa.Column('id', sa.String(length=64), primary_key=True),
        sa.Column('modis_obs_id', sa.String(length=64), sa.ForeignKey('fire_observations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('viirs_obs_id', sa.String(length=64), sa.ForeignKey('fire_observations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('match_type', sa.String(length=32), nullable=False, server_default='cross_sensor'),
        sa.Column('spatial_distance_meters', sa.Float(), nullable=False),
        sa.Column('footprint_overlap_ratio', sa.Float(), nullable=True),
        sa.Column('time_difference_seconds', sa.Float(), nullable=False),
        sa.Column('match_score', sa.Float(), nullable=False),
        sa.Column('match_criteria', sa.JSON(), nullable=True),
        sa.Column('algorithm_version', sa.String(length=16), nullable=False),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='candidate'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('modis_obs_id', 'viirs_obs_id', 'algorithm_version', name='uq_obs_match_pair_ver'),
    )
    op.create_index('ix_observation_matches_modis_obs_id', 'observation_matches', ['modis_obs_id'])
    op.create_index('ix_observation_matches_viirs_obs_id', 'observation_matches', ['viirs_obs_id'])
    op.create_index('ix_observation_matches_match_type', 'observation_matches', ['match_type'])
    op.create_index('ix_observation_matches_spatial_distance_meters', 'observation_matches', ['spatial_distance_meters'])
    op.create_index('ix_observation_matches_time_difference_seconds', 'observation_matches', ['time_difference_seconds'])
    op.create_index('ix_observation_matches_match_score', 'observation_matches', ['match_score'])
    op.create_index('ix_observation_matches_algorithm_version', 'observation_matches', ['algorithm_version'])
    op.create_index('ix_observation_matches_status', 'observation_matches', ['status'])
    op.create_index('ix_match_score_type', 'observation_matches', ['match_score', 'match_type'])

    # 16. PostGIS Spatial GiST Indexes (PostgreSQL only)
    if is_postgres:
        op.create_index('idx_fire_observations_geom', 'fire_observations', ['geom'], unique=False, postgresql_using='gist')
        op.create_index('idx_harmonized_observations_geom', 'harmonized_observations', ['geom'], unique=False, postgresql_using='gist')
        op.create_index('idx_fire_events_geom', 'fire_events', ['geom'], unique=False, postgresql_using='gist')


def downgrade():
    bind = op.get_bind()
    is_postgres = (bind.dialect.name == 'postgresql')

    # 1. Drop GiST Spatial Indexes (PostgreSQL only)
    if is_postgres:
        op.drop_index('idx_fire_events_geom', table_name='fire_events', postgresql_using='gist')
        op.drop_index('idx_harmonized_observations_geom', table_name='harmonized_observations', postgresql_using='gist')
        op.drop_index('idx_fire_observations_geom', table_name='fire_observations', postgresql_using='gist')

    # 2. Drop tables in exact reverse dependency order
    op.drop_table('observation_matches')
    op.drop_table('harmonized_observations')
    op.drop_table('fire_event_observations')
    op.drop_table('anomaly_detections')
    op.drop_table('ingestion_logs')
    op.drop_table('fire_observations')
    op.drop_table('ingestion_runs')
    op.drop_table('harmonization_runs')
    op.drop_table('frp_analyses')
    op.drop_table('fire_events')
    op.drop_table('fire_activity_summaries')
    op.drop_table('dataset_availability')
    op.drop_table('calibration_models')
    op.drop_table('analysis_runs')
