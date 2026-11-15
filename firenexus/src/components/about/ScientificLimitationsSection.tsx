import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  CloudRain,
  EyeOff,
  Clock,
  Maximize2,
  GitCompare,
  Flame,
  Info,
} from 'lucide-react';

interface LimitationItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  scientificExplanation: string;
  researchImpact: string;
}

const LIMITATION_ITEMS: LimitationItem[] = [
  {
    id: 'undercounting',
    title: 'Detection Does Not Represent Every Fire',
    subtitle: 'Sub-Canopy & Low-Intensity Burns',
    icon: EyeOff,
    accent: 'text-amber-400 bg-amber-400/15 border-amber-400/40',
    scientificExplanation:
      'Satellite thermal radiometers detect fires only when radiant heat sufficiently elevates the integrated pixel brightness temperature above the local background. Sub-canopy ground fires, smoldering peat layers, and low-temperature agricultural burns often escape spaceborne detection.',
    researchImpact:
      'Global active fire catalogs underestimate smoldering combustion and dense canopy fires, requiring auxiliary ground inventories for total carbon release accounting.',
  },
  {
    id: 'clouds',
    title: 'Cloud Cover & Atmospheric Masking',
    subtitle: 'Mid-Infrared Radiance Attenuation',
    icon: CloudRain,
    accent: 'text-cyan bg-cyan/15 border-cyan/40',
    scientificExplanation:
      'Thick cumulus clouds, thunderstorm anvils, and torrential precipitation completely block 3.9 µm and 11 µm thermal emissions from escaping into space. Fires burning beneath overcast skies remain invisible until cloud cover dissipates.',
    researchImpact:
      'Introduces seasonal observation bias in wet, cloudy biomes (e.g., tropical monsoon periods) where fire frequency appears falsely low due to persistent cloud cover.',
  },
  {
    id: 'resolution',
    title: 'Different Spatial Resolutions',
    subtitle: '1 km MODIS vs. 375 m VIIRS Disparity',
    icon: Maximize2,
    accent: 'text-fire bg-fire/15 border-fire/40',
    scientificExplanation:
      'A 1,000 m MODIS pixel covers approximately 1.0 km² at nadir, whereas a 375 m VIIRS pixel covers approximately 0.14 km². VIIRS detects smaller, cooler fires and produces ~7x more pixels across the same physical fire footprint.',
    researchImpact:
      'Raw detection counts from MODIS and VIIRS cannot be directly concatenated or summed. Without harmonization, mixing sensor data yields artificial statistical surges.',
  },
  {
    id: 'timing',
    title: 'Satellite Overpass Timing & Diurnal Gaps',
    subtitle: 'Discrete Sun-Synchronous Snapshots',
    icon: Clock,
    accent: 'text-purple-300 bg-purple-500/15 border-purple-400/40',
    scientificExplanation:
      'Polar-orbiting satellites visit any given location only 2 to 4 times per 24-hour cycle (Terra ~10:30 AM/PM, Aqua/S-NPP ~01:30 PM/AM). Fires that ignite, spread, and extinguish between sensor passes escape satellite detection entirely.',
    researchImpact:
      'Daily fire counts represent instantaneous orbital snapshots rather than continuous 24-hour fire behavior, missing rapid afternoon grass fire spikes.',
  },
  {
    id: 'perimeters',
    title: 'Hotspots ≠ Fire Perimeter Measurements',
    subtitle: 'Radiant Points vs. Burned Area Polygons',
    icon: Flame,
    accent: 'text-amber-400 bg-amber-400/15 border-amber-400/40',
    scientificExplanation:
      'A satellite active fire hotspot is a vector coordinate identifying a pixel whose radiometric temperature exceeded detection thresholds at the instant of overpass. It is neither a fire perimeter boundary nor an exact measurement of burned hectares.',
    researchImpact:
      'Active fire pixels must be paired with post-fire surface reflectance products (e.g., MODIS MCD64A1 burned area) to measure true cumulative burned land area.',
  },
  {
    id: 'harmonization-limits',
    title: 'Harmonization Involves Empirical Assumptions',
    subtitle: 'Statistical Modeling vs. Ground Truth',
    icon: GitCompare,
    accent: 'text-mint bg-mint/15 border-mint/40',
    scientificExplanation:
      'Cross-sensor harmonization involves statistical clustering, spatial aggregation, and empirical regression scaling. Variations in satellite view angles, atmospheric water vapor columns, and sensor aging introduce unavoidable modeling uncertainties.',
    researchImpact:
      'Harmonization frameworks provide standardized analytical estimates for scientific comparison, but should be interpreted as calibrated approximations rather than absolute truth.',
  },
];

export const ScientificLimitationsSection: React.FC = () => {
  return (
    <section id="limitations-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Scientific Limitations &amp; Methodology
              </h2>
              <span className="demo-badge">Transparency &amp; Rigor</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Understanding the inherent physical and orbital constraints of satellite remote sensing observations.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>Peer-reviewed observational transparency</span>
        </div>
      </div>

      {/* 6 Limitations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIMITATION_ITEMS.map((item, idx) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.07 }}
              className="card p-5 bg-surface/95 border-border/80 hover:bg-surface-light hover:border-amber-500/40 shadow-xl flex flex-col justify-between space-y-4 group transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${item.accent} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-midnight text-text-muted border border-border/60">
                    Constraint 0{idx + 1}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-text-primary group-hover:text-amber-400 transition-colors">
                    {item.title}
                  </h3>
                  <div className="text-xs text-text-muted mt-0.5">{item.subtitle}</div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {item.scientificExplanation}
                </p>
              </div>

              <div className="pt-3 border-t border-border/50 text-[11px] leading-relaxed">
                <div className="p-2.5 rounded-xl bg-midnight/80 border border-border/60 text-text-secondary">
                  <strong className="text-amber-400">Scientific Implication:</strong>{' '}
                  {item.researchImpact}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Synthesis Banner */}
      <div className="p-4 rounded-xl bg-navy/60 border border-border/70 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan shrink-0" />
          <span>
            Observational rigor requires acknowledging physical sensor limits. FIRENEXUS is engineered to highlight these differences transparently so users avoid erroneous scientific conclusions.
          </span>
        </div>
      </div>
    </section>
  );
};

export default ScientificLimitationsSection;
