import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Satellite,
  DownloadCloud,
  Filter,
  Compass,
  GitCompare,
  BarChart3,
  Globe2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';

interface WorkflowStage {
  id: number;
  name: string;
  shortLabel: string;
  icon: React.ElementType;
  accent: 'orange' | 'cyan' | 'mint' | 'violet' | 'amber';
  summary: string;
  inputData: string;
  outputProduct: string;
  algorithmMethod: string;
  validationStatus: string;
  isExperimental: boolean;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 1,
    name: 'Satellite Observations',
    shortLabel: 'Observations',
    icon: Satellite,
    accent: 'orange',
    summary:
      'Polar-orbiting radiometers aboard Terra, Aqua, Suomi-NPP, and NOAA satellites measure radiance in 3.9 µm (MIR) and 11 µm (TIR) spectral bands during orbital passes.',
    inputData: 'Raw spaceborne top-of-atmosphere radiance fluxes (L1B calibrated radiances).',
    outputProduct: 'Digital counts and calibrated radiance measurements per sensor pixel.',
    algorithmMethod: 'Planck blackbody radiation function inversion to brightness temperatures (Kelvin).',
    validationStatus: 'NASA Operational Standard (Decades of flight heritage).',
    isExperimental: false,
  },
  {
    id: 2,
    name: 'Data Acquisition',
    shortLabel: 'Acquisition',
    icon: DownloadCloud,
    accent: 'cyan',
    summary:
      'NASA FIRMS (Fire Information for Resource Management System) and LANCE process downlink telemetry within 3 hours of observation to generate NRT active fire products.',
    inputData: 'Telemetry direct broadcast and ground tracking stations downlinks.',
    outputProduct: 'MOD14/MYD14 (MODIS) and VNP14IMG/VJ114IMG (VIIRS) tabular records.',
    algorithmMethod: 'Automated ingestion pipelines distributing geolocated active fire points.',
    validationStatus: 'NASA Operational Standard (NRT delivery within ~3 hours).',
    isExperimental: false,
  },
  {
    id: 3,
    name: 'Data Cleaning',
    shortLabel: 'Cleaning',
    icon: Filter,
    accent: 'mint',
    summary:
      'Filtering noisy pixels, sunglint over water bodies, extreme viewing zenith angle artifacts, and cloud-contaminated anomalous radiance spikes.',
    inputData: 'Raw FIRMS fire detection points with contextual background statistics.',
    outputProduct: 'Quality-assured active fire candidate vector points with confidence ratings.',
    algorithmMethod: 'Contextual thresholding and land-water mask boundary verification.',
    validationStatus: 'Established remote sensing quality assurance protocol.',
    isExperimental: false,
  },
  {
    id: 4,
    name: 'Coordinate & Timestamp Standardization',
    shortLabel: 'Standardization',
    icon: Compass,
    accent: 'violet',
    summary:
      'Transforming heterogeneous sensor geometries into standardized WGS84 spatial coordinates and Coordinated Universal Time (UTC) overpass timestamps.',
    inputData: 'Pixel scan line/sample indices and satellite ephemeris position vectors.',
    outputProduct: 'Normalized decimal latitude, longitude, and astronomical solar day/night flags.',
    algorithmMethod: 'Ellipsoidal geodetic reprojection and solar zenith angle calculation.',
    validationStatus: 'Standardized GIS and astronomical geodesy methods.',
    isExperimental: false,
  },
  {
    id: 5,
    name: 'MODIS–VIIRS Harmonization',
    shortLabel: 'Harmonization',
    icon: GitCompare,
    accent: 'cyan',
    summary:
      'Spatial clustering and footprint-scaling equations to reconcile 1 km MODIS and 375 m VIIRS pixel counts into unified physical fire event approximations.',
    inputData: 'Standardized MODIS and VIIRS detections across coincident spatial windows.',
    outputProduct: 'Harmonized fire event cohorts with calibrated area and energy scaling.',
    algorithmMethod: 'Spatial proximity clustering (Haversine ≤ 35 km) and empirical sensor sensitivity ratios.',
    validationStatus: 'Exploratory Scientific Framework (Research in progress).',
    isExperimental: true,
  },
  {
    id: 6,
    name: 'Comparative Analysis',
    shortLabel: 'Comparison',
    icon: BarChart3,
    accent: 'amber',
    summary:
      'Cross-sensor statistical regression, Fire Radiative Power (FRP) correlation, and diurnal detection frequency modeling across diverse biomes.',
    inputData: 'Harmonized multi-sensor fire event clusters across overlapping swaths.',
    outputProduct: 'FRP ratio distributions, detection difference matrices, and sensor bias metrics.',
    algorithmMethod: 'Bivariate linear regression, density estimation, and residual distribution analysis.',
    validationStatus: 'Analytical validation and exploratory modeling.',
    isExperimental: true,
  },
  {
    id: 7,
    name: 'Global Fire Activity Visualization',
    shortLabel: 'Visualization',
    icon: Globe2,
    accent: 'mint',
    summary:
      'Interactive multi-dimensional rendering across 3D Earth globes, geospatial heatmaps, temporal trend charts, and analytical dashboards.',
    inputData: 'Harmonized global fire intelligence datasets.',
    outputProduct: 'User-facing scientific explorer, temporal heatmaps, and exportable datasets.',
    algorithmMethod: 'WebGL geospatial acceleration, canvas particle rendering, and vector clustering.',
    validationStatus: 'Demonstration and scientific visualization platform.',
    isExperimental: false,
  },
];

export const HarmonizationWorkflowSection: React.FC = () => {
  const [activeStageId, setActiveStageId] = useState<number>(5);

  const activeStage = WORKFLOW_STAGES.find((s) => s.id === activeStageId) || WORKFLOW_STAGES[4];

  const getAccentColor = (accent: WorkflowStage['accent']) => {
    switch (accent) {
      case 'orange':
        return { text: 'text-fire', bg: 'bg-fire/15', border: 'border-fire/40', glow: 'shadow-fire-dim' };
      case 'cyan':
        return { text: 'text-cyan', bg: 'bg-cyan/15', border: 'border-cyan/40', glow: 'shadow-cyan-dim' };
      case 'mint':
        return { text: 'text-mint', bg: 'bg-mint/15', border: 'border-mint/40', glow: 'shadow-mint-dim' };
      case 'violet':
        return { text: 'text-purple-300', bg: 'bg-purple-500/15', border: 'border-purple-400/40', glow: 'shadow-purple-dim' };
      case 'amber':
        return { text: 'text-amber-400', bg: 'bg-amber-400/15', border: 'border-amber-400/40', glow: 'shadow-amber-dim' };
    }
  };

  const activeAccent = getAccentColor(activeStage.accent);

  return (
    <section id="workflow-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md shadow-cyan-dim">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Harmonization Workflow
              </h2>
              <span className="demo-badge">Scientific Pipeline</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Seven-stage scientific data pipeline from satellite photon capture to unified global fire intelligence.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Click any stage below to inspect the pipeline</span>
        </div>
      </div>

      {/* Interactive 7-Stage Node Pipeline */}
      <div className="card p-6 bg-surface/95 border-border/80 shadow-2xl space-y-6">
        {/* Animated Connecting Timeline */}
        <div className="relative">
          {/* Connecting Background Line */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-gradient-to-r from-fire via-cyan to-mint opacity-40 z-0" />

          {/* Glowing Pulse Animation */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-1/2 h-0.5 bg-cyan/80 blur-sm opacity-50 z-0 animate-pulse" />

          {/* Stages Nodes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 relative z-10">
            {WORKFLOW_STAGES.map((stage) => {
              const isSelected = stage.id === activeStageId;
              const accent = getAccentColor(stage.accent);
              const Icon = stage.icon;

              return (
                <button
                  key={stage.id}
                  onClick={() => setActiveStageId(stage.id)}
                  className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all duration-300 relative group ${
                    isSelected
                      ? `bg-surface-light ${accent.border} border-2 shadow-lg ${accent.glow} scale-105`
                      : 'bg-navy/80 border border-border/70 hover:bg-surface-light hover:border-cyan/40'
                  }`}
                >
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-between w-full mb-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? `${accent.bg} ${accent.text}` : 'bg-midnight text-text-muted'
                      }`}
                    >
                      0{stage.id}
                    </span>
                    {stage.isExperimental && (
                      <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-400 font-mono" title="Exploratory research stage">
                        EXP
                      </span>
                    )}
                  </div>

                  {/* Icon Node */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? `${accent.bg} ${accent.text} border ${accent.border}`
                        : 'bg-midnight/70 text-text-secondary group-hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Stage Name */}
                  <div className="mt-2.5">
                    <span
                      className={`text-xs font-bold block leading-tight ${
                        isSelected ? accent.text : 'text-text-primary'
                      }`}
                    >
                      {stage.shortLabel}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Stage Explanation Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStage.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className={`p-5 lg:p-6 rounded-2xl bg-gradient-to-br from-navy via-surface to-navy border ${activeAccent.border} shadow-xl space-y-5`}
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${activeAccent.bg} ${activeAccent.text} border ${activeAccent.border}`}>
                  <activeStage.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-muted uppercase">Stage 0{activeStage.id} of 07</span>
                    <span className="text-text-muted">&bull;</span>
                    <h3 className={`text-lg font-bold ${activeAccent.text}`}>
                      {activeStage.name}
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {activeStage.summary}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {activeStage.isExperimental ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Exploratory Framework</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-mint/15 text-mint border border-mint/30 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Operational Protocol</span>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Detail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Input Data */}
              <div className="p-3.5 rounded-xl bg-midnight/70 border border-border/60 space-y-1.5">
                <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
                  <DownloadCloud className="w-3.5 h-3.5 text-cyan" /> Stage Input
                </div>
                <div className="font-medium text-text-primary text-xs leading-relaxed">
                  {activeStage.inputData}
                </div>
              </div>

              {/* Algorithmic Function */}
              <div className="p-3.5 rounded-xl bg-midnight/70 border border-border/60 space-y-1.5">
                <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-mint" /> Algorithmic Function
                </div>
                <div className="font-medium text-text-primary text-xs leading-relaxed">
                  {activeStage.algorithmMethod}
                </div>
              </div>

              {/* Output Deliverable */}
              <div className="p-3.5 rounded-xl bg-midnight/70 border border-border/60 space-y-1.5">
                <div className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5 text-fire" /> Stage Output
                </div>
                <div className="font-medium text-text-primary text-xs leading-relaxed">
                  {activeStage.outputProduct}
                </div>
              </div>
            </div>

            {/* Scientific Transparency Disclaimer */}
            <div className="p-3.5 rounded-xl bg-navy/60 border border-border/70 flex items-start gap-2.5 text-xs leading-relaxed">
              <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <div>
                <strong className="text-text-primary">Scientific Validation Note: </strong>
                <span className="text-text-secondary">
                  {activeStage.isExperimental
                    ? 'FIRENEXUS demonstrates proposed cross-sensor harmonization methods as an exploratory research platform for the NASA Space Apps Challenge. While data ingestion strictly follows official NASA FIRMS schemas, cross-sensor harmonization equations and spatial aggregation parameters represent active exploratory research and are not yet formally validated or endorsed as operational NASA data products.'
                    : 'This workflow stage follows established, peer-reviewed remote sensing methodologies and standard NASA FIRMS / Earthdata processing standards.'}
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default HarmonizationWorkflowSection;
