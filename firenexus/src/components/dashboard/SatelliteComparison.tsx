import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Satellite, Radio, AlertCircle, Orbit,
} from 'lucide-react';
import type { FireObservation } from '../../types';

interface SatelliteComparisonProps {
  observations: FireObservation[];
}

const COLORS = {
  MODIS: '#FF713E',
  VIIRS: '#00E5B0',
};

export default function SatelliteComparison({ observations }: SatelliteComparisonProps) {
  const modis = useMemo(
    () => observations.filter((o) => o.satellite === 'MODIS'),
    [observations],
  );
  const viirs = useMemo(
    () => observations.filter((o) => o.satellite === 'VIIRS'),
    [observations],
  );

  const total = observations.length || 1;
  const modisPct = Math.round((modis.length / total) * 1000) / 10;
  const viirsPct = Math.round((viirs.length / total) * 1000) / 10;

  const modisAvgFrp =
    modis.length > 0
      ? Math.round((modis.reduce((s, o) => s + o.frp, 0) / modis.length) * 10) / 10
      : 0;
  const viirsAvgFrp =
    viirs.length > 0
      ? Math.round((viirs.reduce((s, o) => s + o.frp, 0) / viirs.length) * 10) / 10
      : 0;

  const modisMaxFrp = modis.length > 0 ? Math.max(...modis.map((o) => o.frp)) : 0;
  const viirsMaxFrp = viirs.length > 0 ? Math.max(...viirs.map((o) => o.frp)) : 0;

  const modisHighConf = modis.filter((o) => o.confidence === 'high').length;
  const viirsHighConf = viirs.filter((o) => o.confidence === 'high').length;

  const pieData = [
    { name: 'MODIS', value: modis.length, color: COLORS.MODIS },
    { name: 'VIIRS', value: viirs.length, color: COLORS.VIIRS },
  ];

  const ratio = modis.length > 0 ? (viirs.length / modis.length).toFixed(2) : 'N/A';

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl p-5 flex flex-col justify-between backdrop-blur-xl space-y-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
            <Orbit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Sensor Inter-Comparison: MODIS vs VIIRS
            </h3>
            <p className="text-xs text-text-secondary">
              Dual-instrument cross-sensor observation dynamics and detection disparity
            </p>
          </div>
        </div>
        <span className="demo-badge text-[10px]">Sensor Harmonization</span>
      </div>

      {/* Critical Scientific Callout Alert */}
      <div className="p-3.5 rounded-xl bg-cyan/10 border border-cyan/30 text-xs text-text-secondary flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-cyan font-semibold block mb-0.5">
            Scientific Sensor Resolution Distinction
          </strong>
          VIIRS 375 m imagery possesses an individual pixel area ~7x finer than MODIS 1 km. Consequently, VIIRS detects significantly smaller, cooler, and fragmented fires that fall below MODIS thermal thresholds.
          <strong className="text-text-primary">
            {' '}A higher VIIRS observation count reflects enhanced sensor spatial sensitivity, not an increase in separate physical wildfire events.
          </strong>
        </div>
      </div>

      {/* Grid: Donut Breakdown + Key Sensor Metric Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Donut Chart with Center Ratio */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <div className="w-full h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1F2E4A',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} observations`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Ratio Pill */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-text-muted font-mono uppercase">Ratio</span>
              <span className="text-base font-extrabold text-text-primary font-mono">
                1 : {ratio}
              </span>
              <span className="text-[9px] text-cyan font-mono">VIIRS : MODIS</span>
            </div>
          </div>

          {/* Sensor Share Indicator */}
          <div className="flex items-center gap-6 mt-1 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-fire" />
              <span className="text-text-secondary">MODIS:</span>
              <span className="font-mono font-bold text-fire">{modisPct}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan" />
              <span className="text-text-secondary">VIIRS:</span>
              <span className="font-mono font-bold text-cyan">{viirsPct}%</span>
            </div>
          </div>
        </div>

        {/* Side-by-Side Instrument Matrix */}
        <div className="md:col-span-7 space-y-2.5">
          {/* Comparison Row 1: Total & Resolution */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-surface/50 border border-fire/30">
              <div className="flex items-center gap-1 text-fire font-bold mb-1">
                <Satellite className="w-3.5 h-3.5" />
                <span>MODIS</span>
              </div>
              <div className="text-lg font-mono font-bold text-text-primary mb-0.5">
                {modis.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-text-muted">
                Spatial Res: <strong className="text-text-primary">1 km</strong> nadir
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface/50 border border-cyan/30">
              <div className="flex items-center gap-1 text-cyan font-bold mb-1">
                <Radio className="w-3.5 h-3.5" />
                <span>VIIRS</span>
              </div>
              <div className="text-lg font-mono font-bold text-text-primary mb-0.5">
                {viirs.length.toLocaleString()}
              </div>
              <div className="text-[11px] text-text-muted">
                Spatial Res: <strong className="text-text-primary">375 m</strong> I-band
              </div>
            </div>
          </div>

          {/* Comparison Row 2: Average FRP & Max FRP */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface/40 border border-border">
              <div className="text-[11px] text-text-muted mb-0.5">Mean FRP (MW)</div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono font-bold text-fire">{modisAvgFrp} MW</span>
                <span className="text-[10px] text-text-muted">Peak: {modisMaxFrp} MW</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface/40 border border-border">
              <div className="text-[11px] text-text-muted mb-0.5">Mean FRP (MW)</div>
              <div className="flex items-baseline justify-between">
                <span className="font-mono font-bold text-cyan">{viirsAvgFrp} MW</span>
                <span className="text-[10px] text-text-muted">Peak: {viirsMaxFrp} MW</span>
              </div>
            </div>
          </div>

          {/* Comparison Row 3: High Confidence Rate & Swath */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface/40 border border-border">
              <div className="text-[11px] text-text-muted mb-0.5">High Confidence Count</div>
              <div className="font-mono font-bold text-text-primary">
                {modisHighConf.toLocaleString()} ({modis.length ? Math.round((modisHighConf / modis.length) * 100) : 0}%)
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">Swath: 2,330 km</div>
            </div>

            <div className="p-2.5 rounded-xl bg-surface/40 border border-border">
              <div className="text-[11px] text-text-muted mb-0.5">High Confidence Count</div>
              <div className="font-mono font-bold text-text-primary">
                {viirsHighConf.toLocaleString()} ({viirs.length ? Math.round((viirsHighConf / viirs.length) * 100) : 0}%)
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">Swath: 3,000 km (no gap)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}