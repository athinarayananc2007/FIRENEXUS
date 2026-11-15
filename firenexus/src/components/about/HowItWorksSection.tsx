import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Database,
  Cpu,
  MapPin,
  Clock,
  GitCompare,
  BarChart3,
  ChevronRight,
  Code2,
  CheckCircle2,
} from 'lucide-react';

interface ProcessStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  keyOperations: string[];
  scientificFormula: string;
  formulaLabel: string;
  outputArtifact: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 1,
    title: 'Data Collection',
    subtitle: 'Automated FIRMS Satellite Ingestion',
    icon: Database,
    description:
      'Continuous harvesting of Near Real-Time (NRT) active fire thermal anomalies from NASA FIRMS across Terra, Aqua, Suomi-NPP, and NOAA-20 platforms.',
    keyOperations: [
      'Ingests standardized CSV and GeoJSON streams from NASA Earthdata / LANCE.',
      'Parses spectral radiance bands, acquisition timestamps, and viewing zenith angles.',
      'Assigns persistent global observation identifiers (e.g., MODIS-2024-0518-842).',
    ],
    scientificFormula: 'T_b = (h·c) / (k·λ · ln((2·h·c² / (λ⁵ · L_λ)) + 1))',
    formulaLabel: 'Planck Radiance Inversion to Brightness Temp (K)',
    outputArtifact: 'Normalized raw observation vector records with 12 core attributes.',
  },
  {
    id: 2,
    title: 'Data Preprocessing',
    subtitle: 'Quality Assurance & Boundary Filtering',
    icon: Cpu,
    description:
      'Rigorous scientific QA filtering to clean anomalous thermal spikes, remove corrupt pixels, and apply land-water surface masks.',
    keyOperations: [
      'Applies land-water masks to reject sunglint reflections over oceans and inland lakes.',
      'Categorizes algorithmic confidence ratings into Low, Nominal, and High bins.',
      'Screens out scan-edge distortions exceeding optical bowtie limits.',
    ],
    scientificFormula: 'ΔT = T_b(3.9 µm) - T_b(11.0 µm) > Threshold_contextual',
    formulaLabel: 'Contextual Dual-Band Fire Detection Criterion',
    outputArtifact: 'Quality-cleansed active fire candidate cohort with verified spatial bounds.',
  },
  {
    id: 3,
    title: 'Spatial Analysis',
    subtitle: 'Geodetic Clustering & Footprint Modeling',
    icon: MapPin,
    description:
      'Calculates exact surface distances between detections using ellipsoidal geodesy and aggregates neighboring pixels into cohesive fire clusters.',
    keyOperations: [
      'Executes great-circle Haversine calculations across all candidate coordinate pairs.',
      'Identifies co-incident candidate detections within a configurable ≤35 km search radius.',
      'Models the ~7.1:1 area ratio between 1 km MODIS and 375 m VIIRS footprint footprints.',
    ],
    scientificFormula: 'd = 2R · arcsin(√(sin²(Δφ/2) + cos(φ₁)·cos(φ₂)·sin²(Δλ/2)))',
    formulaLabel: 'Haversine Great-Circle Proximity Equation',
    outputArtifact: 'Spatially indexed clusters mapping overlapping sensor observations.',
  },
  {
    id: 4,
    title: 'Temporal Analysis',
    subtitle: 'Diurnal Cycle & Overpass Synchronization',
    icon: Clock,
    description:
      'Correlates observation timestamps to track fire evolution across morning, afternoon, and nocturnal orbital passes.',
    keyOperations: [
      'Normalizes all acquisition timestamps to universal Coordinated Universal Time (UTC).',
      'Calculates local solar time and solar zenith angles (SZA) to designate Day (D) vs Night (N).',
      'Pairs consecutive morning (Terra 10:30) and afternoon (Aqua/S-NPP 13:30) observation windows.',
    ],
    scientificFormula: 'Hour_solar = (Hour_UTC + Longitude / 15°) mod 24',
    formulaLabel: 'Astronomical Local Solar Time Conversion',
    outputArtifact: 'Diurnally categorized observation timeline tracking ignition trends.',
  },
  {
    id: 5,
    title: 'Cross-Satellite Comparison',
    subtitle: 'Harmonization & Bias Calibration',
    icon: GitCompare,
    description:
      'Evaluates sensor sensitivity deltas and aligns Fire Radiative Power (FRP) metrics between MODIS and VIIRS instruments.',
    keyOperations: [
      'Computes detection density ratios between 1 km and 375 m sensors over identical biomes.',
      'Empirically calibrates Fire Radiative Power (FRP) to ensure energetic continuity.',
      'Identifies duplicate overpass detections and tags coincident sensor captures.',
    ],
    scientificFormula: 'FRP_harmonized = α · (A_VIIRS / A_MODIS)^β · FRP_observed',
    formulaLabel: 'Experimental Multi-Sensor FRP Scaling Calibration',
    outputArtifact: 'Harmonized observation dataset with cross-calibrated energy metrics.',
  },
  {
    id: 6,
    title: 'Visualization & Interpretation',
    subtitle: 'Interactive Geospatial Intelligence',
    icon: BarChart3,
    description:
      'Renders the harmonized data into responsive 3D WebGL globes, interactive 2D maps, analytical charts, and scientific research tables.',
    keyOperations: [
      'Projects 3D active fire heatmaps onto interactive virtual Earth spheres.',
      'Generates synchronized Leaflet maps with custom MODIS (orange) and VIIRS (cyan) styling.',
      'Powers interactive temporal heatmaps, analytics dashboards, and open data exports.',
    ],
    scientificFormula: 'Heatmap_intensity = Σ (FRP_i · exp(-d_i² / 2σ²))',
    formulaLabel: 'Gaussian Kernel Density Heatmap Projection',
    outputArtifact: 'Fully interactive scientific dashboard accessible to researchers worldwide.',
  },
];

export const HowItWorksSection: React.FC = () => {
  const [activeStepId, setActiveStepId] = useState<number>(1);

  const activeStep = PROCESS_STEPS.find((s) => s.id === activeStepId) || PROCESS_STEPS[0];

  return (
    <section id="process-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md shadow-cyan-dim">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                How It Works
              </h2>
              <span className="demo-badge">Interactive Process Architecture</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Step-by-step scientific process governing data ingestion, preprocessing, spatial-temporal analysis, and visualization.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Click any phase to inspect the underlying mechanics</span>
        </div>
      </div>

      {/* Main Process Stepper Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step Selector List (Left Column) */}
        <div className="lg:col-span-5 space-y-2">
          {PROCESS_STEPS.map((step) => {
            const isCurrent = step.id === activeStepId;
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => setActiveStepId(step.id)}
                className={`w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex items-center justify-between border ${
                  isCurrent
                    ? 'bg-surface-light border-cyan/50 shadow-md shadow-cyan-dim/20 ring-1 ring-cyan/40'
                    : 'bg-navy/70 border-border/60 hover:bg-surface/80 hover:border-cyan/30 text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isCurrent
                        ? 'bg-cyan text-midnight shadow-sm'
                        : 'bg-midnight text-text-muted border border-border/60'
                    }`}
                  >
                    0{step.id}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isCurrent ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {step.title}
                    </div>
                    <div className="text-[10px] text-text-muted">{step.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isCurrent ? 'text-cyan' : 'text-text-muted'
                    }`}
                  />
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isCurrent ? 'text-cyan translate-x-0.5' : 'text-text-muted/50'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Deep Dive Panel (Right Column) */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="card p-6 bg-surface/98 border-cyan/40 shadow-2xl space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan/20 text-cyan border border-cyan/40 shadow-sm">
                    <activeStep.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan">
                      Process Phase 0{activeStep.id} of 06
                    </span>
                    <h3 className="text-xl font-bold text-text-primary mt-0.5">
                      {activeStep.title}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-navy text-text-muted border border-border/60">
                  {activeStep.subtitle}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {activeStep.description}
              </p>

              {/* Key Operations */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-mint" /> Primary Scientific Operations:
                </div>
                <ul className="space-y-1.5 text-xs text-text-secondary">
                  {activeStep.keyOperations.map((op, i) => (
                    <li key={i} className="flex items-start gap-2 bg-midnight/50 p-2 rounded-lg border border-border/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{op}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Scientific Formula / Logic Representation */}
              <div className="p-3.5 rounded-xl bg-midnight/90 border border-border/70 space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span className="flex items-center gap-1 text-cyan font-semibold">
                    <Code2 className="w-3 h-3" /> {activeStep.formulaLabel}
                  </span>
                  <span className="text-[9px] px-1 rounded bg-navy text-text-muted">Algorithm</span>
                </div>
                <div className="text-xs font-bold text-mint bg-navy/60 p-2 rounded border border-border/40 overflow-x-auto">
                  {activeStep.scientificFormula}
                </div>
              </div>

              {/* Output Deliverable Banner */}
              <div className="p-3 rounded-xl bg-navy/60 border border-border/60 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[11px]">Phase Output:</span>
                <span className="font-semibold text-text-primary text-[11px] text-right truncate max-w-[320px]">
                  {activeStep.outputArtifact}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
