# FIRENEXUS – Backend Platform: Foundation, Ingestion, Harmonization, Analytics & Validation (Phases 1–5)

Flask and PostgreSQL/PostGIS backend service for the **FIRENEXUS** Global Satellite Active Fire Monitoring, MODIS–VIIRS Harmonization, Statistical Calibration, and Performance Engineering platform.

---

## 1. Architecture Overview

The backend uses a modular application factory architecture with API versioning (`/api/v1`), centralized error handling, PostGIS spatial queries, automated NASA FIRMS ingestion, a dedicated **MODIS–VIIRS Observation Harmonization Engine**, an advanced **Statistical Calibration & Anomaly Detection Engine**, and a **Validation & Performance Engineering Suite**.

```
backend/
├── app/
│   ├── __init__.py           # Flask application factory (create_app) & CLI registration
│   ├── cli.py                # Click CLI commands (flask firms ..., flask harmonize ..., flask analytics ...)
│   ├── config.py             # Environment configurations (Dev, Test, Prod)
│   ├── extensions.py         # SQLAlchemy, Migrate, CORS extensions
│   ├── models/               # SQLAlchemy models
│   │   ├── base.py           # BaseModel with timestamps
│   │   ├── types.py          # PostGISPoint custom geometry decorator
│   │   ├── observation.py    # FireObservation (NASA FIRMS raw archive)
│   │   ├── ingestion.py      # IngestionRun, IngestionLog
│   │   ├── availability.py   # DatasetAvailability
│   │   ├── harmonization.py  # HarmonizedObservation, ObservationMatch, FireEvent, FireEventObservation, HarmonizationRun
│   │   └── analytics.py      # FRPAnalysis, CalibrationModel, AnomalyDetection, FireActivitySummary, AnalysisRun
│   ├── routes/               # API endpoints
│   │   ├── health.py         # /api/v1/health
│   │   ├── availability.py   # /api/v1/availability
│   │   ├── ingestion.py      # /api/v1/ingestion/...
│   │   ├── observations.py   # /api/v1/observations/...
│   │   ├── harmonization.py  # /api/v1/harmonization/...
│   │   └── analytics.py      # /api/v1/analytics/...
│   ├── schemas/              # Serialization and validation schemas
│   ├── services/             # Core business logic & pipeline services
│   │   ├── firms_service.py               # NASA FIRMS API client with backoff
│   │   ├── csv_parser.py                  # Streaming parser for MODIS and VIIRS CSVs
│   │   ├── observation_repository.py      # Idempotent bulk insertion & spatial queries (single SQL aggregation)
│   │   ├── availability_service.py        # Temporal availability discovery & baseline cache
│   │   ├── ingestion_service.py           # Ingestion batch & 5-day chunking orchestrator
│   │   ├── harmonization_config.py        # Scientific parameters & algorithm thresholds
│   │   ├── sensor_normalization_service.py# Sensor footprint & attribute normalizer
│   │   ├── spatial_matching_service.py    # Haversine & footprint overlap evaluator
│   │   ├── temporal_matching_service.py   # Orbit-aware temporal window evaluator
│   │   ├── fire_event_service.py          # Spatiotemporal fire event clustering (with max diameter constraint)
│   │   ├── harmonization_repository.py    # Matches, events, and harmonized queries (batch deduplication)
│   │   ├── harmonization_service.py       # Harmonization execution orchestrator
│   │   ├── frp_analysis_service.py        # Univariate & paired bivariate FRP statistics
│   │   ├── calibration_service.py         # OLS & zero-intercept regression (chronological split)
│   │   ├── anomaly_detection_service.py   # Z-score, MAD, IQR, saturation & spatial isolation
│   │   ├── fire_trend_service.py          # Daily, weekly, monthly trends & event duration
│   │   ├── diurnal_analysis_service.py    # 24-hour UTC distribution & sun-synchronous profiles
│   │   └── analytics_repository.py        # Analytics data persistence & summary queries
│   └── utils/                # Error handling, constant-time auth, and structured logging
│       ├── auth.py           # Centralized constant-time admin authorization (hmac.compare_digest)
│       ├── errors.py         # RFC 7807 problem details error handlers
│       └── logger.py         # Structured logging, X-Response-Time and X-Request-ID telemetry
├── docs/
│   ├── harmonization_methodology.md       # Comprehensive scientific harmonization methodology doc
│   ├── statistical_analysis_methodology.md# Mathematical formulas, calibration models & anomaly methods
│   └── backend_validation_report.md       # Phase 5 validation, security audit & performance benchmarks
├── scripts/                  # Standalone administrative and benchmarking utilities
│   ├── verify_postgres_postgis.py         # PostgreSQL/PostGIS live verification and 8-step E2E suite
│   └── run_load_test.py                   # Multi-threaded concurrent load benchmark runner
├── migrations/               # Database migration scripts (Flask-Migrate)
├── tests/                    # Pytest test suite (137 comprehensive automated tests)
├── .env.example              # Environment variables template
├── .env                      # Local environment configuration
├── requirements.txt          # Python dependencies
├── run.py                    # Server startup script
└── README.md                 # Complete documentation
```

---

## 2. Supported NASA FIRMS Satellite Datasets

FIRENEXUS supports 8 official NASA FIRMS products across 5 spaceborne instruments:

| Dataset Source | Sensor | Satellite Platform | Product Type | Spatial Resolution | Baseline Min Date |
|---|---|---|---|---|---|
| `MODIS_NRT` | MODIS | Terra / Aqua | Near Real-Time (NRT) | 1 km | 2020-01-01 |
| `MODIS_SP` | MODIS | Terra / Aqua | Standard Quality (SP) | 1 km | 2000-11-01 |
| `VIIRS_SNPP_NRT` | VIIRS | Suomi-NPP | Near Real-Time (NRT) | 375 m | 2020-01-01 |
| `VIIRS_SNPP_SP` | VIIRS | Suomi-NPP | Standard Quality (SP) | 375 m | 2012-01-20 |
| `VIIRS_NOAA20_NRT` | VIIRS | NOAA-20 (JPSS-1) | Near Real-Time (NRT) | 375 m | 2020-01-01 |
| `VIIRS_NOAA20_SP` | VIIRS | NOAA-20 (JPSS-1) | Standard Quality (SP) | 375 m | 2018-01-01 |
| `VIIRS_NOAA21_NRT` | VIIRS | NOAA-21 (JPSS-2) | Near Real-Time (NRT) | 375 m | 2023-01-01 |
| `VIIRS_NOAA21_SP` | VIIRS | NOAA-21 (JPSS-2) | Standard Quality (SP) | 375 m | 2023-01-01 |

> [!IMPORTANT]
> **NASA Area API Constraint**: The NASA FIRMS Area API imposes a strict hard ceiling of **$\le 5$ days** per request (`/area/csv/[KEY]/[SOURCE]/[AREA]/[DAY_RANGE]/[DATE]`). FIRENEXUS automatically chunks all extended date-range ingestion queries into $\le 5$-day slices.

---

## 3. MODIS–VIIRS Harmonization Engine (Phase 3)

The harmonization engine resolves instrument and orbital differences between MODIS and VIIRS thermal anomaly observations without destroying original measurements:

### Core Capabilities:
1. **Sensor Normalization**:
   - Calculates pixel along-scan and along-track footprint geometry ($A_{\text{pixel}} \approx S \times T$ in $\text{km}^2$).
   - Standardizes timestamps to timezone-aware UTC `TIMESTAMPTZ`.
   - Categorizes confidence into standardized classes (`'low'`, `'nominal'`, `'high'`) while preserving raw continuous scores for MODIS.
2. **Cross-Sensor Correspondence Matching**:
   - Compares center distance using the spherical Haversine formula ($d$).
   - Evaluates sub-pixel footprint overlap ratio ($O_{\text{footprint}}$), recognizing that a $1\text{ km}$ MODIS pixel physically encompasses multiple $375\text{ m}$ VIIRS pixels.
   - Evaluates orbital temporal windows:
     - Same-orbit afternoon pass (Aqua $\leftrightarrow$ VIIRS): 1 hour window ($\Delta t \le 3600\text{ s}$).
     - Diurnal cross-orbit pass (Terra $\leftrightarrow$ VIIRS): 4 hours window ($\Delta t \le 14400\text{ s}$).
   - Assigns a transparent algorithmic correspondence score $S \in [0.0, 1.0]$.
   - Handles 1-to-many sub-pixel correspondence without artificial single-record merging.
3. **Fire Event Grouping**:
   - Spatiotemporal connected components clustering (default radius: $3.0\text{ km}$, temporal window: $12\text{ hours}$, max diameter cap: $15\text{ km}$ to prevent transitive chaining).
   - Aggregates multi-sensor counts (`modis_count`, `viirs_count`) and multi-sensor energies (`total_frp_mw`, `modis_frp_mw`, `viirs_frp_mw`).
4. **NRT vs Standard Processing Provenance**:
   - Identifies and links reprocessing lineage pairs between NRT and SP records as `match_type = 'reprocessing_provenance'`, preventing duplicate counting.

---

## 4. Statistical Calibration & Anomaly Detection (Phase 4)

1. **Cross-Sensor FRP Statistical Analysis**:
   - Univariate parametric (Mean, Variance, StdDev, Skewness, Kurtosis) and percentile distributions (P5, P25, P50, P75, P90, P95, P99, IQR).
   - Paired cross-sensor metrics: Pearson correlation ($r$), Spearman rank correlation ($\rho$), Mean Bias Error (MBE), RMSE, MAE, MAPE, and paired difference statistics.
2. **Statistical Calibration Framework**:
   - Ordinary Least Squares (OLS) and Zero-Intercept Ratio regression models for bidirectional sensor calibration (MODIS $\leftrightarrow$ VIIRS).
   - Strict **chronological train/test split** ($\max(t_{\text{train}}) \le \min(t_{\text{test}})$) eliminating temporal data leakage.
   - Comprehensive holdout evaluation metrics ($R^2$, RMSE, MAE, Mean Bias).
3. **Multi-Method Anomaly Detection Engine**:
   - Parametric Z-score ($|Z| > 3.0$).
   - Modified Z-score with Median Absolute Deviation (MAD, $|M| > 3.5$).
   - Interquartile Range (IQR) upper fence test ($Q_3 + 1.5 \times \text{IQR}$).
   - Physical sensor saturation test (MODIS $\ge 500\text{ K}$, VIIRS I4 $\ge 367\text{ K}$).
   - Spatial isolation test (nearest-neighbor distance $> 15\text{ km}$).
   - Zero alteration to raw observation data.
4. **Temporal Trends & Diurnal Analysis**:
   - Daily, weekly, and monthly active fire aggregations with sensor ratio tracking.
   - Fire event duration classification (single-pass, short-duration, multi-day persistent).
   - 24-hour UTC diurnal curves and sun-synchronous satellite orbital sampling profiles.

---

## 5. Validation, Security & Performance Engineering (Phase 5)

1. **Centralized Constant-Time Authentication**:
   - Extracted administrative verification into `app.utils.auth.verify_admin_authorization`.
   - Utilizes `hmac.compare_digest` to prevent timing attacks on API key comparison.
2. **Database Query Optimizations**:
   - Consolidated `ObservationRepository.get_summary_stats` from 9 separate roundtrips into a single ANSI SQL conditional aggregation query using `case(...)`.
   - Batched match existence queries in `HarmonizationRepository.bulk_insert_matches` reducing up to 500 queries per batch to 1 query.
   - Hardened count handling (`total = query.count() or 0`) against `NoneType` under concurrency.
3. **Observability & Request Telemetry**:
   - Injected `X-Response-Time` and `X-Request-ID` headers on all responses.
   - Slow request warning logger (> 1000ms).
4. **Load Benchmarks**:
   - Sustained **1,819.1 RPS** on health endpoints with 1.79ms median latency.
   - Sustained **836.5 RPS** on observations summary with 10.79ms median latency.
   - Tested under 25, 50, and 100 concurrent worker threads with **0.0% Error Rate**.
5. **PostgreSQL/PostGIS Live Verification**:
   - Standalone script `backend/scripts/verify_postgres_postgis.py` with 8-step isolated workflow.
   - Accurately reports `[POSTGRES_VERIFICATION_PENDING]` if PostgreSQL service is offline, strictly complying with project instructions not to substitute SQLite results as PostgreSQL verification.

---

## 6. Installation & Configuration

1. **Activate Virtual Environment**:
   ```bash
   cd backend
   .\.venv\Scripts\Activate.ps1   # Windows PowerShell
   # or source .venv/bin/activate # Linux / macOS
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables (`.env`)**:
   ```ini
   FLASK_ENV=development
   PORT=5000
   HOST=0.0.0.0
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/firenexus
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173
   LOG_LEVEL=INFO

   # NASA FIRMS Integration
   FIRMS_MAP_KEY=your_nasa_firms_map_key_here
   FIRMS_BASE_URL=https://firms.modaps.eosdis.nasa.gov/api

   # Administrative Key for Ingestion, Harmonization & Calibration Triggers
   ADMIN_API_KEY=firenexus-admin-secret-dev-key
   ```

---

## 7. CLI & Verification Utilities

```bash
# Set FLASK_APP
$env:FLASK_APP="backend\run.py"

# FIRMS Ingestion Commands
flask firms check-availability
flask firms ingest --source MODIS_NRT --area world --days 2

# Harmonization Engine Commands
flask harmonize summary
flask harmonize run --start 2026-05-01 --end 2026-05-01

# Analytics Engine Commands
flask analytics summary
flask analytics detect-anomalies --method all --z-thresh 3.0 --mad-thresh 3.5

# Standalone PostgreSQL/PostGIS Live Verification
python backend\scripts\verify_postgres_postgis.py

# Standalone Multi-Threaded Load Benchmark
python backend\scripts\run_load_test.py
```

---

## 8. REST API Endpoints Overview

All endpoints are versioned under `/api/v1`:

### Ingestion & Availability
- `GET /api/v1/health`: System health & FIRMS API configuration state.
- `GET /api/v1/availability`: Sensor coverage dates & operational status.
- `GET /api/v1/ingestion/status`: List recent batch ingestion runs.
- `GET /api/v1/ingestion/logs`: Audit logs from ingestion executions.
- `POST /api/v1/ingestion/run`: *(Admin)* Trigger controlled NASA FIRMS ingestion.

### Active Fire Observations
- `GET /api/v1/observations`: Filtered, sorted, paginated raw observations.
- `GET /api/v1/observations/summary`: Observational statistics across sensors.
- `GET /api/v1/observations/<id>`: Full details of an individual observation.

### Harmonization Engine
- `GET /api/v1/harmonization/status`: Status of recent harmonization runs.
- `GET /api/v1/harmonization/summary`: Summary metrics (harmonized records, matches, events).
- `GET /api/v1/harmonization/matches`: Paginated, filtered cross-sensor matches.
- `GET /api/v1/harmonization/matches/<id>`: Single match details with joined observations.
- `GET /api/v1/harmonization/events`: Paginated, filtered fire event clusters.
- `GET /api/v1/harmonization/events/<id>`: Single fire event with member observation list.
- `GET /api/v1/harmonization/observations`: Paginated normalized observations.
- `POST /api/v1/harmonization/run`: *(Admin)* Trigger controlled harmonization pipeline execution.

### Statistical Analysis & Anomaly Detection (Phase 4)
- `GET /api/v1/analytics/frp`: Univariate FRP statistics per sensor or globally.
- `GET /api/v1/analytics/frp/comparison`: Paired cross-sensor FRP statistical comparison.
- `GET /api/v1/analytics/calibration`: List trained statistical calibration models.
- `POST /api/v1/analytics/calibration/train`: *(Admin)* Train and evaluate calibration model with chronological split.
- `GET /api/v1/analytics/anomalies`: Paginated list of detected anomalies.
- `POST /api/v1/analytics/anomalies/detect`: *(Admin)* Run multi-method anomaly detection pipeline.
- `GET /api/v1/analytics/trends`: Temporal fire activity aggregations (daily, weekly, monthly) and event durations.
- `GET /api/v1/analytics/diurnal`: 24-hour UTC diurnal fire activity distribution and orbit profiles.
- `GET /api/v1/analytics/summary`: Consolidated analytics dashboard summary.
- `GET /api/v1/analytics/runs`: Audit history of analytical runs.

---

## 9. Automated Testing Suite

The backend contains **137 automated unit, contract, security, load, and reliability tests** passing with **86% code coverage**:

```bash
# Run all tests
pytest -v backend\tests

# Run tests with code coverage report
pytest --cov=app backend\tests
```

---

## 10. Phase 6: Frontend & Backend API Integration

The Python Flask backend is fully integrated with the React 19 + Vite frontend via the centralized API layer in `firenexus/src/services/api/`:
- **CORS Configured**: Permits requests from `http://localhost:5173` and `http://localhost:3000`.
- **Public Endpoints**: Read-only endpoints (`/observations`, `/harmonization/matches`, `/analytics/frp`, `/analytics/trends`, `/analytics/anomalies`) serve live satellite telemetry directly to frontend charts, maps, and tables.
- **Resilient Fallback**: If the Flask backend is not running, the frontend gracefully falls back to simulated baseline data without crashing.
- **Startup**:
  ```bash
  # Terminal 1: Backend
  cd backend
  .\.venv\Scripts\activate
  python run.py

  # Terminal 2: Frontend
  cd firenexus
  npm run dev
  ```

