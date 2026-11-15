# FIRENEXUS: Complete Database Design & REST API Reference

**System**: FIRENEXUS Satellite Active Fire Monitoring & Harmonization Platform  
**Purpose**: Comprehensive Technical Reference for Database Schemas, Geospatial Types, and REST Endpoints  
**API Specification**: RESTful JSON over HTTPS (Version `v1`)  
**Database**: PostgreSQL 16 + PostGIS 3.4 Spatial Extension (SRID 4326)  

---

## SECTION 1: DATABASE ARCHITECTURE & 14 RELATIONAL SCHEMAS

### 1.1 Overview & Spatial Modeling
The FIRENEXUS database architecture models planetary-scale satellite observations using a hybrid relational-geospatial approach.
- **Geospatial Specification**: Open Geospatial Consortium (OGC) Simple Features for SQL standard.
- **Coordinate Reference System**: WGS 84 (`EPSG:4326` / SRID `4326`) representing unprojected latitude and longitude in decimal degrees.
- **Metric Distance Transformation**: When calculating distance in meters, PostGIS casts SRID 4326 geometries to the Spherical Mercator projection (`EPSG:3857`) or utilizes the PostGIS `geography` type, which uses great-circle spherical distance on the WGS 84 ellipsoid.
- **Spatial Indexing**: Generalized Search Tree (**GiST**) R-Tree indexes allow two-dimensional spatial queries (such as bounding boxes and radius searches) to execute in $O(\log N)$ time instead of scanning every table row.

### 1.2 Custom `PostGISPoint` Type Decorator (`app/models/types.py`)
To enable automated unit testing in environments where native PostGIS or SpatiaLite is unavailable, FIRENEXUS implements a custom SQLAlchemy `TypeDecorator`:
```python
class PostGISPoint(TypeDecorator):
    """
    Compiles to PostGIS Geometry('POINT', srid=4326) on PostgreSQL engines.
    Falls back to String(64) on SQLite engines for hermetic in-memory testing.
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_GEOALCHEMY and Geometry is not None:
            return dialect.type_descriptor(Geometry(geometry_type="POINT", srid=4326))
        return dialect.type_descriptor(String(64))
```

### 1.3 Detailed Specifications of All 14 Relational Tables

#### 1. `fire_observations` (Raw Telemetry Archive)
- **Purpose**: Stores immutable raw satellite active fire detections ingested from NASA FIRMS.
- **Primary Key**: `id` (UUID string, 36 chars).
- **Unique Constraint**: `dedup_hash` (VARCHAR(64), SHA-256 hash preventing duplicate ingestion).
- **Core Columns**:
  - `source_product`: VARCHAR(32) (e.g. `MODIS_NRT`, `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`).
  - `sensor`: VARCHAR(16) (`MODIS` or `VIIRS`).
  - `satellite`: VARCHAR(32) (`Terra`, `Aqua`, `Suomi-NPP`, `NOAA-20`, `NOAA-21`).
  - `product_type`: VARCHAR(8) (`NRT` for near-real-time or `SP` for standard climate processing).
  - `acq_date`: DATE (acquisition date).
  - `acq_time`: VARCHAR(8) (acquisition time string, UTC `HHMM`).
  - `acq_datetime`: TIMESTAMP WITH TIME ZONE (normalized UTC datetime).
  - `latitude`: FLOAT (WGS 84 latitude, validated $[-90.0, +90.0]$).
  - `longitude`: FLOAT (WGS 84 longitude, validated $[-180.0, +180.0]$).
  - `location`: `PostGISPoint` (PostGIS `GEOMETRY(Point, 4326)`).
  - `brightness`: FLOAT (Channel 4 µm brightness temperature in Kelvin).
  - `bright_secondary`: FLOAT (Channel 11 µm background brightness temperature in Kelvin).
  - `frp`: FLOAT (Fire Radiative Power in Megawatts, MW).
  - `confidence`: VARCHAR(16) (normalized categorical: `low`, `nominal`, `high`).
  - `confidence_raw`: VARCHAR(16) (raw satellite output: e.g. `'85'` for MODIS, `'nominal'` for VIIRS).
  - `day_night`: VARCHAR(2) (`'D'` for Day pass, `'N'` for Night pass).
  - `scan`: FLOAT (along-scan pixel ground dimension in km).
  - `track`: FLOAT (along-track pixel ground dimension in km).
  - `version`: VARCHAR(16) (algorithm collection version, e.g. `'6.1N'`, `'2.0NRT'`).
- **Indexes**:
  - B-tree index on `(acq_datetime, sensor)`.
  - B-tree index on `(acq_date, source_product)`.
  - GiST spatial index on `location`.

#### 2. `dataset_availability` (Sensor Temporal Coverage)
- **Purpose**: Tracks temporal availability bounds and active status for each NASA FIRMS stream.
- **Primary Key**: `id` (UUID string).
- **Unique Constraint**: `data_id` (VARCHAR(32), e.g. `MODIS_NRT`).
- **Core Columns**: `data_id`, `sensor`, `satellite`, `min_date`, `max_date`, `status` (`active`, `legacy`), `total_days_available`, `last_checked_at`.

#### 3. `ingestion_runs` (Ingestion Audit History)
- **Purpose**: Audit log of automated and administrator-triggered NASA FIRMS ingestion runs.
- **Primary Key**: `id` (UUID string).
- **Core Columns**: `source_product`, `area`, `start_date`, `end_date`, `status` (`running`, `completed`, `failed`), `records_fetched`, `records_inserted`, `duplicates_skipped`, `error_count`, `duration_seconds`, `started_at`, `completed_at`.

#### 4. `ingestion_logs` (Granular Batch Logs)
- **Purpose**: Stores individual log events and error traces generated during an ingestion run.
- **Primary Key**: `id` (UUID string).
- **Foreign Key**: `run_id` references `ingestion_runs.id` (ON DELETE CASCADE).
- **Core Columns**: `run_id`, `level` (`INFO`, `WARNING`, `ERROR`), `message`, `details` (JSON), `created_at`.

#### 5. `harmonized_observations` (Normalized Spatial Observations)
- **Purpose**: Stores standardized observational records after sensor footprint expansion modeling and confidence categorization.
- **Primary Key**: `id` (UUID string).
- **Foreign Key**: `observation_id` references `fire_observations.id`.
- **Core Columns**: `observation_id`, `source_product`, `sensor`, `satellite`, `product_type`, `acq_datetime`, `latitude`, `longitude`, `footprint_along_scan_km`, `footprint_along_track_km`, `footprint_area_km2`, `brightness_kelvin`, `frp_mw`, `confidence_category`, `algorithm_version`, `normalized_at`.
- **Indexes**: B-tree index on `(acq_datetime, sensor)`.

#### 6. `observation_matches` (Cross-Sensor Correspondence Pairs)
- **Purpose**: Records algorithmic pairings between a MODIS observation and a VIIRS observation (or NRT/SP reprocessing pairs).
- **Primary Key**: `id` (UUID string).
- **Foreign Keys**:
  - `modis_obs_id` references `fire_observations.id`.
  - `viirs_obs_id` references `fire_observations.id`.
- **Core Columns**:
  - `match_type`: VARCHAR(32) (`cross_sensor` for MODIS $\leftrightarrow$ VIIRS; `reprocessing_provenance` for NRT $\leftrightarrow$ SP).
  - `spatial_distance_meters`: FLOAT (Haversine distance between pixel centers).
  - `footprint_overlap_ratio`: FLOAT (estimated spatial footprint intersection ratio $[0.0, 1.0]$).
  - `time_difference_seconds`: FLOAT (absolute time delta $|t_1 - t_2|$).
  - `match_score`: FLOAT (composite heuristic score $[0.0, 1.0]$: $0.6 \cdot s_{\text{spatial}} + 0.4 \cdot s_{\text{temporal}}$).
  - `match_criteria`: JSON (snapshot of weights and thresholds applied).
  - `algorithm_version`: VARCHAR(16).
  - `status`: VARCHAR(16) (`confirmed` if score $\ge 0.70$; `candidate` if $0.25 \le \text{score} < 0.70$).
- **Indexes**: Composite B-tree index on `(modis_obs_id, viirs_obs_id)`.

#### 7. `fire_events` (Clustered Wildfire Entities)
- **Purpose**: Aggregates discrete spatiotemporally proximate hotspots into cohesive physical wildfire events.
- **Primary Key**: `id` (UUID string).
- **Unique Constraint**: `event_code` (e.g. `EVT-20261114-A1F2`).
- **Core Columns**:
  - `event_code`: Structured human-readable identifier.
  - `status`: VARCHAR(16) (`active` if duration $< 24\text{ hours}$; `inactive` otherwise).
  - `first_observed_at`: TIMESTAMP WITH TIME ZONE (earliest detection).
  - `last_observed_at`: TIMESTAMP WITH TIME ZONE (latest detection).
  - `duration_hours`: FLOAT (temporal span).
  - `centroid_latitude`, `centroid_longitude`: FLOAT (center of mass).
  - `centroid_geom`: `PostGISPoint` (PostGIS `GEOMETRY(Point, 4326)`).
  - `spatial_radius_meters`: FLOAT (maximum distance from centroid to any member pixel).
  - `observation_count`: INTEGER (total hotspots in cluster).
  - `modis_count`, `viirs_count`: INTEGER (sensor-specific counts).
  - `total_frp_mw`, `max_frp_mw`, `avg_frp_mw`: FLOAT (aggregate energy).
  - `modis_frp_mw`, `viirs_frp_mw`: FLOAT (energy partitioned by sensor).
  - `algorithm_version`: VARCHAR(16).

#### 8. `fire_event_observations` (Cluster Membership Join Table)
- **Purpose**: Many-to-many association between a `fire_event` and its individual member `fire_observations`.
- **Primary Key**: `id` (UUID string).
- **Foreign Keys**:
  - `event_id` references `fire_events.id` (ON DELETE CASCADE).
  - `observation_id` references `fire_observations.id`.
- **Core Columns**: `event_id`, `observation_id`, `distance_to_centroid_meters`, `time_offset_seconds`, `created_at`.

#### 9. `harmonization_runs` (Harmonization Audit History)
- **Purpose**: Tracks execution metrics, processing durations, and record counts for harmonization pipeline runs.
- **Primary Key**: `id` (UUID string).
- **Core Columns**: `algorithm_version`, `parameters` (JSON), `start_date`, `end_date`, `status` (`running`, `completed`, `failed`), `total_observations_analyzed`, `harmonized_records_created`, `matches_created`, `duplicates_skipped`, `events_created`, `duration_seconds`, `started_at`, `completed_at`.

#### 10. `frp_analyses` (Fire Radiative Power Statistics)
- **Purpose**: Stores computed parametric and non-parametric distribution statistics and cross-sensor comparison metrics.
- **Primary Key**: `id` (UUID string).
- **Core Columns**: `analysis_type` (`univariate`, `paired_comparison`), `sensor` (`MODIS`, `VIIRS`, `ALL`), `sample_size`, `mean_frp_mw`, `median_frp_mw`, `std_frp_mw`, `variance_frp_mw`, `min_frp_mw`, `max_frp_mw`, `iqr_frp_mw`, `percentiles` (JSON: $P_{10}$ to $P_{99}$), `pearson_r`, `spearman_rho`, `mean_bias_error_mw`, `mae_mw`, `rmse_mw`, `mape`, `created_at`.

#### 11. `calibration_models` (Cross-Sensor Empirical Regression)
- **Purpose**: Stores trained regression models relating MODIS and VIIRS FRP with chronological validation metrics.
- **Primary Key**: `id` (UUID string).
- **Unique Constraint**: `model_name` (e.g. `MODIS_vs_VIIRS_FRP_OLS_2026`).
- **Core Columns**: `model_name`, `model_type` (`linear_ols`, `zero_intercept`), `source_sensor` (`VIIRS`), `target_sensor` (`MODIS`), `satellite_pair` (`Aqua_Suomi-NPP`), `slope`, `intercept`, `r_squared`, `rmse`, `mae`, `mean_bias`, `train_count`, `test_count`, `train_period_start`, `train_period_end`, `evaluation_metrics` (JSON), `status` (`active`, `deprecated`).

#### 12. `anomaly_detections` (Active Fire Anomalies)
- **Purpose**: Catalog of flagged radiometric, statistical, and spatial outlier observations.
- **Primary Key**: `id` (UUID string).
- **Foreign Key**: `observation_id` references `fire_observations.id`.
- **Core Columns**: `observation_id`, `sensor`, `satellite`, `anomaly_type` (`high_frp`, `high_brightness`, `spatial_isolation`), `method` (`z_score`, `modified_z_score`, `iqr`, `saturation_threshold`, `spatial_isolation_test`), `anomaly_score`, `threshold_applied`, `metric_name`, `metric_value`, `explanation`, `reviewed` (BOOLEAN), `created_at`.

#### 13. `fire_activity_summaries` (Temporal & Regional Aggregations)
- **Purpose**: Pre-aggregated fire activity summaries across daily, weekly, and monthly intervals for ultra-fast frontend dashboard rendering.
- **Primary Key**: `id` (UUID string).
- **Core Columns**: `aggregation_period` (`daily`, `weekly`, `monthly`), `period_start`, `period_end`, `total_observations`, `modis_count`, `viirs_count`, `total_frp_mw`, `avg_frp_mw`, `sensor_distribution` (JSON), `geographic_summary` (JSON).

#### 14. `analysis_runs` (Analytics Pipeline Audit)
- **Purpose**: Execution audit log for statistical analytics, calibration training, and anomaly detection runs.
- **Primary Key**: `id` (UUID string).
- **Core Columns**: `run_type` (`frp_stats`, `calibration`, `anomaly_detection`), `algorithm_version`, `status` (`running`, `completed`, `failed`), `parameters` (JSON), `results_summary` (JSON), `duration_seconds`, `created_at`.

---

## SECTION 2: COMPLETE REST API REFERENCE (ALL 26 ENDPOINTS)

All endpoints are prefixed with `/api/v1` and return standard RFC 7807 JSON error responses on failure.

| Method | Endpoint | Description | Auth Required | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health, database connectivity, and FIRMS API configuration state | None | **VERIFIED** |
| `GET` | `/api/v1/availability` | Discovered sensor temporal coverage bounds and operational status | None | **VERIFIED** |
| `GET` | `/api/v1/observations` | Filtered, sorted, paginated raw active fire observations | None | **VERIFIED** |
| `GET` | `/api/v1/observations/summary` | Aggregate observational metrics and sensor energy distributions | None | **VERIFIED** |
| `GET` | `/api/v1/observations/<id>` | Full telemetry details of a single active fire observation | None | **VERIFIED** |
| `GET` | `/api/v1/ingestion/status` | List recent NASA FIRMS batch ingestion runs | None | **VERIFIED** |
| `GET` | `/api/v1/ingestion/logs` | Audit logs from ingestion executions | None | **VERIFIED** |
| `POST` | `/api/v1/ingestion/run` | Trigger controlled NASA FIRMS ingestion batch | `ADMIN_API_KEY` | **VERIFIED** |
| `GET` | `/api/v1/harmonization/status` | Status of recent harmonization pipeline executions | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/summary` | Metrics summary (harmonized records, matches, events) | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/matches` | Filtered, paginated cross-sensor matches between MODIS and VIIRS | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/matches/<id>` | Single cross-sensor match details with joined observation data | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/events` | Filtered, paginated clustered fire event entities | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/events/<id>` | Single fire event details with member observation list | None | **VERIFIED** |
| `GET` | `/api/v1/harmonization/observations` | Filtered, paginated normalized observations with footprint models | None | **VERIFIED** |
| `POST` | `/api/v1/harmonization/run` | Trigger controlled harmonization pipeline execution | `ADMIN_API_KEY` | **VERIFIED** |
| `GET` | `/api/v1/analytics/frp` | Univariate FRP distribution statistics per sensor or globally | None | **VERIFIED** |
| `GET` | `/api/v1/analytics/frp/comparison` | Paired cross-sensor FRP comparative statistics (MBE, RMSE, Pearson r) | None | **VERIFIED** |
| `GET` | `/api/v1/analytics/calibration` | List trained statistical calibration models and evaluation metrics | None | **VERIFIED** |
| `POST` | `/api/v1/analytics/calibration/train` | Train and evaluate calibration model with chronological split | `ADMIN_API_KEY` | **VERIFIED** |
| `GET` | `/api/v1/analytics/anomalies` | Paginated list of detected radiometric, statistical, and spatial anomalies | None | **VERIFIED** |
| `POST` | `/api/v1/analytics/anomalies/detect` | Execute multi-method anomaly detection pipeline | `ADMIN_API_KEY` | **VERIFIED** |
| `GET` | `/api/v1/analytics/trends` | Temporal fire activity aggregations (daily, weekly, monthly) | None | **VERIFIED** |
| `GET` | `/api/v1/analytics/diurnal` | 24-hour UTC diurnal fire activity distribution and orbit profiles | None | **VERIFIED** |
| `GET` | `/api/v1/analytics/summary` | Consolidated analytics dashboard summary | None | **VERIFIED** |
| `GET` | `/api/v1/analytics/runs` | Historical audit list of analytical runs | None | **VERIFIED** |

---

### Detailed Endpoint Specifications & Payload Examples

#### 1. System Health Endpoint: `GET /api/v1/health`
- **Request Parameters**: None.
- **Example Response (Database Offline - HTTP 503)**:
```json
{
  "application": "FIRENEXUS",
  "backend": "running",
  "database": "disconnected",
  "details": "Could not establish connection to the configured database server.",
  "firms_api": "configured",
  "message": "Database connection is unavailable or service is offline.",
  "status": "error"
}
```
- **Example Response (Database Online - HTTP 200)**:
```json
{
  "application": "FIRENEXUS",
  "backend": "running",
  "database": "connected",
  "database_type": "PostgreSQL 16.16 with PostGIS 3.4.2",
  "firms_api": "configured",
  "status": "healthy",
  "timestamp": "2026-11-14T19:00:00Z"
}
```

#### 2. Observations Query: `GET /api/v1/observations`
- **Query Parameters**:
  - `sensor`: `MODIS` | `VIIRS` | `ALL`
  - `satellite`: `Terra` | `Aqua` | `Suomi-NPP` | `NOAA-20` | `NOAA-21`
  - `start_date`, `end_date`: ISO dates (`YYYY-MM-DD`)
  - `min_frp`, `max_frp`: Numeric bounds (MW)
  - `confidence`: `low`, `nominal`, `high`
  - `day_night`: `D` (Day) | `N` (Night)
  - `page`: Integer (default 1)
  - `page_size`: Integer (default 50, max 1000)
- **Example Response (HTTP 200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "c8a41b2e-7f1a-4d2b-9e8c-1a2b3c4d5e6f",
      "source_product": "VIIRS_NOAA20_NRT",
      "sensor": "VIIRS",
      "satellite": "NOAA-20",
      "product_type": "NRT",
      "acq_date": "2026-11-14",
      "acq_time": "12:05",
      "acq_datetime": "2026-11-14T12:05:00Z",
      "latitude": 34.052,
      "longitude": -118.251,
      "brightness": 325.0,
      "bright_secondary": 298.0,
      "frp": 38.0,
      "confidence": "nominal",
      "confidence_raw": "nominal",
      "day_night": "D",
      "scan": 0.4,
      "track": 0.4,
      "version": "2.0NRT",
      "dedup_hash": "a1b2c3d4e5f6..."
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 11469,
    "total_pages": 230,
    "has_next": true,
    "has_prev": false
  }
}
```

#### 3. Cross-Sensor Matches Query: `GET /api/v1/harmonization/matches`
- **Query Parameters**: `status` (`confirmed`, `candidate`), `match_type`, `min_score`, `page`, `page_size`.
- **Example Response (HTTP 200)**:
```json
{
  "status": "success",
  "data": [
    {
      "id": "match-8821",
      "modis_obs_id": "obs-modis-101",
      "viirs_obs_id": "obs-viirs-202",
      "match_type": "cross_sensor",
      "spatial_distance_meters": 245.0,
      "footprint_overlap_ratio": 0.88,
      "time_difference_seconds": 320.0,
      "match_score": 0.912,
      "status": "confirmed",
      "algorithm_version": "v1.0.0",
      "modis_observation": {
        "satellite": "Aqua",
        "latitude": 34.05,
        "longitude": -118.25,
        "frp": 45.0
      },
      "viirs_observation": {
        "satellite": "NOAA-20",
        "latitude": 34.052,
        "longitude": -118.251,
        "frp": 48.0
      }
    }
  ],
  "pagination": { "page": 1, "page_size": 50, "total": 1, "total_pages": 1 }
}
```

#### 4. Paired FRP Comparative Analytics: `GET /api/v1/analytics/frp/comparison`
- **Example Response (HTTP 200)**:
```json
{
  "status": "success",
  "data": {
    "paired_count": 184,
    "correlation": {
      "pearson_r": 0.842,
      "spearman_rho": 0.875
    },
    "error_metrics": {
      "mean_bias_error_mw": 3.42,
      "mean_absolute_error_mw": 8.15,
      "root_mean_square_error_mw": 12.60,
      "mean_absolute_percentage_error": 18.4
    },
    "difference_percentiles_mw": {
      "p10": 0.8,
      "p25": 2.4,
      "p50": 5.9,
      "p75": 11.2,
      "p90": 22.8,
      "p95": 34.5
    },
    "sensor_distributions": {
      "MODIS": { "mean": 42.1, "median": 28.5, "iqr": 31.0, "sample_size": 184 },
      "VIIRS": { "mean": 45.5, "median": 31.2, "iqr": 33.5, "sample_size": 184 }
    },
    "scientific_disclaimer": "Empirical cross-sensor correspondence rather than direct physical equivalence."
  }
}
```

#### 5. Trigger Harmonization Run: `POST /api/v1/harmonization/run`
- **Authentication**: Requires header `X-Admin-Key: <key>` or `Authorization: Bearer <key>`.
- **Request Body (JSON)**:
```json
{
  "start_date": "2026-11-01",
  "end_date": "2026-11-14",
  "max_spatial_distance_meters": 2000.0,
  "same_orbit_max_time_diff_seconds": 3600.0
}
```
- **Example Response (HTTP 200)**:
```json
{
  "status": "success",
  "data": {
    "run_id": "run-f1e2d3c4",
    "status": "completed",
    "total_observations_analyzed": 13784,
    "harmonized_records_created": 13784,
    "matches_created": 1240,
    "events_created": 412,
    "duration_seconds": 4.18
  }
}
```
