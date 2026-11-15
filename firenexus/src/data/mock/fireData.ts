// ──────────────────────────────────────────────
// FIRENEXUS — Mock Fire Observation Data
// Realistic simulated data for frontend demonstration
// ──────────────────────────────────────────────
import type {
  FireObservation, SatelliteInstrument, ConfidenceLevel,
  DashboardStats, RegionActivity, MonthlyActivity, DailyActivity,
  ComparisonData, AnomalyRecord, CalendarDay, FilterState,
  KpiMetrics, FrpBinData, SeasonalData, ContinentStats,
  MatchedFirePair, SpatialMatchingResults, MatchingEngineParams,
  EnrichedCalendarDay, WeeklyActivity, YearlyComparisonRecord,
} from '../../types';

// ── Seed-based pseudo-random for reproducibility ──
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Geographic regions with realistic fire-prone coordinates ──
interface GeoRegion {
  name: string; country: string; continent: string;
  latRange: [number, number]; lonRange: [number, number]; weight: number;
}

const FIRE_REGIONS: GeoRegion[] = [
  // Africa
  { name: 'Sub-Saharan West Africa', country: 'Nigeria', continent: 'Africa', latRange: [5, 12], lonRange: [-5, 10], weight: 12 },
  { name: 'Central Africa', country: 'DR Congo', continent: 'Africa', latRange: [-5, 5], lonRange: [15, 30], weight: 15 },
  { name: 'Southern Africa', country: 'Mozambique', continent: 'Africa', latRange: [-20, -10], lonRange: [25, 40], weight: 10 },
  { name: 'East Africa', country: 'Tanzania', continent: 'Africa', latRange: [-10, 0], lonRange: [30, 40], weight: 8 },
  { name: 'Madagascar', country: 'Madagascar', continent: 'Africa', latRange: [-20, -12], lonRange: [44, 50], weight: 5 },
  // South America
  { name: 'Amazon Basin', country: 'Brazil', continent: 'South America', latRange: [-10, 0], lonRange: [-65, -50], weight: 14 },
  { name: 'Cerrado', country: 'Brazil', continent: 'South America', latRange: [-18, -8], lonRange: [-52, -44], weight: 10 },
  { name: 'Gran Chaco', country: 'Argentina', continent: 'South America', latRange: [-25, -18], lonRange: [-65, -58], weight: 6 },
  { name: 'Orinoco Basin', country: 'Venezuela', continent: 'South America', latRange: [4, 9], lonRange: [-72, -62], weight: 5 },
  // Asia
  { name: 'Southeast Asia', country: 'Indonesia', continent: 'Asia', latRange: [-5, 5], lonRange: [100, 120], weight: 12 },
  { name: 'Mainland SE Asia', country: 'Myanmar', continent: 'Asia', latRange: [14, 22], lonRange: [94, 102], weight: 8 },
  { name: 'Central Siberia', country: 'Russia', continent: 'Asia', latRange: [55, 65], lonRange: [90, 130], weight: 9 },
  { name: 'Indian Subcontinent', country: 'India', continent: 'Asia', latRange: [8, 28], lonRange: [72, 88], weight: 7 },
  // North America
  { name: 'Western US', country: 'United States', continent: 'North America', latRange: [34, 48], lonRange: [-122, -110], weight: 8 },
  { name: 'Boreal Canada', country: 'Canada', continent: 'North America', latRange: [50, 62], lonRange: [-120, -80], weight: 7 },
  { name: 'Mexico Central', country: 'Mexico', continent: 'North America', latRange: [18, 24], lonRange: [-104, -96], weight: 5 },
  // Europe
  { name: 'Mediterranean', country: 'Greece', continent: 'Europe', latRange: [36, 42], lonRange: [20, 28], weight: 4 },
  { name: 'Iberian Peninsula', country: 'Portugal', continent: 'Europe', latRange: [37, 42], lonRange: [-9, -3], weight: 3 },
  // Oceania
  { name: 'Northern Australia', country: 'Australia', continent: 'Oceania', latRange: [-20, -12], lonRange: [125, 145], weight: 9 },
  { name: 'Eastern Australia', country: 'Australia', continent: 'Oceania', latRange: [-37, -28], lonRange: [145, 153], weight: 6 },
];

// ── Generate observations with realistic co-incident overpass clusters ──
function generateObservations(count: number, seed = 42): FireObservation[] {
  const rng = seededRandom(seed);
  const observations: FireObservation[] = [];
  const totalWeight = FIRE_REGIONS.reduce((s, r) => s + r.weight, 0);

  while (observations.length < count) {
    // Weighted region selection
    let pick = rng() * totalWeight;
    let region = FIRE_REGIONS[0];
    for (const r of FIRE_REGIONS) {
      pick -= r.weight;
      if (pick <= 0) { region = r; break; }
    }

    const lat = region.latRange[0] + rng() * (region.latRange[1] - region.latRange[0]);
    const lon = region.lonRange[0] + rng() * (region.lonRange[1] - region.lonRange[0]);

    // Seasonal bias: more fires in dry seasons
    const month = Math.floor(rng() * 12);
    const day = Math.floor(rng() * 28) + 1;
    const hour = Math.floor(rng() * 24);
    const minute = Math.floor(rng() * 60);
    const dateStr = `2024-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    // ~35% candidate multi-sensor overpass cluster pair
    const isPaired = rng() < 0.35 && observations.length + 2 <= count;

    if (isPaired) {
      // 1. MODIS observation (1 km)
      const modisConf: ConfidenceLevel = rng() > 0.5 ? 'high' : rng() > 0.2 ? 'nominal' : 'low';
      const modisFrpBase = 15 + rng() * 95;
      const modisFrp = Math.round(modisFrpBase * (modisConf === 'high' ? 1.5 : 1.1) * 10) / 10;
      const modisBright = Math.round((310 + rng() * 100) * 10) / 10;

      observations.push({
        id: `FN-${String(observations.length + 1).padStart(6, '0')}`,
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lon * 10000) / 10000,
        date: dateStr,
        time: timeStr,
        satellite: 'MODIS',
        confidence: modisConf,
        frp: modisFrp,
        brightness: modisBright,
        country: region.country,
        region: region.name,
        continent: region.continent,
        status: 'simulated',
      });

      // 2. Corresponding VIIRS observation (nearby: ~0.4 to 2.2 km away, 15 to 75 min offset)
      const dLat = (rng() - 0.5) * 0.016; // ~1.5 km
      const dLon = (rng() - 0.5) * 0.016;
      const timeOffsetMinutes = Math.floor(15 + rng() * 60);
      const totalMin = hour * 60 + minute + timeOffsetMinutes;
      const vHour = Math.min(23, Math.floor(totalMin / 60));
      const vMin = totalMin % 60;
      const vTimeStr = `${String(vHour).padStart(2, '0')}:${String(vMin).padStart(2, '0')}`;

      const viirsConf: ConfidenceLevel = rng() > 0.4 ? 'high' : rng() > 0.15 ? 'nominal' : 'low';
      const viirsFrp = Math.round((modisFrp * (0.8 + rng() * 0.45)) * 10) / 10;
      const viirsBright = Math.round((modisBright + (rng() - 0.5) * 12) * 10) / 10;

      observations.push({
        id: `FN-${String(observations.length + 1).padStart(6, '0')}`,
        latitude: Math.round((lat + dLat) * 10000) / 10000,
        longitude: Math.round((lon + dLon) * 10000) / 10000,
        date: dateStr,
        time: vTimeStr,
        satellite: 'VIIRS',
        confidence: viirsConf,
        frp: viirsFrp,
        brightness: viirsBright,
        country: region.country,
        region: region.name,
        continent: region.continent,
        status: 'simulated',
      });
    } else {
      // Single un-paired observation (VIIRS 55%, MODIS 45%)
      const satellite: SatelliteInstrument = rng() > 0.45 ? 'VIIRS' : 'MODIS';
      const confRoll = rng();
      const confidence: ConfidenceLevel = confRoll > 0.6 ? 'high' : confRoll > 0.25 ? 'nominal' : 'low';

      const baseFrp = 5 + rng() * 80;
      const frp = Math.round((confidence === 'high' ? baseFrp * 1.8 : confidence === 'nominal' ? baseFrp * 1.2 : baseFrp) * 10) / 10;
      const brightness = Math.round((300 + rng() * 120 + (confidence === 'high' ? 50 : 0)) * 10) / 10;

      observations.push({
        id: `FN-${String(observations.length + 1).padStart(6, '0')}`,
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lon * 10000) / 10000,
        date: dateStr,
        time: timeStr,
        satellite,
        confidence,
        frp,
        brightness,
        country: region.country,
        region: region.name,
        continent: region.continent,
        status: 'simulated',
      });
    }
  }

  return observations.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (b.time ?? '').localeCompare(a.time ?? ''));
}

// ── Pre-generated dataset ──
export const MOCK_OBSERVATIONS = generateObservations(2000);

// ── Derived statistics ──
export function computeStats(data: FireObservation[]): DashboardStats {
  const modis = data.filter(d => d.satellite === 'MODIS');
  const viirs = data.filter(d => d.satellite === 'VIIRS');
  const high = data.filter(d => d.confidence === 'high');
  const regions = new Set(data.map(d => d.region));
  const dates = data.map(d => d.date).filter((d): d is string => typeof d === 'string' && d.length > 0).sort();
  const period = dates.length > 0 ? `${dates[0]} – ${dates[dates.length - 1]}` : 'N/A';

  return {
    totalObservations: data.length,
    modisCount: modis.length,
    viirsCount: viirs.length,
    highConfidence: high.length,
    activeRegions: regions.size,
    observationPeriod: period,
  };
}

export function computeKpiMetrics(data: FireObservation[]): KpiMetrics {
  const total = data.length;
  const modis = data.filter(d => d.satellite === 'MODIS');
  const viirs = data.filter(d => d.satellite === 'VIIRS');
  const high = data.filter(d => d.confidence === 'high');
  const regions = new Set(data.map(d => d.region));
  const dates = data.map(d => d.date).filter((d): d is string => typeof d === 'string' && d.length > 0).sort();
  const period = dates.length > 0 ? `${dates[0]} – ${dates[dates.length - 1]}` : 'N/A';

  const avgFrp = total > 0 ? Math.round((data.reduce((s, o) => s + o.frp, 0) / total) * 10) / 10 : 0;
  const maxFrp = total > 0 ? Math.round(Math.max(...data.map(d => d.frp)) * 10) / 10 : 0;
  const modisShare = total > 0 ? Math.round((modis.length / total) * 1000) / 10 : 0;
  const viirsShare = total > 0 ? Math.round((viirs.length / total) * 1000) / 10 : 0;
  const highConfRate = total > 0 ? Math.round((high.length / total) * 1000) / 10 : 0;

  // 12-month activity sparklines
  const totalSparkline = Array(12).fill(0);
  const modisSparkline = Array(12).fill(0);
  const viirsSparkline = Array(12).fill(0);
  const frpMonthSums = Array(12).fill(0);
  const frpMonthCounts = Array(12).fill(0);

  data.forEach(d => {
    if (!d.date || typeof d.date !== 'string' || d.date.length < 7) return;
    const m = parseInt(d.date.substring(5, 7), 10) - 1;
    if (m >= 0 && m < 12) {
      totalSparkline[m] += 1;
      if (d.satellite === 'MODIS') modisSparkline[m] += 1;
      else viirsSparkline[m] += 1;
      frpMonthSums[m] += d.frp;
      frpMonthCounts[m] += 1;
    }
  });

  const frpSparkline = frpMonthCounts.map((c, i) =>
    c > 0 ? Math.round((frpMonthSums[i] / c) * 10) / 10 : 0
  );

  // Compute trend indicators vs previous semi-annual or baseline ratio
  const h1 = totalSparkline.slice(0, 6).reduce((a, b) => a + b, 0);
  const h2 = totalSparkline.slice(6, 12).reduce((a, b) => a + b, 0);
  const totalTrend = h1 > 0 ? Math.round(((h2 - h1) / h1) * 1000) / 10 : +8.4;

  const m1 = modisSparkline.slice(0, 6).reduce((a, b) => a + b, 0);
  const m2 = modisSparkline.slice(6, 12).reduce((a, b) => a + b, 0);
  const modisTrend = m1 > 0 ? Math.round(((m2 - m1) / m1) * 1000) / 10 : +6.2;

  const v1 = viirsSparkline.slice(0, 6).reduce((a, b) => a + b, 0);
  const v2 = viirsSparkline.slice(6, 12).reduce((a, b) => a + b, 0);
  const viirsTrend = v1 > 0 ? Math.round(((v2 - v1) / v1) * 1000) / 10 : +10.1;

  const f1 = frpSparkline.slice(0, 6).reduce((a, b) => a + b, 0) / 6 || 1;
  const f2 = frpSparkline.slice(6, 12).reduce((a, b) => a + b, 0) / 6 || 1;
  const frpTrend = Math.round(((f2 - f1) / f1) * 1000) / 10;

  return {
    totalHotspots: total,
    totalTrend,
    totalSparkline,
    modisCount: modis.length,
    modisTrend,
    modisShare,
    modisSparkline,
    viirsCount: viirs.length,
    viirsTrend,
    viirsShare,
    viirsSparkline,
    avgFrp,
    frpTrend,
    maxFrp,
    frpSparkline,
    highConfRate,
    activeRegions: regions.size,
    observationPeriod: period,
  };
}

export function computeFrpBins(data: FireObservation[]): FrpBinData[] {
  const total = data.length || 1;
  const bins = [
    { label: 'Low', range: '< 20 MW', min: 0, max: 20, description: 'Ground litter / smoldering fires' },
    { label: 'Moderate', range: '20 – 50 MW', min: 20, max: 50, description: 'Active understory / brush fires' },
    { label: 'High', range: '50 – 100 MW', min: 50, max: 100, description: 'Severe surface / localized crown fires' },
    { label: 'Extreme', range: '> 100 MW', min: 100, max: Infinity, description: 'Intense crown fire / pyro-convection' },
  ];

  return bins.map(b => {
    const obs = data.filter(d => d.frp >= b.min && (b.max === Infinity ? true : d.frp < b.max));
    const modis = obs.filter(d => d.satellite === 'MODIS').length;
    const viirs = obs.filter(d => d.satellite === 'VIIRS').length;
    return {
      label: b.label,
      range: b.range,
      count: obs.length,
      modis,
      viirs,
      percentage: Math.round((obs.length / total) * 1000) / 10,
      description: b.description,
    };
  });
}

export function computeSeasonalActivity(data: FireObservation[]): SeasonalData[] {
  const seasons = [
    { name: 'Spring', months: [3, 4, 5], label: 'Mar – May' },
    { name: 'Summer', months: [6, 7, 8], label: 'Jun – Aug' },
    { name: 'Autumn', months: [9, 10, 11], label: 'Sep – Nov' },
    { name: 'Winter', months: [12, 1, 2], label: 'Dec – Feb' },
  ];

  return seasons.map(s => {
    const obs = data.filter(d => {
      if (!d.date || typeof d.date !== 'string' || d.date.length < 7) return false;
      const m = parseInt(d.date.substring(5, 7), 10);
      return s.months.includes(m);
    });
    const modis = obs.filter(d => d.satellite === 'MODIS').length;
    const viirs = obs.filter(d => d.satellite === 'VIIRS').length;
    const avgFrp = obs.length > 0 ? Math.round((obs.reduce((acc, o) => acc + o.frp, 0) / obs.length) * 10) / 10 : 0;
    return {
      season: s.name,
      months: s.label,
      count: obs.length,
      avgFrp,
      modis,
      viirs,
    };
  });
}

export function computeContinentActivity(data: FireObservation[]): ContinentStats[] {
  const total = data.length || 1;
  const map = new Map<string, FireObservation[]>();
  data.forEach(d => {
    const key = d.continent || 'Other';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });

  return Array.from(map.entries())
    .map(([continent, obs]) => {
      const highConf = obs.filter(o => o.confidence === 'high').length;
      const avgFrp = Math.round((obs.reduce((s, o) => s + o.frp, 0) / obs.length) * 10) / 10;
      return {
        continent,
        count: obs.length,
        avgFrp,
        highConf,
        percentage: Math.round((obs.length / total) * 1000) / 10,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function computeConfidenceBreakdown(data: FireObservation[]) {
  const total = data.length || 1;
  const levels: ConfidenceLevel[] = ['high', 'nominal', 'low'];
  return levels.map(level => {
    const obs = data.filter(d => d.confidence === level);
    const modis = obs.filter(d => d.satellite === 'MODIS').length;
    const viirs = obs.filter(d => d.satellite === 'VIIRS').length;
    return {
      confidence: level,
      count: obs.length,
      percentage: Math.round((obs.length / total) * 1000) / 10,
      modis,
      viirs,
      avgFrp: obs.length > 0 ? Math.round((obs.reduce((s, o) => s + o.frp, 0) / obs.length) * 10) / 10 : 0,
    };
  });
}

export function computeRegionActivity(data: FireObservation[]): RegionActivity[] {
  const map = new Map<string, FireObservation[]>();
  data.forEach(d => {
    const key = d.region;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });

  return Array.from(map.entries()).map(([region, obs]) => {
    const modis = obs.filter(o => o.satellite === 'MODIS').length;
    const viirs = obs.filter(o => o.satellite === 'VIIRS').length;
    return {
      region,
      country: obs[0].country,
      continent: obs[0].continent,
      observationCount: obs.length,
      avgFrp: Math.round(obs.reduce((s, o) => s + o.frp, 0) / obs.length * 10) / 10,
      dominantSatellite: (modis >= viirs ? 'MODIS' : 'VIIRS') as SatelliteInstrument,
    };
  }).sort((a, b) => b.observationCount - a.observationCount);
}

export function computeMonthlyActivity(data: FireObservation[]): MonthlyActivity[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const map = new Map<string, FireObservation[]>();
  data.forEach(d => {
    if (!d.date || typeof d.date !== 'string' || d.date.length < 7) return;
    const key = d.date.substring(0, 7);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, obs]) => {
      const [y, m] = month.split('-');
      const modis = obs.filter(o => o.satellite === 'MODIS').length;
      const viirs = obs.filter(o => o.satellite === 'VIIRS').length;
      return {
        month,
        label: `${months[parseInt(m) - 1]} ${y}`,
        modisCount: modis,
        viirsCount: viirs,
        totalCount: obs.length,
        avgFrp: Math.round(obs.reduce((s, o) => s + o.frp, 0) / obs.length * 10) / 10,
      };
    });
}

export function computeDailyActivity(data: FireObservation[]): DailyActivity[] {
  const map = new Map<string, FireObservation[]>();
  data.forEach(d => {
    if (!d.date || typeof d.date !== 'string') return;
    if (!map.has(d.date)) map.set(d.date, []);
    map.get(d.date)!.push(d);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, obs]) => ({
      date,
      count: obs.length,
      avgFrp: Math.round(obs.reduce((s, o) => s + o.frp, 0) / obs.length * 10) / 10,
    }));
}

export function computeCalendarData(data: FireObservation[]): CalendarDay[] {
  const dailyMap = new Map<string, number>();
  data.forEach(d => {
    if (!d.date || typeof d.date !== 'string') return;
    dailyMap.set(d.date, (dailyMap.get(d.date) || 0) + 1);
  });

  const maxCount = Math.max(...dailyMap.values(), 1);
  return Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
    intensity: Math.min(4, Math.floor((count / maxCount) * 5)),
  }));
}

export function computeEnrichedCalendarMap(data: FireObservation[]): Map<string, EnrichedCalendarDay> {
  const map = new Map<string, FireObservation[]>();
  data.forEach((d) => {
    if (!d.date || typeof d.date !== 'string') return;
    if (!map.has(d.date)) map.set(d.date, []);
    map.get(d.date)!.push(d);
  });

  const resultMap = new Map<string, EnrichedCalendarDay>();
  map.forEach((obs, date) => {
    const modisCount = obs.filter((o) => o.satellite === 'MODIS').length;
    const viirsCount = obs.filter((o) => o.satellite === 'VIIRS').length;
    const highConf = obs.filter((o) => o.confidence === 'high').length;
    const avgFrp =
      obs.length > 0
        ? Math.round((obs.reduce((s, o) => s + o.frp, 0) / obs.length) * 10) / 10
        : 0;

    let intensity = 0;
    if (obs.length >= 13) intensity = 4;
    else if (obs.length >= 8) intensity = 3;
    else if (obs.length >= 4) intensity = 2;
    else if (obs.length >= 1) intensity = 1;

    resultMap.set(date, {
      date,
      count: obs.length,
      modisCount,
      viirsCount,
      avgFrp,
      intensity,
      highConf,
    });
  });

  return resultMap;
}

export function computeWeeklyActivity(data: FireObservation[]): WeeklyActivity[] {
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const wNum = i + 1;
    const d = new Date(2024, 0, 1 + i * 7);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      week: `W${wNum}`,
      startDate: dateStr,
      totalCount: 0,
      modisCount: 0,
      viirsCount: 0,
      totalFrp: 0,
    };
  });

  data.forEach((d) => {
    if (!d.date || typeof d.date !== 'string') return;
    const start = new Date(2024, 0, 1).getTime();
    const current = new Date(`${d.date}T00:00:00Z`).getTime();
    if (isNaN(current)) return;
    const dayOfYear = Math.floor((current - start) / 86400000);
    const wIdx = Math.min(51, Math.max(0, Math.floor(dayOfYear / 7)));

    weeks[wIdx].totalCount += 1;
    if (d.satellite === 'MODIS') weeks[wIdx].modisCount += 1;
    else weeks[wIdx].viirsCount += 1;
    weeks[wIdx].totalFrp += d.frp;
  });

  return weeks.map((w) => ({
    week: w.week,
    startDate: w.startDate,
    totalCount: w.totalCount,
    modisCount: w.modisCount,
    viirsCount: w.viirsCount,
    avgFrp: w.totalCount > 0 ? Math.round((w.totalFrp / w.totalCount) * 10) / 10 : 0,
  }));
}

export function computeMultiYearComparison(currentYearData: FireObservation[]): YearlyComparisonRecord[] {
  const currentTotal = currentYearData.length;
  const currentModis = currentYearData.filter((o) => o.satellite === 'MODIS').length;
  const currentViirs = currentYearData.filter((o) => o.satellite === 'VIIRS').length;
  const currentAvgFrp =
    currentTotal > 0
      ? Math.round((currentYearData.reduce((s, o) => s + o.frp, 0) / currentTotal) * 10) / 10
      : 0;

  return [
    {
      year: 2024,
      totalHotspots: currentTotal,
      modisTotal: currentModis,
      viirsTotal: currentViirs,
      avgFrp: currentAvgFrp,
      peakMonth: 'August',
      yoyChangePct: +8.4,
    },
    {
      year: 2023,
      totalHotspots: Math.round(currentTotal * 0.92),
      modisTotal: Math.round(currentModis * 0.94),
      viirsTotal: Math.round(currentViirs * 0.90),
      avgFrp: Math.round((currentAvgFrp * 0.96) * 10) / 10,
      peakMonth: 'September',
      yoyChangePct: +4.2,
    },
    {
      year: 2022,
      totalHotspots: Math.round(currentTotal * 0.88),
      modisTotal: Math.round(currentModis * 0.91),
      viirsTotal: Math.round(currentViirs * 0.86),
      avgFrp: Math.round((currentAvgFrp * 0.93) * 10) / 10,
      peakMonth: 'July',
      yoyChangePct: -2.1,
    },
    {
      year: 2021,
      totalHotspots: Math.round(currentTotal * 0.90),
      modisTotal: Math.round(currentModis * 0.93),
      viirsTotal: Math.round(currentViirs * 0.88),
      avgFrp: Math.round((currentAvgFrp * 0.95) * 10) / 10,
      peakMonth: 'August',
      yoyChangePct: +1.5,
    },
  ];
}

export function getComparisonTable(data: FireObservation[]): ComparisonData[] {
  const modis = data.filter(d => d.satellite === 'MODIS');
  const viirs = data.filter(d => d.satellite === 'VIIRS');

  const avgFrp = (arr: FireObservation[]) =>
    arr.length ? Math.round(arr.reduce((s, o) => s + o.frp, 0) / arr.length * 10) / 10 : 0;
  const highConf = (arr: FireObservation[]) =>
    arr.filter(o => o.confidence === 'high').length;
  const dateRange = (arr: FireObservation[]) => {
    const dates = arr.map(o => o.date).filter((d): d is string => typeof d === 'string' && d.length > 0).sort();
    return dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'N/A';
  };

  return [
    { parameter: 'Instrument', modis: 'MODIS (Aqua/Terra)', viirs: 'VIIRS (Suomi NPP/NOAA-20)' },
    { parameter: 'Spatial Resolution', modis: '1 km', viirs: '375 m' },
    { parameter: 'Detection Count', modis: modis.length, viirs: viirs.length },
    { parameter: 'High Confidence', modis: highConf(modis), viirs: highConf(viirs) },
    { parameter: 'Avg FRP (MW)', modis: avgFrp(modis), viirs: avgFrp(viirs) },
    { parameter: 'Observation Period', modis: dateRange(modis), viirs: dateRange(viirs) },
    { parameter: 'Swath Width', modis: '2330 km', viirs: '3000 km' },
  ];
}

export function computeAnomalies(data: FireObservation[]): AnomalyRecord[] {
  const regionMap = new Map<string, FireObservation[]>();
  data.forEach(d => {
    if (!regionMap.has(d.region)) regionMap.set(d.region, []);
    regionMap.get(d.region)!.push(d);
  });

  const rng = seededRandom(123);
  return Array.from(regionMap.entries())
    .map(([region, obs]) => {
      const baseline = Math.round(obs.length * (0.5 + rng() * 0.5));
      const observed = obs.length;
      const score = Math.min(1, Math.max(0, (observed - baseline) / Math.max(baseline, 1)));
      return {
        id: `AN-${region.replace(/\s+/g, '-').substring(0, 12)}`,
        region,
        date: '2024',
        score: Math.round(score * 100) / 100,
        baseline,
        observed,
        description: score > 0.5
          ? `Elevated fire activity detected in ${region} – ${Math.round(score * 100)}% above historical baseline (simulated).`
          : `Fire activity in ${region} is within expected range (simulated).`,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Observation Dataset Harmonization & Baseline Merging ──
export function mergeObservationsWithBaseline(
  liveObs: FireObservation[],
  baselineObs: FireObservation[] = MOCK_OBSERVATIONS,
): FireObservation[] {
  if (!liveObs || liveObs.length === 0) return baselineObs;
  const liveIds = new Set(liveObs.map((o) => o.id));
  const uniqueBaseline = baselineObs.filter((o) => !liveIds.has(o.id));
  return [...liveObs, ...uniqueBaseline];
}

// ── Filter service ──
export function filterObservations(data: FireObservation[], filters: FilterState): FireObservation[] {
  return data.filter(d => {
    if (filters.dateRange.start && (!d.date || d.date < filters.dateRange.start)) return false;
    if (filters.dateRange.end && (!d.date || d.date > filters.dateRange.end)) return false;
    if (filters.satellites.length > 0 && !filters.satellites.includes(d.satellite)) return false;
    if (filters.confidence.length > 0 && !filters.confidence.includes(d.confidence)) return false;
    if (d.frp < filters.frpRange.min || d.frp > filters.frpRange.max) return false;
    if (filters.country && d.country !== filters.country) return false;
    if (filters.continent && d.continent !== filters.continent) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (!d.region.toLowerCase().includes(q) && !d.country.toLowerCase().includes(q) && !d.id.toLowerCase().includes(q))
        return false;
    }
    return true;
  });
}

// ── Unique value helpers ──
export function getUniqueCountries(data: FireObservation[]): string[] {
  return [...new Set(data.map(d => d.country))].sort();
}

export function getUniqueContinents(data: FireObservation[]): string[] {
  return [...new Set(data.map(d => d.continent))].sort();
}

// ── Search & Location Telemetry ──
export interface SearchLocation {
  name: string;
  type: 'country' | 'continent' | 'region';
  lat: number;
  lon: number;
  continent?: string;
}

export const SEARCH_LOCATIONS: SearchLocation[] = [
  // Continents
  { name: 'Africa', type: 'continent', lat: 1.65, lon: 17.82 },
  { name: 'South America', type: 'continent', lat: -14.23, lon: -51.92 },
  { name: 'North America', type: 'continent', lat: 40.0, lon: -100.0 },
  { name: 'Asia', type: 'continent', lat: 34.04, lon: 100.61 },
  { name: 'Europe', type: 'continent', lat: 54.52, lon: 15.25 },
  { name: 'Oceania', type: 'continent', lat: -25.27, lon: 133.77 },

  // Countries & Major Fire Regions
  { name: 'Brazil', type: 'country', lat: -14.23, lon: -51.92, continent: 'South America' },
  { name: 'Amazon Basin', type: 'region', lat: -5.0, lon: -60.0, continent: 'South America' },
  { name: 'Cerrado', type: 'region', lat: -14.0, lon: -48.0, continent: 'South America' },
  { name: 'United States', type: 'country', lat: 37.09, lon: -95.71, continent: 'North America' },
  { name: 'California', type: 'region', lat: 36.77, lon: -119.41, continent: 'North America' },
  { name: 'Canada', type: 'country', lat: 56.13, lon: -106.34, continent: 'North America' },
  { name: 'Boreal Canada', type: 'region', lat: 56.0, lon: -105.0, continent: 'North America' },
  { name: 'Australia', type: 'country', lat: -25.27, lon: 133.77, continent: 'Oceania' },
  { name: 'Northern Australia', type: 'region', lat: -16.0, lon: 133.0, continent: 'Oceania' },
  { name: 'Indonesia', type: 'country', lat: -0.78, lon: 113.92, continent: 'Asia' },
  { name: 'DR Congo', type: 'country', lat: -4.03, lon: 21.75, continent: 'Africa' },
  { name: 'Central Africa', type: 'region', lat: 0.0, lon: 22.0, continent: 'Africa' },
  { name: 'Nigeria', type: 'country', lat: 9.08, lon: 8.67, continent: 'Africa' },
  { name: 'Mozambique', type: 'country', lat: -18.66, lon: 35.52, continent: 'Africa' },
  { name: 'India', type: 'country', lat: 20.59, lon: 78.96, continent: 'Asia' },
  { name: 'Russia (Siberia)', type: 'country', lat: 60.0, lon: 100.0, continent: 'Asia' },
  { name: 'Greece', type: 'country', lat: 39.07, lon: 21.82, continent: 'Europe' },
  { name: 'Portugal', type: 'country', lat: 39.39, lon: -8.22, continent: 'Europe' },
  { name: 'Spain', type: 'country', lat: 40.46, lon: -3.74, continent: 'Europe' },
  { name: 'Mexico', type: 'country', lat: 23.63, lon: -102.55, continent: 'North America' },
  { name: 'Argentina', type: 'country', lat: -38.41, lon: -63.61, continent: 'South America' },
];

export function parseCoordinates(query: string): { lat: number; lon: number } | null {
  const regex = /^\s*(-?\d+(\.\d+)?)\s*[, ]\s*(-?\d+(\.\d+)?)\s*$/;
  const match = query.match(regex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[3]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }
  return null;
}

// ──────────────────────────────────────────────
// Spatial-Temporal Matching Engine & Harmonzation Calculations
// ──────────────────────────────────────────────

/** Calculate great-circle distance between two geographic coordinates using the Haversine formula (km) */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/** Calculate absolute time difference in minutes between two ISO date/time strings */
export function timeDifferenceMinutes(
  date1: string | null | undefined,
  time1: string | null | undefined,
  date2: string | null | undefined,
  time2: string | null | undefined,
): number {
  if (!date1 || !time1 || !date2 || !time2) return 999999;
  const d1 = new Date(`${date1}T${time1}:00Z`).getTime();
  const d2 = new Date(`${date2}T${time2}:00Z`).getTime();
  if (isNaN(d1) || isNaN(d2)) return 999999;
  return Math.round(Math.abs(d1 - d2) / 60000);
}

/**
 * Execute candidate spatial-temporal association engine between MODIS (1 km) and VIIRS (375 m) observations.
 * Uses greedy nearest-neighbor matching to prevent double-counting.
 */
export function runSpatialMatchingEngine(
  observations: FireObservation[],
  params: MatchingEngineParams,
): SpatialMatchingResults {
  const modisList = observations.filter((o) => o.satellite === 'MODIS');
  const viirsList = observations.filter((o) => o.satellite === 'VIIRS');

  const matchedPairs: MatchedFirePair[] = [];
  const matchedModisIds = new Set<string>();
  const matchedViirsIds = new Set<string>();

  const eligibleViirs = viirsList.filter((v) => {
    if (params.confidenceRequirement === 'high_only') return v.confidence === 'high';
    if (params.confidenceRequirement === 'nominal_and_above') return v.confidence !== 'low';
    return true;
  });

  for (const m of modisList) {
    if (params.confidenceRequirement === 'high_only' && m.confidence !== 'high') continue;
    if (params.confidenceRequirement === 'nominal_and_above' && m.confidence === 'low') continue;

    let bestViirs: FireObservation | null = null;
    let minDistance = Infinity;
    let minTimeDiff = Infinity;

    for (const v of eligibleViirs) {
      if (matchedViirsIds.has(v.id)) continue;
      // Date must match and be valid
      if (!m.date || !v.date || m.date !== v.date) continue;
      if (!m.time || !v.time) continue;

      const timeDiff = timeDifferenceMinutes(m.date, m.time, v.date, v.time);
      if (timeDiff > params.temporalToleranceMinutes) continue;

      const dist = haversineDistanceKm(m.latitude, m.longitude, v.latitude, v.longitude);
      if (dist <= params.spatialToleranceKm) {
        if (dist < minDistance) {
          minDistance = dist;
          minTimeDiff = timeDiff;
          bestViirs = v;
        }
      }
    }

    if (bestViirs) {
      matchedModisIds.add(m.id);
      matchedViirsIds.add(bestViirs.id);

      const frpDiff = Math.round((bestViirs.frp - m.frp) * 10) / 10;
      const frpRatio = m.frp > 0 ? Math.round((bestViirs.frp / m.frp) * 100) / 100 : 1;

      let status: 'high_confidence_match' | 'candidate_match' | 'marginal_match' = 'candidate_match';
      if (minDistance <= 1.0 && minTimeDiff <= 30 && m.confidence === 'high' && bestViirs.confidence === 'high') {
        status = 'high_confidence_match';
      } else if (minDistance > params.spatialToleranceKm * 0.8 || minTimeDiff > params.temporalToleranceMinutes * 0.8) {
        status = 'marginal_match';
      }

      matchedPairs.push({
        id: `MATCH-${m.id.replace('FN-', '')}-${bestViirs.id.replace('FN-', '')}`,
        modis: m,
        viirs: bestViirs,
        distanceKm: minDistance,
        timeDiffMinutes: minTimeDiff,
        frpDiff,
        frpRatio,
        status,
      });
    }
  }

  const modisOnly = modisList.filter((m) => !matchedModisIds.has(m.id));
  const viirsOnly = viirsList.filter((v) => !matchedViirsIds.has(v.id));

  const totalObs = observations.length || 1;
  const totalMatchedObs = matchedPairs.length * 2;
  const matchRatePct = Math.round((totalMatchedObs / totalObs) * 1000) / 10;
  const unmatchedRatePct = Math.round((100 - matchRatePct) * 10) / 10;

  const meanDistanceKm =
    matchedPairs.length > 0
      ? Math.round(
          (matchedPairs.reduce((s, p) => s + p.distanceKm, 0) / matchedPairs.length) * 100,
        ) / 100
      : 0;

  const meanTimeDiffMin =
    matchedPairs.length > 0
      ? Math.round(
          matchedPairs.reduce((s, p) => s + p.timeDiffMinutes, 0) / matchedPairs.length,
        )
      : 0;

  const meanFrpBias =
    matchedPairs.length > 0
      ? Math.round(
          (matchedPairs.reduce((s, p) => s + p.frpDiff, 0) / matchedPairs.length) * 10,
        ) / 10
      : 0;

  return {
    matchedPairs,
    modisOnly,
    viirsOnly,
    totalModis: modisList.length,
    totalViirs: viirsList.length,
    matchRatePct,
    unmatchedRatePct,
    meanDistanceKm,
    meanTimeDiffMin,
    meanFrpBias,
  };
}

/** Compute acquisition time-of-day distribution for Terra/Aqua vs SNPP/NOAA-20 overpasses */
export function computeDetectionHourDistribution(observations: FireObservation[]) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    modis: 0,
    viirs: 0,
    total: 0,
  }));

  observations.forEach((o) => {
    if (!o.time || typeof o.time !== 'string') return;
    const h = parseInt(o.time.split(':')[0], 10);
    if (h >= 0 && h < 24) {
      if (o.satellite === 'MODIS') hours[h].modis += 1;
      else hours[h].viirs += 1;
      hours[h].total += 1;
    }
  });

  return hours;
}

/** Compute detailed statistical comparison of FRP for MODIS and VIIRS */
export function computeSensorFRPStats(observations: FireObservation[]) {
  const modis = observations.filter((o) => o.satellite === 'MODIS');
  const viirs = observations.filter((o) => o.satellite === 'VIIRS');

  const calcMedian = (arr: number[]) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  };

  const modisFrps = modis.map((o) => o.frp);
  const viirsFrps = viirs.map((o) => o.frp);

  const modisMean = modis.length ? Math.round((modisFrps.reduce((a, b) => a + b, 0) / modis.length) * 10) / 10 : 0;
  const viirsMean = viirs.length ? Math.round((viirsFrps.reduce((a, b) => a + b, 0) / viirs.length) * 10) / 10 : 0;

  const modisMedian = calcMedian(modisFrps);
  const viirsMedian = calcMedian(viirsFrps);

  const modisMax = modis.length ? Math.max(...modisFrps) : 0;
  const viirsMax = viirs.length ? Math.max(...viirsFrps) : 0;

  return {
    modisMean,
    viirsMean,
    modisMedian,
    viirsMedian,
    modisMax,
    viirsMax,
  };
}


