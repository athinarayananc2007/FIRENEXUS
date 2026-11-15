import { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  CalendarDays, TrendingUp, Flame,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import {
  computeMonthlyActivity,
  computeDailyActivity,
  computeSeasonalActivity,
} from '../../data/mock/fireData';

interface TemporalAnalyticsProps {
  observations: FireObservation[];
  onSelectDatePreset?: (start: string, end: string) => void;
  activeFilterRange?: { start: string; end: string };
}

type TemporalTab = 'monthly' | 'daily' | 'seasonal' | 'annual';

export default function TemporalAnalytics({
  observations,
  onSelectDatePreset,
}: TemporalAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<TemporalTab>('monthly');

  // Compute dataset views
  const monthlyData = useMemo(
    () => computeMonthlyActivity(observations),
    [observations],
  );

  const dailyData = useMemo(() => {
    const raw = computeDailyActivity(observations);
    // If large span, sample or group to avoid rendering 365 dense bars
    if (raw.length > 90) {
      // Group every 3 days for readability
      const sampled: { date: string; count: number; avgFrp: number }[] = [];
      for (let i = 0; i < raw.length; i += 3) {
        const slice = raw.slice(i, i + 3);
        const count = slice.reduce((s, d) => s + d.count, 0);
        const avgFrp =
          slice.reduce((s, d) => s + d.avgFrp, 0) / (slice.length || 1);
        sampled.push({
          date: slice[0].date,
          count,
          avgFrp: Math.round(avgFrp * 10) / 10,
        });
      }
      return sampled;
    }
    return raw;
  }, [observations]);

  const seasonalData = useMemo(
    () => computeSeasonalActivity(observations),
    [observations],
  );

  // Annual baseline comparison mock data
  const annualComparisonData = useMemo(() => {
    return monthlyData.map((m) => {
      const baseline = Math.round(m.totalCount * 0.88);
      return {
        label: m.label,
        observed: m.totalCount,
        baseline,
        delta: m.totalCount - baseline,
      };
    });
  }, [monthlyData]);

  // Peak month calculation
  const peakMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    return [...monthlyData].sort((a, b) => b.totalCount - a.totalCount)[0];
  }, [monthlyData]);

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl p-5 flex flex-col justify-between backdrop-blur-xl">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">
              Temporal Fire Activity Analytics
            </h3>
            <span className="demo-badge text-[10px]">Time Series</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Temporal distribution, seasonality, and multi-sensor observation frequency
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 glass border border-border/80 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'monthly'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Monthly Activity
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'daily'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Daily Frequency
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'seasonal'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Seasonal Patterns
          </button>
          <button
            onClick={() => setActiveTab('annual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'annual'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Baseline Comparison
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="w-full h-80 min-h-[320px]">
        {/* 1. Monthly Stacked Area Chart */}
        {activeTab === 'monthly' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorModisMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF713E" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#FF713E" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorViirsMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5B0" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#00E5B0" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
              <XAxis
                dataKey="label"
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
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Area
                type="monotone"
                dataKey="modisCount"
                name="MODIS (1 km)"
                stackId="1"
                stroke="#FF713E"
                strokeWidth={2}
                fill="url(#colorModisMonthly)"
              />
              <Area
                type="monotone"
                dataKey="viirsCount"
                name="VIIRS (375 m)"
                stackId="1"
                stroke="#00E5B0"
                strokeWidth={2}
                fill="url(#colorViirsMonthly)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* 2. Daily Frequency Timeline */}
        {activeTab === 'daily' && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
                interval={Math.floor(dailyData.length / 8)}
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
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Observed Detections"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#colorDaily)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* 3. Seasonal Patterns */}
        {activeTab === 'seasonal' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seasonalData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} />
              <XAxis
                dataKey="season"
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
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="modis" name="MODIS" fill="#FF713E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="viirs" name="VIIRS" fill="#00E5B0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* 4. Annual Baseline Comparison */}
        {activeTab === 'annual' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annualComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} />
              <XAxis
                dataKey="label"
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
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Line
                type="monotone"
                dataKey="observed"
                name="2024 Observed Fires"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#38bdf8' }}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                name="Historical Baseline (Avg)"
                stroke="#64748b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Analytical Insight Footer */}
      <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-fire" />
          <span>
            {peakMonth
              ? `Peak activity concentrated in ${peakMonth.label} (${peakMonth.totalCount} observations, mean FRP ${peakMonth.avgFrp} MW)`
              : 'Consistent seasonal pattern observed'}
          </span>
        </div>

        {onSelectDatePreset && (
          <button
            onClick={() => onSelectDatePreset('2024-06-01', '2024-10-31')}
            className="text-cyan hover:underline font-semibold flex items-center gap-1"
          >
            <span>Filter to Peak Fire Season (Jun–Oct)</span>
            <TrendingUp className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}