import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe2,
  Flame,
  Satellite,
  GitCompare,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface MissionCardData {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accentColor: 'orange' | 'cyan' | 'mint' | 'violet' | 'amber';
  summary: string;
  details: string[];
  keyMetric: string;
  metricLabel: string;
}

const MISSION_CARDS: MissionCardData[] = [
  {
    id: 'detection',
    title: 'What Satellite Fire Detection Means',
    subtitle: 'Thermal infrared Radiometry in Orbit',
    icon: Flame,
    accentColor: 'orange',
    summary:
      'Satellite fire detection uses spaceborne radiometers that measure radiant heat emissions at mid-infrared (3.9 µm) and longwave thermal infrared (11 µm) wavelengths.',
    details: [
      'Active combustion produces intense Planck blackbody emissions peaking sharply in the 3.7–4.0 µm atmospheric window.',
      'A sub-pixel flaming front covering as little as 0.01% of a satellite pixel footprint elevates the total brightness temperature above background ambient landscape levels.',
      'Contextual detection algorithms contrast candidate fire pixels against neighboring cloud-free background samples to eliminate false positives.',
    ],
    keyMetric: '3.9 µm & 11 µm',
    metricLabel: 'Mid & Longwave Thermal Bands',
  },
  {
    id: 'monitoring',
    title: 'Why Global Fire Monitoring Matters',
    subtitle: 'Climate, Ecosystems & Planetary Health',
    icon: Globe2,
    accentColor: 'cyan',
    summary:
      'Wildfires emit over 2 petagrams of carbon dioxide annually, alter forest regeneration cycles, and produce dangerous particulate matter (PM2.5) that crosses international borders.',
    details: [
      'Near real-time tracking gives emergency managers early situational awareness across unpopulated wilderness areas where ground towers cannot operate.',
      'Wildfire smoke plumes loft black carbon and aerosols into the stratosphere, altering solar radiation budgets and melting polar ice.',
      'Monitoring fire regimes over multi-decadal timelines reveals shifting fire season lengths driven by persistent climate anomalies.',
    ],
    keyMetric: '~2.0 Pg C',
    metricLabel: 'Annual Global Wildfire Carbon Release',
  },
  {
    id: 'multi-sensor',
    title: 'Why Multiple Satellite Instruments Are Used',
    subtitle: 'Closing Orbital Blindspots & Diurnal Cycles',
    icon: Satellite,
    accentColor: 'mint',
    summary:
      'A single polar-orbiting spacecraft observes any spot on Earth only once or twice per day. Combining multiple satellites enables continuous surveillance across the diurnal fire cycle.',
    details: [
      'Terra provides mid-morning observations (~10:30 AM local), capturing early ignition ramp-ups before midday winds accelerate combustion.',
      'Aqua and Suomi-NPP provide afternoon observations (~1:30 PM local), catching peak diurnal burn behavior when surface temperatures and convective plumes are highest.',
      'NOAA-20 trails Suomi-NPP by 50 minutes, providing interleaved observations that capture rapid fire spread rates across consecutive orbital swaths.',
    ],
    keyMetric: '4+ Passes/Day',
    metricLabel: 'Combined Global Orbital Coverage',
  },
  {
    id: 'harmonization',
    title: 'Why Harmonizing MODIS and VIIRS is Vital',
    subtitle: 'Preventing False Statistical Discontinuities',
    icon: GitCompare,
    accentColor: 'violet',
    summary:
      'Because VIIRS has a 375 m pixel footprint (~7x smaller in area than a 1 km MODIS pixel), VIIRS routinely detects 1.5x to 2.5x more active fire pixels over identical wildfires.',
    details: [
      'Transitioning directly from MODIS to VIIRS without calibrated spatial-temporal scaling equations creates an artificial illusion of an abrupt global fire explosion.',
      'Long-term climate modeling requires a continuous, sensor-agnostic fire activity baseline that bridges the 2000–2024 MODIS record with modern VIIRS sensors.',
      'FIRENEXUS develops algorithmic harmonization strategies to standardize spatial clustering, sensor sensitivity scaling, and Fire Radiative Power (FRP) metrics.',
    ],
    keyMetric: '~7.1x Area Ratio',
    metricLabel: '1 km MODIS vs. 375 m VIIRS Pixel',
  },
  {
    id: 'analysis',
    title: 'Supporting Better Global Analysis',
    subtitle: 'From Raw Radiance to Actionable Intelligence',
    icon: TrendingUp,
    accentColor: 'amber',
    summary:
      'Consistent, harmonized satellite observations transform fragmented sensor detections into unified, research-ready geospatial datasets for science and decision-making.',
    details: [
      'Unified spatial-temporal gridding simplifies cross-border wildfire comparisons and hemispheric trend analysis.',
      'Harmonized Fire Radiative Power (FRP) estimates provide direct, reliable inputs for biomass consumption and atmospheric emission models.',
      'Empowers environmental researchers, national forestry services, and international policymakers with transparent, cross-calibrated satellite observations.',
    ],
    keyMetric: 'Unified Metrics',
    metricLabel: 'Harmonized Spatial-Temporal Framework',
  },
];

export const MissionOverviewSection: React.FC = () => {
  const [selectedCardId, setSelectedCardId] = useState<string>('harmonization');

  const getAccentStyles = (color: MissionCardData['accentColor']) => {
    switch (color) {
      case 'orange':
        return {
          border: 'border-fire/40',
          hoverBorder: 'hover:border-fire',
          bg: 'bg-fire/15',
          text: 'text-fire',
          glow: 'shadow-[0_0_20px_rgba(255,113,62,0.15)]',
        };
      case 'cyan':
        return {
          border: 'border-cyan/40',
          hoverBorder: 'hover:border-cyan',
          bg: 'bg-cyan/15',
          text: 'text-cyan',
          glow: 'shadow-[0_0_20px_rgba(0,184,217,0.15)]',
        };
      case 'mint':
        return {
          border: 'border-mint/40',
          hoverBorder: 'hover:border-mint',
          bg: 'bg-mint/15',
          text: 'text-mint',
          glow: 'shadow-[0_0_20px_rgba(0,229,176,0.15)]',
        };
      case 'violet':
        return {
          border: 'border-purple-400/40',
          hoverBorder: 'hover:border-purple-400',
          bg: 'bg-purple-500/15',
          text: 'text-purple-300',
          glow: 'shadow-[0_0_20px_rgba(167,139,250,0.15)]',
        };
      case 'amber':
        return {
          border: 'border-amber-400/40',
          hoverBorder: 'hover:border-amber-400',
          bg: 'bg-amber-400/15',
          text: 'text-amber-400',
          glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]',
        };
    }
  };

  const activeCard = MISSION_CARDS.find((c) => c.id === selectedCardId) || MISSION_CARDS[3];
  const activeStyles = getAccentStyles(activeCard.accentColor);

  return (
    <section id="mission-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Understanding the Mission
              </h2>
              <span className="demo-badge">Core Objectives</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Why spaceborne fire detection and multi-sensor harmonization are essential for modern Earth system science.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Click any card to inspect scientific details</span>
          <ChevronRight className="w-3.5 h-3.5 text-cyan" />
        </div>
      </div>

      {/* 5 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MISSION_CARDS.map((card, idx) => {
          const isSelected = card.id === selectedCardId;
          const styles = getAccentStyles(card.accentColor);
          const Icon = card.icon;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              onClick={() => setSelectedCardId(card.id)}
              className={`p-5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `bg-surface/98 ${styles.border} ${styles.glow} ring-1 ring-cyan/40 scale-[1.01]`
                  : 'bg-surface/80 border border-border/70 hover:bg-surface-light hover:border-cyan/30'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl ${styles.bg} border ${styles.border} flex items-center justify-center ${styles.text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy/80 text-text-muted border border-border/60">
                    Phase 0{idx + 1}
                  </span>
                </div>

                <div>
                  <h3 className={`font-bold text-base tracking-tight ${isSelected ? styles.text : 'text-text-primary'}`}>
                    {card.title}
                  </h3>
                  <span className="text-xs text-text-muted font-medium block mt-0.5">
                    {card.subtitle}
                  </span>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                  {card.summary}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between text-xs">
                <div>
                  <div className={`font-mono font-bold text-xs ${styles.text}`}>
                    {card.keyMetric}
                  </div>
                  <div className="text-[10px] text-text-muted">{card.metricLabel}</div>
                </div>

                <span className={`text-[11px] font-semibold flex items-center gap-1 ${isSelected ? styles.text : 'text-text-muted'}`}>
                  {isSelected ? 'Active Focus' : 'Inspect'}
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Selected Card Deep Dive Expansion Panel */}
        <motion.div
          key={activeCard.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className={`p-6 rounded-2xl bg-gradient-to-br from-navy/95 via-surface to-navy/95 border ${activeStyles.border} shadow-2xl col-span-1 md:col-span-2 lg:col-span-1 flex flex-col justify-between space-y-4`}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scientific Deep Dive</span>
            </div>

            <h3 className={`text-lg font-bold ${activeStyles.text}`}>
              {activeCard.title}
            </h3>

            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              {activeCard.summary}
            </p>

            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="text-[11px] font-bold text-text-primary uppercase tracking-wide">
                Key Remote Sensing Mechanics:
              </div>
              <ul className="space-y-2 text-xs text-text-secondary">
                {activeCard.details.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeStyles.bg} border ${activeStyles.border} mt-1.5 shrink-0`} />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-midnight/70 border border-border/70 flex items-center justify-between text-xs">
            <div>
              <div className="text-[10px] text-text-muted uppercase">Observational Parameter</div>
              <div className={`font-mono font-bold ${activeStyles.text}`}>{activeCard.keyMetric}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-text-muted uppercase">Harmonization Role</div>
              <div className="font-semibold text-text-primary text-[11px]">{activeCard.metricLabel}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default MissionOverviewSection;
