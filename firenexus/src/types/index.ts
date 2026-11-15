// ──────────────────────────────────────────────
// FIRENEXUS — Core TypeScript Types
// ──────────────────────────────────────────────

export type SatelliteInstrument = 'MODIS' | 'VIIRS';
export type ConfidenceLevel = 'low' | 'nominal' | 'high';
export type DataStatus = 'simulated' | 'validated' | 'provisional';

export interface FireObservation {
  id: string;
  latitude: number;
  longitude: number;
  date: string | null;        // ISO date YYYY-MM-DD or null if missing/unverifiable
  time: string | null;        // HH:MM UTC or null if missing/unverifiable
  satellite: SatelliteInstrument;
  confidence: ConfidenceLevel;
  frp: number;         // Fire Radiative Power (MW)
  brightness: number;  // Brightness temperature (K)
  country: string;
  region: string;
  continent: string;
  status: DataStatus;
}

export interface FilterState {
  dateRange: { start: string; end: string };
  satellites: SatelliteInstrument[];
  confidence: ConfidenceLevel[];
  frpRange: { min: number; max: number };
  country: string;
  continent: string;
  searchQuery: string;
}

export interface DashboardStats {
  totalObservations: number;
  modisCount: number;
  viirsCount: number;
  highConfidence: number;
  activeRegions: number;
  observationPeriod: string;
}

export interface KpiMetrics {
  totalHotspots: number;
  totalTrend: number;
  totalSparkline: number[];
  modisCount: number;
  modisTrend: number;
  modisShare: number;
  modisSparkline: number[];
  viirsCount: number;
  viirsTrend: number;
  viirsShare: number;
  viirsSparkline: number[];
  avgFrp: number;
  frpTrend: number;
  maxFrp: number;
  frpSparkline: number[];
  highConfRate: number;
  activeRegions: number;
  observationPeriod: string;
}

export interface FrpBinData {
  label: string;
  range: string;
  count: number;
  modis: number;
  viirs: number;
  percentage: number;
  description: string;
}

export interface SeasonalData {
  season: string;
  months: string;
  count: number;
  avgFrp: number;
  modis: number;
  viirs: number;
}

export interface ContinentStats {
  continent: string;
  count: number;
  avgFrp: number;
  highConf: number;
  percentage: number;
}

export interface RegionActivity {
  region: string;
  country: string;
  continent: string;
  observationCount: number;
  avgFrp: number;
  dominantSatellite: SatelliteInstrument;
}

export interface MonthlyActivity {
  month: string;     // YYYY-MM
  label: string;     // e.g. "Jan 2024"
  modisCount: number;
  viirsCount: number;
  totalCount: number;
  avgFrp: number;
}

export interface DailyActivity {
  date: string;
  count: number;
  avgFrp: number;
}

export interface ComparisonData {
  parameter: string;
  modis: string | number;
  viirs: string | number;
}

export interface MatchedFirePair {
  id: string;
  modis: FireObservation;
  viirs: FireObservation;
  distanceKm: number;
  timeDiffMinutes: number;
  frpDiff: number;
  frpRatio: number;
  status: 'high_confidence_match' | 'candidate_match' | 'marginal_match';
}

export interface SpatialMatchingResults {
  matchedPairs: MatchedFirePair[];
  modisOnly: FireObservation[];
  viirsOnly: FireObservation[];
  totalModis: number;
  totalViirs: number;
  matchRatePct: number;
  unmatchedRatePct: number;
  meanDistanceKm: number;
  meanTimeDiffMin: number;
  meanFrpBias: number;
}

export interface MatchingEngineParams {
  spatialToleranceKm: number;
  temporalToleranceMinutes: number;
  confidenceRequirement?: 'any' | 'high_only' | 'nominal_and_above';
}

export interface AnomalyRecord {
  id: string;
  region: string;
  date: string;
  score: number;       // 0-1 anomaly score
  baseline: number;
  observed: number;
  description: string;
}

export interface CalendarDay {
  date: string;
  count: number;
  intensity: number; // 0-4 scale
}

export interface EnrichedCalendarDay {
  date: string;
  count: number;
  modisCount: number;
  viirsCount: number;
  avgFrp: number;
  intensity: number; // 0-4 scale
  highConf: number;
}

export interface WeeklyActivity {
  week: string;
  startDate: string;
  totalCount: number;
  modisCount: number;
  viirsCount: number;
  avgFrp: number;
}

export interface YearlyComparisonRecord {
  year: number;
  totalHotspots: number;
  modisTotal: number;
  viirsTotal: number;
  avgFrp: number;
  peakMonth: string;
  yoyChangePct: number;
}

export const CONTINENTS = [
  'Africa', 'Asia', 'Europe', 'North America',
  'South America', 'Oceania', 'Antarctica'
] as const;

export const DEFAULT_FILTERS: FilterState = {
  dateRange: { start: '2024-01-01', end: '2026-12-31' },
  satellites: ['MODIS', 'VIIRS'],
  confidence: ['low', 'nominal', 'high'],
  frpRange: { min: 0, max: 500 },
  country: '',
  continent: '',
  searchQuery: '',
};

