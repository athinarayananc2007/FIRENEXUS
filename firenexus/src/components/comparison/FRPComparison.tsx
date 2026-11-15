import { useMemo } from 'react';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';
import {
  Zap, AlertTriangle,
} from 'lucide-react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { computeFrpBins, computeSensorFRPStats } from '../../data/mock/fireData';

interface FRPComparisonProps {
  observations: FireObservation[];
  matchedPairs: MatchedFirePair[];
}

export default function FRPComparison({
  observations,
  matchedPairs,
}: FRPComparisonProps) {
  const bins = useMemo(() => computeFrpBins(observations), [observations]);
  const frpStats = useMemo(() => computeSensorFRPStats(observations), [observations]);

  // Scatter plot data from candidate matches (cap at 200 for clean SVG rendering)
  const scatterData = useMemo(() => {
    return matchedPairs.slice(0, 200).map((p) => ({
      id: p.id,
      modisFrp: p.modis.frp,
      viirsFrp: p.viirs.frp,
      distanceKm: p.distanceKm,
      timeDiffMin: p.timeDiffMinutes,
      region: p.modis.region,
    }));
  }, [matchedPairs]);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Fire Radiative Power (MW) Inter-Comparison
            </h2>
            <span className="demo-badge text-[10px]">Thermal Energy Retrieval</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Cross-sensor radiant thermal energy calibration, histogram distributions, and paired scatter evaluation
          </p>
        </div>
      </div>

      {/* Two-Column Grid: FRP Histogram + Matched FRP Scatter Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: FRP Binned Histograms */}
        <div className="glass border border-border/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                FRP Intensity Distribution Histogram
              </h3>
              <p className="text-[11px] text-text-muted">
                Hotspot frequency categorized across combustion intensity tiers
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Units: MW
            </span>
          </div>

          <div className="w-full h-64 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bins} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
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
                  formatter={(val: any, name: any) => [`${Number(val)} hotspots`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                <Bar dataKey="modis" name="MODIS (1 km)" fill="#FF713E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="viirs" name="VIIRS (375 m)" fill="#00E5B0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 rounded-xl bg-fire/10 border border-fire/20">
              <span className="text-[10px] text-text-muted block">MODIS Mean / Median</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono font-bold text-fire text-sm">
                  {frpStats.modisMean} MW
                </span>
                <span className="text-[10px] text-text-muted">
                  (Med: {frpStats.modisMedian} MW)
                </span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-cyan/10 border border-cyan/20">
              <span className="text-[10px] text-text-muted block">VIIRS Mean / Median</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono font-bold text-cyan text-sm">
                  {frpStats.viirsMean} MW
                </span>
                <span className="text-[10px] text-text-muted">
                  (Med: {frpStats.viirsMedian} MW)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Paired FRP Scatter Plot */}
        <div className="glass border border-border/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary">
                Candidate Matched FRP Correlation
              </h3>
              <p className="text-[11px] text-text-muted">
                MODIS FRP vs VIIRS FRP for co-incident candidate pairs with 1:1 reference line
              </p>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              {scatterData.length} Matched Pairs
            </span>
          </div>

          <div className="w-full h-64 min-h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="modisFrp"
                  name="MODIS FRP"
                  unit=" MW"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#1F2E4A' }}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="viirsFrp"
                  name="VIIRS FRP"
                  unit=" MW"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={{ stroke: '#1F2E4A' }}
                  tickLine={false}
                />
                <ZAxis range={[25, 25]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="p-2.5 rounded-xl bg-midnight/95 border border-border text-xs text-text-primary shadow-xl font-mono">
                        <p className="font-bold text-purple-300 mb-1">{d.id}</p>
                        <p className="text-fire">MODIS: {d.modisFrp} MW</p>
                        <p className="text-cyan">VIIRS: {d.viirsFrp} MW</p>
                        <p className="text-text-muted mt-1 text-[10px]">
                          Dist: {d.distanceKm} km · &Delta;t: {d.timeDiffMin} min
                        </p>
                      </div>
                    );
                  }}
                />
                {/* 1:1 Reference Line */}
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 250, y: 250 }]}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{ value: '1:1 Equivalence', fill: '#64748b', fontSize: 10, position: 'insideTopLeft' }}
                />
                <Scatter
                  name="Candidate Pairs"
                  data={scatterData}
                  fill="#c084fc"
                  opacity={0.85}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-border/50 text-[11px] text-text-muted flex items-center justify-between">
            <span>Points along dashed line indicate identical energy retrievals</span>
            <span className="text-purple-300 font-mono font-semibold">
              Bias: {(frpStats.viirsMean - frpStats.modisMean).toFixed(1)} MW
            </span>
          </div>
        </div>
      </div>

      {/* Scientific Principle Warning */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-text-secondary flex items-start gap-3 shadow-md">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-amber-300 font-semibold">
            Radiative Equivalence Caveat:{' '}
          </strong>
          FRP values retrieved from MODIS and VIIRS must <strong className="text-text-primary">not be treated as automatically interchangeable</strong>. MODIS utilizes the 3.96 µm channel while VIIRS utilizes the 3.74 µm I-band. Discrepancies in spectral filter profiles, atmospheric window transmission, sub-pixel flame temperature distributions, and scan angle geometry create systematic retrieval offsets that require empirical scaling prior to biomass burning emission modeling.
        </div>
      </div>
    </section>
  );
}