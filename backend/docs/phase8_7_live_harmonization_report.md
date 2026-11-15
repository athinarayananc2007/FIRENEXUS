# FIRENEXUS – Phase 8.7: Live Cross-Sensor Harmonization & Calibration Persistence Report

**Execution Timestamp:** 2026-11-15T00:55:00+05:30  
**Environment:** Staging / Pre-Production  
**Target Database:** Neon PostgreSQL 18.7 (`neondb`) on AWS Asia Pacific 1 (Singapore, `ap-southeast-1`)  
**Spatial Engine:** PostGIS 3.6 (`USE_GEOS=1 USE_PROJ=1 USE_STATS=1`)  
**Alembic Schema Revision:** `001_initial_schema` (14 application tables verified)  
**Status:** **PHASE 8.7 COMPLETED AND VERIFIED**

---

## Executive Summary

Phase 8.7 advances FIRENEXUS from raw data persistence to verified live satellite observation harmonization, spatiotemporal cross-sensor correspondence evaluation, fire-event clustering, and database persistence.

Using the 200 Near Real-Time (NRT) satellite observations persisted in Phase 8.6 (100 `MODIS_NRT` + 100 `VIIRS_SNPP_NRT` from observation date `2026-11-01`), the full backend harmonization engine was executed against live Neon PostgreSQL + PostGIS infrastructure without mock fallbacks.

Key achievements:
1. **Schema & Catalog Audit:** Verified PostgreSQL 18.7, PostGIS 3.6, Alembic revision `001_initial_schema`, and reconciled the 118 physical index relations across `pg_indexes`.
2. **Sensor Normalization:** 200 / 200 raw observations normalized into `harmonized_observations` with estimated pixel footprints, standardized UTC timestamps, confidence tiers, and native PostGIS `POINT(geometry, 4326)`.
3. **Cross-Sensor Matching:** Rigorously executed spatial and temporal candidate evaluation across the 100 MODIS vs 100 VIIRS observations. Identified 1,900 temporal candidate pairs and 0 spatial candidate pairs (geographic distance of closest pair was 2,485 km due to independent global sample chunking). 0 false matches were created.
4. **Fire Event Clustering:** Successfully formed 97 cohesive fire events across the 200 observations (200 associations, 0 unassociated), with valid PostGIS centroid geometries (SRID 4326) and strictly bounded spatial extents (average radius 396.3 m, max 3,478.8 m, 0 runaway chained clusters).
5. **Experimental Calibration Diagnostics:** Handled insufficient sample size strictly in accordance with scientific protocols: because 0 matched pairs existed across this disjoint global sample, calibration model fitting was bypassed rather than generating misleading or scientifically invalid regression coefficients.
6. **Idempotency Verification:** Re-running the complete harmonization pipeline yielded 0 duplicate harmonized records, 0 duplicate events, and 0 duplicate associations (297 duplicates skipped), leaving database row counts completely invariant.
7. **API Verification:** All 9 harmonization, event, match, and analytics endpoints were verified live with zero credential leakage.
8. **Regression Suite:** 137 / 137 backend pytest tests passed; frontend code quality reported 0 lint warnings and built cleanly in 2.22s with 100% visual and functional preservation.

---

## 1. Database Preflight & Read-Only Schema Audit

Before running harmonization, a read-only audit verified database connectivity, extension health, schema version, and initial record counts:

| Audit Parameter | Target / Expected Value | Observed Neon Value | Status |
|---|---|---|:---:|
| **Database Host** | Neon AWS Singapore (`ap-southeast-1`) | `ep-aged-thunder-a1frhu6e.ap-southeast-1.aws.neon.tech` | **PASS** |
| **PostgreSQL Version** | PostgreSQL 18.7 | `PostgreSQL 18.7 (a21afb5) on aarch64-unknown-linux-gnu` | **PASS** |
| **PostGIS Extension** | PostGIS 3.6 | `POSTGIS="3.6.4 94d984b" [EXTENSION] PGSQL="180" GEOS="3.12.1" PROJ="9.4.0"` | **PASS** |
| **Alembic Revision** | `001_initial_schema` | `001_initial_schema` (stamped in `alembic_version`) | **PASS** |
| **SSL Enforcement** | Required | Active (`sslmode=require`) | **PASS** |
| **Pre-Ingested Observations** | 200 records | Exactly 200 records in `fire_observations` | **PASS** |
| **MODIS Breakdown** | 100 records (`2026-11-01`) | 19 Aqua (`MODIS_NRT`) + 81 Terra (`MODIS_NRT`) | **PASS** |
| **VIIRS Breakdown** | 100 records (`2026-11-01`) | 100 Suomi-NPP (`VIIRS_SNPP_NRT`) | **PASS** |
| **Observation Geometries** | PostGIS SRID 4326 | 200 / 200 valid `ST_Point` geometries with SRID 4326 | **PASS** |

---

## 2. Corrected Index Catalog Audit

The PostgreSQL catalog `pg_indexes` was queried to produce an exact, authoritative index reconciliation for all 14 application tables and 3 utility/system relations:

```
Total Physical Indexes in pg_indexes: 118
  ├── Application Tables (14 tables): 115 Indexes
  │     ├── Explicit Migration Indexes (op.create_index): 94 (91 B-Tree + 3 GiST Spatial)
  │     ├── Automatic Primary Key Indexes: 14 (<table_name>_pkey)
  │     └── Automatic Unique Constraint Indexes: 7 (<table_name>_<col>_key)
  └── System & Utility Tables (3 tables): 3 Indexes
        ├── alembic_version (1: alembic_version_pkc)
        ├── playing_with_neon (1: playing_with_neon_pkey)
        └── spatial_ref_sys (1: spatial_ref_sys_pkey)
Catalog Sum: 94 + 14 + 7 + 3 = 118 Physical Index Relations
```

### Authoritative Application Table Index Breakdown

| Table Name | Primary Key Index | Unique Constraint Index | Explicit Migration Indexes | Total Indexes in DB |
|---|:---:|:---:|:---:|:---:|
| `analysis_runs` | 1 (`analysis_runs_pkey`) | 0 | 2 (`ix_analysis_runs_*`) | 3 |
| `anomaly_detections` | 1 (`anomaly_detections_pkey`) | 1 (`uq_obs_anomaly_ver`) | 7 (`ix_anomaly_detections_*`) | 9 |
| `calibration_models` | 1 (`calibration_models_pkey`) | 0 | 4 (`ix_calibration_models_*`) | 5 |
| `dataset_availability` | 1 (`dataset_availability_pkey`) | 1 (`uq_dataset_availability_source_product`) | 3 (`ix_dataset_availability_*`) | 5 |
| `fire_activity_summaries` | 1 (`fire_activity_summaries_pkey`) | 1 (`uq_period_summary_ver`) | 6 (`ix_fire_activity_summaries_*`) | 8 |
| `fire_event_observations` | 1 (`fire_event_observations_pkey`) | 1 (`uq_event_obs`) | 2 (`ix_fire_event_observations_*`) | 4 |
| `fire_events` | 1 (`fire_events_pkey`) | 1 (`uq_fire_events_event_code`) | 12 (incl. 1 GiST `idx_fire_events_geom`) | 14 |
| `fire_observations` | 1 (`fire_observations_pkey`) | 1 (`uq_fire_observations_dedup_hash`) | 20 (incl. 1 GiST `idx_fire_observations_geom`) | 22 |
| `frp_analyses` | 1 (`frp_analyses_pkey`) | 0 | 4 (`ix_frp_analyses_*`) | 5 |
| `harmonization_runs` | 1 (`harmonization_runs_pkey`) | 0 | 2 (`ix_harmonization_runs_*`) | 3 |
| `harmonized_observations` | 1 (`harmonized_observations_pkey`) | 1 (`uq_harm_obs_ver`) | 16 (incl. 1 GiST `idx_harmonized_observations_geom`) | 18 |
| `ingestion_logs` | 1 (`ingestion_logs_pkey`) | 0 | 2 (`ix_ingestion_logs_*`) | 3 |
| `ingestion_runs` | 1 (`ingestion_runs_pkey`) | 0 | 4 (`ix_ingestion_runs_*`) | 5 |
| `observation_matches` | 1 (`observation_matches_pkey`) | 1 (`uq_obs_match_pair_ver`) | 9 (`ix_observation_matches_*`) | 11 |
| **Application Tables Subtotal** | **14** | **7** | **94** | **115** |
| `alembic_version` | 1 | 0 | 0 | 1 |
| `playing_with_neon` | 1 | 0 | 0 | 1 |
| `spatial_ref_sys` | 1 | 0 | 0 | 1 |
| **PostgreSQL Catalog Total** | **17** | **7** | **94** | **118** |

All 3 spatial GiST indexes (`idx_fire_observations_geom`, `idx_harmonized_observations_geom`, `idx_fire_events_geom`) are verified and active on geometry columns with SRID 4326.

---

## 3. Matching Algorithm Version & Scientific Parameters

Cross-sensor correspondence matching operates under `HarmonizationConfig` (`algorithm_version = "v1.0.0"`):

```json
{
  "algorithm_version": "v1.0.0",
  "max_spatial_distance_meters": 2000.0,
  "use_footprint_geometry": true,
  "min_footprint_overlap_ratio": 0.05,
  "default_max_time_diff_seconds": 7200.0,
  "same_orbit_max_time_diff_seconds": 3600.0,
  "diurnal_max_time_diff_seconds": 14400.0,
  "spatial_weight": 0.60,
  "temporal_weight": 0.40,
  "min_match_score": 0.25,
  "event_spatial_radius_meters": 3000.0,
  "event_temporal_window_seconds": 43200.0,
  "max_event_diameter_meters": 15000.0,
  "batch_size": 500
}
```

### Scientific Parameter Rationale
- **Spatial Threshold (2,000 m):** Accommodates MODIS nadir pixel resolution ($1,000\text{ m}$) and edge-of-swath scan distortion (up to $\sim 4.8\text{ km}$ along-scan) against VIIRS's $375\text{ m}$ pixel resolution.
- **Orbital Temporal Windows:**
  - *Aqua $\leftrightarrow$ Suomi-NPP:* Both operate in afternoon sun-synchronous orbits ($\sim 13:30$ local solar time); window is strictly constrained to 3,600 s (1 hour).
  - *Terra $\leftrightarrow$ Suomi-NPP:* Morning ($\sim 10:30$) vs. afternoon ($\sim 13:30$) diurnal overpass; window allows up to 14,400 s (4 hours) for diurnal fire progression analysis.
- **Scoring Function:** $S = 0.60 \cdot \max(0, 1 - \frac{d}{d_{\max}}) + 0.40 \cdot \max(0, 1 - \frac{\Delta t}{\Delta t_{\max}})$. Matches with $S \ge 0.70$ are classified as `confirmed`; matches with $0.25 \le S < 0.70$ are classified as `candidate`.

---

## 4. Controlled Cross-Sensor Matching Statistics

The cross-sensor matching algorithm evaluated all $100 \times 100 = 10,000$ pairwise combinations between MODIS and VIIRS records from `2026-11-01`:

| Metric | Measured Value | Analysis & Context |
|---|:---:|---|
| **Total MODIS Records Examined** | 100 | 19 Aqua, 81 Terra |
| **Total VIIRS Records Examined** | 100 | 100 Suomi-NPP |
| **Temporal Candidate Pairs** | 1,900 | Passed orbital time-difference threshold ($\Delta t \le \text{window}$) |
| **Spatial Candidate Pairs** | 0 | $d \le 2,000\text{ m}$ threshold applied |
| **Confirmed Matches ($S \ge 0.70$)** | 0 | 0 pairs satisfied both spatial and temporal windows |
| **Candidate Matches ($S < 0.70$)** | 0 | No borderline candidates |
| **Unmatched MODIS Observations** | 100 | 100% preserved in raw and harmonized catalogs |
| **Unmatched VIIRS Observations** | 100 | 100% preserved in raw and harmonized catalogs |
| **One-to-Many Matches** | 0 | None generated |
| **Closest Pair Distance** | 2,485.89 km | MODIS (lat: 28.38°, lon: 49.63°) vs. VIIRS (lat: 46.76°, lon: 33.35°) |
| **Matching Execution Time** | 0.114 s | Optimized with 2D spatial grid indexing |

### Scientific Finding
Because Phase 8.6 ingested the first 100 rows from each respective global NRT CSV stream:
- The initial 100 MODIS rows captured hotspots across Southeast Asia, Indonesia, Australia, and the Persian Gulf (`lat: [-18.2°, 28.4°]`, `lon: [49.6°, 136.2°]`).
- The initial 100 VIIRS rows captured hotspots across Siberia, Russia, and Eastern Europe (`lat: [28.4°, 71.3°]`, `lon: [0.5°, 84.4°]`).

The minimum spatial distance separating any MODIS detection from any VIIRS detection was **2,485.89 km**. Adhering strictly to the spatial threshold ($2,000\text{ m}$) prevented spurious false matches. The matching engine behaved with 100% scientific fidelity.

---

## 5. Fire Event Clustering & Persistence Results

The `FireEventService` clustered the 200 observations into cohesive fire events using spatiotemporal proximity ($d \le 3,000\text{ m}$, $\Delta t \le 12\text{ h}$, cluster diameter $\le 15,000\text{ m}$):

| Clustering Metric | Result | Target / Boundary |
|---|:---:|:---:|
| **Fire Events Formed** | **97** | Persisted in `fire_events` |
| **Observations Associated** | **200** | Persisted in `fire_event_observations` |
| **Unassociated Observations** | **0** | Every observation assigned to an event |
| **Singletons (1 observation)** | 54 events (55.7%) | Isolated thermal detections |
| **Small Events (2–4 observations)** | 32 events (33.0%) | Localized fire clusters |
| **Medium Events (5–9 observations)** | 10 events (10.3%) | Active fire complexes |
| **Large Events ($\ge 10$ observations)** | 1 event (1.0%) | Multi-detection fire complex |
| **Maximum Cluster Size** | 10 observations | Well within 15 km diameter limit |
| **Minimum Spatial Radius** | 0.0 m | Point singletons |
| **Maximum Spatial Radius** | 3,478.8 m | Complex cluster |
| **Average Spatial Radius** | 396.3 m | Compact physical fires |
| **PostGIS Geometry Validity** | 97 / 97 (100%) | `ST_IsValid(geom) = TRUE` |
| **Spatial SRID** | 97 / 97 (100%) | `ST_SRID(geom) = 4326` (WGS 84 Point) |
| **Runaway Chained Clusters ($>7.5\text{ km}$ radius)** | **0** | Chaining prevention verified |

### Event Sample Highlights
- `EVT-20261101-9977`: Centroid `(28.90386, 19.77783)`, 2 member observations, Total FRP: 274.99 MW, Status: `active`.
- `EVT-20261101-6AC4`: Centroid `(-2.57348, 121.37853)`, 1 member observation, Total FRP: 126.54 MW, Status: `active`.
- `EVT-20261101-487F`: Centroid `(-1.56657, 127.43201)`, 1 member observation, Total FRP: 5.73 MW, Status: `active`.

---

## 6. Experimental Calibration Diagnostics & Scientific Limitations

The calibration pipeline was audited for empirical regression modeling (`VIIRS FRP $\rightarrow$ MODIS FRP`):

```
Matched Cross-Sensor Pairs Available: 0
Required Minimum for Regression: 3
Diagnostic Status: INSUFFICIENT SAMPLE SIZE (Bypassed)
```

### Strict Scientific Constraints Applied
1. **No Artificial Coefficients:** Because the 200 bounded observations were geographically disjoint, 0 physical fire hotspot pairs existed. Generating OLS regression coefficients from 0 pairs would be mathematically fraudulent.
2. **Provenance Protection:** The database table `calibration_models` remains at 0 rows. No unverified scaling parameters were stored into staging.
3. **FRP Non-Equivalence Reminder:** The combined observational FRP mean ($28.14\text{ MW}$) must **not** be interpreted as a calibrated cross-sensor measurement. MODIS (satellites Terra/Aqua at $1\text{ km}$ nadir) and VIIRS (satellite Suomi-NPP at $375\text{ m}$ nadir) possess distinct spectral response functions, dynamic saturation limits ($500\text{ K}$ vs. $367\text{ K}$), and sub-pixel fire sensitivity thresholds. Cross-sensor calibration requires high-density co-incident observations over identical fire complexes.

---

## 7. Live Database Persistence Verification

Direct SQL queries were executed against Neon PostgreSQL to audit the state of all tables following Phase 8.7 execution:

```sql
SELECT 
    (SELECT COUNT(*) FROM fire_observations) AS observations,
    (SELECT COUNT(*) FROM harmonized_observations) AS harmonized,
    (SELECT COUNT(*) FROM observation_matches) AS matches,
    (SELECT COUNT(*) FROM fire_events) AS events,
    (SELECT COUNT(*) FROM fire_event_observations) AS event_associations,
    (SELECT COUNT(*) FROM harmonization_runs) AS runs;
```

### Measured Post-Execution Database State

| Table Name | Initial State | Post-Execution Count | Delta | Integrity Check |
|---|:---:|:---:|:---:|:---:|
| `fire_observations` | 200 | **200** | 0 | Raw observations preserved untouched |
| `harmonized_observations` | 0 | **200** | +200 | 100% normalized with SRID 4326 |
| `observation_matches` | 0 | **0** | 0 | Zero false matches created |
| `fire_events` | 0 | **97** | +97 | 100% clustered with valid centroids |
| `fire_event_observations` | 0 | **200** | +200 | 100% foreign key references valid |
| `harmonization_runs` | 0 | **1** | +1 | Audit run tracked with parameters & duration |
| `calibration_models` | 0 | **0** | 0 | Zero unvalidated models published |

### PostGIS Geometry Integrity Checks
- **`harmonized_observations.geom`:** 200 / 200 records (100%) populated as `ST_Point(lon, lat)` with SRID 4326 and valid geometries (`ST_IsValid = TRUE`).
- **`fire_events.geom`:** 97 / 97 records (100%) populated as `ST_Point(centroid_lon, centroid_lat)` with SRID 4326 and valid geometries (`ST_IsValid = TRUE`).
- **Foreign Key Integrity:** All 200 `fire_event_observations` point to valid `fire_events.id` and `fire_observations.id`. Zero orphaned records exist.

---

## 8. Idempotency Verification

A second execution of `HarmonizationService.run_harmonization()` was triggered against the exact same date and observations:

```
[Phase 5 - Idempotency Verification (Run 2)]:
  Run 2 ID:               67f94725-4ea7-4923-81eb-b5270be1225e
  Status:                 COMPLETED
  Observations Analyzed:  200
  Harmonized Built (new): 0
  Matches Created (new):  0
  Events Created (new):   0
  Duplicates Skipped:     297 (200 harmonized + 97 events)
  Duration:               3.98s
```

### Post-Run 2 Table Invariance Assertions

| Table | Post-Run 1 Count | Post-Run 2 Count | Net Difference | Idempotency Verification |
|---|:---:|:---:|:---:|:---:|
| `fire_observations` | 200 | 200 | **0** | Invariant |
| `harmonized_observations` | 200 | 200 | **0** | Invariant |
| `observation_matches` | 0 | 0 | **0** | Invariant |
| `fire_events` | 97 | 97 | **0** | Invariant |
| `fire_event_observations` | 200 | 200 | **0** | Invariant |

**Conclusion:** Zero duplicate records were created. Idempotency is verified at 100%.

---

## 9. Live API Endpoint Verification

All 9 relevant read endpoints were tested using the Flask application test client against the live Neon database:

| Endpoint | Method | HTTP Status | Response Payload Summary | Credentials Leaked? |
|---|:---:|:---:|---|:---:|
| `/api/v1/harmonization/status` | GET | **200 OK** | Returns 2 harmonization runs (`COMPLETED`, runtime, parameters) | **No** (0 leaks) |
| `/api/v1/harmonization/summary` | GET | **200 OK** | `harmonized: 200`, `matches: 0`, `events: 97`, `total_frp_mw: 5627.87` | **No** (0 leaks) |
| `/api/v1/harmonization/matches` | GET | **200 OK** | `total: 0`, paginated empty match list | **No** (0 leaks) |
| `/api/v1/harmonization/events?page_size=5` | GET | **200 OK** | `total: 97`, 5 events returned in page | **No** (0 leaks) |
| `/api/v1/harmonization/events/<id>` | GET | **200 OK** | Event detail with member observations list | **No** (0 leaks) |
| `/api/v1/harmonization/observations?page_size=5` | GET | **200 OK** | `total: 200`, 5 harmonized observations returned | **No** (0 leaks) |
| `/api/v1/analytics/calibration` | GET | **200 OK** | `count: 0`, models list | **No** (0 leaks) |
| `/api/v1/analytics/summary` | GET | **200 OK** | `calibration_models: 0`, `anomalies: 0` | **No** (0 leaks) |
| `/api/v1/analytics/runs` | GET | **200 OK** | `count: 0`, analysis runs history | **No** (0 leaks) |

**Security Audit:** Every response payload was verified for credential hygiene; zero database URLs, passwords, or MAP_KEY values were present.

---

## 10. Regression Testing & Frontend Preservation

| Verification Suite | Standard / Baseline | Observed Result | Status |
|---|:---:|:---:|:---:|
| **Backend Test Suite (`pytest`)** | 137 unit & integration tests | **137 / 137 passed in 6.92s** | **PASS** |
| **Pyright Static Type Checker** | 0 errors across 54 files | **0 errors, 0 warnings** | **PASS** |
| **Frontend Code Quality (`oxlint`)** | 0 warnings, 0 errors | **0 warnings, 0 errors (113 files)** | **PASS** |
| **Frontend Production Build (`vite`)** | Clean bundle generation | **Built in 2.22s (`dist/` verified)** | **PASS** |
| **Frontend Visual Preservation** | 9 pages, 3D Earth globe, particles | **100% untouched** | **PASS** |

---

## 11. Remaining Scientific & Engineering Limitations

1. **Sample Geographic Disjointness:** Bounded ingestion capped at the top 100 lines of each global CSV sampled disjoint geographic quadrants on `2026-11-01` (Southeast Asia for MODIS vs. Siberia/Eastern Europe for VIIRS). Generating physical co-incident cross-sensor matches requires spatial co-location (e.g. bounding box queries over active wildfire regions such as North American boreal forests or Pantanal wetlands).
2. **Calibration Sample Size:** In accordance with the prompt's scientific instructions, empirical regression modeling was bypassed because $N < 3$ pairs existed in this bounded sample. Production cross-calibration requires a statistically significant co-incident sample ($N \ge 100$ co-located detections).
3. **Point Centroid vs. Multi-Polygon Extents:** `fire_events.geom` currently represents the cluster centroid as PostGIS `POINT(geometry, 4326)` with an associated spatial radius. Future analytical phases can compute dynamic convex hulls (`ST_ConvexHull`) or minimum bounding geometry polygons for complex fires with $>3$ observations.

---

## 12. Conclusion & Staging Readiness

Phase 8.7 has concluded with complete verification:
- Real observations harmonized and persisted in Neon PostgreSQL + PostGIS.
- Spatiotemporal matching and clustering engines executed natively with full database provenance.
- Zero duplicate records created across multiple executions.
- Zero credentials exposed.
- All 9 frontend pages remain visually and structurally intact.
