import {
  GitMerge, AlertCircle, CheckCircle,
  Layers, Clock, MapPin, Shield,
} from 'lucide-react';
import type { MatchingEngineParams, SpatialMatchingResults } from '../../types';

interface SpatialMatchingEngineProps {
  params: MatchingEngineParams;
  onChangeParams: (params: MatchingEngineParams) => void;
  results: SpatialMatchingResults;
}

export default function SpatialMatchingEngine({
  params,
  onChangeParams,
  results,
}: SpatialMatchingEngineProps) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <GitMerge className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Spatial-Temporal Matching Engine
            </h2>
            <span className="demo-badge text-[10px]">Harmonization Kernel</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Identify candidate co-incident thermal anomaly associations between MODIS and VIIRS passes using rigorous Haversine &amp; temporal criteria
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-xl space-y-6">
        {/* Top Controls Grid: Sliders for Spatial & Temporal Tolerances */}
        <div className="p-4 rounded-xl bg-navy/60 border border-border/60 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Spatial Tolerance Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan" />
                Spatial Tolerance
              </span>
              <span className="font-mono font-bold text-cyan bg-cyan/10 border border-cyan/30 px-2 py-0.5 rounded">
                &le; {params.spatialToleranceKm.toFixed(2)} km
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.25}
              value={params.spatialToleranceKm}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  spatialToleranceKm: Number(e.target.value),
                })
              }
              className="w-full accent-cyan h-1.5 bg-midnight rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
              <span>0.5 km (Strict)</span>
              <span>2.5 km</span>
              <span>5.0 km (Relaxed)</span>
            </div>
          </div>

          {/* 2. Temporal Tolerance Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning" />
                Temporal Window
              </span>
              <span className="font-mono font-bold text-warning bg-warning/10 border border-warning/30 px-2 py-0.5 rounded">
                &le; {params.temporalToleranceMinutes} min
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={params.temporalToleranceMinutes}
              onChange={(e) =>
                onChangeParams({
                  ...params,
                  temporalToleranceMinutes: Number(e.target.value),
                })
              }
              className="w-full accent-warning h-1.5 bg-midnight rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
              <span>15 min (Near-instant)</span>
              <span>90 min</span>
              <span>180 min (3 Hours)</span>
            </div>
          </div>

          {/* 3. Confidence Threshold Filter */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Confidence Filter
              </span>
              <span className="text-[10px] text-text-muted font-mono">Algorithm Gate</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { id: 'any', label: 'All' },
                { id: 'nominal_and_above', label: 'Nominal+' },
                { id: 'high_only', label: 'High Only' },
              ].map((opt) => {
                const active = (params.confidenceRequirement || 'any') === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() =>
                      onChangeParams({
                        ...params,
                        confidenceRequirement: opt.id as any,
                      })
                    }
                    className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                      active
                        ? 'bg-cyan/20 border-cyan/40 text-cyan font-bold shadow-sm'
                        : 'bg-surface-light/40 border-border/60 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-text-muted block mt-1">
              Apply minimum confidence requirement to matched pairs
            </span>
          </div>
        </div>

        {/* 3 Output Categories: Matched, MODIS-only, VIIRS-only */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Category 1: Matched Observations */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-purple-400" />
                  Candidate Matched Pairs
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold">
                  {results.matchRatePct}% Cohort
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-mono font-extrabold text-purple-200">
                  {results.matchedPairs.length.toLocaleString()}
                </span>
                <span className="text-xs text-text-muted">
                  pairs ({results.matchedPairs.length * 2} detections)
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                Observations satisfying spatial (&le;{params.spatialToleranceKm} km) and temporal (&le;{params.temporalToleranceMinutes} min) criteria.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-purple-500/20 grid grid-cols-2 gap-2 text-[10px] text-text-muted font-mono">
              <div>
                <span>Mean Distance:</span>
                <p className="font-bold text-text-primary">{results.meanDistanceKm} km</p>
              </div>
              <div>
                <span>Mean Time Delta:</span>
                <p className="font-bold text-text-primary">{results.meanTimeDiffMin} min</p>
              </div>
            </div>
          </div>

          {/* Category 2: MODIS-only Observations */}
          <div className="p-4 rounded-xl bg-fire/10 border border-fire/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-fire flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-fire" />
                  MODIS-Only Observations
                </span>
                <span className="px-2 py-0.5 rounded-full bg-fire/20 text-fire font-mono text-[10px] font-bold">
                  {results.totalModis ? Math.round((results.modisOnly.length / results.totalModis) * 100) : 0}% of MODIS
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-mono font-extrabold text-fire">
                  {results.modisOnly.length.toLocaleString()}
                </span>
                <span className="text-xs text-text-muted">unpaired detections</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                Fires detected on Terra or Aqua with no corresponding VIIRS overpass within configured tolerance (e.g. morning pass or cloud drift).
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-fire/20 flex items-center justify-between text-[10px] text-text-muted">
              <span>Sensor: <strong className="text-fire font-semibold">1 km Nadir</strong></span>
              <span>Terra 10:30 &amp; Aqua 13:30</span>
            </div>
          </div>

          {/* Category 3: VIIRS-only Observations */}
          <div className="p-4 rounded-xl bg-cyan/10 border border-cyan/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan" />
                  VIIRS-Only Observations
                </span>
                <span className="px-2 py-0.5 rounded-full bg-cyan/20 text-cyan font-mono text-[10px] font-bold">
                  {results.totalViirs ? Math.round((results.viirsOnly.length / results.totalViirs) * 100) : 0}% of VIIRS
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="text-2xl font-mono font-extrabold text-cyan">
                  {results.viirsOnly.length.toLocaleString()}
                </span>
                <span className="text-xs text-text-muted">unpaired detections</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                Fires detected by Suomi-NPP or NOAA-20 that were below MODIS 1 km detection thresholds or outside MODIS swath coverage.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-cyan/20 flex items-center justify-between text-[10px] text-text-muted">
              <span>Sensor: <strong className="text-cyan font-semibold">375 m I-band</strong></span>
              <span>Sub-pixel thermal sensitivity</span>
            </div>
          </div>
        </div>

        {/* Scientific Principle Alert */}
        <div className="p-4 rounded-xl bg-surface/50 border border-border/80 text-xs text-text-secondary flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-cyan font-semibold">
              Scientific Candidate Association Notice:{' '}
            </strong>
            Spatial and temporal proximity establishes a <strong className="text-text-primary">candidate association</strong> between observations, not physical proof of the exact same flame perimeter. Rapid fire progression, wind shifts, and smoke plume drift mean a fire can evolve significantly even within 30 minutes. To prevent double-counting, our engine enforces greedy bipartite assignment where each VIIRS pixel is paired to at most one MODIS pixel.
          </div>
        </div>
      </div>
    </section>
  );
}