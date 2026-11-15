import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Satellite,
  Flame,
  Zap,
  Clock,
  Layers,
  Sparkles,
  Info,
  Maximize2,
} from 'lucide-react';

interface ModisPlatform {
  name: 'Terra' | 'Aqua';
  catalog: string;
  launchYear: number;
  orbitType: string;
  equatorCrossing: string;
  crossingNode: 'Descending' | 'Ascending';
  activeFireProduct: string;
  fireRole: string;
}

interface ViirsPlatform {
  name: 'Suomi-NPP' | 'NOAA-20' | 'NOAA-21';
  catalog: string;
  launchYear: number;
  orbitType: string;
  equatorCrossing: string;
  crossingNode: 'Ascending';
  activeFireProduct: string;
  fireRole: string;
}

const MODIS_PLATFORMS: ModisPlatform[] = [
  {
    name: 'Terra',
    catalog: 'EOS AM-1',
    launchYear: 1999,
    orbitType: 'Sun-synchronous circular (705 km)',
    equatorCrossing: '10:30 AM local solar time',
    crossingNode: 'Descending',
    activeFireProduct: 'MOD14 (Standard) / MOD14N (NRT)',
    fireRole: 'Captures early morning fire ramp-up and baseline diurnal conditions.',
  },
  {
    name: 'Aqua',
    catalog: 'EOS PM-1',
    launchYear: 2002,
    orbitType: 'Sun-synchronous circular (705 km)',
    equatorCrossing: '01:30 PM local solar time',
    crossingNode: 'Ascending',
    activeFireProduct: 'MYD14 (Standard) / MYD14N (NRT)',
    fireRole: 'Captures peak diurnal fire intensity and maximum convective thermal plumes.',
  },
];

const VIIRS_PLATFORMS: ViirsPlatform[] = [
  {
    name: 'Suomi-NPP',
    catalog: 'Joint NASA / NOAA',
    launchYear: 2011,
    orbitType: 'Sun-synchronous polar (824 km)',
    equatorCrossing: '01:30 PM local solar time',
    crossingNode: 'Ascending',
    activeFireProduct: 'VNP14IMG (375 m I-band)',
    fireRole: 'Foundational baseline for 375 m sub-pixel active fire sensitivity.',
  },
  {
    name: 'NOAA-20',
    catalog: 'JPSS-1',
    launchYear: 2017,
    orbitType: 'Sun-synchronous polar (824 km)',
    equatorCrossing: '01:30 PM (50 min offset)',
    crossingNode: 'Ascending',
    activeFireProduct: 'VJ114IMG (375 m I-band)',
    fireRole: 'Trails Suomi-NPP by 50 min, capturing short-interval fire spread dynamics.',
  },
  {
    name: 'NOAA-21',
    catalog: 'JPSS-2',
    launchYear: 2022,
    orbitType: 'Sun-synchronous polar (824 km)',
    equatorCrossing: '01:30 PM (Staggered)',
    crossingNode: 'Ascending',
    activeFireProduct: 'VJ214IMG (375 m I-band)',
    fireRole: 'Next-generation continuity platform expanding orbital interleave density.',
  },
];

export const SatelliteScienceSection: React.FC = () => {
  const [selectedModis, setSelectedModis] = useState<ModisPlatform['name']>('Terra');
  const [selectedViirs, setSelectedViirs] = useState<ViirsPlatform['name']>('Suomi-NPP');
  const [showFootprintComparison, setShowFootprintComparison] = useState(true);

  const currentModis = MODIS_PLATFORMS.find((p) => p.name === selectedModis)!;
  const currentViirs = VIIRS_PLATFORMS.find((p) => p.name === selectedViirs)!;

  return (
    <section id="science-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fire/15 border border-fire/40 flex items-center justify-center text-fire shadow-md shadow-fire-dim">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                The Science Behind the Project
              </h2>
              <span className="demo-badge">Sensor Physics &amp; Specs</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Comparative analysis of NASA&apos;s MODIS and VIIRS radiometer instruments, orbital mechanics, and resolution footprints.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowFootprintComparison(!showFootprintComparison)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showFootprintComparison
              ? 'bg-cyan/20 text-cyan border-cyan/40 shadow-sm'
              : 'bg-surface text-text-muted border-border hover:text-text-primary'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>{showFootprintComparison ? 'Footprint Comparator Active' : 'Show Footprint Comparison'}</span>
        </button>
      </div>

      {/* Two Interactive Satellite Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── CARD 1: MODIS ────────────────────────────────────────────── */}
        <div className="card p-6 bg-surface/95 border-fire/35 shadow-xl flex flex-col justify-between space-y-5 relative overflow-hidden group">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-fire/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-fire/20 text-fire border border-fire/40 shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-fire">
                    MODIS Instrument
                  </h3>
                  <div className="text-xs text-text-muted">
                    Moderate Resolution Imaging Spectroradiometer
                  </div>
                </div>
              </div>

              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-fire/15 text-fire border border-fire/30">
                1 km Nadir
              </span>
            </div>

            {/* Satellite Platform Switcher (Terra / Aqua) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Select Spacecraft Platform:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MODIS_PLATFORMS.map((plat) => {
                  const isActive = plat.name === selectedModis;
                  return (
                    <button
                      key={plat.name}
                      onClick={() => setSelectedModis(plat.name)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        isActive
                          ? 'bg-fire/20 border-fire text-fire font-bold shadow-md shadow-fire-dim'
                          : 'bg-navy/60 border-border text-text-secondary hover:text-text-primary hover:border-fire/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{plat.name} Satellite</span>
                        <span className="text-[10px] font-mono px-1 rounded bg-midnight">
                          {plat.launchYear}
                        </span>
                      </div>
                      <div className="text-[10px] text-text-muted truncate mt-0.5">
                        {plat.catalog} &bull; {plat.crossingNode}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Satellite Telemetry Badge */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-fire/25 space-y-2 text-xs">
              <div className="flex items-center justify-between text-fire font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Equatorial Overpass Timing
                </span>
                <span className="font-mono text-xs">{currentModis.equatorCrossing}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {currentModis.fireRole}
              </p>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-1.5 text-xs font-mono text-text-secondary bg-midnight/70 p-3.5 rounded-xl border border-border/50">
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Nominal Resolution:</span>
                <strong className="text-text-primary">1,000 m (1.0 km nadir)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Orbital Altitude:</span>
                <strong className="text-text-primary">705 km (Polar circular)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Cross-Track Swath:</span>
                <strong className="text-text-primary">2,330 km across scan</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Thermal Radiance Channels:</span>
                <strong className="text-text-primary">B21/22 (3.96 µm) &amp; B31 (11.0 µm)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Scan-Edge Distortion:</span>
                <strong className="text-fire">4.8 km &times; 2.0 km (Bowtie elongation)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Active Fire Product:</span>
                <strong className="text-text-primary">{currentModis.activeFireProduct}</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Continuous Heritage:</span>
                <strong className="text-fire">2000 &ndash; Present (24+ years)</strong>
              </div>
            </div>
          </div>

          {/* Bottom Scientific Insight */}
          <div className="pt-3 border-t border-border/50 text-[11px] text-text-muted leading-relaxed">
            <strong className="text-fire">Climatological Role:</strong> MODIS represents the continuous
            historical standard for multi-decadal wildfire frequency and climate modeling.
          </div>
        </div>

        {/* ── CARD 2: VIIRS ────────────────────────────────────────────── */}
        <div className="card p-6 bg-surface/95 border-cyan/35 shadow-xl flex flex-col justify-between space-y-5 relative overflow-hidden group">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan/20 text-cyan border border-cyan/40 shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-cyan">
                    VIIRS Instrument
                  </h3>
                  <div className="text-xs text-text-muted">
                    Visible Infrared Imaging Radiometer Suite
                  </div>
                </div>
              </div>

              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-cyan/15 text-cyan border border-cyan/30">
                375 m Nadir
              </span>
            </div>

            {/* Satellite Platform Switcher (Suomi-NPP / NOAA-20 / NOAA-21) */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Select Spacecraft Platform:
              </div>
              <div className="grid grid-cols-3 gap-2">
                {VIIRS_PLATFORMS.map((plat) => {
                  const isActive = plat.name === selectedViirs;
                  return (
                    <button
                      key={plat.name}
                      onClick={() => setSelectedViirs(plat.name)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        isActive
                          ? 'bg-cyan/20 border-cyan text-cyan font-bold shadow-md shadow-cyan-dim'
                          : 'bg-navy/60 border-border text-text-secondary hover:text-text-primary hover:border-cyan/40'
                      }`}
                    >
                      <div className="text-xs truncate">{plat.name}</div>
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">
                        {plat.launchYear}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Satellite Telemetry Badge */}
            <div className="p-3.5 rounded-xl bg-navy/70 border border-cyan/25 space-y-2 text-xs">
              <div className="flex items-center justify-between text-cyan font-semibold">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Equatorial Overpass Timing
                </span>
                <span className="font-mono text-xs">{currentViirs.equatorCrossing}</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                {currentViirs.fireRole}
              </p>
            </div>

            {/* Technical Specifications Grid */}
            <div className="space-y-1.5 text-xs font-mono text-text-secondary bg-midnight/70 p-3.5 rounded-xl border border-border/50">
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Nominal Resolution:</span>
                <strong className="text-cyan">375 m (I-band nadir)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Orbital Altitude:</span>
                <strong className="text-text-primary">824 km (Sun-synchronous)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Cross-Track Swath:</span>
                <strong className="text-text-primary">3,000 km (Zero daily gaps)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Thermal Radiance Channels:</span>
                <strong className="text-text-primary">I4 (3.74 µm), I5 (11.45 µm) + M13</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Scan-Edge Distortion:</span>
                <strong className="text-cyan">~0.8 km &times; 0.8 km (Aggregated)</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Active Fire Product:</span>
                <strong className="text-text-primary">{currentViirs.activeFireProduct}</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-text-muted">Operational Era:</span>
                <strong className="text-cyan">2012 &ndash; Present (Modern Era)</strong>
              </div>
            </div>
          </div>

          {/* Bottom Scientific Insight */}
          <div className="pt-3 border-t border-border/50 text-[11px] text-text-muted leading-relaxed">
            <strong className="text-cyan">Sub-Pixel Sensitivity:</strong> VIIRS detects smaller,
            low-intensity agricultural and savanna fires obscured inside coarser 1 km pixels.
          </div>
        </div>
      </div>

      {/* ── Footprint Resolution Comparator Diagram ──────────────────────── */}
      {showFootprintComparison && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-5 lg:p-6 rounded-2xl bg-gradient-to-r from-navy via-surface to-navy border border-border/80 shadow-xl space-y-4"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Layers className="w-4 h-4 text-cyan" />
            <h4 className="text-sm font-bold text-text-primary">
              Spatial Resolution Disparity: 1 km MODIS vs. 375 m VIIRS Footprint Comparison
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visual Footprint Graphic */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-midnight/80 rounded-xl border border-border/70">
              <div className="relative w-56 h-56 border-2 border-dashed border-fire/70 rounded-lg p-2 flex flex-col justify-between">
                <span className="absolute -top-3 left-3 bg-midnight px-1.5 text-[10px] font-mono font-bold text-fire border border-fire/40 rounded">
                  1 MODIS Pixel (1,000 m &times; 1,000 m = 1.0 km²)
                </span>

                {/* 375m VIIRS Sub-Grid (Showing ~7 pixels inside 1 MODIS pixel) */}
                <div className="grid grid-cols-3 gap-1.5 h-full w-full pt-2">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded bg-cyan/20 border border-cyan/60 flex items-center justify-center text-[9px] font-mono text-cyan font-bold transition-transform hover:scale-105"
                      title="375 m VIIRS I-band Pixel"
                    >
                      375m
                    </div>
                  ))}
                  <div className="rounded bg-navy/40 border border-dashed border-border flex items-center justify-center text-[9px] font-mono text-text-muted">
                    ...
                  </div>
                  <div className="rounded bg-navy/40 border border-dashed border-border flex items-center justify-center text-[9px] font-mono text-text-muted">
                    ~7x
                  </div>
                </div>

                <span className="absolute -bottom-2.5 right-3 bg-midnight px-1.5 text-[10px] font-mono font-bold text-cyan border border-cyan/40 rounded">
                  VIIRS Pixel Footprint (375 m &times; 375 m = 0.14 km²)
                </span>
              </div>
              <div className="text-[10px] text-text-muted mt-3 font-mono">
                Geometric footprint area ratio: 1.0 km² / 0.14 km² &approx; 7.11 : 1
              </div>
            </div>

            {/* Scientific Explanation */}
            <div className="md:col-span-7 space-y-3 text-xs text-text-secondary leading-relaxed">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                <p>
                  <strong>Why Resolution Matters:</strong> Because one 1 km MODIS pixel contains approximately
                  seven 375 m VIIRS pixels, a single large wildfire produces significantly more discrete
                  detections in VIIRS than in MODIS.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-navy/50 border border-border/60 space-y-1.5">
                <div className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-mint" /> Algorithmic Harmonization Principle
                </div>
                <p className="text-[11px] text-text-muted">
                  Without rigorous spatial-temporal harmonization and calibrated point-spread matching,
                  transitioning from MODIS to VIIRS records an artificial twofold explosion in global fire counts.
                  FIRENEXUS creates a bridge that maps detection footprints to consistent fire events.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-midnight/60 border border-fire/30">
                  <span className="text-fire font-bold">MODIS 1 km:</span> Best for continuous 24-year historical baseline modeling.
                </div>
                <div className="p-2 rounded bg-midnight/60 border border-cyan/30">
                  <span className="text-cyan font-bold">VIIRS 375 m:</span> Best for sub-pixel fire line tracking and small ignitions.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
};

export default SatelliteScienceSection;
