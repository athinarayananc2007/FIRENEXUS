import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  CalendarDays, Clock, TrendingUp,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import {
  computeMonthlyActivity,
  computeDailyActivity,
  computeSeasonalActivity,
  computeDetectionHourDistribution,
} from '../../data/mock/fireData';

interface TemporalComparisonProps {
  observations: FireObservation[];
  onSelectDatePreset?: (start: string, end: string) => void;
}

type TabType = 'monthly' | 'daily' | 'diurnal' | 'seasonal';

export default function TemporalComparison({
  observations,
  onSelectDatePreset,
}: TemporalComparisonProps) {
  const [activeTab, setActiveTab] = useState<TabType>('monthly');

  const monthlyData = useMemo(() => computeMonthlyActivity(observations), [observations]);
  const dailyData = useMemo(() => {
    const raw = computeDailyActivity(observations);
    if (raw.length > 90) {
      const sampled: { date: string; count: number; avgFrp: number }[] = [];
      for (let i = 0; i < raw.length; i += 3) {
        const slice = raw.slice(i, i + 3);
        const count = slice.reduce((s, d) => s + d.count, 0);
        const avgFrp = slice.reduce((s, d) => s + d.avgFrp, 0) / (slice.length || 1);
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

  const diurnalData = useMemo(() => computeDetectionHourDistribution(observations), [observations]);
  const seasonalData = useMemo(() => computeSeasonalActivity(observations), [observations]);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <CalendarDays className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Temporal Detection Dynamics
            </h2>
            <span className="demo-badge text-[10px]">Time Series Alignment</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Synchronized temporal evaluation: monthly cycles, daily pulses, diurnal overpass schedules, and seasonal surges
          </p>
        </div>

        {/* Tab Controls */}
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
            onClick={() => setActiveTab('diurnal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'diurnal'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Diurnal Overpass Hours
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'seasonal'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Seasonal Distribution
          </button>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="glass border border-border/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl">
        <div className="w-full h-80 min-h-[320px]">
          {/* 1. Monthly Activity */}
          {activeTab === 'monthly' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Bar dataKey="modisCount" name="MODIS (1 km)" fill="#FF713E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="viirsCount" name="VIIRS (375 m)" fill="#00E5B0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* 2. Daily Frequency */}
          {activeTab === 'daily' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="compDailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
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
                  name="Combined Detections"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#compDailyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* 3. Diurnal Overpass Timing */}
          {activeTab === 'diurnal' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diurnalData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
                <XAxis
                  dataKey="hour"
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
                <Bar dataKey="modis" name="MODIS (Aqua/Terra)" fill="#FF713E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="viirs" name="VIIRS (SNPP/NOAA-20)" fill="#00E5B0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* 4. Seasonal Patterns */}
          {activeTab === 'seasonal' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seasonalData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
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
                <Bar dataKey="modis" name="MODIS (1 km)" fill="#FF713E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="viirs" name="VIIRS (375 m)" fill="#00E5B0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer Insight */}
        <div className="pt-3 mt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan" />
            <span>
              Orbital Synchronization: Terra passes occur near 10:30 local solar time; Aqua, Suomi-NPP, and NOAA-20 converge in the early afternoon near 13:30 peak diurnal burning.
            </span>
          </div>

          {onSelectDatePreset && (
            <button
              onClick={() => onSelectDatePreset('2024-06-01', '2024-10-31')}
              className="text-cyan hover:underline font-semibold flex items-center gap-1 shrink-0"
            >
              <span>Focus Peak Season (Jun–Oct)</span>
              <TrendingUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}