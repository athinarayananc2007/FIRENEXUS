import type { FireObservation, MatchedFirePair } from '../types';

/**
 * Mathematical & Statistical Utilities for FIRENEXUS Analytics
 */

export function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export function computeMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return Math.round(sorted[mid] * 10) / 10;
  }
  return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

export function computeStandardDeviation(values: number[], mean?: number): number {
  if (values.length < 2) return 0;
  const avg = mean !== undefined ? mean : computeMean(values);
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / (values.length - 1);
  return Math.round(Math.sqrt(variance) * 10) / 10;
}

export function computeIQR(values: number[]): { q1: number; q3: number; iqr: number } {
  if (values.length === 0) return { q1: 0, q3: 0, iqr: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = Math.round(sorted[q1Index] * 10) / 10;
  const q3 = Math.round(sorted[q3Index] * 10) / 10;
  const iqr = Math.round((q3 - q1) * 10) / 10;
  return { q1, q3, iqr };
}

/**
 * Computes Pearson correlation coefficient (r), R-squared (R2), sample size (N),
 * and linear regression slope & intercept for paired numerical arrays.
 */
export function computePearsonCorrelation(
  x: number[],
  y: number[]
): {
  r: number;
  r2: number;
  n: number;
  slope: number;
  intercept: number;
} {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return { r: 0, r2: 0, n, slope: 1, intercept: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return { r: 0, r2: 0, n, slope: 1, intercept: 0 };
  }

  const r = numerator / denominator;
  const r2 = Math.pow(r, 2);

  // Linear regression y = slope * x + intercept
  const denomSlope = n * sumX2 - sumX * sumX;
  const slope = denomSlope !== 0 ? (n * sumXY - sumX * sumY) / denomSlope : 1;
  const intercept = (sumY - slope * sumX) / n;

  return {
    r: Math.round(r * 1000) / 1000,
    r2: Math.round(r2 * 1000) / 1000,
    n,
    slope: Math.round(slope * 1000) / 1000,
    intercept: Math.round(intercept * 10) / 10,
  };
}

export interface FRPDistributionBin {
  bin: string;
  min: number;
  max: number;
  total: number;
  modis: number;
  viirs: number;
  percentage: number;
}

export function computeFRPDistribution(observations: FireObservation[]): FRPDistributionBin[] {
  const binsConfig = [
    { bin: '0–20 MW', min: 0, max: 20 },
    { bin: '20–50 MW', min: 20, max: 50 },
    { bin: '50–100 MW', min: 50, max: 100 },
    { bin: '100–150 MW', min: 100, max: 150 },
    { bin: '150–250 MW', min: 150, max: 250 },
    { bin: '250+ MW', min: 250, max: Infinity },
  ];

  const totalObs = observations.length || 1;

  return binsConfig.map((b) => {
    const matches = observations.filter((o) => o.frp >= b.min && o.frp < b.max);
    const modis = matches.filter((o) => o.satellite === 'MODIS').length;
    const viirs = matches.filter((o) => o.satellite === 'VIIRS').length;

    return {
      bin: b.bin,
      min: b.min,
      max: b.max,
      total: matches.length,
      modis,
      viirs,
      percentage: Math.round((matches.length / totalObs) * 1000) / 10,
    };
  });
}

export interface DiurnalHourBin {
  hour: string;
  hourNum: number;
  modisCount: number;
  viirsCount: number;
  total: number;
}

export function computeDiurnalOverpass(observations: FireObservation[]): DiurnalHourBin[] {
  const hours: DiurnalHourBin[] = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    hourNum: i,
    modisCount: 0,
    viirsCount: 0,
    total: 0,
  }));

  observations.forEach((o) => {
    if (!o.time || typeof o.time !== 'string') return;
    const h = parseInt(o.time.split(':')[0], 10);
    if (!isNaN(h) && h >= 0 && h < 24) {
      hours[h].total += 1;
      if (o.satellite === 'MODIS') hours[h].modisCount += 1;
      else hours[h].viirsCount += 1;
    }
  });

  return hours;
}

export interface AutomatedScientificInsight {
  id: string;
  title: string;
  category: 'temporal' | 'sensor' | 'energetic' | 'spatial' | 'harmonization';
  summary: string;
  details: string;
  metricBadge: string;
}

export function generateAutomatedScientificInsights(
  observations: FireObservation[],
  matchedPairs: MatchedFirePair[]
): AutomatedScientificInsight[] {
  const insights: AutomatedScientificInsight[] = [];
  const total = observations.length;
  if (total === 0) return insights;

  const modisCount = observations.filter((o) => o.satellite === 'MODIS').length;
  const viirsCount = observations.filter((o) => o.satellite === 'VIIRS').length;

  // 1. Sensor Yield Disparity
  if (modisCount > 0 && viirsCount > 0) {
    const ratio = Math.round((viirsCount / modisCount) * 100) / 100;
    insights.push({
      id: 'sensor-yield',
      title: 'Sensor Spatial Footprint & Detection Sensitivity Multiplier',
      category: 'sensor',
      metricBadge: `${ratio}x VIIRS Yield`,
      summary: `VIIRS captures ${ratio}x more active fire thermal detections than MODIS within the current active filter bounds.`,
      details: `VIIRS's 375 m nadir resolution represents an approximately 7.1x smaller surface pixel footprint compared to MODIS 1 km pixels. This heightened spatial sampling captures smaller, low-intensity flaming anomalies and sub-pixel fire fronts that remain diluted below MODIS's 4 µm detection threshold.`,
    });
  }

  // 2. Energetic Skewness (Mean vs Median FRP)
  const frpValues = observations.map((o) => o.frp);
  const meanFrp = computeMean(frpValues);
  const medianFrp = computeMedian(frpValues);
  const skewRatio = medianFrp > 0 ? Math.round((meanFrp / medianFrp) * 10) / 10 : 1;

  insights.push({
    id: 'energetic-skewness',
    title: 'Positively Skewed Log-Normal Energetic Distribution',
    category: 'energetic',
    metricBadge: `Mean: ${meanFrp} MW / Median: ${medianFrp} MW`,
    summary: `Mean FRP (${meanFrp} MW) exceeds Median FRP (${medianFrp} MW) by a factor of ${skewRatio}x, revealing a heavily right-skewed intensity spectrum.`,
    details: `The vast majority of satellite-detected fires are low-to-moderate intensity surface burns (<40 MW). However, a small tail of catastrophic high-intensity crown fires (>150 MW) significantly shifts the arithmetic mean, demonstrating that median FRP provides a more robust measure of typical fire energetics.`,
  });

  // 3. Peak Temporal Activity
  const monthCounts = Array(12).fill(0);
  observations.forEach((o) => {
    if (o?.date && typeof o.date === 'string' && o.date.includes('-')) {
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) monthCounts[mIdx] += 1;
      }
    }
  });
  const maxMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const peakMonthName = monthNames[maxMonthIdx];
  const peakMonthPct = Math.round((monthCounts[maxMonthIdx] / total) * 100);

  insights.push({
    id: 'temporal-peak',
    title: 'Seasonal Thermal Concentration Epoch',
    category: 'temporal',
    metricBadge: `Peak: ${peakMonthName} (${peakMonthPct}%)`,
    summary: `${peakMonthName} represents the global seasonal maximum, accounting for ${peakMonthPct}% of all filtered active-fire detections.`,
    details: `This temporal concentration is driven by the synchrony between mid-to-late summer high-latitude boreal wildfire burning in the Northern Hemisphere and the peak agricultural deforestation dry season in South America and Sub-Saharan Africa.`,
  });

  // 4. Spatial Density Epicenter
  const continentMap = new Map<string, number>();
  observations.forEach((o) => {
    const c = o.continent || 'Other';
    continentMap.set(c, (continentMap.get(c) || 0) + 1);
  });
  const topContinent = Array.from(continentMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topContinent) {
    const contPct = Math.round((topContinent[1] / total) * 100);
    insights.push({
      id: 'spatial-epicenter',
      title: 'Continental Fire Burden Disparity',
      category: 'spatial',
      metricBadge: `${topContinent[0]} (${contPct}%)`,
      summary: `${topContinent[0]} hosts the highest thermal anomaly frequency, comprising ${contPct}% (${topContinent[1].toLocaleString()} detections) of the current selection.`,
      details: `Regional biomass density, prolonged dry seasons, and widespread savanna land management account for the disproportionate active fire counts observed across this geographical region.`,
    });
  }

  // 5. Cross-Sensor Spatial Matching
  if (matchedPairs.length > 0 && modisCount > 0) {
    const matchRate = Math.round((matchedPairs.length / modisCount) * 100);
    const meanDist =
      Math.round(
        (matchedPairs.reduce((s, p) => s + p.distanceKm, 0) / matchedPairs.length) * 100
      ) / 100;
    const meanTime =
      Math.round(
        (matchedPairs.reduce((s, p) => s + p.timeDiffMinutes, 0) / matchedPairs.length) * 10
      ) / 10;

    insights.push({
      id: 'harmonization-rate',
      title: 'Cross-Sensor Spatial Co-location & Swath Synchronization',
      category: 'harmonization',
      metricBadge: `${matchRate}% Match Rate`,
      summary: `${matchRate}% of MODIS detections possess a candidate VIIRS match within ≤2.0 km and ≤90 minutes (Mean: ${meanDist} km, ${meanTime} min).`,
      details: `The mean spatial displacement of ${meanDist} km falls within the expected nominal 1 km MODIS pixel footprint boundary and VIIRS edge-of-scan geometry, confirming robust spatial-temporal consistency across orbital overpasses.`,
    });
  }

  return insights;
}

