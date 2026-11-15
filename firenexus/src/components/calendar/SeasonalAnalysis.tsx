import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import { Compass, Flame, Zap, ShieldCheck, Sun, Snowflake, CloudRain, Wind } from 'lucide-react';

interface SeasonalAnalysisProps {
  observations: FireObservation[];
}

type HemisphereScope = 'global' | 'northern' | 'southern';

interface SeasonMetric {
  id: string;
  name: string;
  months: string;
  icon: any;
  hemisphereContext: string;
  totalHotspots: number;
  modisCount: number;
  viirsCount: number;
  avgFrp: number;
  highConfPct: number;
  keyBiomes: string;
  scientificNotes: string;
}

export const SeasonalAnalysis: React.FC<SeasonalAnalysisProps> = ({ observations }) => {
  const [scope, setScope] = useState<HemisphereScope>('global');

  // Filter observations based on hemisphere scope
  const scopedObservations = useMemo(() => {
    if (scope === 'northern') {
      return observations.filter((o) => o.latitude >= 0);
    }
    if (scope === 'southern') {
      return observations.filter((o) => o.latitude < 0);
    }
    return observations;
  }, [observations, scope]);

  // Group by meteorological season
  // Dec-Feb: Winter (North) / Summer (South)
  // Mar-May: Spring (North) / Autumn (South)
  // Jun-Aug: Summer (North) / Winter-Dry (South)
  // Sep-Nov: Autumn (North) / Spring-Dry (South)
  const seasonsData: SeasonMetric[] = useMemo(() => {
    const buckets: Record<string, FireObservation[]> = {
      q1: [], // Dec-Feb
      q2: [], // Mar-May
      q3: [], // Jun-Aug
      q4: [], // Sep-Nov
    };

    scopedObservations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      const parts = obs.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        if (m === 12 || m === 1 || m === 2) buckets.q1.push(obs);
        else if (m >= 3 && m <= 5) buckets.q2.push(obs);
        else if (m >= 6 && m <= 8) buckets.q3.push(obs);
        else if (m >= 9 && m <= 11) buckets.q4.push(obs);
      }
    });

    const computeMetrics = (obsList: FireObservation[]) => {
      const total = obsList.length;
      const modis = obsList.filter((o) => o.satellite === 'MODIS').length;
      const viirs = obsList.filter((o) => o.satellite === 'VIIRS').length;
      const avgFrp =
        total > 0
          ? Math.round((obsList.reduce((s, o) => s + o.frp, 0) / total) * 10) / 10
          : 0;
      const highConf = obsList.filter((o) => o.confidence === 'high').length;
      const highConfPct = total > 0 ? Math.round((highConf / total) * 100) : 0;

      // Primary regions
      const bCounts = new Map<string, number>();
      obsList.forEach((o) => bCounts.set(o.region, (bCounts.get(o.region) || 0) + 1));
      const sortedBiomes = Array.from(bCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([b]) => b);

      return {
        total,
        modis,
        viirs,
        avgFrp,
        highConfPct,
        keyBiomes: sortedBiomes.join(', ') || 'Global Woodlands',
      };
    };

    const q1Metrics = computeMetrics(buckets.q1);
    const q2Metrics = computeMetrics(buckets.q2);
    const q3Metrics = computeMetrics(buckets.q3);
    const q4Metrics = computeMetrics(buckets.q4);

    return [
      {
        id: 'q3',
        name: 'June – August',
        months: 'Jun, Jul, Aug',
        icon: Sun,
        hemisphereContext:
          scope === 'southern'
            ? 'Austral Winter / Early Tropical Dry Season'
            : 'Boreal Summer / Peak Arctic & Temperate Fires',
        totalHotspots: q3Metrics.total,
        modisCount: q3Metrics.modis,
        viirsCount: q3Metrics.viirs,
        avgFrp: q3Metrics.avgFrp,
        highConfPct: q3Metrics.highConfPct,
        keyBiomes: q3Metrics.keyBiomes,
        scientificNotes:
          'Maximum global fire activity driven by intense boreal wildfires across Canada and Siberia, concurrent with onset of the dry season in the Amazon and Cerrado.',
      },
      {
        id: 'q4',
        name: 'September – November',
        months: 'Sep, Oct, Nov',
        icon: Wind,
        hemisphereContext:
          scope === 'northern'
            ? 'Boreal Autumn / Post-Harvest Burning'
            : 'Austral Spring / Peak Southern Savanna Fires',
        totalHotspots: q4Metrics.total,
        modisCount: q4Metrics.modis,
        viirsCount: q4Metrics.viirs,
        avgFrp: q4Metrics.avgFrp,
        highConfPct: q4Metrics.highConfPct,
        keyBiomes: q4Metrics.keyBiomes,
        scientificNotes:
          'Peak biomass burning across South America (Amazon/Cerrado) and Sub-Saharan Africa. High prevalence of small agricultural fires detected by VIIRS 375m.',
      },
      {
        id: 'q1',
        name: 'December – February',
        months: 'Dec, Jan, Feb',
        icon: Snowflake,
        hemisphereContext:
          scope === 'southern'
            ? 'Austral Summer / Australian Bushfires'
            : 'Boreal Winter / Sahel & Equatorial Fire Belt',
        totalHotspots: q1Metrics.total,
        modisCount: q1Metrics.modis,
        viirsCount: q1Metrics.viirs,
        avgFrp: q1Metrics.avgFrp,
        highConfPct: q1Metrics.highConfPct,
        keyBiomes: q1Metrics.keyBiomes,
        scientificNotes:
          'Northern hemisphere is mostly dormant under snow cover, but the African Sahel savanna fire belt experiences intense seasonal agricultural burning.',
      },
      {
        id: 'q2',
        name: 'March – May',
        months: 'Mar, Apr, May',
        icon: CloudRain,
        hemisphereContext:
          scope === 'southern'
            ? 'Austral Autumn / Post-Wet Season'
            : 'Boreal Spring / SE Asian Pre-Monsoon Peak',
        totalHotspots: q2Metrics.total,
        modisCount: q2Metrics.modis,
        viirsCount: q2Metrics.viirs,
        avgFrp: q2Metrics.avgFrp,
        highConfPct: q2Metrics.highConfPct,
        keyBiomes: q2Metrics.keyBiomes,
        scientificNotes:
          'Intense pre-monsoon biomass burning in mainland Southeast Asia (Myanmar, Thailand, Laos), combined with spring prescribed burns in North America.',
      },
    ];
  }, [scopedObservations, scope]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header and Geographic Scope Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan" />
            Seasonal Phenology & Hemispheric Fire Regimes
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Bioclimatic fire regime dynamics comparing Boreal summer peaks with Austral tropical dry
            seasons.
          </p>
        </div>

        {/* Scope Pill Toggle */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-lg border border-border/60 text-xs">
          <button
            onClick={() => setScope('global')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              scope === 'global'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Global Regime
          </button>
          <button
            onClick={() => setScope('northern')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              scope === 'northern'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Northern Hemisphere (≥0°N)
          </button>
          <button
            onClick={() => setScope('southern')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              scope === 'southern'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Southern Hemisphere (&lt;0°S)
          </button>
        </div>
      </div>

      {/* 4 Seasonal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {seasonsData.map((s) => {
          const Icon = s.icon;
          const totalScoped = scopedObservations.length;
          const sharePct = totalScoped > 0 ? Math.round((s.totalHotspots / totalScoped) * 100) : 0;

          return (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/50 transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-cyan border border-border/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-text-primary">{s.name}</h3>
                      <span className="text-[10px] text-text-muted font-mono">{s.months}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan bg-midnight px-2 py-0.5 rounded border border-border/50">
                    {sharePct}%
                  </span>
                </div>

                <div className="text-[11px] font-semibold text-text-secondary mb-3 leading-snug">
                  {s.hemisphereContext}
                </div>

                {/* Metrics */}
                <div className="space-y-1.5 bg-midnight/70 p-2.5 rounded-lg border border-border/40 text-xs font-mono">
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Total Detections:</span>
                    <strong className="text-text-primary">{s.totalHotspots.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1 text-fire">
                      <Flame className="w-3 h-3" /> MODIS:
                    </span>
                    <strong className="text-text-primary">{s.modisCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1 text-cyan">
                      <Zap className="w-3 h-3" /> VIIRS:
                    </span>
                    <strong className="text-text-primary">{s.viirsCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Mean FRP:</span>
                    <strong className="text-amber-400">{s.avgFrp} MW</strong>
                  </div>
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3 h-3" /> High Conf:
                    </span>
                    <strong className="text-emerald-400">{s.highConfPct}%</strong>
                  </div>
                </div>
              </div>

              {/* Scientific notes */}
              <div className="pt-2 border-t border-border/40 text-[11px] text-text-secondary leading-relaxed">
                {s.scientificNotes}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scientific Context Callout */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-navy/90 to-surface/90 border border-cyan/30 flex items-start gap-3 text-xs">
        <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center shrink-0 mt-0.5">
          <Compass className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-text-primary">
            Scientific Remote Sensing Principle: Hemispheric Asymmetry & Sensor Complementarity
          </h4>
          <p className="text-text-secondary leading-relaxed">
            Active fire detection depends on both meteorological fuel dryness and satellite swath
            geometry. During high-latitude boreal summers (Jun–Aug), 24-hour daylight and high
            temperatures yield large, intense wildfires with elevated Fire Radiative Power (MW)
            detected by both MODIS and VIIRS. In contrast, during the tropical dry season (Aug–Oct) in
            the Southern Hemisphere, hundreds of smaller agricultural and savanna fires occur that are
            disproportionately captured by VIIRS's higher spatial resolution (375 m nadir) rather than
            MODIS (1 km), proving the essential value of sensor harmonization.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeasonalAnalysis;
