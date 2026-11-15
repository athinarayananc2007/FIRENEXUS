# FIRENEXUS: System Architecture & Technical Diagrams

**System**: FIRENEXUS Satellite Active Fire Monitoring & Harmonization Platform  
**Purpose**: Official Technical Diagrams for NASA Space Apps Presentation & Architecture Review  
**Diagram Format**: GitHub-Flavored Markdown Mermaid (`mermaid`)  

---

## 1. Overall System Architecture (Four-Tier Overview)

The FIRENEXUS architecture decouples presentation, application services, geospatial storage, and background processing into four distinct tiers.

```mermaid
flowchart TD
    subgraph Tier1["Tier 1: Presentation Layer (React 19 + TypeScript + Vite)"]
        UI["FIRENEXUS Web Application<br/>Port 5173"]
        Globe["3D Earth Globe<br/>Three.js / WebGL / Drei"]
        Maps["2D Map Views<br/>Leaflet / React-Leaflet"]
        Charts["Analytics Charts<br/>Recharts SVG"]
        APIClient["API Client & Fallback Layer<br/>src/services/api/apiClient.ts"]
        UI --> Globe
        UI --> Maps
        UI --> Charts
        UI --> APIClient
    end

    subgraph Tier2["Tier 2: Backend Application & API Layer (Python Flask 3.1)"]
        WSGI["Gunicorn WSGI / Dev Runner<br/>Port 5000 / gthread"]
        AppFactory["Flask Application Factory<br/>app/__init__.py"]
        Blueprints["Modular API Blueprints<br/>/api/v1/* (26 Endpoints)"]
        Services["Core Service Layer<br/>Matching • Clustering • Calibration • Anomalies"]
        Repo["Repository Layer<br/>Observation & Harmonization Repos"]
        
        WSGI --> AppFactory
        AppFactory --> Blueprints
        Blueprints --> Services
        Services --> Repo
    end

    subgraph Tier3["Tier 3: Geospatial Database Layer (PostgreSQL 16 + PostGIS 3.4)"]
        PG["PostgreSQL Server<br/>Port 5432 (SSL Required)"]
        PostGIS["PostGIS Spatial Extension<br/>SRID 4326 (WGS 84 Point Geometry)"]
        Tables["14 Relational Schemas<br/>Observations • Matches • Events • Analytics"]
        GiST["GiST Spatial R-Tree Indexes<br/>Sub-millisecond Geodesic Queries"]
        
        PG --> PostGIS
        PostGIS --> Tables
        Tables --> GiST
    end

    subgraph Tier4["Tier 4: Background Orchestration & Ingestion (Python CLI / Cron)"]
        Orchestrator["Background Pipeline Runner<br/>scripts/run_background_pipeline.py"]
        Lockfile["Process Concurrency Guard<br/>.pipeline.lock"]
        FIRMSClient["NASA FIRMS API Client<br/>app/services/firms_service.py"]
        HarmEngine["Harmonization Orchestrator<br/>app/services/harmonization_service.py"]
        AnomEngine["Anomaly Detection Runner<br/>app/services/anomaly_detection_service.py"]
        
        Orchestrator --> Lockfile
        Lockfile --> FIRMSClient
        FIRMSClient --> HarmEngine
        HarmEngine --> AnomEngine
    end

    APIClient <-->|HTTPS JSON API /api/v1/*| WSGI
    Repo <-->|SQLAlchemy + GeoAlchemy2 Pool| PG
    Orchestrator -->|Direct DB Ingestion & Processing| Repo
    FIRMSClient <-->|Authenticated HTTPS Stream| NASA["NASA EOSDIS FIRMS Server<br/>firms.modaps.eosdis.nasa.gov"]
```

---

## 2. NASA FIRMS Data Ingestion Pipeline

This diagram shows how NASA FIRMS CSV telemetry is requested, chunked, rate-limited, parsed in a memory-efficient stream, validated, deduplicated, and stored.

```mermaid
sequenceDiagram
    autonumber
    participant CLI as Background Pipeline / CLI
    participant IngestSvc as IngestionService
    participant FIRMS as FirmsApiClient
    participant NASA as NASA EOSDIS FIRMS Server
    participant Parser as FirmsCsvParser
    participant Repo as ObservationRepository
    participant DB as PostgreSQL (fire_observations)

    CLI->>IngestSvc: trigger_ingestion(source, area, days)
    IngestSvc->>IngestSvc: Split temporal range into <= 5-day chunks
    
    loop For each 5-day chunk
        IngestSvc->>FIRMS: get_area_csv(source, area, day_range)
        FIRMS->>NASA: GET /api/area/csv/{MAP_KEY}/{source}/{area}/{day_range}
        
        alt Success (HTTP 200)
            NASA-->>FIRMS: Raw CSV Stream (text/csv)
        else Rate Limited (HTTP 429)
            NASA-->>FIRMS: 429 Too Many Requests
            FIRMS->>FIRMS: Apply Exponential Backoff (1.5x)
            FIRMS->>NASA: Retry request
            NASA-->>FIRMS: Raw CSV Stream
        end
        
        FIRMS-->>IngestSvc: Return raw CSV text
        IngestSvc->>Parser: parse_csv_stream(csv_text, source)
        
        loop For each CSV row
            Parser->>Parser: Validate Lat [-90, 90] & Lon [-180, 180]
            Parser->>Parser: Parse acquisition datetime to UTC
            Parser->>Parser: Map confidence (continuous -> categorical)
            Parser->>Parser: Compute SHA-256 (sensor + sat + dt + lat + lon + frp)
        end
        
        Parser-->>IngestSvc: (parsed_records, error_records)
        IngestSvc->>Repo: bulk_insert_observations(parsed_records)
        
        Repo->>DB: Query existing dedup_hashes in chunk
        DB-->>Repo: existing_hashes_set
        Repo->>Repo: Filter out intra-batch & existing duplicates
        Repo->>DB: Bulk INSERT remaining new observations
        DB-->>Repo: Insert confirmation
        
        Repo-->>IngestSvc: (inserted_count, duplicates_skipped, errors)
    end
    
    IngestSvc->>DB: Update ingestion_runs audit record (status: COMPLETED)
    IngestSvc-->>CLI: Ingestion cycle summary
```

---

## 3. MODIS–VIIRS Harmonization & Matching Pipeline

This diagram details the core scientific harmonization engine, showing coarse grid binning, spatial Haversine distance, footprint overlap evaluation, temporal windowing, composite match scoring, and status assignment.

```mermaid
flowchart TD
    Start["Raw Observations Query<br/>(MODIS & VIIRS from fire_observations)"] --> Norm["Stage 1: Sensor Footprint Normalization<br/>app/services/sensor_normalization_service.py"]
    
    Norm --> SaveHarm["Bulk Insert Normalized Observations<br/>(harmonized_observations)"]
    Norm --> Part["Partition Observations by Sensor Family"]
    
    Part --> MODIS["MODIS Observations Pool (M)"]
    Part --> VIIRS["VIIRS Observations Pool (V)"]
    
    VIIRS --> GridBin["Spatial Grid Binning (~0.05° ~= 5.5 km)<br/>bin_key = floor(lat*20), floor(lon*20)"]
    
    MODIS --> QueryGrid{"For each MODIS obs:<br/>Query 3x3 adjacent grid bins"}
    GridBin --> QueryGrid
    
    QueryGrid --> SpatialEval["Spatial Matching Evaluation<br/>app/services/spatial_matching_service.py"]
    
    subgraph SpatialCheck["Spatial Analysis"]
        SpatialEval --> Dist["Calculate Geodesic Haversine Distance (d)<br/>R = 6,371,000 meters"]
        SpatialEval --> Radii["Estimate Footprint Radii (r1, r2)<br/>r = sqrt(scan * track) / 2"]
        Dist --> Overlap["Compute Footprint Overlap Ratio (η)<br/>[0.0 to 1.0]"]
        Radii --> Overlap
        Overlap --> SpatCond{"d <= 2000m OR<br/>(overlap > 0.15)?"}
    end
    
    SpatCond -- No --> RejectCandidate["Discard Pair"]
    SpatCond -- Yes --> TempEval["Temporal Matching Evaluation<br/>app/services/temporal_matching_service.py"]
    
    subgraph TemporalCheck["Temporal Analysis"]
        TempEval --> DeltaT["Calculate |t_MODIS - t_VIIRS| in seconds"]
        TempEval --> OrbitWin{"Satellite Orbit Pair?"}
        OrbitWin -- Afternoon (Aqua <-> VIIRS) --> W1["Window = 3,600s (1 Hour)"]
        OrbitWin -- Morning-Afternoon (Terra <-> VIIRS) --> W2["Window = 14,400s (4 Hours)"]
        OrbitWin -- Other --> W3["Window = 7,200s (2 Hours)"]
        DeltaT --> TempCond{"Delta T <= Window AND<br/>Diurnal Phase Compatible?"}
        W1 --> TempCond
        W2 --> TempCond
        W3 --> TempCond
    end
    
    TempCond -- No --> RejectCandidate
    TempCond -- Yes --> ScoreCalc["Composite Match Scoring<br/>s_spatial = 1.0 - (d / 2000m)<br/>s_temporal = 1.0 - (Delta T / Window)<br/>Score = 0.60 * s_spatial + 0.40 * s_temporal"]
    
    ScoreCalc --> ScoreCheck{"Score >= 0.25?"}
    ScoreCheck -- No --> RejectCandidate
    ScoreCheck -- Yes --> Classify{"Score >= 0.70?"}
    
    Classify -- Yes --> StatusConf["Status: 'confirmed'"]
    Classify -- No --> StatusCand["Status: 'candidate'"]
    
    StatusConf --> SaveMatch["Insert into observation_matches"]
    StatusCand --> SaveMatch
    
    SaveMatch --> Cluster["Stage 3: Connected-Component Fire Event Clustering<br/>app/services/fire_event_service.py"]
    Cluster --> SaveEvent["Insert into fire_events & fire_event_observations"]
```

---

## 4. Backend Layered Architecture

This diagram illustrates the software structure of the Flask backend, detailing the separation of concerns across application factory, routes, services, repositories, and models.

```mermaid
classDiagram
    class FlaskApp {
        +create_app(config_name)
        +register_blueprints()
        +register_error_handlers()
        +register_cli_commands()
    }

    class Configs {
        +DevelopmentConfig (DEBUG=True)
        +TestingConfig (SQLite in-memory)
        +StagingConfig (DEBUG=False, Pool=10)
        +ProductionConfig (DEBUG=False, Pool=15)
    }

    class APIBlueprints {
        +health_bp (/api/v1/health)
        +availability_bp (/api/v1/availability)
        +ingestion_bp (/api/v1/ingestion/*)
        +observations_bp (/api/v1/observations/*)
        +harmonization_bp (/api/v1/harmonization/*)
        +analytics_bp (/api/v1/analytics/*)
    }

    class ServiceLayer {
        +FirmsApiClient
        +FirmsCsvParser
        +SensorNormalizationService
        +SpatialMatchingService
        +TemporalMatchingService
        +HarmonizationService
        +FireEventService
        +FRPAnalysisService
        +CalibrationService
        +AnomalyDetectionService
    }

    class RepositoryLayer {
        +ObservationRepository
        +HarmonizationRepository
        +AnalyticsRepository
        +AvailabilityService
    }

    class ModelsLayer {
        +FireObservation
        +DatasetAvailability
        +IngestionRun / IngestionLog
        +HarmonizedObservation
        +ObservationMatch
        +FireEvent / FireEventObservation
        +HarmonizationRun
        +FRPAnalysis
        +CalibrationModel
        +AnomalyDetection
    }

    FlaskApp --> Configs : loads
    FlaskApp --> APIBlueprints : registers
    APIBlueprints --> ServiceLayer : calls
    ServiceLayer --> RepositoryLayer : queries & persists
    RepositoryLayer --> ModelsLayer : maps SQLAlchemy entities
```

---

## 5. Database Entity-Relationship Diagram (14 Relational Schemas)

This ERD diagrams all 14 database models, showing primary keys, foreign keys, spatial geometry columns, and relational associations.

```mermaid
erDiagram
    FIRE_OBSERVATIONS ||--o{ HARMONIZED_OBSERVATIONS : "normalizes to"
    FIRE_OBSERVATIONS ||--o{ OBSERVATION_MATCHES : "matched as MODIS"
    FIRE_OBSERVATIONS ||--o{ OBSERVATION_MATCHES : "matched as VIIRS"
    FIRE_OBSERVATIONS ||--o{ FIRE_EVENT_OBSERVATIONS : "grouped into"
    FIRE_EVENTS ||--o{ FIRE_EVENT_OBSERVATIONS : "contains"
    INGESTION_RUNS ||--o{ INGESTION_LOGS : "records"
    HARMONIZATION_RUNS ||--o{ OBSERVATION_MATCHES : "provenance"

    FIRE_OBSERVATIONS {
        string id PK "UUID"
        string dedup_hash UK "SHA-256 fingerprint"
        string source_product "e.g. MODIS_NRT, VIIRS_SNPP_NRT"
        string sensor "MODIS | VIIRS"
        string satellite "Terra, Aqua, Suomi-NPP, NOAA-20/21"
        string product_type "NRT | SP"
        date acq_date "Acquisition date"
        string acq_time "UTC HHMM"
        datetime acq_datetime "Timezone-aware UTC"
        float latitude "WGS 84 (-90 to +90)"
        float longitude "WGS 84 (-180 to +180)"
        geometry location "PostGIS Point SRID 4326"
        float brightness "Brightness temp 4um (K)"
        float bright_secondary "Brightness temp 11um (K)"
        float frp "Fire Radiative Power (MW)"
        string confidence "low | nominal | high"
        string day_night "D | N"
        float scan "Along-scan pixel dimension (km)"
        float track "Along-track pixel dimension (km)"
        datetime created_at
    }

    DATASET_AVAILABILITY {
        string id PK "UUID"
        string data_id UK "Product code"
        date min_date "Earliest available date"
        date max_date "Latest available date"
        string sensor "MODIS | VIIRS"
        string status "active | legacy | deprecated"
        datetime last_checked_at
    }

    INGESTION_RUNS {
        string id PK "UUID"
        string source_product "Product code"
        string status "running | completed | failed"
        datetime start_date
        datetime end_date
        int records_fetched
        int records_inserted
        int duplicates_skipped
        float duration_seconds
    }

    INGESTION_LOGS {
        string id PK "UUID"
        string run_id FK "References ingestion_runs.id"
        string level "INFO | WARNING | ERROR"
        string message "Audit text"
        datetime created_at
    }

    HARMONIZED_OBSERVATIONS {
        string id PK "UUID"
        string observation_id FK "References fire_observations.id"
        string sensor "MODIS | VIIRS"
        float footprint_along_scan_km
        float footprint_along_track_km
        float footprint_area_km2
        float frp_mw
        string confidence_category "low | nominal | high"
        string algorithm_version "v1.0.0"
        datetime normalized_at
    }

    OBSERVATION_MATCHES {
        string id PK "UUID"
        string modis_obs_id FK "References fire_observations.id"
        string viirs_obs_id FK "References fire_observations.id"
        string match_type "cross_sensor | reprocessing_provenance"
        float spatial_distance_meters
        float footprint_overlap_ratio
        float time_difference_seconds
        float match_score "0.000 to 1.000"
        string status "confirmed | candidate"
        datetime created_at
    }

    FIRE_EVENTS {
        string id PK "UUID"
        string event_code UK "e.g. EVT-20261114-A1F2"
        string status "active | inactive"
        datetime first_observed_at
        datetime last_observed_at
        float duration_hours
        float centroid_latitude
        float centroid_longitude
        geometry centroid_geom "PostGIS Point SRID 4326"
        float spatial_radius_meters
        int observation_count
        int modis_count
        int viirs_count
        float total_frp_mw
        float max_frp_mw
        float avg_frp_mw
    }

    FIRE_EVENT_OBSERVATIONS {
        string id PK "UUID"
        string event_id FK "References fire_events.id"
        string observation_id FK "References fire_observations.id"
        float distance_to_centroid_meters
        float time_offset_seconds
        datetime created_at
    }

    HARMONIZATION_RUNS {
        string id PK "UUID"
        string algorithm_version
        string status "running | completed | failed"
        int total_observations_analyzed
        int harmonized_records_created
        int matches_created
        int events_created
        float duration_seconds
    }

    FRP_ANALYSES {
        string id PK "UUID"
        string analysis_type "univariate | paired_comparison"
        string sensor "MODIS | VIIRS | ALL"
        int sample_size
        float mean_frp_mw
        float median_frp_mw
        float std_frp_mw
        float iqr_frp_mw
        float pearson_r
        float spearman_rho
        float mean_bias_error_mw
        float rmse_mw
    }

    CALIBRATION_MODELS {
        string id PK "UUID"
        string model_name UK
        string model_type "linear_ols | zero_intercept"
        float slope
        float intercept
        float r_squared
        float rmse
        float mae
        int train_count
        int test_count
        string status "active | deprecated"
    }

    ANOMALY_DETECTIONS {
        string id PK "UUID"
        string observation_id FK "References fire_observations.id"
        string anomaly_type "high_frp | high_brightness | spatial_isolation"
        string method "z_score | modified_z_score | iqr | saturation_threshold"
        float anomaly_score
        float threshold_applied
        string metric_name
        float metric_value
        string explanation
    }

    FIRE_ACTIVITY_SUMMARIES {
        string id PK "UUID"
        string aggregation_period "daily | weekly | monthly"
        date period_start
        date period_end
        int total_observations
        int modis_count
        int viirs_count
        float total_frp_mw
    }

    ANALYSIS_RUNS {
        string id PK "UUID"
        string run_type "frp_stats | calibration | anomaly_detection"
        string status "running | completed | failed"
        float duration_seconds
        datetime created_at
    }
```

---

## 6. Frontend–Backend Communication & Resilience Lifecycle

This diagram demonstrates how the React frontend interacts with the Flask backend, showing how network failures or database offline states are trapped by `apiClient.ts` to provide uninterrupted user navigation using simulated baseline fallbacks.

```mermaid
sequenceDiagram
    autonumber
    participant Page as React Page (e.g. Dashboard)
    participant Svc as Domain API Service (observationService)
    participant Client as apiClient (Axios / Fetch Wrapper)
    participant API as Flask REST API (/api/v1/*)
    participant Mock as Simulated Baseline Cache

    Page->>Svc: getObservations(filters)
    Svc->>Client: apiGet('/observations', params)
    Client->>API: GET http://localhost:5000/api/v1/observations
    
    alt Backend Running & Database Connected (HTTP 200)
        API-->>Client: 200 OK { status: 'success', data: [...], pagination: {...} }
        Client-->>Svc: ApiResponse<BackendObservation[]>
        Svc->>Svc: Adapt backend models to frontend types (adapters.ts)
        Svc-->>Page: { data: FireObservation[], dataSourceStatus: 'live' }
        Page->>Page: Render Live Satellite Observations (Green Status Badge)
        
    else Database Unreachable / Offline (HTTP 503)
        API-->>Client: 503 Service Unavailable { error_code: 'DATABASE_UNAVAILABLE' }
        Client->>Client: Catch HTTP 503 without throwing
        Client-->>Svc: Error intercepted
        Svc->>Mock: Load cached baseline data matching filters
        Mock-->>Svc: Simulated observations dataset
        Svc-->>Page: { data: MOCK_OBSERVATIONS, dataSourceStatus: 'fallback' }
        Page->>Page: Render Baseline Data (Amber Fallback Badge)
        
    else Backend Process Completely Offline (Network Failure)
        Client->>Client: Connection Refused / Timeout caught
        Client-->>Svc: Fallback trigger
        Svc->>Mock: Load cached baseline data
        Mock-->>Svc: Simulated observations dataset
        Svc-->>Page: { data: MOCK_OBSERVATIONS, dataSourceStatus: 'fallback' }
        Page->>Page: Render Baseline Data (Zero UI Crash, Smooth Interaction)
    end
```

---

## 7. End-to-End Data Processing Lifecycle

This diagram illustrates the lifecycle of a single wildfire detection from initial orbital photon detection down to user interaction on the 3D Earth Globe.

```mermaid
flowchart LR
    subgraph Space["1. Spacecraft Thermal Detection"]
        Fire["Wildfire Flaming & Smoldering<br/>Radiant Heat: 800–1200 K"] --> MIR["Mid-Infrared Radiance<br/>MODIS 3.95µm / VIIRS 3.74µm"]
        MIR --> Optic["Satellite Optics & Detectors<br/>Instantaneous Field of View"]
    end

    subgraph Ground["2. Ground Station & NASA FIRMS"]
        Optic --> Downlink["X-Band Ground Downlink<br/>Direct Broadcast & Stored Playback"]
        Downlink --> MODAPS["NASA EOSDIS MODAPS<br/>Collection 6.1 / VIIRS v2 Algorithms"]
        MODAPS --> FIRMSFeed["NASA FIRMS REST API Endpoint<br/>Active Fire CSV Stream"]
    end

    subgraph Engine["3. FIRENEXUS Backend Engine"]
        FIRMSFeed --> Ingest["Streaming Ingestion & Parsing<br/>SHA-256 Deduplication"]
        Ingest --> PersistRaw["Store Raw Record<br/>(fire_observations)"]
        PersistRaw --> HarmEngine["Harmonization Engine<br/>Haversine + Footprint Overlap + Orbit Window"]
        HarmEngine --> EventClust["Connected-Component Clustering<br/>3 km Radius / 12 hr Window / 15 km Max Diam"]
        EventClust --> StatsCalib["FRP Statistics & Calibration<br/>OLS Regression & Anomaly Detection"]
    end

    subgraph UI["4. User Visualization & Exploration"]
        StatsCalib --> JSONAPI["Versioned JSON API<br/>/api/v1/observations & /harmonization/*"]
        JSONAPI --> ReactApp["React 19 Frontend<br/>Web Application"]
        ReactApp --> Globe3D["Interactive 3D Earth Globe<br/>Orange (MODIS) & Cyan (VIIRS) Markers"]
        ReactApp --> DualMap["Split-Screen Footprint Map<br/>1 km vs 375 m Visualizer"]
        ReactApp --> Analytics["FRP Regression Scatter Plot<br/>& Diurnal Activity Curves"]
    end
```
