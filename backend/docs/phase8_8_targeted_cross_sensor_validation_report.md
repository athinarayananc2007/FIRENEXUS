# FIRENEXUS – Phase 8.8: Targeted Geographic Acquisition & Cross-Sensor Match Validation Report

**Execution Timestamp:** 2026-11-15T01:30:00+05:30  
**Environment:** Staging / Pre-Production  
**Target Database:** Neon PostgreSQL 18.7 (`neondb`) on AWS Asia Pacific 1 (Singapore, `ap-southeast-1`)  
**Spatial Engine:** PostGIS 3.6 (`USE_GEOS=1 USE_PROJ=1 USE_STATS=1`)  
**Alembic Schema Revision:** `001_initial_schema` (14 application tables verified)  
**Status:** **PHASE 8.8 COMPLETED AND VERIFIED**

---

## Executive Summary

Phase 8.8 resolves the geographic separation encountered in earlier global samples by executing a targeted, bounded acquisition of real, co-incident NASA FIRMS satellite active-fire observations across South America's Pantanal & Cerrado region on observation date `2026-11-01`.

Key achievements:
1. **Targeted Region Discovery:** Audited six candidate wildfire regions across multiple dates. Discovered that the Pantanal & Cerrado bounding box (`[-65.0, -22.0, -52.0, -10.0]`) contains 147 MODIS_NRT and 498 VIIRS_SNPP_NRT records on `2026-11-01`, perfectly fitting within the 500-per-product / 1,000-total safety limit without requiring arbitrary row truncation.
2. **Controlled Dry-Run & Live Ingestion:** Successfully validated 645 real NASA observations with zero malformed records. Bounded live ingestion persisted 147 MODIS and 498 VIIRS observations into Neon PostgreSQL + PostGIS, increasing total raw observations from 200 to 845 with 100% PostGIS SRID 4326 validity.
3. **Idempotent Deduplication:** Re-running the batch confirmed 147 skipped duplicates and 0 duplicate insertions, verifying 100% idempotent deduplication via SHA-256 hashes.
4. **Cross-Sensor Match Validation:** The harmonization engine identified **74 genuine spatiotemporal candidate cross-sensor matches**. Minimum spatial distance was **7.69 meters**, median spatial distance was **659.1 meters**, with overpass time differences of ~3.85 hours matching the night diurnal orbital geometry of Terra vs. Suomi-NPP.
5. **Fire Event Clustering:** Formed 206 new fire events (total in DB: 303 events) with 845 total observation associations. All centroids possess valid SRID 4326 geometries with zero runaway chained clusters (average radius: 379.2 m, maximum: 4,642.3 m $\le 7,500\text{ m}$).
6. **Calibration Diagnostic Evaluation:** Evaluated empirical regression relationships across the 74 paired measurements ($r = 0.3794$). In accordance with strict scientific boundaries, production `calibration_models` was intentionally left at 0 rows because diurnal fire intensity evolution over ~3.8 hours prevents treating these observations as simultaneous radiometric truth without independent ground validation.
7. **Zero Frontend Impact:** All 9 React pages, 3D Earth globe, and visual components remain 100% intact. Backend pytest suite (137/137 tests), oxlint (0 warnings/errors), and Vite production build (2.27s) passed with zero errors.

---

## 1. Database Preflight & Upstream Read-Only Audit

Prior to any write operations, a read-only audit verified database health, schema status, and baseline data integrity:

| Preflight Parameter | Target / Expected Value | Observed Neon Value | Status |
|---|---|---|:---:|
| **Database Host** | Neon AWS Singapore (`ap-southeast-1`) | `ep-aged-thunder-a1frhu6e.ap-southeast-1.aws.neon.tech` | **PASS** |
| **PostgreSQL Version** | PostgreSQL 18.7 | `PostgreSQL 18.7 (a21afb5) on aarch64-unknown-linux-gnu` | **PASS** |
| **PostGIS Extension** | PostGIS 3.6 | `POSTGIS="3.6.4 94d984b" [EXTENSION] PGSQL="180" GEOS="3.12.1" PROJ="9.4.0"` | **PASS** |
| **Alembic Revision** | `001_initial_schema` | `001_initial_schema` | **PASS** |
| **SSL Enforcement** | Required | Active (`sslmode=require`) | **PASS** |
| **Pre-Existing Raw Observations** | 200 records | Exactly 200 records in `fire_observations` | **PASS** |
| **Pre-Existing Harmonized Obs** | 200 records | Exactly 200 records in `harmonized_observations` | **PASS** |
| **Pre-Existing Fire Events** | 97 events | Exactly 97 events in `fire_events` | **PASS** |
| **Pre-Existing Event Associations** | 200 associations | Exactly 200 associations in `fire_event_observations` | **PASS** |
| **Pre-Existing Matches** | 0 matches | Exactly 0 matches in `observation_matches` | **PASS** |

All pre-existing Phase 8.6 and Phase 8.7 records were preserved untouched.

---

## 2. Selected Geographic Region & Bounding Box

To identify genuine cross-sensor correspondence, candidate wildfire regions were surveyed across multiple dates using the NASA FIRMS Area API.

### Comparative Regional Discovery Results (Date: 2026-11-01)

| Candidate Region | Bounding Box (`W,S,E,N`) | MODIS Records | VIIRS Records | Assessment & Notes |
|---|:---:|:---:|:---:|---|
| **Pantanal & Cerrado (Brazil/Bolivia)** | `[-65.0, -22.0, -52.0, -10.0]` | **147** | **498** | **SELECTED.** Both products have dense co-located data; natural sample size fits under the 500/500 cap with 0 truncation needed. |
| **Amazon Basin** | `[-70.0, -10.0, -50.0, 0.0]` | 936 | 3,069 | High density, but exceeds the 500-record threshold, requiring arbitrary row truncation. |
| **Australia (Northern Territory)** | `[125.0, -25.0, 145.0, -12.0]` | 565 | 2,580 | Large sample; diurnal passes lacked overlapping temporal windows ($>6\text{ h}$ gap). |
| **Southeast Asia (Borneo Peatland)** | `[98.0, -5.0, 118.0, 5.0]` | 62 | 913 | Fragmented cloud cover; limited co-incident clear-sky detections. |
| **North America (US Southwest)** | `[-125.0, 32.0, -114.0, 42.0]` | 2 | 30 | Insufficient observation volume for statistical matching. |
| **Southern Africa (Angola/Zambia)** | `[15.0, -18.0, 32.0, -5.0]` | 713 | 2,797 | Exceeds sample limit; temporal pass differences exceeded diurnal window. |

### Selected Acquisition Parameters

- **Region Name:** South America – Pantanal & Cerrado (Brazil / Bolivia)
- **Bounding Box (W, S, E, N):** `min_lon = -65.0`, `min_lat = -22.0`, `max_lon = -52.0`, `max_lat = -10.0`
- **NASA Area Query String:** `-65,-22,-52,-10`
- **Common Observation Date:** `2026-11-01`
- **MODIS Available Count:** 147
- **VIIRS Available Count:** 498
- **Total Regional Sample:** 645 observations
- **Selection Rationale:** The sample sizes (147 MODIS, 498 VIIRS) naturally conform to the prompt's cap (max 500 MODIS, max 500 VIIRS, max 1,000 total) without discarding any valid records, preserving the full ecological active fire domain.

---

## 3. NASA FIRMS Upstream Availability & Temporal Discovery

Auditing multiple dates (`2026-11-01`, `2026-11-10`, `2026-11-13`, `2026-11-14`) revealed that in the NASA FIRMS Near Real-Time archive, `VIIRS_SNPP_NRT` area queries for subsequent dates returned 0 records due to downstream delivery schedules, whereas `2026-11-01` presented complete, verified NRT coverage across both instruments.

Both instruments captured clear-sky thermal active-fire emissions across the Pantanal wetland biome and Cerrado savanna woodland, ensuring robust cross-sensor observation pairs.

---

## 4. Controlled Dry-Run Results

A non-persisting dry run was conducted using `FirmsCsvParser.parse_csv_stream`:

```
[Dry-Run 1] MODIS_NRT (Pantanal/Cerrado, 2026-11-01):
  - Stream Bytes:       12,820 bytes
  - Parsed Records:     147 valid
  - Malformed Rows:     0 errors
  - Unique Dedup Hashes: 147 (0 internal duplicates, 0 existing in DB)
  - Coordinate Check:   Lat [-21.76, -10.81], Lon [-64.76, -54.16] (All inside bbox: PASS)

[Dry-Run 2] VIIRS_SNPP_NRT (Pantanal/Cerrado, 2026-11-01):
  - Stream Bytes:       41,390 bytes
  - Parsed Records:     498 valid
  - Malformed Rows:     0 errors
  - Unique Dedup Hashes: 498 (0 internal duplicates, 0 existing in DB)
  - Coordinate Check:   Lat [-21.76, -10.16], Lon [-64.93, -52.76] (All inside bbox: PASS)

[Dry-Run 3] Sensor & Satellite Identity:
  - MODIS Satellites:   Terra (139), Aqua (8)
  - VIIRS Satellites:   Suomi-NPP (498)
  - Database Status:    0 modifications committed (Read-Only)
```

Validation confirmed zero coordinate anomalies, valid UTC datetime parsing, and 100% hash uniqueness.

---

## 5. Bounded Live Ingestion & Provenance Tracking

Following dry-run validation, live ingestion was executed via `IngestionService.run_single_batch`:

| Ingestion Metric | MODIS Batch | VIIRS Batch | Combined Regional Ingestion |
|---|:---:|:---:|:---:|
| **Source Product** | `MODIS_NRT` | `VIIRS_SNPP_NRT` | Both |
| **Ingestion Run ID** | `57cf66c8-5a9f-4973-84f5-17429e29c64a` | `83ff4b23-e19b-432c-9988-16fec5adf3a4` | 2 Runs |
| **Area Bounding Box** | `-65,-22,-52,-10` | `-65,-22,-52,-10` | Identical |
| **Acquisition Date** | `2026-11-01` | `2026-11-01` | Identical |
| **Records Fetched** | 147 | 498 | 645 |
| **Records Inserted** | **147** | **498** | **645** |
| **Duplicate Skipped** | 0 | 0 | 0 |
| **Database Errors** | 0 | 0 | 0 |
| **Execution Duration** | 4.42 s | 4.01 s | 8.43 s |
| **Run Status** | `completed` | `completed` | `completed` |

### Idempotency Deduplication Verification
Immediately following ingestion, the MODIS batch was re-submitted against the live database:
- **Total Fetched:** 147
- **Inserted (new):** **0**
- **Duplicate Skipped:** **147**
- **Database Count Invariance:** Maintained without row increase.

### Database Row Count Progression
- Initial count (Phase 8.6): 200 records
- Newly inserted MODIS: +147 records
- Newly inserted VIIRS: +498 records
- **Total `fire_observations`:** **845 records**
- **Geometry SRID 4326 Check:** 845 / 845 (100%) valid `POINT(lon, lat)` with SRID 4326.

---

## 6. Cross-Sensor Harmonization & Correspondence Matching Statistics

Harmonization run `c51bd69c-5e36-4d17-8be3-e410d214ace0` executed across all 845 observations on date `2026-11-01` using `HarmonizationConfig` (`algorithm_version = "v1.0.0"`):

- Spatial threshold: $d_{\max} = 2,000.0\text{ m}$
- Same-orbit temporal window: $\Delta t_{\text{same}} = 3,600.0\text{ s}$ (1 hour)
- Diurnal temporal window: $\Delta t_{\text{diurnal}} = 14,400.0\text{ s}$ (4 hours)
- Scoring function: $S = 0.60 \cdot \max(0, 1 - \frac{d}{d_{\max}}) + 0.40 \cdot \max(0, 1 - \frac{\Delta t}{\Delta t_{\max}})$

### Matching Results & Statistical Distribution

| Match Metric | Measured Value | Analysis & Physical Meaning |
|---|:---:|---|
| **Total Matches Formed** | **74** | Persisted in `observation_matches` |
| **Confirmed Matches ($S \ge 0.70$)** | 0 | Temporal separation of ~3.8h bounds max score to ~0.613 |
| **Candidate Matches ($0.25 \le S < 0.70$)** | **74** | Genuine spatiotemporal candidate correspondences |
| **Minimum Spatial Separation** | **7.69 m** | MODIS (-16.9603°, -60.6474°) vs. VIIRS (-16.9604°, -60.6475°) |
| **Median Spatial Separation** | **659.1 m** | Well within the $1\text{ km}$ MODIS nadir pixel diameter |
| **Maximum Spatial Separation** | **1,146.5 m** | Bounded within the 2,000 m threshold |
| **Minimum Time Difference** | 13,680.0 s (3.80 h) | Overpass time difference between night orbits |
| **Median Time Difference** | 13,860.0 s (3.85 h) | Terra overpass (~00:45 UTC) vs. Suomi-NPP (~04:36 UTC) |
| **Maximum Time Difference** | 14,100.0 s (3.92 h) | Within the 14,400 s (4-hour) diurnal limit |
| **Minimum Match Score** | 0.271 | Edge-of-threshold candidate |
| **Median Match Score** | 0.418 | Strong spatial correspondence with diurnal lag |
| **Maximum Match Score** | 0.613 | Optimal spatial coincidence ($d = 7.7\text{ m}$) |
| **Unique MODIS Observations Matched** | 36 / 147 (24.5%) | 21 MODIS pixels matched $>1$ sub-pixel VIIRS fire |
| **Unique VIIRS Observations Matched** | 35 / 498 (7.0%) | 27 VIIRS pixels matched to larger MODIS footprints |
| **One-to-Many Relationships** | Present | Reflects physical resolution asymmetry ($1000\text{ m}$ vs $375\text{ m}$) |

### Top 5 Cross-Sensor Match Pairs

| Match Rank | Match Score | Spatial Distance | Time Difference | Satellite Pair | MODIS FRP | VIIRS FRP | Coordinates (Lat, Lon) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1** | **0.613** | **7.7 m** | 13,860 s (3.85 h) | Terra $\leftrightarrow$ Suomi-NPP | 7.61 MW | 4.87 MW | (-16.9603, -60.6474) |
| **2** | **0.600** | **68.1 m** | 13,680 s (3.80 h) | Terra $\leftrightarrow$ Suomi-NPP | 15.19 MW | 9.03 MW | (-21.7548, -59.4589) |
| **3** | **0.581** | **91.6 m** | 14,100 s (3.92 h) | Terra $\leftrightarrow$ Suomi-NPP | 16.23 MW | 1.02 MW | (-21.7589, -59.4578) |
| **4** | **0.567** | **161.0 m** | 13,860 s (3.85 h) | Terra $\leftrightarrow$ Suomi-NPP | 52.41 MW | 6.00 MW | (-16.9589, -60.6491) |
| **5** | **0.559** | **201.9 m** | 13,680 s (3.80 h) | Terra $\leftrightarrow$ Suomi-NPP | 44.90 MW | 4.34 MW | (-21.7532, -59.4536) |

---

## 7. Fire Event Clustering Results

Clustering grouped observations into aggregate fire complexes using spatiotemporal proximity ($d \le 3,000\text{ m}$, $\Delta t \le 12\text{ h}$, max diameter $\le 15,000\text{ m}$):

| Clustering Metric | Baseline (Phase 8.7) | New Added (Phase 8.8) | Total In Database | Status |
|---|:---:|:---:|:---:|:---:|
| **Fire Events** | 97 | +206 | **303** | Persisted in `fire_events` |
| **Observation Associations** | 200 | +645 | **845** | Persisted in `fire_event_observations` |
| **Unassociated Observations** | 0 | 0 | **0** | 100% assignment |
| **Minimum Event Size** | 1 observation | 1 observation | 1 observation | Point singletons |
| **Median Event Size** | 1 observation | 2 observations | 2 observations | Clustered active fires |
| **Maximum Event Size** | 10 observations | 25 observations | 25 observations | Complex active fire front |
| **Average Spatial Radius** | 396.3 m | 371.5 m | **379.2 m** | Compact physical clusters |
| **Maximum Spatial Radius** | 3,478.8 m | 4,642.3 m | **4,642.3 m** | $\le 7,500.0\text{ m}$ limit |
| **Runaway Chained Clusters** | 0 | 0 | **0** | Chaining strictly prevented |
| **Centroid Geometry SRID** | 100% SRID 4326 | 100% SRID 4326 | **100% SRID 4326** | `ST_Point(lon, lat)` |
| **PostGIS Geometry Validity** | 100% valid | 100% valid | **100% valid** | `ST_IsValid = TRUE` |

### Collision-Safe Event Code Generation
To prevent unique constraint collisions (`uq_fire_events_event_code`) as event catalogs expand, `FireEventService._generate_event_code` was enhanced to use 8 hex digits (`uuid.uuid4().hex[:8]`), providing $4.29 \times 10^9$ entropy, paired with an active database existence check in `HarmonizationRepository.bulk_insert_events`.

---

## 8. Experimental Calibration Readiness Assessment

The 74 paired cross-sensor observations were evaluated for empirical regression modeling (`VIIRS FRP $\rightarrow$ MODIS FRP`):

```
Paired Observations Sample Size: 74
Unique MODIS Events Represented: 13
Unique VIIRS Events Represented: 13
MODIS FRP: min = 3.68 MW, mean = 20.49 MW, median = 13.45 MW, max = 65.72 MW
VIIRS FRP: min = 1.02 MW, mean =  4.35 MW, median =  4.32 MW, max =  9.03 MW
Zero FRP Values: MODIS = 0, VIIRS = 0
Missing FRP Values: 0
Pearson Correlation (r): 0.3794
```

### Experimental Regression Fitting (In-Memory Diagnostic)

Two empirical models were computed for analytical exploration:
1. **Ordinary Least Squares (OLS):**
   $$\text{MODIS\_FRP} = 2.4251 \cdot \text{VIIRS\_FRP} + 9.9274$$
   - $R^2 = 0.1439$
   - $\text{RMSE} = 14.388\text{ MW}$
   - $\text{MAE} = 11.872\text{ MW}$
   - $\text{Mean Bias} \approx 0.00\text{ MW}$

2. **Zero-Intercept Scaling Ratio:**
   $$\text{MODIS\_FRP} = 4.1627 \cdot \text{VIIRS\_FRP}$$

### Scientific Limitation & Decision Against Production Model Storing

> [!IMPORTANT]
> **Scientific Integrity Decision:** The table `calibration_models` remains at **0 rows**.
> 
> **Scientific Rationale:**
> 1. **Temporal Delay:** The observed cross-sensor pairs reflect a ~3.85-hour night diurnal delay between Terra (descending pass ~00:45 UTC) and Suomi-NPP (ascending pass ~04:36 UTC). 
> 2. **Physical Fire Dynamics:** Active fire intensity undergoes substantial physical fluctuation, smoldering, and combustion shifts over a nearly 4-hour duration.
> 3. **Non-Simultaneity:** Regressing VIIRS FRP at 04:36 against MODIS FRP at 00:45 measures diurnal fire decay rather than purely sensor calibration differences.
> 4. **Scientific Transparency:** Publishing this model as a verified calibration baseline would be scientifically invalid. True cross-calibration requires near-simultaneous observations (e.g. Aqua $\leftrightarrow$ Suomi-NPP within $<15$ minutes) or airborne reference data.

---

## 9. Live Database & API Endpoint Verification

Direct SQL queries verified the live state of Neon PostgreSQL:

```sql
SELECT 
    (SELECT COUNT(*) FROM fire_observations) AS raw_obs,
    (SELECT COUNT(*) FROM harmonized_observations) AS harm_obs,
    (SELECT COUNT(*) FROM observation_matches) AS matches,
    (SELECT COUNT(*) FROM fire_events) AS events,
    (SELECT COUNT(*) FROM fire_event_observations) AS event_associations,
    (SELECT COUNT(*) FROM harmonization_runs) AS harm_runs,
    (SELECT COUNT(*) FROM ingestion_runs) AS ing_runs,
    (SELECT COUNT(*) FROM calibration_models) AS calib_models;
```

### Verified Post-Execution Database State

| Table Name | Phase 8.7 Baseline | Phase 8.8 Count | Delta | Integrity Audit |
|---|:---:|:---:|:---:|:---:|
| `fire_observations` | 200 | **845** | +645 | Raw observations intact with SRID 4326 |
| `harmonized_observations` | 200 | **845** | +645 | 100% normalized with SRID 4326 |
| `observation_matches` | 0 | **74** | +74 | 74 candidate cross-sensor matches |
| `fire_events` | 97 | **303** | +206 | Clustered events with SRID 4326 centroids |
| `fire_event_observations` | 200 | **845** | +645 | 100% observation membership verified |
| `harmonization_runs` | 2 | **4** | +2 | Audit runs logged with configuration |
| `ingestion_runs` | 3 | **6** | +3 | Provenance tracked for all batches |
| `calibration_models` | 0 | **0** | 0 | Maintained at 0 unvalidated models |

### Foreign Key & Geometry Integrity
- **Match Foreign Keys:** 74 / 74 (100%) valid references to `fire_observations`.
- **Event Observation Foreign Keys:** 845 / 845 (100%) valid references to `fire_events` and `fire_observations`.
- **Geometry Validity:** 845 / 845 observations and 303 / 303 fire events have valid geometries with `ST_IsValid(geom) = TRUE` and `ST_SRID(geom) = 4326`.

### Live Flask API Endpoint Test Results

| API Endpoint | HTTP Status | Response Data | Secret Leak Check |
|---|:---:|---|:---:|
| `GET /api/v1/observations?page_size=5` | **200 OK** | Paginated raw observations (total: 845) | **No leaks** |
| `GET /api/v1/observations/summary` | **200 OK** | Aggregated observation statistics | **No leaks** |
| `GET /api/v1/harmonization/status` | **200 OK** | Harmonization run audit history | **No leaks** |
| `GET /api/v1/harmonization/summary` | **200 OK** | `harmonized: 845`, `matches: 74`, `events: 303` | **No leaks** |
| `GET /api/v1/harmonization/matches?page_size=5` | **200 OK** | Paginated match pairs with distances & scores | **No leaks** |
| `GET /api/v1/harmonization/events?page_size=5` | **200 OK** | Paginated fire event complexes | **No leaks** |
| `GET /api/v1/ingestion/status` | **200 OK** | Ingestion run audit history (6 runs) | **No leaks** |
| `GET /api/v1/analytics/summary` | **200 OK** | `calibration_models: 0`, `anomalies: 0` | **No leaks** |
| `GET /api/v1/analytics/calibration` | **200 OK** | Active calibration models list (empty) | **No leaks** |

---

## 10. Regression Testing & Frontend Preservation

| Verification Suite | Standard / Baseline | Observed Result | Status |
|---|:---:|:---:|:---:|
| **Backend Test Suite (`pytest`)** | 137 unit & integration tests | **137 / 137 passed in 53.00s** | **PASS** |
| **Frontend Code Quality (`oxlint`)** | 0 warnings, 0 errors | **0 warnings, 0 errors (113 files)** | **PASS** |
| **Frontend Production Build (`vite`)** | Clean bundle generation | **Built in 2.27s (`dist/` verified)** | **PASS** |
| **Frontend Visual Preservation** | 9 pages, 3D Earth globe, particles | **100% untouched** | **PASS** |

---

## 11. Remaining Scientific & Engineering Limitations

1. **Diurnal Time Lag:** Matching Terra with Suomi-NPP captures night passes separated by ~3.85 hours. While spatial alignment is exceptionally tight ($d_{\min} = 7.7\text{ m}$), temporal evolution over 3.8 hours influences radiometric FRP comparisons.
2. **Sub-Pixel Resolution Asymmetry:** A MODIS pixel covers $1,000\text{ m} \times 1,000\text{ m}$ at nadir ($1.0\text{ km}^2$), whereas VIIRS I-band covers $375\text{ m} \times 375\text{ m}$ ($0.14\text{ km}^2$). A single MODIS detection naturally corresponds to multiple VIIRS detections across the same fire complex.
3. **Point Centroids vs. Polygon Envelopes:** Event geometries are currently stored as PostGIS `POINT(geometry, 4326)` centroids with radial bounds. Multi-observation clusters can be enhanced in future phases with convex hull polygons (`ST_ConvexHull`).

---

## 12. Conclusion & Staging Readiness

Phase 8.8 has achieved complete verification:
- Real, geographically co-located NASA FIRMS observations were acquired, dry-run tested, and ingested into Neon PostgreSQL.
- Genuine cross-sensor correspondence matches (74 pairs, min distance 7.69 m) were detected and persisted.
- 303 fire events were formed with 845 member observations and valid PostGIS geometries.
- Calibration suitability was rigorously evaluated with full scientific transparency.
- Full regression integrity and 100% frontend visual preservation were confirmed.
