import React, { useMemo } from 'react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { computeMean, computeMedian } from '../../utils/analyticsMath';
import {
  Flame,
  Zap,
  Radio,
  Activity,
  Gauge,
  ShieldCheck,
  GitMerge,
  Info,
} from 'lucide-react';

interface AnalyticsKpiCardsProps {
  observations: FireObservation[];
  matchedPairs: MatchedFirePair[];
  onNavigateToComparison?: () => void;
}

export const AnalyticsKpiCards: React.FC<AnalyticsKpiCardsProps> = ({
  observations,
  matchedPairs,
  onNavigateToComparison,
}) => {
  const stats = useMemo(() => {
    const total = observations.length;
    const modisList = observations.filter((o) => o.satellite === 'MODIS');
    const viirsList = observations.filter((o) => o.satellite === 'VIIRS');
    const modisCount = modisList.length;
    const viirsCount = viirsList.length;

    const frpValues = observations.map((o) => o.frp);
    const meanFrp = computeMean(frpValues);
    const medianFrp = computeMedian(frpValues);

    const highConfCount = observations.filter((o) => o.confidence === 'high').length;
    const highConfPct = total > 0 ? Math.round((highConfCount / total) * 1000) / 10 : 0;

    const matchedCount = matchedPairs.length;
    const matchRate = modisCount > 0 ? Math.round((matchedCount / modisCount) * 1000) / 10 : 0;

    // Monthly sparkline aggregates (12 points)
    const monthlyTotals = Array(12).fill(0);
    const monthlyModis = Array(12).fill(0);
    const monthlyViirs = Array(12).fill(0);
    const monthlyFrpSum = Array(12).fill(0);

    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          monthlyTotals[m] += 1;
          if (o.satellite === 'MODIS') monthlyModis[m] += 1;
          else monthlyViirs[m] += 1;
          monthlyFrpSum[m] += o.frp;
        }
      }
    });

    const monthlyAvgFrp = monthlyTotals.map((tot, i) =>
      tot > 0 ? Math.round((monthlyFrpSum[i] / tot) * 10) / 10 : 0
    );

    return {
      total,
      modisCount,
      viirsCount,
      modisShare: total > 0 ? Math.round((modisCount / total) * 100) : 0,
      viirsShare: total > 0 ? Math.round((viirsCount / total) * 100) : 0,
      meanFrp,
      medianFrp,
      highConfCount,
      highConfPct,
      matchedCount,
      matchRate,
      sparklines: {
        total: monthlyTotals,
        modis: monthlyModis,
        viirs: monthlyViirs,
        frp: monthlyAvgFrp,
      },
    };
  }, [observations, matchedPairs]);

  // Mini SVG Sparkline generator
  const renderSparkline = (data: number[], strokeColor: string) => {
    if (data.length === 0) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 80;
    const height = 24;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="space-y-3">
      {/* 7 Scientific KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {/* 1. Total Satellite Observations */}
        <div className="card p-4 bg-surface/95 border-border/80 shadow-md hover:border-border transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Total Observations
              </span>
              <Radio className="w-3.5 h-3.5 text-cyan" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-text-primary mt-1">
              {stats.total.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-muted mt-0.5">Active thermal pixels</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] font-mono text-cyan">100% Cohort</span>
            {renderSparkline(stats.sparklines.total, '#00E5B0')}
          </div>
        </div>

        {/* 2. MODIS Observations */}
        <div className="card p-4 bg-surface/95 border-fire/30 shadow-md hover:border-fire/60 transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-fire">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> MODIS 1 km
              </span>
              <span className="text-[10px] font-mono font-bold bg-fire/15 px-1.5 py-0.2 rounded border border-fire/30">
                {stats.modisShare}%
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-fire mt-1">
              {stats.modisCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">Terra &amp; Aqua passes</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] text-text-muted">1 km nominal</span>
            {renderSparkline(stats.sparklines.modis, '#FF713E')}
          </div>
        </div>

        {/* 3. VIIRS Observations */}
        <div className="card p-4 bg-surface/95 border-cyan/30 shadow-md hover:border-cyan/60 transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-cyan">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> VIIRS 375 m
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan/15 px-1.5 py-0.2 rounded border border-cyan/30">
                {stats.viirsShare}%
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan mt-1">
              {stats.viirsCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">Suomi-NPP &amp; NOAA-20</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] text-text-muted">375 m I-band</span>
            {renderSparkline(stats.sparklines.viirs, '#00E5B0')}
          </div>
        </div>

        {/* 4. Average FRP */}
        <div className="card p-4 bg-surface/95 border-border/80 shadow-md hover:border-border transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" /> Mean FRP
              </span>
              <span className="text-[10px] text-amber-400 font-mono">MW</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">
              {stats.meanFrp} <span className="text-xs font-normal text-text-muted">MW</span>
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">Arithmetic mean output</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-[10px] text-text-muted">Monthly Trend</span>
            {renderSparkline(stats.sparklines.frp, '#f59e0b')}
          </div>
        </div>

        {/* 5. Median FRP */}
        <div className="card p-4 bg-surface/95 border-border/80 shadow-md hover:border-border transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-cyan" /> Median FRP
              </span>
              <span className="text-[10px] text-cyan font-mono">50th %ile</span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-text-primary mt-1">
              {stats.medianFrp} <span className="text-xs font-normal text-text-muted">MW</span>
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">Robust central value</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-text-muted">
            <span>Skew Index</span>
            <span className="font-mono text-text-primary font-bold">
              {stats.medianFrp > 0 ? (stats.meanFrp / stats.medianFrp).toFixed(1) : 1}x Mean
            </span>
          </div>
        </div>

        {/* 6. High Confidence % */}
        <div className="card p-4 bg-surface/95 border-emerald-500/30 shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> High Conf
              </span>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                {stats.highConfPct}%
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">
              {stats.highConfCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">Algorithm certainty</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-text-muted">
            <span>Filter verified</span>
            <span className="font-mono text-emerald-400">Strict check</span>
          </div>
        </div>

        {/* 7. Candidate Matched Observations */}
        <div
          onClick={onNavigateToComparison}
          className="card p-4 bg-surface/95 border-cyan/40 shadow-md hover:border-cyan hover:bg-surface-light transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          title="Click to view detailed matching analysis on Comparison page"
        >
          <div>
            <div className="flex items-center justify-between text-cyan">
              <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <GitMerge className="w-3.5 h-3.5" /> Matched Pairs
              </span>
              <span className="text-[10px] font-mono font-bold bg-cyan/15 px-1.5 py-0.2 rounded border border-cyan/30">
                {stats.matchRate}%
              </span>
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan mt-1 group-hover:scale-105 transition-transform">
              {stats.matchedCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-text-secondary mt-0.5">&le;2 km &amp; &le;90 min</div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-cyan group-hover:underline">
            <span>Co-located</span>
            <span>View &rarr;</span>
          </div>
        </div>
      </div>

      {/* Scientific Clarification Banner: Observations vs Unique Events */}
      <div className="px-4 py-2.5 rounded-xl bg-navy/80 border border-border/60 text-xs text-text-secondary flex items-start gap-2.5 print:hidden">
        <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-primary">Remote Sensing Clarification:</strong> Satellite
          active fire records report individual instantaneous pixel-level thermal anomalies detected
          during polar orbital swaths. Multiple detections frequently correspond to the same ongoing
          wildfire perimeter across successive daytime and nighttime satellite overpasses. FIRENEXUS
          distinguishes raw satellite pixel observations from clustered wildfire incident complexes.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsKpiCards;

