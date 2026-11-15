import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import { computeWeeklyActivity } from '../../data/mock/fireData';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Activity, Flame, Zap, Calendar } from 'lucide-react';

interface DailyTimelineChartProps {
  observations: FireObservation[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

export const DailyTimelineChart: React.FC<DailyTimelineChartProps> = ({
  observations,
  selectedDate,
  onSelectDate,
}) => {
  const [granularity, setGranularity] = useState<Granularity>('weekly');

  // Daily Series
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; modis: number; viirs: number; total: number; frpSum: number }>();

    // Seed all dates of 2024 or observed dates
    observations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      if (!map.has(obs.date)) {
        map.set(obs.date, { date: obs.date, modis: 0, viirs: 0, total: 0, frpSum: 0 });
      }
      const item = map.get(obs.date)!;
      item.total += 1;
      if (obs.satellite === 'MODIS') item.modis += 1;
      else item.viirs += 1;
      item.frpSum += obs.frp;
    });

    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        key: d.date,
        label: d.date,
        shortLabel: d.date.slice(5), // "MM-DD"
        modis: d.modis,
        viirs: d.viirs,
        total: d.total,
        avgFrp: d.total > 0 ? Math.round((d.frpSum / d.total) * 10) / 10 : 0,
      }));
  }, [observations]);

  // Weekly Series
  const weeklyData = useMemo(() => {
    const weeks = computeWeeklyActivity(observations);
    return weeks.map((w) => ({
      key: w.week,
      label: `${w.week} (${w.startDate})`,
      shortLabel: w.week,
      modis: w.modisCount,
      viirs: w.viirsCount,
      total: w.totalCount,
      avgFrp: w.avgFrp,
      date: w.startDate,
    }));
  }, [observations]);

  // Monthly Series
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts = Array.from({ length: 12 }, (_, i) => ({
      key: months[i],
      label: months[i],
      shortLabel: months[i],
      modis: 0,
      viirs: 0,
      total: 0,
      frpSum: 0,
      avgFrp: 0,
      date: `2024-${String(i + 1).padStart(2, '0')}-01`,
    }));

    observations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      const parts = obs.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          counts[mIdx].total += 1;
          if (obs.satellite === 'MODIS') counts[mIdx].modis += 1;
          else counts[mIdx].viirs += 1;
          counts[mIdx].frpSum += obs.frp;
        }
      }
    });

    counts.forEach((c) => {
      c.avgFrp = c.total > 0 ? Math.round((c.frpSum / c.total) * 10) / 10 : 0;
    });

    return counts;
  }, [observations]);

  const activeSeries = useMemo(() => {
    if (granularity === 'daily') return dailyData;
    if (granularity === 'weekly') return weeklyData;
    return monthlyData;
  }, [granularity, dailyData, weeklyData, monthlyData]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-4">
      {/* Header and Granularity Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan" />
            Continuous Fire Activity Timeline
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Synchronized observation frequency series comparing MODIS and VIIRS throughput across
            time.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => setGranularity('daily')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              granularity === 'daily'
                ? 'bg-cyan/20 text-cyan border border-cyan/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Daily (366d)
          </button>
          <button
            onClick={() => setGranularity('weekly')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              granularity === 'weekly'
                ? 'bg-cyan/20 text-cyan border border-cyan/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Weekly (52w)
          </button>
          <button
            onClick={() => setGranularity('monthly')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              granularity === 'monthly'
                ? 'bg-cyan/20 text-cyan border border-cyan/40'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Monthly (12m)
          </button>
        </div>
      </div>

      {/* Legend & Selected Date Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-text-secondary">
            <span className="w-3 h-3 rounded-sm bg-fire shadow-sm shadow-fire/40" />
            <span>MODIS (1 km nominal)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-text-secondary">
            <span className="w-3 h-3 rounded-sm bg-cyan shadow-sm shadow-cyan/40" />
            <span>VIIRS (375 m nominal)</span>
          </span>
        </div>

        {selectedDate && (
          <div className="text-[11px] font-mono text-cyan flex items-center gap-1.5 bg-navy/80 px-2.5 py-1 rounded border border-cyan/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Active Point: {selectedDate}</span>
          </div>
        )}
      </div>

      {/* Recharts Area Chart */}
      <div className="h-72 sm:h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={activeSeries}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            onClick={(e: any) => {
              if (e && e.activePayload && e.activePayload[0]) {
                const payloadDate = e.activePayload[0].payload.key || e.activePayload[0].payload.date;
                if (payloadDate && payloadDate.startsWith('2024-')) {
                  onSelectDate(payloadDate);
                }
              }
            }}
          >
            <defs>
              <linearGradient id="colorModis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF713E" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#FF713E" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorViirs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5B0" stopOpacity={0.6} />
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
              interval={granularity === 'daily' ? 14 : granularity === 'weekly' ? 3 : 0}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-navy/95 border border-border/80 p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-mono">
                      <div className="font-bold text-text-primary font-sans border-b border-border/60 pb-1 flex items-center justify-between">
                        <span>{data.label}</span>
                        <span className="text-cyan font-bold">{data.total} detections</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-fire flex items-center gap-1">
                          <Flame className="w-3 h-3" /> MODIS:
                        </span>
                        <span className="font-bold text-text-primary">{data.modis}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-cyan flex items-center gap-1">
                          <Zap className="w-3 h-3" /> VIIRS:
                        </span>
                        <span className="font-bold text-text-primary">{data.viirs}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-1 text-text-secondary">
                        <span>Mean FRP:</span>
                        <span className="font-bold text-amber-400">{data.avgFrp} MW</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {selectedDate && granularity === 'daily' && (
              <ReferenceLine
                x={selectedDate.slice(5)}
                stroke="#00E5B0"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Selected',
                  position: 'insideTopRight',
                  fill: '#00E5B0',
                  fontSize: 10,
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="modis"
              name="MODIS"
              stackId="1"
              stroke="#FF713E"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorModis)"
            />
            <Area
              type="monotone"
              dataKey="viirs"
              name="VIIRS"
              stackId="1"
              stroke="#00E5B0"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorViirs)"
            />

            {granularity === 'daily' && (
              <Brush
                dataKey="shortLabel"
                height={26}
                stroke="#00E5B0"
                fill="#0a0f1d"
                travellerWidth={8}
                startIndex={Math.max(0, dailyData.length - 120)}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DailyTimelineChart;
