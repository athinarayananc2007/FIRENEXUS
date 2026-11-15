import type { FireObservation } from '../types';
import { haversineDistanceKm, timeDifferenceMinutes } from '../data/mock/fireData';

/**
 * Derives satellite platform/instrument from observation data according to NASA FIRMS conventions.
 */
export function getObservationInstrument(obs: FireObservation): string {
  const hour = obs.time ? parseInt(obs.time.split(':')[0], 10) : 12;
  if (obs.satellite === 'MODIS') {
    // Terra: morning overpass (~10:30 local) / Aqua: afternoon overpass (~13:30 local)
    return hour < 12 ? 'Terra (MODIS)' : 'Aqua (MODIS)';
  }
  // VIIRS: Suomi-NPP (~13:30) / NOAA-20 (~12:40)
  return hour % 2 === 0 ? 'Suomi-NPP (VIIRS)' : 'NOAA-20 (VIIRS)';
}

/**
 * Derives astronomical Day/Night ('D' | 'N') status from UTC time and longitude.
 * Formula: localSolarHour = (utcHours + lon / 15) mod 24
 * If 6.0 <= localSolarHour <= 18.0 -> Day ('D'), else Night ('N').
 */
export function getObservationDayNight(obs: FireObservation): 'D' | 'N' {
  if (!obs.time) return 'D';
  const [hStr, mStr] = obs.time.split(':');
  const utcHours = parseInt(hStr, 10) + parseInt(mStr || '0', 10) / 60;
  let localHour = (utcHours + obs.longitude / 15) % 24;
  if (localHour < 0) localHour += 24;

  return localHour >= 6 && localHour <= 18 ? 'D' : 'N';
}

/**
 * Formats coordinates into clean scientific representations (°N/°S, °E/°W and DMS).
 */
export function formatCoordinates(lat: number, lon: number): {
  latStr: string;
  lonStr: string;
  dmsStr: string;
} {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);

  const latStr = `${absLat.toFixed(4)}° ${latDir}`;
  const lonStr = `${absLon.toFixed(4)}° ${lonDir}`;

  // DMS conversion
  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  const latSec = Math.round(((absLat - latDeg) * 60 - latMin) * 60);

  const lonDeg = Math.floor(absLon);
  const lonMin = Math.floor((absLon - lonDeg) * 60);
  const lonSec = Math.round(((absLon - lonDeg) * 60 - lonMin) * 60);

  const dmsStr = `${latDeg}°${latMin}'${latSec}" ${latDir}, ${lonDeg}°${lonMin}'${lonSec}" ${lonDir}`;

  return { latStr, lonStr, dmsStr };
}

export interface DuplicateCheckResult {
  obs1: FireObservation;
  obs2: FireObservation;
  distanceKm: number;
  timeDiffMinutes: number;
  category: 'cross_sensor_overpass' | 'same_sensor_overlap';
}

/**
 * Scans a list of observations for spatial-temporal coincident overlaps
 * (within specified distance and time thresholds).
 */
export function findDuplicateObservations(
  observations: FireObservation[],
  spatialTolKm = 0.5,
  timeTolMin = 15
): DuplicateCheckResult[] {
  const duplicates: DuplicateCheckResult[] = [];
  const n = observations.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const o1 = observations[i];
      const o2 = observations[j];

      // Must share same valid date and time to be candidates
      if (!o1.date || !o2.date || o1.date !== o2.date) continue;
      if (!o1.time || !o2.time) continue;

      // Fast bounding box check (~0.5 km is ~0.005 deg)
      if (Math.abs(o1.latitude - o2.latitude) > 0.01) continue;
      if (Math.abs(o1.longitude - o2.longitude) > 0.01) continue;

      const timeDiff = timeDifferenceMinutes(o1.date, o1.time, o2.date, o2.time);
      if (timeDiff > timeTolMin) continue;

      const dist = haversineDistanceKm(o1.latitude, o1.longitude, o2.latitude, o2.longitude);
      if (dist <= spatialTolKm) {
        duplicates.push({
          obs1: o1,
          obs2: o2,
          distanceKm: dist,
          timeDiffMinutes: timeDiff,
          category:
            o1.satellite === o2.satellite ? 'same_sensor_overlap' : 'cross_sensor_overpass',
        });
      }
    }
  }

  return duplicates;
}

export interface QualityAuditReport {
  totalRecords: number;
  validCoordinatesCount: number;
  validFrpCount: number;
  validBrightnessCount: number;
  missingValuesCount: number;
  completenessPct: number;
}

/**
 * Audits dataset records for scientific integrity and valid ranges.
 */
export function auditDataQuality(observations: FireObservation[]): QualityAuditReport {
  let validCoords = 0;
  let validFrp = 0;
  let validBright = 0;
  let missing = 0;

  observations.forEach((o) => {
    if (o.latitude >= -90 && o.latitude <= 90 && o.longitude >= -180 && o.longitude <= 180) {
      validCoords += 1;
    }
    if (o.frp > 0 && o.frp < 5000) {
      validFrp += 1;
    }
    if (o.brightness >= 250 && o.brightness <= 600) {
      validBright += 1;
    }
    if (!o.id || !o.date || !o.time || !o.country || !o.region) {
      missing += 1;
    }
  });

  const total = observations.length || 1;
  const completeness = Math.round(((total - missing) / total) * 1000) / 10;

  return {
    totalRecords: observations.length,
    validCoordinatesCount: validCoords,
    validFrpCount: validFrp,
    validBrightnessCount: validBright,
    missingValuesCount: missing,
    completenessPct: completeness,
  };
}

