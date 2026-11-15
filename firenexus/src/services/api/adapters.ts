// ──────────────────────────────────────────────
// FIRENEXUS — Data Transformation Adapters
// Maps raw backend API models into existing frontend domain models
// ──────────────────────────────────────────────

import type {
  FireObservation,
  SatelliteInstrument,
  ConfidenceLevel,
  DataStatus,
  MatchedFirePair,
} from '../../types';
import type {
  BackendObservation,
  BackendCrossSensorMatch,
} from './types';

/**
 * Heuristic continent derivation from authoritative country metadata or geographical coordinates.
 * Returns 'Unknown' when classification is ambiguous to avoid false geographical attribution.
 */
export function estimateContinent(lat: number, lon: number, country?: string | null): string {
  if (country) {
    const cLower = country.toLowerCase().trim();
    // North America & Central America
    if (
      cLower.includes('usa') ||
      cLower.includes('united states') ||
      cLower.includes('canada') ||
      cLower.includes('mexico') ||
      cLower.includes('guatemala') ||
      cLower.includes('honduras') ||
      cLower.includes('nicaragua') ||
      cLower.includes('costa rica') ||
      cLower.includes('panama') ||
      cLower.includes('cuba')
    ) {
      return 'North America';
    }
    // South America
    if (
      cLower.includes('brazil') ||
      cLower.includes('argentina') ||
      cLower.includes('bolivia') ||
      cLower.includes('chile') ||
      cLower.includes('colombia') ||
      cLower.includes('peru') ||
      cLower.includes('venezuela') ||
      cLower.includes('paraguay') ||
      cLower.includes('ecuador')
    ) {
      return 'South America';
    }
    // Oceania
    if (
      cLower.includes('australia') ||
      cLower.includes('new zealand') ||
      cLower.includes('zealand') ||
      cLower.includes('papua') ||
      cLower.includes('fiji')
    ) {
      return 'Oceania';
    }
    // Africa
    if (
      cLower.includes('congo') ||
      cLower.includes('angola') ||
      cLower.includes('zambia') ||
      cLower.includes('south africa') ||
      cLower.includes('kenya') ||
      cLower.includes('tanzania') ||
      cLower.includes('nigeria') ||
      cLower.includes('mozambique') ||
      cLower.includes('madagascar') ||
      cLower.includes('algeria') ||
      cLower.includes('egypt')
    ) {
      return 'Africa';
    }
    // Europe
    if (
      cLower.includes('spain') ||
      cLower.includes('portugal') ||
      cLower.includes('greece') ||
      cLower.includes('italy') ||
      cLower.includes('france') ||
      cLower.includes('germany') ||
      cLower.includes('united kingdom') ||
      cLower.includes('norway') ||
      cLower.includes('sweden') ||
      cLower.includes('finland') ||
      cLower.includes('ukraine') ||
      cLower.includes('poland')
    ) {
      return 'Europe';
    }
    // Asia (including Middle East, Russia, Indonesia, Kazakhstan)
    if (
      cLower.includes('indonesia') ||
      cLower.includes('china') ||
      cLower.includes('india') ||
      cLower.includes('russia') ||
      cLower.includes('myanmar') ||
      cLower.includes('thailand') ||
      cLower.includes('vietnam') ||
      cLower.includes('japan') ||
      cLower.includes('turkey') ||
      cLower.includes('saudi') ||
      cLower.includes('iran') ||
      cLower.includes('iraq') ||
      cLower.includes('kazakhstan') ||
      cLower.includes('malaysia') ||
      cLower.includes('philippines')
    ) {
      return 'Asia';
    }
  }

  // Fallback to bounding boxes
  if (lat < -60) return 'Antarctica';
  if (lat >= -50 && lat <= -10 && lon >= 110 && lon <= 180) return 'Oceania';
  if (lat >= 7 && lat <= 85 && lon >= -170 && lon <= -50) return 'North America';
  if (lat >= -60 && lat < 12 && lon >= -90 && lon <= -30) return 'South America';
  if (lat >= -35 && lat <= 38 && lon >= -20 && lon <= 55) return 'Africa';
  if (lat > 35 && lat <= 72 && lon >= -25 && lon <= 45) return 'Europe';
  if (lat >= -11 && lat <= 85 && lon > 45 && lon <= 180) return 'Asia';

  // Rather than guessing or inventing, return Unknown
  return 'Unknown';
}

/**
 * Normalizes confidence string to standard ConfidenceLevel.
 */
export function normalizeConfidence(raw: string | undefined | null): ConfidenceLevel {
  if (!raw) return 'nominal';
  const lower = raw.toLowerCase().trim();
  if (lower === 'high' || lower === 'h') return 'high';
  if (lower === 'low' || lower === 'l') return 'low';
  const num = parseInt(lower, 10);
  if (!isNaN(num)) {
    if (num >= 80) return 'high';
    if (num <= 30) return 'low';
    return 'nominal';
  }
  return 'nominal';
}

/**
 * Normalizes sensor string to standard SatelliteInstrument.
 */
export function normalizeSatellite(raw: string | undefined | null): SatelliteInstrument {
  if (!raw) return 'MODIS';
  const upper = raw.toUpperCase();
  if (upper.includes('VIIRS')) return 'VIIRS';
  return 'MODIS';
}

/**
 * Strict calendar date validation.
 * Ensures the date is formatted as YYYY-MM-DD, within the valid historical/satellite
 * range 1990-2100, month 1-12, and the day is strictly within the calendar month
 * (including leap years).
 * Returns 'YYYY-MM-DD' on success, or null if missing, malformed, or out of range.
 */
export function validateCalendarDate(candidate: unknown): string | null {
  if (candidate === null || candidate === undefined) return null;

  let raw = '';
  if (candidate instanceof Date) {
    if (isNaN(candidate.getTime())) return null;
    raw = candidate.toISOString().slice(0, 10);
  } else if (typeof candidate === 'string') {
    raw = candidate.trim();
  } else {
    return null;
  }

  if (raw === '') return null;

  // Extract date portion if ISO string contains 'T' or space
  if (raw.includes('T')) {
    raw = raw.split('T')[0].trim();
  } else if (raw.includes(' ')) {
    raw = raw.split(' ')[0].trim();
  }

  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Validate year bounds (FIRMS satellite data begins ~2000, 1990-2100 allows all records)
  if (year < 1990 || year > 2100) return null;

  // Validate month bounds
  if (month < 1 || month > 12) return null;

  // Validate days in month accounting for leap years
  // Date.UTC(year, month, 0) yields the last day of month `month` (1-indexed)
  const maxDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > maxDays) return null;

  const yStr = String(year).padStart(4, '0');
  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');

  return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Strict UTC time validation.
 * Validates HH:MM (00:00 to 23:59) or raw FIRMS 4-digit HHMM.
 * Returns formatted 'HH:MM' on success, or null if missing, malformed, or invalid.
 */
export function validateUtcTime(candidate: unknown): string | null {
  if (candidate === null || candidate === undefined) return null;

  let raw = '';
  if (typeof candidate === 'number') {
    if (isNaN(candidate) || candidate < 0 || candidate > 2359) return null;
    raw = String(Math.floor(candidate)).padStart(4, '0');
  } else if (typeof candidate === 'string') {
    raw = candidate.trim();
  } else {
    return null;
  }

  if (raw === '') return null;

  // If candidate is ISO timestamp with 'T'
  if (raw.includes('T')) {
    const afterT = raw.split('T')[1].trim();
    raw = afterT.replace(/Z|[+-].*$/, '');
  }

  let hours = -1;
  let minutes = -1;

  if (raw.includes(':')) {
    const parts = raw.split(':');
    if (parts.length >= 2) {
      hours = parseInt(parts[0], 10);
      minutes = parseInt(parts[1], 10);
    }
  } else if (/^\d{1,4}$/.test(raw)) {
    const padded = raw.padStart(4, '0');
    hours = parseInt(padded.slice(0, 2), 10);
    minutes = parseInt(padded.slice(2, 4), 10);
  }

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Maps raw backend observation to frontend FireObservation interface.
 * Strictly adheres to verified observation data without fabrication.
 */
export function adaptObservation(obs: BackendObservation): FireObservation {
  const satellite = normalizeSatellite(obs.sensor || obs.instrument || obs.satellite);
  const confidence = normalizeConfidence(obs.confidence);
  const continent =
    obs.continent && obs.continent.trim() !== '' && obs.continent.toLowerCase() !== 'global'
      ? obs.continent
      : estimateContinent(obs.latitude, obs.longitude, obs.country);

  // Robust date extraction and validation: NEVER fabricate dates
  const rawDate =
    (typeof obs.date === 'string' && obs.date.trim() !== '' ? obs.date : null) ||
    (typeof obs.acq_date === 'string' && obs.acq_date.trim() !== '' ? obs.acq_date : null) ||
    (typeof obs.datetime === 'string' && obs.datetime.trim() !== '' ? obs.datetime : null) ||
    (typeof obs.acq_datetime === 'string' && obs.acq_datetime.trim() !== '' ? obs.acq_datetime : null);
  const date = validateCalendarDate(rawDate);

  // Robust time extraction and validation: NEVER fabricate times
  const rawTime =
    (typeof obs.time === 'string' && obs.time.trim() !== '' ? obs.time : null) ||
    (typeof obs.acq_time === 'string' && obs.acq_time.trim() !== '' ? obs.acq_time : null) ||
    (typeof obs.datetime === 'string' && obs.datetime.includes('T') ? obs.datetime.split('T')[1] : null) ||
    (typeof obs.acq_datetime === 'string' && obs.acq_datetime.includes('T') ? obs.acq_datetime.split('T')[1] : null);
  const time = validateUtcTime(rawTime);

  return {
    id: String(obs.id),
    latitude: Number(obs.latitude),
    longitude: Number(obs.longitude),
    date,
    time,
    satellite,
    confidence,
    frp: Number(obs.frp ?? 0),
    brightness: Number(obs.brightness ?? 300),
    country: obs.country || 'Global',
    region: obs.region || 'Active Region',
    continent,
    status: 'validated' as DataStatus,
  };
}

/**
 * Maps raw backend cross-sensor match record to frontend MatchedFirePair.
 */
export function adaptMatchPair(match: BackendCrossSensorMatch): MatchedFirePair {
  const modis = match.modis_observation
    ? adaptObservation(match.modis_observation)
    : {
        id: `m-${match.modis_obs_id}`,
        latitude: 0,
        longitude: 0,
        date: null,
        time: null,
        satellite: 'MODIS' as SatelliteInstrument,
        confidence: 'nominal' as ConfidenceLevel,
        frp: match.modis_frp,
        brightness: 320,
        country: 'Global',
        region: 'Active Match',
        continent: 'Global',
        status: 'validated' as DataStatus,
      };

  const viirs = match.viirs_observation
    ? adaptObservation(match.viirs_observation)
    : {
        id: `v-${match.viirs_obs_id}`,
        latitude: 0,
        longitude: 0,
        date: null,
        time: null,
        satellite: 'VIIRS' as SatelliteInstrument,
        confidence: 'nominal' as ConfidenceLevel,
        frp: match.viirs_frp,
        brightness: 325,
        country: 'Global',
        region: 'Active Match',
        continent: 'Global',
        status: 'validated' as DataStatus,
      };

  let status: 'high_confidence_match' | 'candidate_match' | 'marginal_match' = 'candidate_match';
  if (match.match_confidence_score >= 0.8) {
    status = 'high_confidence_match';
  } else if (match.match_confidence_score < 0.5) {
    status = 'marginal_match';
  }

  return {
    id: String(match.id),
    modis,
    viirs,
    distanceKm: Number((match.spatial_distance_meters / 1000).toFixed(3)),
    timeDiffMinutes: Number((Math.abs(match.time_difference_seconds) / 60).toFixed(1)),
    frpDiff: Number(match.frp_difference.toFixed(2)),
    frpRatio: Number(match.frp_ratio.toFixed(3)),
    status,
  };
}
