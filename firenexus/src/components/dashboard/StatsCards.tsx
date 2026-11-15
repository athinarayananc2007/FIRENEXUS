import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame, Satellite, Radio, Zap, TrendingUp, TrendingDown,
  ShieldCheck, MapPin, Calendar, Info,
} from 'lucide-react';
import type { KpiMetrics } from '../../types';

interface StatsCardsProps {
  metrics: KpiMetrics;
}

// Lightweight, crisp SVG Sparkline with gradient area and hover indicator
function MiniSparkline({
  data,
  color,
  id,
}: {
  data: number[];
  color: string;
  id: string;
}) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 140;
  const height = 40;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${id})`} />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End Point Glow */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1].split(',')[0]}
          cy={points[points.length - 1].split(',')[1]}
          r="3"
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

export default function StatsCards({ metrics }: StatsCardsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const kpis = [
    {
      id: 'total',
      title: 'Total Global Hotspots',
      value: (metrics.totalHotspots ?? 0).toLocaleString(),
      unit: 'hotspots',
      trend: metrics.totalTrend,
      trendLabel: 'vs prior 6-month cycle',
      subtext: 'Synchronized MODIS & VIIRS active fire observations',
      color: '#38bdf8', // Sky cyan
      accentClass: 'text-cyan',
      borderHover: 'hover:border-cyan/40',
      icon: Flame,
      sparkline: metrics.totalSparkline,
      badge: 'All Sensors',
      tooltip: 'Combined active fire observations detected across Terra, Aqua, Suomi-NPP, and NOAA-20 platforms.',
    },
    {
      id: 'modis',
      title: 'MODIS Detections',
      value: (metrics.modisCount ?? 0).toLocaleString(),
      unit: 'detections',
      trend: metrics.modisTrend,
      trendLabel: 'vs prior 6-month cycle',
      subtext: `${metrics.modisShare ?? 0}% of total global detections`,
      color: '#FF713E', // Fire orange
      accentClass: 'text-fire',
      borderHover: 'hover:border-fire/40',
      icon: Satellite,
      sparkline: metrics.modisSparkline,
      badge: 'Terra & Aqua · 1 km',
      tooltip: 'Moderate Resolution Imaging Spectroradiometer thermal anomalies at 1 km spatial resolution.',
    },
    {
      id: 'viirs',
      title: 'VIIRS Detections',
      value: (metrics.viirsCount ?? 0).toLocaleString(),
      unit: 'detections',
      trend: metrics.viirsTrend,
      trendLabel: 'vs prior 6-month cycle',
      subtext: `${metrics.viirsShare ?? 0}% of total global detections`,
      color: '#00E5B0', // Teal/green
      accentClass: 'text-emerald-400',
      borderHover: 'hover:border-emerald-500/40',
      icon: Radio,
      sparkline: metrics.viirsSparkline,
      badge: 'Suomi NPP / NOAA-20 · 375 m',
      tooltip: 'Visible Infrared Imaging Radiometer Suite 375 m I-band detections with enhanced sub-pixel sensitivity.',
    },
    {
      id: 'frp',
      title: 'Average Fire Radiative Power',
      value: `${metrics.avgFrp}`,
      unit: 'MW',
      trend: metrics.frpTrend,
      trendLabel: 'vs prior 6-month cycle',
      subtext: `Peak observation: ${metrics.maxFrp} MW`,
      color: '#f59e0b', // Amber
      accentClass: 'text-amber-400',
      borderHover: 'hover:border-amber-500/40',
      icon: Zap,
      sparkline: metrics.frpSparkline,
      badge: 'Radiant Energy Rate',
      tooltip: 'Mean instantaneous radiant heat output (Megawatts) directly related to fuel combustion rate.',
    },
  ];

  return (
    <section className="space-y-4">
      {/* 4 Major Interactive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const isUp = kpi.trend >= 0;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.35 }}
              onMouseEnter={() => setActiveTooltip(kpi.id)}
              onMouseLeave={() => setActiveTooltip(null)}
              className={`relative glass border border-border/80 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:shadow-2xl ${kpi.borderHover} flex flex-col justify-between overflow-hidden group`}
            >
              {/* Subtle Ambient Background Glow on Hover */}
              <div
                className="absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                style={{ backgroundColor: kpi.color }}
              />

              {/* Top Header: Title, Icon, Badge */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-xl border border-border/60"
                      style={{ backgroundColor: `${kpi.color}15` }}
                    >
                      <kpi.icon className={`w-4 h-4 ${kpi.accentClass}`} />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {kpi.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded-full bg-surface-light border border-border text-text-muted">
                    {kpi.badge}
                  </span>
                </div>

                {/* Primary Metric Value & Unit */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-3xl font-extrabold tracking-tight font-mono ${kpi.accentClass}`}>
                    {kpi.value}
                  </span>
                  <span className="text-sm font-medium text-text-muted">
                    {kpi.unit}
                  </span>
                </div>

                {/* Subtext description */}
                <p className="text-xs text-text-secondary line-clamp-1 mb-4">
                  {kpi.subtext}
                </p>
              </div>

              {/* Bottom Row: Trend Pill & Sparkline */}
              <div className="pt-3 border-t border-border/50 flex items-end justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md ${
                      isUp
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isUp ? '+' : ''}
                      {kpi.trend}%
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {kpi.trendLabel}
                  </span>
                </div>

                {/* Interactive Sparkline */}
                <div title="12-Month Distribution Trend">
                  <MiniSparkline data={kpi.sparkline} color={kpi.color} id={kpi.id} />
                </div>
              </div>

              {/* Tooltip Hover Overlay */}
              {activeTooltip === kpi.id && (
                <div className="absolute inset-x-3 bottom-3 p-2.5 rounded-xl bg-midnight/95 backdrop-blur-md border border-border text-xs text-text-secondary shadow-xl z-20 transition-all flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-cyan shrink-0 mt-0.5" />
                  <span className="leading-snug">{kpi.tooltip}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Secondary Fast Telemetry Indicators Bar */}
      <div className="glass border border-border/70 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-text-muted">High Confidence Rate:</span>
            <span className="font-mono font-bold text-text-primary">
              {metrics.highConfRate}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-electric" />
            <span className="text-text-muted">Active Global Fire Regions:</span>
            <span className="font-mono font-bold text-text-primary">
              {metrics.activeRegions}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-secondary" />
            <span className="text-text-muted">Observed Date Span:</span>
            <span className="font-mono text-text-secondary">
              {metrics.observationPeriod}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-text-muted font-mono">
            Centralized Pipeline: Online
          </span>
          <span className="demo-badge text-[10px]">Simulated Data</span>
        </div>
      </div>
    </section>
  );
}