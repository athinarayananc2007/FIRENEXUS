// ──────────────────────────────────────────────
// FIRENEXUS — API Service Layer Type Definitions
// ──────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
  pagination?: PaginationMeta;
  total?: number;
}

export interface ApiErrorResponse {
  status: 'error';
  error_code: string;
  message: string;
  status_code: number;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  errorCode: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(errorResponse: ApiErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
    this.errorCode = errorResponse.error_code;
    this.statusCode = errorResponse.status_code;
    this.details = errorResponse.details;
  }
}

// ──────────────────────────────────────────────
// Raw Backend Model Serializations
// ──────────────────────────────────────────────

export interface BackendObservation {
  id: string | number;
  latitude: number;
  longitude: number;
  date?: string;
  time?: string;
  datetime?: string;
  acq_date?: string;
  acq_time?: string;
  acq_datetime?: string;
  satellite: string;
  instrument?: string;
  sensor?: string;
  confidence: string;
  confidence_raw?: string | null;
  brightness: number;
  bright_t31?: number | null;
  bright_secondary?: number | null;
  frp: number;
  daynight?: string;
  day_night?: string;
  scan?: number | null;
  track?: number | null;
  version?: string | null;
  country?: string | null;
  region?: string | null;
  continent?: string | null;
  source_product?: string | null;
  dedup_hash?: string | null;
}

export interface BackendObservationSummary {
  total_observations: number;
  modis_records?: number;
  modis_count?: number;
  viirs_records?: number;
  viirs_count?: number;
  daytime_records?: number;
  day_count?: number;
  nighttime_records?: number;
  night_count?: number;
  high_confidence_records?: number;
  high_confidence_count?: number;
  nominal_confidence_records?: number;
  low_confidence_records?: number;
  avg_frp: number;
  max_frp: number;
  date_min?: string | null;
  date_max?: string | null;
  date_range?: {
    earliest: string | null;
    latest: string | null;
  };
}

export interface BackendCrossSensorMatch {
  id: number;
  modis_obs_id: number;
  viirs_obs_id: number;
  modis_observation?: BackendObservation;
  viirs_observation?: BackendObservation;
  spatial_distance_meters: number;
  time_difference_seconds: number;
  modis_frp: number;
  viirs_frp: number;
  frp_difference: number;
  frp_ratio: number;
  match_confidence_score: number;
  match_algorithm_version: string;
  created_at?: string;
}

export interface BackendHarmonizationSummary {
  total_harmonized: number;
  total_matches: number;
  match_rate: number;
  mean_distance_m: number;
  mean_time_diff_sec: number;
  frp_ratio: number;
  total_events: number;
}

export interface BackendFireEvent {
  id: number;
  event_name?: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  centroid_latitude: number;
  centroid_longitude: number;
  total_observations: number;
  modis_count: number;
  viirs_count: number;
  peak_frp: number;
  mean_frp: number;
  status: string;
}

export interface BackendFrpBin {
  label: string;
  range_min: number;
  range_max: number;
  count: number;
  percentage: number;
}

export interface BackendFrpStats {
  mean: number;
  median: number;
  std: number;
  iqr: number;
  p25: number;
  p75: number;
  p90: number;
  p99: number;
  min: number;
  max: number;
  sample_size: number;
  bins: BackendFrpBin[];
}

export interface BackendTrendPoint {
  period_start: string;
  period_end: string;
  observation_count: number;
  modis_count: number;
  viirs_count: number;
  avg_frp: number;
  max_frp: number;
}

export interface BackendDiurnalHourly {
  hour: number;
  count: number;
  avg_frp: number;
  modis_count: number;
  viirs_count: number;
}

export interface BackendDiurnalResponse {
  hourly: BackendDiurnalHourly[];
  sampling_profile: {
    peak_hour: number;
    trough_hour: number;
    diurnal_range_ratio: number;
  };
}

export interface BackendAnomalyRecord {
  id: number;
  observation_id: number;
  anomaly_type: string;
  severity: string;
  score: number;
  metric_name: string;
  observed_value: number;
  expected_value: number;
  deviation: number;
  detection_method: string;
  description: string;
  created_at: string;
  observation?: BackendObservation;
}

export interface BackendHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: string;
  firms_api: string;
  version: string;
  timestamp: string;
}

export interface ObservationQueryParams {
  page?: number;
  limit?: number;
  sensor?: 'MODIS' | 'VIIRS';
  confidence?: 'low' | 'nominal' | 'high';
  daynight?: 'D' | 'N';
  date_start?: string;
  date_end?: string;
  min_frp?: number;
  max_frp?: number;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
  sort_by?: 'acq_datetime' | 'frp' | 'confidence' | 'brightness';
  order?: 'asc' | 'desc';
  country?: string;
}
