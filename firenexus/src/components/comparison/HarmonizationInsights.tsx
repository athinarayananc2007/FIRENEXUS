import { motion } from 'framer-motion';
import {
  Merge, Database, MapPin, Clock, ShieldCheck,
  Sparkles, Layers, AlertCircle,
} from 'lucide-react';
import type { SpatialMatchingResults } from '../../types';

interface HarmonizationInsightsProps {
  results: SpatialMatchingResults;
}

const WORKFLOW_STAGES = [
  {
    step: '01',
    title: 'Multi-Sensor Ingestion',
    desc: 'Ingest raw active-fire products from Terra/Aqua MODIS (MOD14/MYD14) and SNPP/NOAA-20 VIIRS (VNP14IMG/VJ114IMG).',
    icon: Database,
    color: 'text-cyan',
  },
  {
    step: '02',
    title: 'Coordinate & Timestamp Normalization',
    desc: 'Standardize geodetic ellipsoids (WGS84), acquisition timestamps (UTC), and radiometric scan angles.',
    icon: MapPin,
    color: 'text-electric',
  },
  {
    step: '03',
    title: 'Spatial-Temporal Bipartite Kernel',
    desc: 'Execute distance calculations (Haversine &le;2.0 km) and overpass time-delta gating (&le;90 min) to identify candidate co-incident pairs.',
    icon: Clock,
    color: 'text-warning',
  },
  {
    step: '04',
    title: 'De-duplication & Cluster Assignment',
    desc: 'Prevent double-counting: map multiple sub-pixel VIIRS 375 m detections to single MODIS 1 km footprints with 1:N cluster weights.',
    icon: Layers,
    color: 'text-fire',
  },
  {
    step: '05',
    title: 'Radiative Energy Cross-Calibration',
    desc: 'Apply empirical bandpass scaling coefficients to harmonize VIIRS 3.74 µm FRP with MODIS 3.96 µm baseline retrievals.',
    icon: ShieldCheck,
    color: 'text-emerald-400',
  },
  {
    step: '06',
    title: 'Unified Harmonized Product',
    desc: 'Generate consensus fire perimeter, unified confidence score, and complete bidirectional sensor provenance metadata.',
    icon: Merge,
    color: 'text-purple-300',
  },
];

export default function HarmonizationInsights({ results }: HarmonizationInsightsProps) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Merge className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Harmonization Insights &amp; Scientific Methodology
            </h2>
            <span className="demo-badge text-[10px]">Data Fusion Framework</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Operational workflow transforming disparate multi-sensor satellite observations into a unified active-fire record
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass border border-border/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
        {/* Harmonization Workflow Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan" />
              <span>Harmonization Processing Pipeline</span>
            </h3>
            <span className="text-[11px] font-mono text-text-muted">
              6-Stage Algorithmic Pipeline
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKFLOW_STAGES.map((st, i) => (
              <motion.div
                key={st.step}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-3.5 rounded-xl bg-surface/40 hover:bg-surface-light border border-border/60 hover:border-cyan/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-text-muted group-hover:text-cyan transition-colors">
                      STAGE {st.step}
                    </span>
                    <st.icon className={`w-4 h-4 ${st.color}`} />
                  </div>
                  <h4 className="text-xs font-bold text-text-primary mb-1">
                    {st.title}
                  </h4>
                  <p className="text-[11px] text-text-secondary leading-snug">
                    {st.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Dynamic Harmonization Statistics Summary */}
        <div className="pt-4 border-t border-border/60">
          <h3 className="text-sm font-bold text-text-primary mb-3">
            Candidate Harmonization Cohort Distribution
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                Candidate Matched Pairs
              </span>
              <span className="text-xl font-mono font-extrabold text-purple-300">
                {results.matchedPairs.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-purple-400 block mt-0.5 font-mono">
                {results.matchRatePct}% of cohort
              </span>
            </div>

            <div className="p-3 rounded-xl bg-fire/10 border border-fire/30">
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                MODIS-Only Detections
              </span>
              <span className="text-xl font-mono font-extrabold text-fire">
                {results.modisOnly.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-fire block mt-0.5 font-mono">
                {results.totalModis ? Math.round((results.modisOnly.length / results.totalModis) * 100) : 0}% of MODIS
              </span>
            </div>

            <div className="p-3 rounded-xl bg-cyan/10 border border-cyan/30">
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                VIIRS-Only Detections
              </span>
              <span className="text-xl font-mono font-extrabold text-cyan">
                {results.viirsOnly.length.toLocaleString()}
              </span>
              <span className="text-[10px] text-cyan block mt-0.5 font-mono">
                {results.totalViirs ? Math.round((results.viirsOnly.length / results.totalViirs) * 100) : 0}% of VIIRS
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface/50 border border-border">
              <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">
                Mean Cross-Sensor Distance
              </span>
              <span className="text-xl font-mono font-extrabold text-text-primary">
                {results.meanDistanceKm} km
              </span>
              <span className="text-[10px] text-text-muted block mt-0.5 font-mono">
                &Delta;t: {results.meanTimeDiffMin} min
              </span>
            </div>
          </div>
        </div>

        {/* Distinction: Raw vs Harmonized */}
        <div className="p-4 rounded-xl bg-navy/80 border border-border/80 text-xs text-text-secondary flex items-start gap-3 shadow-md">
          <AlertCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-cyan font-semibold">
              Distinguishing Raw Observations from Harmonized Records:{' '}
            </strong>
            <span className="text-text-primary">Raw sensor observations</span> represent individual uncalibrated instrument detections subject to scan-angle distortion, pixel overlap, and varying satellite passes. A <strong className="text-text-primary">Harmonized Observation Record</strong> resolves duplicate thermal pixels across constellations, applies energy bias corrections, and attributes a single consistent fire event record with full provenance tracking back to both source satellite instruments.
          </div>
        </div>
      </div>
    </section>
  );
}