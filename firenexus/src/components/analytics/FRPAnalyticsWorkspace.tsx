import React, { useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  computeMean,
  computeMedian,
  computeStandardDeviation,
  computeIQR,
  computeFRPDistribution,
} from '../../utils/analyticsMath';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';

interface FRPAnalyticsWorkspaceProps {
  observations: FireObservation[];
}

export const FRPAnalyticsWorkspace: React.FC<FRPAnalyticsWorkspaceProps> = ({ observations }) => {
  // FRP Values array
  const frpValues = useMemo(() => observations.map((o) => o.frp), [observations]);

  // Comprehensive descriptive statistics
  const stats = useMemo(() => {
    const mean = computeMean(frpValues);
    const median = computeMedian(frpValues);
    const stdDev = computeStandardDeviation(frpValues, mean);
    const { q1, q3, iqr } = computeIQR(frpValues);
    const max = frpValues.length > 0 ? Math.round(Math.max(...frpValues) * 10) / 10 : 0;
    const min = frpValues.length > 0 ? Math.round(Math.min(...frpValues) * 10) / 10 : 0;

    return { mean, median, stdDev, q1, q3, iqr, max, min };
  }, [frpValues]);

  // Histogram distribution
  const distributionBins = useMemo(() => {
    return computeFRPDistribution(observations);
  }, [observations]);

  // FRP by confidence level
  const confidenceFRP = useMemo(() => {
    const levels = ['high', 'nominal', 'low'] as const;
    return levels.map((lvl) => {
      const subset = observations.filter((o) => o.confidence === lvl);
      const vals = subset.map((o) => o.frp);
      return {
        level: lvl.toUpperCase(),
        count: subset.length,
        mean: computeMean(vals),
        median: computeMedian(vals),
      };
    });
  }, [observations]);

  // Monthly FRP evolution trend
  const monthlyFRP = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      month: months[i],
      modisFRP: [] as number[],
      viirsFRP: [] as number[],
      allFRP: [] as number[],
    }));

    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          buckets[m].allFRP.push(o.frp);
          if (o.satellite === 'MODIS') buckets[m].modisFRP.push(o.frp);
          else buckets[m].viirsFRP.push(o.frp);
        }
      }
    });

    return buckets.map((b) => ({
      month: b.month,
      'Overall Mean FRP': computeMean(b.allFRP),
      'MODIS Mean FRP': computeMean(b.modisFRP),
      'VIIRS Mean FRP': computeMean(b.viirsFRP),
    }));
  }, [observations]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Fire Radiative Power (FRP) Energetics Workspace
            </h2>
            <span className="demo-badge text-[10px]">Radiant Flux Analysis</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Quantification of instantaneous thermal radiation emissions (MW) and combustion rate
            distribution across satellite swaths.
          </p>
        </div>

        <div className="text-xs font-mono text-text-muted bg-navy/80 px-3 py-1.5 rounded-lg border border-border/60">
          Units: <span className="text-amber-400 font-bold">Megawatts (MW = 10⁶ J/s)</span>
        </div>
      </div>

      {/* 5 Energetic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Arithmetic Mean FRP
          </div>
          <div className="text-xl font-extrabold font-mono text-amber-400">
            {stats.mean} <span className="text-xs text-text-muted font-normal">MW</span>
          </div>
          <div className="text-[10px] text-text-secondary">Expected value &mu;</div>
        </div>

        <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Median FRP (50th %ile)
          </div>
          <div className="text-xl font-extrabold font-mono text-cyan">
            {stats.median} <span className="text-xs text-text-muted font-normal">MW</span>
          </div>
          <div className="text-[10px] text-text-secondary">Robust to extreme tails</div>
        </div>

        <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Standard Deviation (&sigma;)
          </div>
          <div className="text-xl font-extrabold font-mono text-text-primary">
            &plusmn;{stats.stdDev} <span className="text-xs text-text-muted font-normal">MW</span>
          </div>
          <div className="text-[10px] text-text-secondary">Dispersion variance</div>
        </div>

        <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
          <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
            Interquartile Range (IQR)
          </div>
          <div className="text-xl font-extrabold font-mono text-text-primary">
            {stats.iqr} <span className="text-xs text-text-muted font-normal">MW</span>
          </div>
          <div className="text-[10px] text-text-secondary">
            Q1: {stats.q1} &rarr; Q3: {stats.q3} MW
          </div>
        </div>

        <div className="p-3.5 bg-navy/70 border border-fire/40 rounded-xl space-y-1">
          <div className="text-[10px] text-fire uppercase tracking-wider font-semibold">
            Maximum Recorded FRP
          </div>
          <div className="text-xl font-extrabold font-mono text-fire">
            {stats.max} <span className="text-xs text-text-muted font-normal">MW</span>
          </div>
          <div className="text-[10px] text-text-secondary">Extreme crown fire event</div>
        </div>
      </div>

      {/* Main Grid: Distribution Histogram & Monthly Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* FRP Distribution Histogram */}
        <div className="bg-navy/60 p-4 sm:p-5 rounded-xl border border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              FRP Spectrum Bins by Sensor
            </span>
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan" /> VIIRS
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distributionBins}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="bin" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                            {d.bin}
                          </div>
                          <div className="text-fire flex items-center justify-between gap-3">
                            <span>MODIS:</span>
                            <span>{d.modis}</span>
                          </div>
                          <div className="text-cyan flex items-center justify-between gap-3">
                            <span>VIIRS:</span>
                            <span>{d.viirs}</span>
                          </div>
                          <div className="text-text-primary border-t border-border/40 pt-1 flex items-center justify-between gap-3">
                            <span>Bin Total:</span>
                            <span className="font-bold">
                              {d.total} ({d.percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ display: 'none' }} />
                <Bar dataKey="modis" fill="#FF713E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="viirs" fill="#00E5B0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Mean FRP Evolution */}
        <div className="bg-navy/60 p-4 sm:p-5 rounded-xl border border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan" />
              Annual Radiative Intensity Evolution (MW)
            </span>
            <span className="text-[11px] text-text-muted font-mono">Jan – Dec</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyFRP} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                            {d.month} 2024
                          </div>
                          <div className="text-amber-400 flex items-center justify-between gap-3">
                            <span>Overall Mean:</span>
                            <span>{d['Overall Mean FRP']} MW</span>
                          </div>
                          <div className="text-fire flex items-center justify-between gap-3">
                            <span>MODIS Mean:</span>
                            <span>{d['MODIS Mean FRP']} MW</span>
                          </div>
                          <div className="text-cyan flex items-center justify-between gap-3">
                            <span>VIIRS Mean:</span>
                            <span>{d['VIIRS Mean FRP']} MW</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="MODIS Mean FRP"
                  stroke="#FF713E"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#FF713E' }}
                />
                <Line
                  type="monotone"
                  dataKey="VIIRS Mean FRP"
                  stroke="#00E5B0"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#00E5B0' }}
                />
                <Line
                  type="monotone"
                  dataKey="Overall Mean FRP"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3.5, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* FRP Distribution by Confidence Tier Table */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-navy/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border/60 font-sans">
            <tr>
              <th className="px-4 py-3">Confidence Tier</th>
              <th className="px-4 py-3">Active Observations</th>
              <th className="px-4 py-3">Arithmetic Mean FRP</th>
              <th className="px-4 py-3">Median FRP (50th %ile)</th>
              <th className="px-4 py-3">Energetic Relationship</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-text-secondary">
            {confidenceFRP.map((row) => (
              <tr key={row.level} className="hover:bg-surface-light transition-colors">
                <td className="px-4 py-2.5 font-bold text-text-primary flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      row.level === 'HIGH'
                        ? 'bg-emerald-400'
                        : row.level === 'NOMINAL'
                        ? 'bg-cyan'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>{row.level}</span>
                </td>
                <td className="px-4 py-2.5 text-text-primary">{row.count.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-amber-400 font-bold">{row.mean} MW</td>
                <td className="px-4 py-2.5 text-cyan font-bold">{row.median} MW</td>
                <td className="px-4 py-2.5 text-text-muted font-sans text-[11px]">
                  {row.level === 'HIGH'
                    ? 'Higher FRP correlates with unequivocal mid-IR radiance excess.'
                    : row.level === 'NOMINAL'
                    ? 'Standard algorithm contextual test satisfied.'
                    : 'Low thermal contrast or boundary scan artifact risk.'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Strict Scientific Distinction Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-surface to-navy border border-amber-500/30 flex items-start gap-3 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-text-primary">
            Critical Scientific Distinction: FRP &ne; Temperature &ne; Burned Area
          </h4>
          <p className="text-text-secondary leading-relaxed">
            <strong>Fire Radiative Power (FRP, MW):</strong> Quantifies the instantaneous rate of
            electromagnetic radiative heat output emitted by actively combusting fuels across the
            middle-infrared atmospheric window (MIR ~3.9 µm). FRP is directly proportional to the
            instantaneous dry biomass combustion rate (~0.368 ± 0.015 kg/MJ). FRP is{' '}
            <em>not</em> kinetic flame temperature (Kelvin), nor does it directly denote post-fire
            burned scar area (hectares). High FRP can originate from either a large smoldering front
            or an intense compact flaming vortex.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FRPAnalyticsWorkspace;
