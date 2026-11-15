import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Flame,
  Zap,
  Sun,
  Moon,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import { getObservationDayNight } from '../../utils/dataExplorerUtils';

interface DataVisualizationsSuiteProps {
  observations: FireObservation[];
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DataVisualizationsSuite: React.FC<DataVisualizationsSuiteProps> = ({ observations }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sensor' | 'geospatial' | 'energetics'>('all');

  // ── 1. MODIS vs VIIRS Record Distribution ────────────────────────────────
  const sensorData = useMemo(() => {
    const modisCount = observations.filter((o) => o.satellite === 'MODIS').length;
    const viirsCount = observations.filter((o) => o.satellite === 'VIIRS').length;
    const total = observations.length || 1;

    return [
      {
        name: 'MODIS (1 km)',
        count: modisCount,
        percentage: Math.round((modisCount / total) * 100),
        color: '#FF713E',
      },
      {
        name: 'VIIRS (375 m)',
        count: viirsCount,
        percentage: Math.round((viirsCount / total) * 100),
        color: '#00E5B0',
      },
    ];
  }, [observations]);

  // ── 2. Monthly Detection Trends ──────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const counts = MONTH_NAMES.map((name, idx) => ({
      month: name,
      monthIndex: idx,
      modis: 0,
      viirs: 0,
      total: 0,
    }));

    observations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      const parts = obs.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          if (obs.satellite === 'MODIS') counts[m].modis++;
          else counts[m].viirs++;
          counts[m].total++;
        }
      }
    });

    return counts;
  }, [observations]);

  // ── 3. Confidence Level Distribution ─────────────────────────────────────
  const confidenceData = useMemo(() => {
    const high = observations.filter((o) => o.confidence === 'high').length;
    const nominal = observations.filter((o) => o.confidence === 'nominal').length;
    const low = observations.filter((o) => o.confidence === 'low').length;
    const total = observations.length || 1;

    return [
      { name: 'High', count: high, pct: Math.round((high / total) * 100), color: '#00E5B0' },
      { name: 'Nominal', count: nominal, pct: Math.round((nominal / total) * 100), color: '#00B8D9' },
      { name: 'Low', count: low, pct: Math.round((low / total) * 100), color: '#FFA94D' },
    ];
  }, [observations]);

  // ── 4. Fire Radiative Power (FRP) Energetics Distribution ────────────────
  const frpDistributionData = useMemo(() => {
    const bins = [
      { range: '< 20 MW', label: 'Low (< 20)', min: 0, max: 20, count: 0, modis: 0, viirs: 0, color: '#00B8D9' },
      { range: '20-50 MW', label: 'Moderate (20-50)', min: 20, max: 50, count: 0, modis: 0, viirs: 0, color: '#00E5B0' },
      { range: '50-100 MW', label: 'Substantial (50-100)', min: 50, max: 100, count: 0, modis: 0, viirs: 0, color: '#FFA94D' },
      { range: '100-250 MW', label: 'Intense (100-250)', min: 100, max: 250, count: 0, modis: 0, viirs: 0, color: '#FF713E' },
      { range: '250+ MW', label: 'Extreme (250+)', min: 250, max: 99999, count: 0, modis: 0, viirs: 0, color: '#EF4444' },
    ];

    observations.forEach((o) => {
      for (const bin of bins) {
        if (o.frp >= bin.min && o.frp < bin.max) {
          bin.count++;
          if (o.satellite === 'MODIS') bin.modis++;
          else bin.viirs++;
          break;
        }
      }
    });

    return bins;
  }, [observations]);

  // ── 5. Daytime vs Nighttime Observations ─────────────────────────────────
  const dayNightData = useMemo(() => {
    let dayCount = 0;
    let nightCount = 0;

    observations.forEach((o) => {
      const dn = getObservationDayNight(o);
      if (dn === 'D') dayCount++;
      else nightCount++;
    });

    const total = observations.length || 1;
    return [
      { name: 'Daytime', count: dayCount, percentage: Math.round((dayCount / total) * 100), color: '#FFA94D' },
      { name: 'Nighttime', count: nightCount, percentage: Math.round((nightCount / total) * 100), color: '#00B8D9' },
    ];
  }, [observations]);

  // ── 6. Global Continental Detection Distribution ─────────────────────────
  const continentalData = useMemo(() => {
    const map = new Map<string, { count: number; modis: number; viirs: number; totalFrp: number }>();

    observations.forEach((o) => {
      const cont = o.continent || 'Other';
      if (!map.has(cont)) {
        map.set(cont, { count: 0, modis: 0, viirs: 0, totalFrp: 0 });
      }
      const entry = map.get(cont)!;
      entry.count++;
      entry.totalFrp += o.frp;
      if (o.satellite === 'MODIS') entry.modis++;
      else entry.viirs++;
    });

    return Array.from(map.entries())
      .map(([continent, data]) => ({
        continent,
        count: data.count,
        modis: data.modis,
        viirs: data.viirs,
        avgFrp: Math.round(data.totalFrp / (data.count || 1)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [observations]);

  const avgFrpAll = useMemo(() => {
    if (!observations.length) return 0;
    const sum = observations.reduce((acc, o) => acc + o.frp, 0);
    return (sum / observations.length).toFixed(1);
  }, [observations]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-5">
      {/* Visualizations Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-sm">
            <BarChart3 className="w-5 h-5 text-mint" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
                Scientific Data Visualizations
              </h2>
              <span className="badge-cyan text-[10px] font-mono">
                {observations.length.toLocaleString()} Active Records Filtered
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Real-time multi-dimensional distributions dynamically synchronized with your active search and filter constraints.
            </p>
          </div>
        </div>

        {/* View Mode Filters & Collapse Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan/20 text-cyan border border-cyan/30 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All Matrices
            </button>
            <button
              onClick={() => setActiveTab('sensor')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'sensor'
                  ? 'bg-cyan/20 text-cyan border border-cyan/30 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Sensor &amp; Temporal
            </button>
            <button
              onClick={() => setActiveTab('geospatial')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'geospatial'
                  ? 'bg-cyan/20 text-cyan border border-cyan/30 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Geospatial
            </button>
            <button
              onClick={() => setActiveTab('energetics')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeTab === 'energetics'
                  ? 'bg-cyan/20 text-cyan border border-cyan/30 font-semibold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              FRP Energetics
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-navy/80 hover:bg-surface border border-border/60 text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1"
            title={isCollapsed ? 'Expand Visualizations' : 'Collapse Visualizations'}
          >
            {isCollapsed ? (
              <>
                <span>Show Charts</span>
                <ChevronDown className="w-4 h-4 text-cyan" />
              </>
            ) : (
              <>
                <span>Minimize</span>
                <ChevronUp className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Row: Sensor Distribution, Confidence Breakdown, and Day vs Night */}
          {(activeTab === 'all' || activeTab === 'sensor') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. MODIS vs VIIRS Record Distribution */}
              <div className="p-4 rounded-xl bg-navy/70 border border-border/70 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-cyan" />
                    MODIS vs VIIRS Record Distribution
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Instrument Share</span>
                </div>

                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sensorData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        stroke="#111C32"
                        strokeWidth={2}
                        paddingAngle={3}
                      >
                        {sensorData.map((entry, index) => (
                          <Cell key={`sensor-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111C32',
                          borderColor: '#1F2E4A',
                          borderRadius: '8px',
                          color: '#F1F5FF',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Metric */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-lg font-black font-mono text-text-primary">
                      {observations.length.toLocaleString()}
                    </span>
                    <span className="text-[9px] uppercase font-semibold text-text-muted">Total Hits</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-surface/80 border border-fire/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-fire font-bold flex items-center gap-1">
                        <Flame className="w-3 h-3" /> MODIS
                      </span>
                      <span className="font-mono text-[10px] text-fire">{sensorData[0].percentage}%</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {sensorData[0].count.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-surface/80 border border-mint/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-mint font-bold flex items-center gap-1">
                        <Zap className="w-3 h-3" /> VIIRS
                      </span>
                      <span className="font-mono text-[10px] text-mint">{sensorData[1].percentage}%</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {sensorData[1].count.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Confidence Level Breakdown */}
              <div className="p-4 rounded-xl bg-navy/70 border border-border/70 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-mint" />
                    Confidence Distribution
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Algorithmic Grade</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={confidenceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} vertical={false} />
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111C32',
                          borderColor: '#1F2E4A',
                          borderRadius: '8px',
                          color: '#F1F5FF',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {confidenceData.map((entry, index) => (
                          <Cell key={`conf-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs pt-1">
                  {confidenceData.map((c) => (
                    <div key={c.name} className="p-1.5 rounded-lg bg-surface/70 border border-border/50">
                      <div className="text-[9px] font-semibold text-text-muted uppercase">{c.name}</div>
                      <div className="font-bold font-mono text-xs text-text-primary">{c.count}</div>
                      <div className="text-[9px] font-mono" style={{ color: c.color }}>{c.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Daytime vs Nighttime Observations */}
              <div className="p-4 rounded-xl bg-navy/70 border border-border/70 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Day vs Night Observations
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Diurnal Passes</span>
                </div>

                <div className="h-44 w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dayNightData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={68}
                        stroke="#111C32"
                        strokeWidth={2}
                        paddingAngle={3}
                      >
                        {dayNightData.map((entry, index) => (
                          <Cell key={`dn-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111C32',
                          borderColor: '#1F2E4A',
                          borderRadius: '8px',
                          color: '#F1F5FF',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <Moon className="w-5 h-5 text-cyan mb-0.5" />
                    <span className="text-[10px] font-bold text-text-primary">Diurnal Ratio</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-surface/80 border border-amber-500/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                        <Sun className="w-3 h-3" /> Daytime
                      </span>
                      <span className="font-mono text-[10px] text-amber-400">{dayNightData[0].percentage}%</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {dayNightData[0].count.toLocaleString()}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-surface/80 border border-cyan/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan font-bold flex items-center gap-1">
                        <Moon className="w-3 h-3" /> Nighttime
                      </span>
                      <span className="font-mono text-[10px] text-cyan">{dayNightData[1].percentage}%</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-text-primary mt-0.5">
                      {dayNightData[1].count.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Middle Row: Monthly Detection Trends Across 12 Months */}
          {(activeTab === 'all' || activeTab === 'sensor') && (
            <div className="p-4 sm:p-5 rounded-xl bg-navy/70 border border-border/70 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan" />
                  <span className="text-xs font-bold text-text-primary">
                    Monthly Detection Trends (Harmonized Satellite Timeline)
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-fire">
                    <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS (1 km)
                  </span>
                  <span className="flex items-center gap-1 text-mint">
                    <span className="w-2.5 h-2.5 rounded-sm bg-mint" /> VIIRS (375 m)
                  </span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorModis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF713E" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#FF713E" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorViirs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E5B0" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#00E5B0" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} />
                    <XAxis dataKey="month" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111C32',
                        borderColor: '#1F2E4A',
                        borderRadius: '8px',
                        color: '#F1F5FF',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="modis"
                      name="MODIS"
                      stroke="#FF713E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorModis)"
                    />
                    <Area
                      type="monotone"
                      dataKey="viirs"
                      name="VIIRS"
                      stroke="#00E5B0"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorViirs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Bottom Row: FRP Energetics Distribution & Global Detection Distribution */}
          {(activeTab === 'all' || activeTab === 'energetics' || activeTab === 'geospatial') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* FRP Distribution */}
              <div className="p-4 sm:p-5 rounded-xl bg-navy/70 border border-border/70 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-fire" />
                    Fire Radiative Power (FRP) Energetics Distribution
                  </span>
                  <span className="text-[10px] font-mono text-cyan bg-cyan/15 px-2 py-0.5 rounded">
                    Mean: {avgFrpAll} MW
                  </span>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frpDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} vertical={false} />
                      <XAxis dataKey="range" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111C32',
                          borderColor: '#1F2E4A',
                          borderRadius: '8px',
                          color: '#F1F5FF',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {frpDistributionData.map((entry, index) => (
                          <Cell key={`frp-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-5 gap-1 text-center text-[10px] pt-1 font-mono">
                  {frpDistributionData.map((b) => (
                    <div key={b.range} className="p-1 rounded bg-surface/60 border border-border/40">
                      <div className="text-[9px] text-text-muted">{b.range}</div>
                      <div className="font-bold text-text-primary">{b.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Detection Distribution by Continent */}
              <div className="p-4 sm:p-5 rounded-xl bg-navy/70 border border-border/70 space-y-3 flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-mint" />
                    Global Detection Distribution (Continental Breakdown)
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Filtered Cohort</span>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={continentalData}
                      layout="vertical"
                      margin={{ top: 5, right: 15, left: 35, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.5} horizontal={false} />
                      <XAxis type="number" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis type="category" dataKey="continent" stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111C32',
                          borderColor: '#1F2E4A',
                          borderRadius: '8px',
                          color: '#F1F5FF',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" fill="#00B8D9" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="text-[11px] text-text-muted font-sans flex items-center justify-between pt-1 border-t border-border/40">
                  <span>Geographic distribution reflects biophysical fire regimes</span>
                  <span className="font-mono text-cyan">
                    {continentalData.length} active continent{continentalData.length > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataVisualizationsSuite;
