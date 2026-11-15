# FIRENEXUS – Phase 6: Frontend & Backend API Integration Plan

## 1. Executive Overview

This plan defines the architecture, field-level data mappings, and implementation strategy for integrating the FIRENEXUS React 19 + Vite + TypeScript frontend with the Python Flask backend.

### Guiding Principles:
1. **Frontend Preservation Mandate**: Zero redesign, zero restyling, zero component renames or deletions. The visual theme, 3D Earth globe, animations, floating particles, cards, and charts must remain completely intact.
2. **Isolated API Service Layer**: Centralize all HTTP networking, response parsing, error handling, query parameter building, and request cancellation inside `src/services/api/`. Individual UI components never make direct fetch calls.
3. **Controlled Mock Fallback**: When the backend is offline, unreachable, or returns an error, the frontend gracefully falls back to existing mock data (`MOCK_OBSERVATIONS`). The frontend will never crash, flicker, or show broken empty states.
4. **Security & Boundary Enforcement**: Secrets (`ADMIN_API_KEY`, `FIRMS_MAP_KEY`, database credentials) are strictly prohibited from frontend code and Vite environment variables. Browser requests only access safe, read-only endpoints.

---

## 2. Existing Frontend Architecture Audit

### 2.1 Technology Stack
- **Framework**: React 19.3.1 with TypeScript 7.0.2
- **Build Tool**: Vite 8.3.6 with `@tailwindcss/vite`
- **Visualization**: Three.js 0.187.0 + `@react-three/fiber` + `@react-three/drei` (3D Earth Globe), Recharts 3.10.1, Leaflet 1.9.4 + `react-leaflet`
- **Animation & Icons**: Framer Motion 14.13.0, Lucide React
- **Data Parsing**: PapaParse 5.7.1
- **Styling**: Tailwind CSS v4 (`src/index.css` with custom theme variables)

### 2.2 Route & Page Inventory (9 Pages)
| Route | Page Component | Primary Visualization / Feature | Current Data Source |
|---|---|---|---|
| `/` | `LandingPage.tsx` | Hero section, 3D HeroGlobe, Platform Overview | Static content & HeroGlobe internal animation |
| `/dashboard` | `Dashboard.tsx` | Executive KPI cards, HotspotMap, Temporal analytics, Sensor comparison | `MOCK_OBSERVATIONS` (2,000 synthetic records) |
| `/explorer` | `EarthExplorer.tsx` | 3D WebGL Earth globe, 2D MapView, Time slider, Layer controls | `MOCK_OBSERVATIONS` |
| `/comparison` | `Comparison.tsx` | Spatial matching engine, side-by-side sensor comparison, FRP ratio | `MOCK_OBSERVATIONS` + `runSpatialMatchingEngine` |
| `/calendar` | `FireCalendar.tsx` | 366-day calendar heatmap, daily activity details, seasonal trends | `MOCK_OBSERVATIONS` + `computeEnrichedCalendarMap` |
| `/analytics` | `Analytics.tsx` | FRP distributions, sensor performance, diurnal/temporal trends, spatial map | `MOCK_OBSERVATIONS` |
| `/anomaly` | `AnomalyExplorer.tsx` | Anomaly list, baseline comparison chart, timeline, anomaly map | `computeAnomalies(MOCK_OBSERVATIONS)` |
| `/data` | `DataExplorer.tsx` | Comprehensive data table, multi-parameter search/filters, record map | `MOCK_OBSERVATIONS` |
| `/about` | `About.tsx` | Informational mission overview, 7-stage pipeline, limitations | Static educational content |

### 2.3 Current State Management & Data Patterns
- State is managed via standard React hooks: `useState`, `useMemo`, `useCallback`, `useRef`.
- There is no external state library (Redux, Zustand, etc.); state is cleanly localized to page containers and passed down to presentation components.
- Mock data in `src/data/mock/fireData.ts` exports `MOCK_OBSERVATIONS`, filter helpers (`filterObservations`), metric calculators (`computeKpiMetrics`), and spatial matching algorithms (`runSpatialMatchingEngine`).

---

## 3. Backend API Inventory & Contract Analysis

The backend exposes standardized, RFC 7807 compliant REST endpoints prefixed with `/api/v1`:

### 3.1 Available Public & Read-Only Endpoints
| HTTP Method | Route | Description | Query Parameters | Response Envelope |
|---|---|---|---|---|
| `GET` | `/` | Root informational index | None | `{"service": ..., "version": ..., "status": ...}` |
| `GET` | `/api/v1/health` | Service health status | None | `{"status": "healthy", "database": ..., "firms_api": ...}` |
| `GET` | `/api/v1/availability` | FIRMS satellite product availability | None | `{"status": "success", "data": {"products": [...]}, "total": 8}` |
| `GET` | `/api/v1/observations` | Paginated fire observations with filtering | `page`, `limit`, `sensor`, `confidence`, `daynight`, `date_start`, `date_end`, `min_frp`, `max_frp`, `min_lat`, `max_lat`, `min_lon`, `max_lon`, `sort_by`, `order` | `{"status": "success", "data": [...], "pagination": {...}}` |
| `GET` | `/api/v1/observations/<id>`| Single observation details | None | `{"status": "success", "data": {...}}` |
| `GET` | `/api/v1/observations/summary`| Aggregated metrics across observations | `sensor`, `date_start`, `date_end`, `country` | `{"status": "success", "data": {"total_observations": ..., "modis_count": ..., "viirs_count": ..., ...}}` |
| `GET` | `/api/v1/harmonization/summary`| Harmonization pipeline summary | None | `{"status": "success", "data": {"total_harmonized": ..., "total_matches": ..., "match_rate": ..., ...}}` |
| `GET` | `/api/v1/harmonization/matches`| Paginated cross-sensor match pairs | `page`, `limit`, `min_confidence_score`, `start_date`, `end_date` | `{"status": "success", "data": [...], "pagination": {...}}` |
| `GET` | `/api/v1/harmonization/matches/<id>`| Single cross-sensor match record | None | `{"status": "success", "data": {...}}` |
| `GET` | `/api/v1/harmonization/events` | Paginated spatiotemporal fire events | `page`, `limit`, `start_date`, `end_date`, `min_observations` | `{"status": "success", "data": [...], "pagination": {...}}` |
| `GET` | `/api/v1/harmonization/observations`| Harmonized normalized observations | `page`, `limit`, `sensor` | `{"status": "success", "data": [...], "pagination": {...}}` |
| `GET` | `/api/v1/analytics/frp` | FRP parametric and non-parametric stats | `sensor`, `date_start`, `date_end` | `{"status": "success", "data": {"mean": ..., "median": ..., "bins": [...]}}` |
| `GET` | `/api/v1/analytics/frp/comparison`| Paired MODIS-VIIRS FRP comparison | None | `{"status": "success", "data": {"bias": ..., "rmse": ..., "mae": ...}}` |
| `GET` | `/api/v1/analytics/calibration`| Trained cross-sensor calibration models | `model_type` | `{"status": "success", "data": [...]}` |
| `GET` | `/api/v1/analytics/anomalies` | Detected statistical & sensor anomalies | `page`, `limit`, `anomaly_type`, `severity`, `start_date`, `end_date` | `{"status": "success", "data": [...], "pagination": {...}}` |
| `GET` | `/api/v1/analytics/trends` | Temporal trends by day, week, or month | `period`, `sensor`, `start_date`, `end_date` | `{"status": "success", "data": [...]}` |
| `GET` | `/api/v1/analytics/diurnal` | Hourly diurnal fire distribution | `sensor`, `start_date`, `end_date` | `{"status": "success", "data": {"hourly": [...], "sampling_profile": {...}}}` |
| `GET` | `/api/v1/analytics/summary` | Consolidated analytics summary | None | `{"status": "success", "data": {...}}` |

### 3.2 Protected Endpoints (Admin Key Required)
- `POST /api/v1/ingestion/run`
- `POST /api/v1/harmonization/run`
- `POST /api/v1/analytics/anomalies/detect`
*Security Rule*: These mutating endpoints are never invoked from client-side browser code. Browser requests use read-only retrieval endpoints only.

---

## 4. Frontend Page-to-API Mapping

| Page Component | Backend Endpoints Leveraged | Live Integration Mode | Fallback Trigger |
|---|---|---|---|
| **Dashboard** (`Dashboard.tsx`) | `GET /api/v1/observations/summary`<br>`GET /api/v1/observations?limit=250` | Replaces summary counts with live totals; populates recent observations with live API records. | If API is unreachable, falls back to `MOCK_OBSERVATIONS`. |
| **Data Explorer** (`DataExplorer.tsx`) | `GET /api/v1/observations` (paginated & filtered)<br>`GET /api/v1/observations/summary` | Server-assisted search, sorting, and pagination across sensor, date range, confidence, and bounding box. | If API is unreachable, filters `MOCK_OBSERVATIONS` locally. |
| **Earth Explorer** (`EarthExplorer.tsx`) | `GET /api/v1/observations?limit=500` | Streams worldwide observations to 3D Globe markers and 2D MapView. | If API is unreachable, plots `MOCK_OBSERVATIONS`. |
| **Satellite Comparison** (`Comparison.tsx`) | `GET /api/v1/harmonization/matches`<br>`GET /api/v1/harmonization/summary` | Displays live paired matches, spatial distance, and time difference from the harmonization engine. | If API has no matches or is unreachable, runs local `runSpatialMatchingEngine`. |
| **Fire Activity Calendar** (`FireCalendar.tsx`) | `GET /api/v1/analytics/trends?period=day`<br>`GET /api/v1/observations` | Populates calendar date counts and selected date observation detail drawer with live backend records. | If API is unreachable, computes enriched calendar map from mock dataset. |
| **Analytics** (`Analytics.tsx`) | `GET /api/v1/analytics/frp`<br>`GET /api/v1/analytics/trends`<br>`GET /api/v1/analytics/diurnal`<br>`GET /api/v1/analytics/summary` | Populates FRP histograms, temporal curves, and hourly diurnal profiles directly from scientific endpoints. | If API is unreachable, computes statistics from mock dataset using `analyticsMath.ts`. |
| **Anomaly Detection** (`AnomalyExplorer.tsx`) | `GET /api/v1/analytics/anomalies` | Displays persisted anomaly records (Z-score, MAD, Saturation, Spatial isolation). | If API is unreachable, runs `computeAnomalies(MOCK_OBSERVATIONS)`. |
| **Landing Page** (`LandingPage.tsx`) | None (or lightweight `GET /api/v1/health` indicator) | Preserved completely. | N/A |
| **About Page** (`About.tsx`) | None | Preserved completely. | N/A |

---

## 5. Data Field Mapping Matrix

The backend database models use scientific geospatial schemas, whereas the frontend uses convenient display camelCase. An adapter layer in `src/services/api/` will seamlessly translate between them:

### 5.1 Observation Schema Mapping
| Backend Field (`Observation`) | Frontend Field (`FireObservation`) | Conversion / Handling |
|---|---|---|
| `id` (`int`) | `id` (`string`) | `String(obs.id)` |
| `latitude` (`float`) | `latitude` (`number`) | `Number(obs.latitude)` |
| `longitude` (`float`) | `longitude` (`number`) | `Number(obs.longitude)` |
| `acq_date` (`string` YYYY-MM-DD) | `date` (`string`) | `obs.acq_date` |
| `acq_time` (`string` HH:MM) | `time` (`string`) | `obs.acq_time` |
| `instrument` (`string` 'MODIS'/'VIIRS') | `satellite` (`SatelliteInstrument`) | Normalize to `'MODIS'` or `'VIIRS'` |
| `confidence` (`string` 'low'/'nominal'/'high') | `confidence` (`ConfidenceLevel`) | Lowercase string: `'low'`, `'nominal'`, or `'high'` |
| `frp` (`float`) | `frp` (`number`) | `Number(obs.frp ?? 0)` |
| `brightness` (`float`) | `brightness` (`number`) | `Number(obs.brightness ?? 300)` |
| `country` (`string`) | `country` (`string`) | `obs.country || 'Global'` |
| `region` (`string`) | `region` (`string`) | `obs.region || 'Unknown'` |
| `continent` (derived) | `continent` (`string`) | Derived from coordinates / lookup |
| `'validated'` | `status` (`DataStatus`) | `'validated'` (for backend records) |

### 5.2 Cross-Sensor Match Schema Mapping
| Backend Field (`CrossSensorMatch`) | Frontend Field (`MatchedFirePair`) | Conversion / Handling |
|---|---|---|
| `id` (`int`) | `id` (`string`) | `String(match.id)` |
| `modis_observation` | `modis` (`FireObservation`) | Mapped via observation adapter |
| `viirs_observation` | `viirs` (`FireObservation`) | Mapped via observation adapter |
| `spatial_distance_meters` (`float`) | `distanceKm` (`number`) | `match.spatial_distance_meters / 1000.0` |
| `time_difference_seconds` (`int`) | `timeDiffMinutes` (`number`) | `Math.abs(match.time_difference_seconds) / 60.0` |
| `modis_frp` & `viirs_frp` | `frpDiff` (`number`) | `Math.abs(match.viirs_frp - match.modis_frp)` |
| `frp_ratio` (`float`) | `frpRatio` (`number`) | `match.frp_ratio` |
| `match_score` (`float`) | `status` | Score $\ge 0.8 \to$ `'high_confidence_match'`, $\ge 0.5 \to$ `'candidate_match'`, else `'marginal_match'` |

---

## 6. Frontend API Service Layer Architecture

The new service layer will reside in `firenexus/src/services/api/`:

```
firenexus/src/services/api/
├── apiClient.ts             # Base HTTP client with timeout, AbortController, error handling
├── endpoints.ts             # Canonical backend URL constants
├── observationService.ts    # Fetch observations, summary, filters, single record
├── harmonizationService.ts  # Fetch cross-sensor matches, harmonization summary, fire events
├── analyticsService.ts      # Fetch FRP stats, trends, diurnal distribution
├── anomalyService.ts        # Fetch detected anomalies
├── adapters.ts              # Data transformation & normalization functions
└── types.ts                 # TypeScript interfaces for API requests, responses, pagination
```

### 6.1 `apiClient.ts` Design
- Native `fetch` with configurable timeout (default 8,000ms).
- Reads `import.meta.env.VITE_API_BASE_URL` with default fallback to `http://localhost:5000/api/v1`.
- Standardized request cancellation using `AbortSignal`.
- Parses RFC 7807 problem details on HTTP $4xx/5xx$ and throws typed `ApiError`.
- Safe `isApiOnline()` health probe utility with 2-second timeout to determine live availability.

---

## 7. Integration Risks & Mitigation Strategies

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Backend Unreachable** (e.g. backend not started by user) | High | Automated graceful fallback to `MOCK_OBSERVATIONS`. The application detects network errors and uses mock data seamlessly. |
| **Overloading 3D Earth Globe** (too many points causing WebGL lag) | Medium | Bounded limits (`limit=500`), spatial clustering or downsampling for global views. |
| **Component Remounting / Request Duplication** | Low | Implement request deduplication and abort previous pending requests on parameter change. |
| **Timing / Stale Closures on Fast Filter Changes** | Low | Use `AbortController` in `useEffect` cleanup to cancel obsolete in-flight requests. |
| **Visual Regressions or Broken Layouts** | High | Integrate one page at a time. Run `npm run lint` and `npm run build` after each page. Do not alter any CSS classes or component structures. |

---

## 8. Step-by-Step Execution Order

1. **Step 1: API Service Layer Implementation**
   - Create `src/services/api/types.ts`
   - Create `src/services/api/endpoints.ts`
   - Create `src/services/api/apiClient.ts`
   - Create `src/services/api/adapters.ts`
   - Create `src/services/api/observationService.ts`
   - Create `src/services/api/harmonizationService.ts`
   - Create `src/services/api/analyticsService.ts`
   - Create `src/services/api/anomalyService.ts`
   - Create `src/services/api/index.ts`
   - Create `.env.example` with `VITE_API_BASE_URL=http://localhost:5000/api/v1`.
   - Validate build and lint.

2. **Step 2: Dashboard Integration**
   - Connect `Dashboard.tsx` to live summary and recent observations with seamless mock fallback.
   - Validate build and lint.

3. **Step 3: Data Explorer Integration**
   - Connect `DataExplorer.tsx` to paginated observations API with live filter mapping and mock fallback.
   - Validate build and lint.

4. **Step 4: Earth Explorer Integration**
   - Connect `EarthExplorer.tsx` to live observation stream for 3D globe and 2D map with mock fallback.
   - Validate build and lint.

5. **Step 5: Satellite Comparison Integration**
   - Connect `Comparison.tsx` to live harmonization matches and summary with mock fallback.
   - Validate build and lint.

6. **Step 6: Fire Activity Calendar Integration**
   - Connect `FireCalendar.tsx` to live daily trends and observations with mock fallback.
   - Validate build and lint.

7. **Step 7: Analytics Integration**
   - Connect `Analytics.tsx` to live FRP distribution, diurnal profile, and temporal trends with mock fallback.
   - Validate build and lint.

8. **Step 8: Anomaly Detection Integration**
   - Connect `AnomalyExplorer.tsx` to live read-only anomaly results with mock fallback.
   - Validate build and lint.

9. **Step 9: Final Verification & Documentation**
   - Run backend tests (137 tests).
   - Run frontend lint and build.
   - Verify zero console errors, zero secret leaks, zero layout shifts.
   - Generate `backend/docs/phase6_frontend_integration_report.md` and artifact.
