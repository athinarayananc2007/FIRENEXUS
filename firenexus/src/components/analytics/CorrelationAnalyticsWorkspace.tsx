import React, { useState, useMemo } from 'react';
import type { MatchedFirePair } from '../../types';
import { computePearsonCorrelation, computeMean } from '../../utils/analyticsMath';
import {
  ScatterChart as ScatterIcon,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface CorrelationAnalyticsWorkspaceProps {
  matchedPairs: MatchedFirePair[];
}

type CorrelationMode = 'frp_pair' | 'spatial_temporal' | 'confidence_frp';

export const CorrelationAnalyticsWorkspace: React.FC<CorrelationAnalyticsWorkspaceProps> = ({
  matchedPairs,
}) => {
  const [activeMode, setActiveMode] = useState<CorrelationMode>('frp_pair');

  // 1. Matched Pairs FRP correlation
  const { frpPairsData, frpStats } = useMemo(() => {
    const validPairs = matchedPairs.filter((p) => p.modis && p.viirs);
    const x = validPairs.map((p) => p.modis.frp);
    const y = validPairs.map((p) => p.viirs.frp);

    const stats = computePearsonCorrelation(x, y);

    const scatterPoints = validPairs.map((p) => ({
      x: Math.round(p.modis.frp * 10) / 10,
      y: Math.round(p.viirs.frp * 10) / 10,
      id: p.id,
      distanceKm: p.distanceKm,
      timeDiffMin: p.timeDiffMinutes,
      country: p.modis.country,
    }));

    return { frpPairsData: scatterPoints, frpStats: stats };
  }, [matchedPairs]);

  // 2. Spatial Distance vs Time Difference correlation
  const { distTimeData, distTimeStats } = useMemo(() => {
    const validPairs = matchedPairs.filter((p) => p.distanceKm !== undefined && p.timeDiffMinutes !== undefined);
    const x = validPairs.map((p) => p.distanceKm);
    const y = validPairs.map((p) => p.timeDiffMinutes);

    const stats = computePearsonCorrelation(x, y);

    const scatterPoints = validPairs.map((p) => ({
      x: p.distanceKm,
      y: p.timeDiffMinutes,
      id: p.id,
      modisFrp: p.modis.frp,
      viirsFrp: p.viirs.frp,
    }));

    return { distTimeData: scatterPoints, distTimeStats: stats };
  }, [matchedPairs]);

  // Max value calculation for 1:1 parity line
  const maxFrpVal = useMemo(() => {
    if (frpPairsData.length === 0) return 200;
    const maxX = Math.max(...frpPairsData.map((p) => p.x), 50);
    const maxY = Math.max(...frpPairsData.map((p) => p.y), 50);
    return Math.ceil(Math.max(maxX, maxY) / 50) * 50;
  }, [frpPairsData]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <ScatterIcon className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Empirical Sensor Correlation &amp; Covariance
            </h2>
            <span className="demo-badge text-[10px]">Pearson r Engine</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Statistical regression modeling between co-located MODIS and VIIRS thermal anomaly pairs
            within defined spatial-temporal gating bounds.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
          <button
            onClick={() => setActiveMode('frp_pair')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeMode === 'frp_pair'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            MODIS vs VIIRS FRP
          </button>
          <button
            onClick={() => setActiveMode('spatial_temporal')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeMode === 'spatial_temporal'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Distance vs Time (&Delta;d vs &Delta;t)
          </button>
        </div>
      </div>

      {activeMode === 'frp_pair' ? (
        <div className="space-y-4">
          {/* Statistical KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-navy/60 p-3.5 rounded-xl border border-border/50 text-xs font-mono">
            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Pearson Correlation (r)
              </span>
              <div className="text-lg font-extrabold text-cyan mt-0.5">
                r = {frpStats.r > 0 ? `+${frpStats.r}` : frpStats.r}
              </div>
              <span className="text-[10px] text-text-muted">
                {Math.abs(frpStats.r) > 0.7
                  ? 'Strong positive linear association'
                  : 'Moderate energetic correlation'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Coefficient of Determ. (R&sup2;)
              </span>
              <div className="text-lg font-extrabold text-amber-400 mt-0.5">
                R&sup2; = {frpStats.r2}
              </div>
              <span className="text-[10px] text-text-muted">
                {Math.round(frpStats.r2 * 100)}% of variance explained
              </span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Paired Sample Size (N)
              </span>
              <div className="text-lg font-extrabold text-text-primary mt-0.5">
                N = {frpStats.n} pairs
              </div>
              <span className="text-[10px] text-text-muted">Co-located observations</span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Linear Scaling Slope
              </span>
              <div className="text-lg font-extrabold text-text-primary mt-0.5">
                &beta; = {frpStats.slope}x
              </div>
              <span className="text-[10px] text-text-muted">
                y = {frpStats.slope}x {frpStats.intercept >= 0 ? `+ ${frpStats.intercept}` : frpStats.intercept}
              </span>
            </div>
          </div>

          {/* FRP Scatter Plot */}
          <div className="h-80 sm:h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="MODIS FRP"
                  unit=" MW"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, maxFrpVal]}
                  label={{
                    value: 'MODIS 1 km Fire Radiative Power (MW)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#FF713E',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="VIIRS FRP"
                  unit=" MW"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, maxFrpVal]}
                  label={{
                    value: 'VIIRS 375 m Fire Radiative Power (MW)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    fill: '#00E5B0',
                    fontSize: 11,
                  }}
                />
                <ZAxis range={[50, 50]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                            Pair ID: {d.id}
                          </div>
                          <div className="text-fire">MODIS FRP: {d.x} MW</div>
                          <div className="text-cyan">VIIRS FRP: {d.y} MW</div>
                          <div className="text-text-muted border-t border-border/40 pt-1">
                            Distance: {d.distanceKm} km | &Delta;t: {d.timeDiffMin} min
                          </div>
                          <div className="text-text-secondary">{d.country}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* 1:1 Parity Reference Line */}
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: maxFrpVal, y: maxFrpVal },
                  ]}
                  stroke="#64748b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '1:1 Parity (y = x)',
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
                <Scatter name="Matched Pairs" data={frpPairsData} fill="#00E5B0" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Spatial Distance vs Temporal Gap Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-navy/60 p-3.5 rounded-xl border border-border/50 text-xs font-mono">
            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Mean Distance Offset
              </span>
              <div className="text-lg font-extrabold text-cyan mt-0.5">
                {computeMean(distTimeData.map((d) => d.x))} km
              </div>
              <span className="text-[10px] text-text-muted">&le; 2.0 km search radius</span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Mean Temporal Gap
              </span>
              <div className="text-lg font-extrabold text-amber-400 mt-0.5">
                {computeMean(distTimeData.map((d) => d.y))} min
              </div>
              <span className="text-[10px] text-text-muted">&le; 90 min orbital offset</span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Spatial-Temporal Correlation
              </span>
              <div className="text-lg font-extrabold text-text-primary mt-0.5">
                r = {distTimeStats.r}
              </div>
              <span className="text-[10px] text-text-muted">Orthogonal parameters</span>
            </div>

            <div>
              <span className="text-[10px] text-text-muted font-sans uppercase">
                Matched Cluster Count
              </span>
              <div className="text-lg font-extrabold text-text-primary mt-0.5">
                N = {distTimeStats.n}
              </div>
              <span className="text-[10px] text-text-muted">Pairs verified</span>
            </div>
          </div>

          {/* Scatter Plot: Distance vs Time */}
          <div className="h-80 sm:h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Spatial Distance"
                  unit=" km"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 2.5]}
                  label={{
                    value: 'Spatial Distance Offset (\u0394d km)',
                    position: 'insideBottom',
                    offset: -10,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Time Difference"
                  unit=" min"
                  stroke="#64748b"
                  fontSize={11}
                  domain={[0, 100]}
                  label={{
                    value: 'Temporal Acquisition Gap (\u0394t minutes)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 0,
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                            Pair: {d.id}
                          </div>
                          <div>Distance: {d.x} km</div>
                          <div>Time Difference: {d.y} minutes</div>
                          <div className="text-text-muted border-t border-border/40 pt-1">
                            MODIS FRP: {d.modisFrp} MW | VIIRS FRP: {d.viirsFrp} MW
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Spatial-Temporal Offsets" data={distTimeData} fill="#FF713E" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Limitations & Biophysical Variance Callout */}
      <div className="p-4 rounded-xl bg-navy/80 border border-border/60 text-xs text-text-secondary flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-text-primary">
            Statistical Interpretation &amp; Physical Variance Drivers
          </h4>
          <p className="leading-relaxed">
            The observed scatter between MODIS and VIIRS FRP values arises from genuine physical
            phenomena: (1) <strong>Pixel Footprint Geometry:</strong> At the edge of swath, MODIS pixels
            broaden to ~4.8 km &times; 2.0 km, diluting background radiance contrast compared to
            VIIRS's controlled 375 m footprint. (2) <strong>Overpass Temporal Gaps:</strong> Even a 15–45
            minute delta allows rapid flame front propagation, smoke plume shadowing, and wind-driven
            gusts to alter the instantaneous radiative output. (3) <strong>Spectral Bandwidth:</strong>{' '}
            Subtle differences between MODIS Band 21 (3.96 &mu;m) and VIIRS I4/M13 (3.74/4.05 &mu;m)
            influence atmospheric carbon dioxide and water vapor transmittance absorption.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CorrelationAnalyticsWorkspace;
