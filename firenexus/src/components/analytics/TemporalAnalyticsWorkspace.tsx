import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import { computeDiurnalOverpass } from '../../utils/analyticsMath';
import {
  Clock,
  TrendingUp,
  Flame,
  Zap,
  Layers,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
} from 'recharts';

interface TemporalAnalyticsWorkspaceProps {
  observations: FireObservation[];
}

type AggregationMode = 'daily' | 'weekly' | 'monthly' | 'seasonal';
type ChartStyle = 'stacked_area' | 'grouped_bar' | 'share_percent';

export const TemporalAnalyticsWorkspace: React.FC<TemporalAnalyticsWorkspaceProps> = ({
  observations,
}) => {
  const [aggregation, setAggregation] = useState<AggregationMode>('monthly');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('stacked_area');

  // Daily time series
  const dailySeries = useMemo(() => {
    const map = new Map<string, { date: string; modis: number; viirs: number; total: number; frpSum: number }>();
    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      if (!map.has(o.date)) {
        map.set(o.date, { date: o.date, modis: 0, viirs: 0, total: 0, frpSum: 0 });
      }
      const entry = map.get(o.date)!;
      entry.total += 1;
      if (o.satellite === 'MODIS') entry.modis += 1;
      else entry.viirs += 1;
      entry.frpSum += o.frp;
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        key: d.date,
        label: d.date,
        shortLabel: d.date.slice(5),
        MODIS: d.modis,
        VIIRS: d.viirs,
        Total: d.total,
        modisShare: d.total > 0 ? Math.round((d.modis / d.total) * 100) : 0,
        viirsShare: d.total > 0 ? Math.round((d.viirs / d.total) * 100) : 0,
        avgFrp: d.total > 0 ? Math.round((d.frpSum / d.total) * 10) / 10 : 0,
      }));
  }, [observations]);

  // Weekly time series (52 weeks)
  const weeklySeries = useMemo(() => {
    const weeks = Array.from({ length: 52 }, (_, i) => ({
      key: `W${i + 1}`,
      label: `Week ${i + 1}`,
      shortLabel: `W${i + 1}`,
      MODIS: 0,
      VIIRS: 0,
      Total: 0,
      frpSum: 0,
      avgFrp: 0,
      modisShare: 0,
      viirsShare: 0,
    }));

    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const start = new Date(2024, 0, 1).getTime();
      const current = new Date(`${o.date}T00:00:00Z`).getTime();
      if (isNaN(current)) return;
      const dayOfYear = Math.floor((current - start) / 86400000);
      const wIdx = Math.min(51, Math.max(0, Math.floor(dayOfYear / 7)));

      weeks[wIdx].Total += 1;
      if (o.satellite === 'MODIS') weeks[wIdx].MODIS += 1;
      else weeks[wIdx].VIIRS += 1;
      weeks[wIdx].frpSum += o.frp;
    });

    return weeks.map((w) => ({
      ...w,
      modisShare: w.Total > 0 ? Math.round((w.MODIS / w.Total) * 100) : 0,
      viirsShare: w.Total > 0 ? Math.round((w.VIIRS / w.Total) * 100) : 0,
      avgFrp: w.Total > 0 ? Math.round((w.frpSum / w.Total) * 10) / 10 : 0,
    }));
  }, [observations]);

  // Monthly time series (12 months)
  const monthlySeries = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const list = Array.from({ length: 12 }, (_, i) => ({
      key: months[i],
      label: `${months[i]} 2024`,
      shortLabel: months[i],
      MODIS: 0,
      VIIRS: 0,
      Total: 0,
      frpSum: 0,
      avgFrp: 0,
      modisShare: 0,
      viirsShare: 0,
    }));

    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          list[mIdx].Total += 1;
          if (o.satellite === 'MODIS') list[mIdx].MODIS += 1;
          else list[mIdx].VIIRS += 1;
          list[mIdx].frpSum += o.frp;
        }
      }
    });

    return list.map((m) => ({
      ...m,
      modisShare: m.Total > 0 ? Math.round((m.MODIS / m.Total) * 100) : 0,
      viirsShare: m.Total > 0 ? Math.round((m.VIIRS / m.Total) * 100) : 0,
      avgFrp: m.Total > 0 ? Math.round((m.frpSum / m.Total) * 10) / 10 : 0,
    }));
  }, [observations]);

  // Seasonal time series (4 quarters)
  const seasonalSeries = useMemo(() => {
    const seasons = [
      { key: 'DJF', label: 'DJF (Dec-Feb)', shortLabel: 'DJF' },
      { key: 'MAM', label: 'MAM (Mar-May)', shortLabel: 'MAM' },
      { key: 'JJA', label: 'JJA (Jun-Aug)', shortLabel: 'JJA' },
      { key: 'SON', label: 'SON (Sep-Nov)', shortLabel: 'SON' },
    ];

    const list = seasons.map((s) => ({
      ...s,
      MODIS: 0,
      VIIRS: 0,
      Total: 0,
      frpSum: 0,
      avgFrp: 0,
      modisShare: 0,
      viirsShare: 0,
    }));

    observations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        let idx = 0;
        if (m === 12 || m === 1 || m === 2) idx = 0;
        else if (m >= 3 && m <= 5) idx = 1;
        else if (m >= 6 && m <= 8) idx = 2;
        else idx = 3;

        list[idx].Total += 1;
        if (o.satellite === 'MODIS') list[idx].MODIS += 1;
        else list[idx].VIIRS += 1;
        list[idx].frpSum += o.frp;
      }
    });

    return list.map((s) => ({
      ...s,
      modisShare: s.Total > 0 ? Math.round((s.MODIS / s.Total) * 100) : 0,
      viirsShare: s.Total > 0 ? Math.round((s.VIIRS / s.Total) * 100) : 0,
      avgFrp: s.Total > 0 ? Math.round((s.frpSum / s.Total) * 10) / 10 : 0,
    }));
  }, [observations]);

  const activeSeries = useMemo(() => {
    switch (aggregation) {
      case 'daily':
        return dailySeries;
      case 'weekly':
        return weeklySeries;
      case 'seasonal':
        return seasonalSeries;
      case 'monthly':
      default:
        return monthlySeries;
    }
  }, [aggregation, dailySeries, weeklySeries, monthlySeries, seasonalSeries]);

  // Diurnal 24-hour histogram
  const diurnalHours = useMemo(() => {
    return computeDiurnalOverpass(observations);
  }, [observations]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Advanced Temporal Dynamics &amp; Phenology
            </h2>
            <span className="demo-badge text-[10px]">Time-Series Engine</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Harmonized temporal cadence analysis contrasting MODIS and VIIRS observation rates and
            diurnal acquisition windows.
          </p>
        </div>

        {/* Aggregation & Style Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Aggregation toggle */}
          <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
            {(['daily', 'weekly', 'monthly', 'seasonal'] as AggregationMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setAggregation(mode)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                  aggregation === mode
                    ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Chart Style Toggle */}
          <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setChartStyle('stacked_area')}
              className={`p-1.5 rounded-lg text-[11px] transition-all ${
                chartStyle === 'stacked_area'
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Stacked Area View"
            >
              <Layers className="w-3.5 h-3.5 text-cyan" />
            </button>
            <button
              onClick={() => setChartStyle('grouped_bar')}
              className={`p-1.5 rounded-lg text-[11px] transition-all ${
                chartStyle === 'grouped_bar'
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
              title="Grouped Bar View"
            >
              <BarChart2 className="w-3.5 h-3.5 text-fire" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Temporal Chart */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-fire shadow-sm shadow-fire/40" />
              <span>MODIS (1 km)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-cyan shadow-sm shadow-cyan/40" />
              <span>VIIRS (375 m)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-amber-400 inline-block" />
              <span>Mean FRP (MW) [Right Axis]</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted font-mono">
            {activeSeries.length} intervals plotted
          </span>
        </div>

        <div className="h-80 sm:h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={activeSeries}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorModisArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF713E" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#FF713E" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorViirsArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5B0" stopOpacity={0.65} />
                  <stop offset="95%" stopColor="#00E5B0" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />

              <XAxis
                dataKey="shortLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                interval={aggregation === 'daily' ? 14 : aggregation === 'weekly' ? 3 : 0}
              />

              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f59e0b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                unit=" MW"
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-navy/95 border border-border/80 p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-mono">
                        <div className="font-bold text-text-primary font-sans border-b border-border/60 pb-1 flex items-center justify-between">
                          <span>{d.label}</span>
                          <span className="text-cyan font-bold">{d.Total} detections</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-fire flex items-center gap-1">
                            <Flame className="w-3 h-3" /> MODIS:
                          </span>
                          <span className="font-bold text-text-primary">
                            {d.MODIS} ({d.modisShare}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-cyan flex items-center gap-1">
                            <Zap className="w-3 h-3" /> VIIRS:
                          </span>
                          <span className="font-bold text-text-primary">
                            {d.VIIRS} ({d.viirsShare}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-1 text-amber-400">
                          <span>Mean Radiative Power:</span>
                          <span className="font-bold">{d.avgFrp} MW</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {chartStyle === 'stacked_area' ? (
                <>
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="MODIS"
                    stackId="1"
                    stroke="#FF713E"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorModisArea)"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="VIIRS"
                    stackId="1"
                    stroke="#00E5B0"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorViirsArea)"
                  />
                </>
              ) : (
                <>
                  <Bar yAxisId="left" dataKey="MODIS" fill="#FF713E" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="left" dataKey="VIIRS" fill="#00E5B0" radius={[3, 3, 0, 0]} />
                </>
              )}

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgFrp"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 1, stroke: '#0a0f1d' }}
                activeDot={{ r: 4.5, fill: '#f59e0b' }}
              />

              {aggregation === 'daily' && (
                <Brush
                  dataKey="shortLabel"
                  height={24}
                  stroke="#00E5B0"
                  fill="#0a0f1d"
                  travellerWidth={8}
                  startIndex={Math.max(0, dailySeries.length - 120)}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Diurnal 24-Hour Acquisition Timing Histogram */}
      <div className="pt-4 border-t border-border/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan" />
              Diurnal Overpass &amp; Solar Cross-Time Distribution (UTC)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Hourly detection frequency capturing diurnal fire weather cycles across polar sun-synchronous tracks.
            </p>
          </div>
          <div className="text-[11px] text-text-muted font-mono flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS Passes
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan" /> VIIRS Passes
            </span>
          </div>
        </div>

        <div className="h-48 sm:h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={diurnalHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                        <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                          {d.hour} UTC
                        </div>
                        <div className="text-fire flex items-center justify-between gap-3">
                          <span>MODIS:</span>
                          <span>{d.modisCount}</span>
                        </div>
                        <div className="text-cyan flex items-center justify-between gap-3">
                          <span>VIIRS:</span>
                          <span>{d.viirsCount}</span>
                        </div>
                        <div className="text-text-primary border-t border-border/40 pt-1 flex items-center justify-between gap-3">
                          <span>Total Hourly Fires:</span>
                          <span className="font-bold">{d.total}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="modisCount" fill="#FF713E" stackId="diurnal" radius={[0, 0, 0, 0]} />
              <Bar dataKey="viirsCount" fill="#00E5B0" stackId="diurnal" radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="p-3 rounded-lg bg-navy/70 border border-border/50 text-[11px] text-text-secondary leading-relaxed">
          <strong className="text-text-primary">Diurnal Physics Note:</strong> The afternoon peak
          at ~13:00–14:00 local solar time corresponds to peak atmospheric vapor pressure deficit
          (VPD), minimum fuel moisture content, and peak solar radiant heating. Aqua and Suomi-NPP
          afternoon orbital passes align with this peak burning window, detecting significantly more
          high-intensity fire anomalies than nighttime or morning passes.
        </div>
      </div>
    </div>
  );
};

export default TemporalAnalyticsWorkspace;
