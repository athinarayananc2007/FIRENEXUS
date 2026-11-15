import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';
import { Zap, Info } from 'lucide-react';
import type { FireObservation } from '../../types';
import { computeFrpBins } from '../../data/mock/fireData';

interface IntensityAnalyticsProps {
  observations: FireObservation[];
}

export default function IntensityAnalytics({ observations }: IntensityAnalyticsProps) {
  const bins = useMemo(() => computeFrpBins(observations), [observations]);

  const modis = useMemo(
    () => observations.filter((o) => o.satellite === 'MODIS'),
    [observations],
  );
  const viirs = useMemo(
    () => observations.filter((o) => o.satellite === 'VIIRS'),
    [observations],
  );

  const modisAvg =
    modis.length > 0
      ? Math.round((modis.reduce((s, o) => s + o.frp, 0) / modis.length) * 10) / 10
      : 0;
  const viirsAvg =
    viirs.length > 0
      ? Math.round((viirs.reduce((s, o) => s + o.frp, 0) / viirs.length) * 10) / 10
      : 0;

  const extremeCount = bins.find((b) => b.label === 'Extreme')?.count || 0;

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl p-5 flex flex-col justify-between backdrop-blur-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Fire Radiative Power (FRP) &amp; Intensity
            </h3>
            <p className="text-xs text-text-secondary">
              Radiant thermal energy emission rate (MW) and combustion severity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-amber-400 font-bold">
            Extreme: {extremeCount}
          </span>
          <span className="text-text-muted">|</span>
          <span className="font-mono text-fire font-bold">
            MODIS: {modisAvg} MW
          </span>
          <span className="text-text-muted">|</span>
          <span className="font-mono text-cyan font-bold">
            VIIRS: {viirsAvg} MW
          </span>
        </div>
      </div>

      {/* Scientific Explanation Callout */}
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-text-secondary flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-300 font-semibold">
            Radiative Power vs Burned Area:{' '}
          </strong>
          FRP measures the instantaneous rate of radiant heat released by actively combusting vegetation (expressed in Megawatts, MW). While FRP correlates directly with biomass consumption and particulate emissions, it{' '}
          <strong className="text-text-primary">
            does not quantify total burned area or scarred perimeter
          </strong>.
        </div>
      </div>

      {/* FRP Histogram Chart */}
      <div className="w-full h-56 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} />
            <XAxis
              dataKey="range"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#1F2E4A' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={{ stroke: '#1F2E4A' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #1F2E4A',
                borderRadius: '12px',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(val: any, name: any) => [
                `${Number(val).toLocaleString()} hotspots`,
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            <Bar dataKey="modis" name="MODIS (1 km)" fill="#FF713E" radius={[4, 4, 0, 0]} />
            <Bar dataKey="viirs" name="VIIRS (375 m)" fill="#00E5B0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Intensity Tiers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/50">
        {bins.map((tier) => {
          const color =
            tier.label === 'Low'
              ? 'text-emerald-400 border-emerald-500/30'
              : tier.label === 'Moderate'
                ? 'text-cyan border-cyan/30'
                : tier.label === 'High'
                  ? 'text-warning border-warning/30'
                  : 'text-rose-400 border-rose-500/30';
          return (
            <div
              key={tier.label}
              className={`p-2.5 rounded-xl bg-surface/40 border ${color} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-text-primary">{tier.label}</span>
                  <span className="font-mono text-text-muted">{tier.range}</span>
                </div>
                <div className="text-lg font-mono font-bold text-text-primary">
                  {tier.count.toLocaleString()}
                </div>
              </div>
              <div className="text-[10px] text-text-muted mt-1.5 flex items-center justify-between">
                <span>{tier.percentage}% of total</span>
                <span className="font-mono">{tier.modis}M / {tier.viirs}V</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}