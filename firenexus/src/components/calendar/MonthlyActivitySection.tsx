import React, { useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  Flame,
  Zap,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Award,
  ArrowDownCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';

interface MonthlyActivitySectionProps {
  observations: FireObservation[];
  selectedMonth: number | null;
  onSelectMonth: (monthIndex: number | null) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const SEASON_TAGS = [
  'Boreal Winter / Sahel Peak',
  'Austral Summer / Sahel Dry',
  'Spring Transition / SE Asia',
  'Early Boreal / Siberian Thaw',
  'Pre-Monsoon Savanna',
  'Early Boreal Summer Fires',
  'Mid-Summer Boreal / Cerrado',
  'Peak Global Fire Activity',
  'Amazon Peak / Austral Spring',
  'Late Amazon / Aussie Savanna',
  'Late Austral Dry Season',
  'Early Boreal Winter',
];

export const MonthlyActivitySection: React.FC<MonthlyActivitySectionProps> = ({
  observations,
  selectedMonth,
  onSelectMonth,
}) => {
  // Aggregate monthly statistics
  const monthlyData = useMemo(() => {
    const list = Array.from({ length: 12 }, (_, i) => ({
      index: i,
      name: MONTH_NAMES[i],
      shortName: MONTH_SHORT[i],
      season: SEASON_TAGS[i],
      total: 0,
      modis: 0,
      viirs: 0,
      highConf: 0,
      totalFrp: 0,
      avgFrp: 0,
    }));

    observations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      const parts = obs.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          list[mIdx].total += 1;
          if (obs.satellite === 'MODIS') list[mIdx].modis += 1;
          else list[mIdx].viirs += 1;
          if (obs.confidence === 'high') list[mIdx].highConf += 1;
          list[mIdx].totalFrp += obs.frp;
        }
      }
    });

    list.forEach((m) => {
      m.avgFrp = m.total > 0 ? Math.round((m.totalFrp / m.total) * 10) / 10 : 0;
    });

    return list;
  }, [observations]);

  // Determine Peak and Lowest months
  const { peakIndex, lowestIndex } = useMemo(() => {
    let peakIdx = 0;
    let lowIdx = 0;
    let maxVal = -1;
    let minVal = Infinity;

    monthlyData.forEach((m) => {
      if (m.total > maxVal) {
        maxVal = m.total;
        peakIdx = m.index;
      }
      if (m.total > 0 && m.total < minVal) {
        minVal = m.total;
        lowIdx = m.index;
      }
    });

    return { peakIndex: peakIdx, lowestIndex: lowIdx };
  }, [monthlyData]);

  // Chart data
  const chartData = useMemo(() => {
    return monthlyData.map((m) => ({
      name: m.shortName,
      monthIndex: m.index,
      MODIS: m.modis,
      VIIRS: m.viirs,
      Total: m.total,
      'Avg FRP (MW)': m.avgFrp,
    }));
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan" />
            Monthly Fire Dynamics & Seasonal Phenology
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Global monthly aggregation contrasting MODIS 1 km and VIIRS 375 m observation rates
            with Fire Radiative Power (MW) output.
          </p>
        </div>

        {selectedMonth !== null && (
          <button
            onClick={() => onSelectMonth(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-navy/80 hover:bg-navy border border-cyan/40 text-cyan transition-colors"
          >
            Clear Monthly Filter ({MONTH_NAMES[selectedMonth]})
          </button>
        )}
      </div>

      {/* Composed Chart: Stacked Bars (MODIS + VIIRS) + Dual-Axis Line (Avg FRP) */}
      <div className="card p-5 bg-surface/95 border-border/80 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="font-bold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan" />
            <span>Monthly Detections & Radiative Intensity (Jan – Dec)</span>
          </div>
          <div className="text-[11px] text-text-muted flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS 1km
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan" /> VIIRS 375m
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-1 bg-amber-400 inline-block" /> Avg FRP (MW)
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const mIdx = e.activePayload[0].payload.monthIndex;
                  onSelectMonth(selectedMonth === mIdx ? null : mIdx);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
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
                    const data = payload[0].payload;
                    return (
                      <div className="bg-navy/95 border border-border/80 p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-mono">
                        <div className="font-bold text-text-primary font-sans border-b border-border/60 pb-1 flex items-center justify-between">
                          <span>{MONTH_NAMES[data.monthIndex]}</span>
                          <span className="text-cyan font-bold">{data.Total} fires</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-fire flex items-center gap-1">
                            <Flame className="w-3 h-3" /> MODIS:
                          </span>
                          <span className="font-bold text-text-primary">{data.MODIS}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-cyan flex items-center gap-1">
                            <Zap className="w-3 h-3" /> VIIRS:
                          </span>
                          <span className="font-bold text-text-primary">{data.VIIRS}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-1 text-amber-400">
                          <span>Avg Radiative Power:</span>
                          <span className="font-bold">{data['Avg FRP (MW)']} MW</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Bar yAxisId="left" dataKey="MODIS" stackId="a" fill="#FF713E" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="VIIRS" stackId="a" fill="#00E5B0" radius={[3, 3, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Avg FRP (MW)"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#0a0f1d' }}
                activeDot={{ r: 5, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 12 Interactive Monthly Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {monthlyData.map((m) => {
          const isSelected = selectedMonth === m.index;
          const isPeak = m.index === peakIndex;
          const isLowest = m.index === lowestIndex;
          const modisPct = m.total > 0 ? Math.round((m.modis / m.total) * 100) : 0;
          const viirsPct = 100 - modisPct;

          return (
            <div
              key={m.name}
              onClick={() => onSelectMonth(isSelected ? null : m.index)}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface/95 border-cyan shadow-lg shadow-cyan-dim/40 ring-1 ring-cyan'
                  : 'bg-navy/60 hover:bg-navy/90 border-border/60 hover:border-border-light'
              }`}
            >
              {/* Card Header with Badges */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                    <span>{m.name}</span>
                  </h4>
                  <span className="font-mono text-xs font-bold text-cyan bg-midnight/80 px-2 py-0.5 rounded border border-border/60">
                    {m.total} fires
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className="text-[10px] text-text-muted">{m.season}</span>
                  {isPeak && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-fire/20 text-fire border border-fire/40">
                      <Award className="w-2.5 h-2.5" /> Peak Month
                    </span>
                  )}
                  {isLowest && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-navy text-text-muted border border-border/50">
                      <ArrowDownCircle className="w-2.5 h-2.5" /> Min Activity
                    </span>
                  )}
                </div>

                {/* Sensor Split Progress Bar */}
                <div className="mb-3 space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-navy overflow-hidden flex">
                    <div
                      style={{ width: `${modisPct}%` }}
                      className="bg-fire transition-all duration-300"
                      title={`MODIS: ${modisPct}%`}
                    />
                    <div
                      style={{ width: `${viirsPct}%` }}
                      className="bg-cyan transition-all duration-300"
                      title={`VIIRS: ${viirsPct}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                    <span className="text-fire">{m.modis} MODIS</span>
                    <span className="text-cyan">{m.viirs} VIIRS</span>
                  </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-2 gap-2 text-center bg-midnight/60 p-2 rounded-lg border border-border/40 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-text-muted flex items-center justify-center gap-1 font-sans">
                      <ShieldAlert className="w-2.5 h-2.5 text-emerald-400" /> High Conf
                    </span>
                    <span className="font-bold text-text-primary text-xs mt-0.5 block">
                      {m.highConf}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted font-sans">Avg FRP</span>
                    <span className="font-bold text-amber-400 text-xs mt-0.5 block">
                      {m.avgFrp} MW
                    </span>
                  </div>
                </div>
              </div>

              {/* Focus Prompt */}
              <div className="mt-3 pt-2 border-t border-border/30 text-right">
                <span className="text-[10px] text-cyan hover:underline">
                  {isSelected ? 'Reset month view' : 'Filter calendar to this month →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyActivitySection;
