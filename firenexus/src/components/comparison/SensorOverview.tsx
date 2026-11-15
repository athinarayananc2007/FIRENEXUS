import { motion } from 'framer-motion';
import {
  Satellite, Radio, Orbit,
  AlertCircle, CheckCircle2,
} from 'lucide-react';

export default function SensorOverview() {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Orbit className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Satellite Sensor Architecture
            </h2>
            <span className="demo-badge text-[10px]">Instrument Specifications</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Technical specifications, orbital characteristics, and active-fire detection capabilities
          </p>
        </div>
      </div>

      {/* Two Comparison Cards: MODIS vs VIIRS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: MODIS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="glass border border-fire/30 hover:border-fire/50 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between group transition-all"
        >
          {/* Subtle Orange Ambient Glow */}
          <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-fire/15 blur-3xl pointer-events-none group-hover:bg-fire/25 transition-all" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-fire/20 border border-fire/40 text-fire">
                  <Satellite className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    MODIS (Aqua &amp; Terra)
                  </h3>
                  <span className="text-xs text-text-muted">
                    Moderate Resolution Imaging Spectroradiometer
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-fire/15 border border-fire/30 text-fire text-xs font-mono font-bold">
                1 km Nominal
              </span>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Satellite Platforms</span>
                <span className="font-semibold text-text-primary">NASA Terra &amp; Aqua</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Sun-synchronous polar orbit</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Equatorial Overpass</span>
                <span className="font-mono font-semibold text-text-primary">10:30 AM/PM &amp; 1:30 PM/AM</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Local solar crossing times</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Active-Fire Pixel Size</span>
                <span className="font-mono font-bold text-fire">1,000 m (at nadir)</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Grows to ~4.8 km at scan edges</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Swath Width</span>
                <span className="font-mono font-semibold text-text-primary">2,330 km cross-track</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Narrow equatorial gaps</span>
              </div>
            </div>

            {/* Detection Characteristics */}
            <div className="space-y-2 text-xs text-text-secondary mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-fire shrink-0 mt-0.5" />
                <span>
                  <strong>Spectral Channels:</strong> Band 21/22 (3.96 µm mid-infrared, saturation ~500 K / 331 K) &amp; Band 31 (11.0 µm thermal infrared).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-fire shrink-0 mt-0.5" />
                <span>
                  <strong>Contextual Threshold Algorithm:</strong> Identifies elevated brightness temperatures against surrounding non-fire background pixels.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-fire shrink-0 mt-0.5" />
                <span>
                  <strong>Multi-Decadal Climate Record:</strong> Continuous observations since 2000 (Terra) and 2002 (Aqua), serving as the scientific baseline.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-text-muted flex items-center justify-between">
            <span>Spatial Footprint: <strong className="text-text-primary">1.0 km²</strong> at nadir</span>
            <span className="text-fire font-semibold">24+ Year Time Series</span>
          </div>
        </motion.div>

        {/* Card 2: VIIRS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass border border-cyan/30 hover:border-cyan/50 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl flex flex-col justify-between group transition-all"
        >
          {/* Subtle Cyan Ambient Glow */}
          <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full bg-cyan/15 blur-3xl pointer-events-none group-hover:bg-cyan/25 transition-all" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan/20 border border-cyan/40 text-cyan">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    VIIRS (Suomi-NPP &amp; NOAA-20)
                  </h3>
                  <span className="text-xs text-text-muted">
                    Visible Infrared Imaging Radiometer Suite
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan/15 border border-cyan/30 text-cyan text-xs font-mono font-bold">
                375 m Nominal
              </span>
            </div>

            {/* Spec Matrix */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Satellite Platforms</span>
                <span className="font-semibold text-text-primary">Suomi-NPP &amp; NOAA-20 / JPSS</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Same orbital plane, 50 min apart</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Equatorial Overpass</span>
                <span className="font-mono font-semibold text-text-primary">1:30 PM/AM Ascending</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Coordinated afternoon orbit</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Active-Fire Pixel Size</span>
                <span className="font-mono font-bold text-cyan">375 m (I-band nadir)</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Onboard aggregation limits to &le;750 m</span>
              </div>

              <div className="p-2.5 rounded-xl bg-surface/50 border border-border/70">
                <span className="text-[11px] text-text-muted block mb-0.5">Swath Width</span>
                <span className="font-mono font-semibold text-text-primary">3,040 km cross-track</span>
                <span className="text-[10px] text-text-muted block mt-0.5">Zero equatorial gaps</span>
              </div>
            </div>

            {/* Detection Characteristics */}
            <div className="space-y-2 text-xs text-text-secondary mb-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong>Spectral Channels:</strong> High-resolution Band I4 (3.74 µm mid-infrared, saturation ~367 K) &amp; Band I5 (11.45 µm thermal infrared).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong>Sub-Pixel Sensitivity:</strong> Resolves small, fragmented, and cooler burns; delineates fire perimeters with &gt;7x pixel density.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan shrink-0 mt-0.5" />
                <span>
                  <strong>Constrained Pixel Growth:</strong> Unique optical aggregation ensures crisp perimeter resolution even toward outer swath edges.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 text-[11px] text-text-muted flex items-center justify-between">
            <span>Spatial Footprint: <strong className="text-text-primary">0.14 km²</strong> at nadir</span>
            <span className="text-cyan font-semibold">High-Resolution Next-Gen</span>
          </div>
        </motion.div>
      </div>

      {/* Scientific Principle Callout */}
      <div className="p-4 rounded-xl bg-navy/80 border border-border/80 text-xs text-text-secondary flex items-start gap-3 shadow-md">
        <AlertCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-cyan font-semibold">
            Important Remote Sensing Harmonization Principle:{' '}
          </strong>
          Spatial resolution alone does not determine active fire detection accuracy. While 375 m VIIRS detects smaller and lower-intensity fires that fall below MODIS 1 km thresholds, detection probability also depends on flame temperature, canopy cover obscuration, view zenith angle, and orbital overpass timing relative to peak diurnal burning. Harmonization requires mathematical modeling rather than simple pixel substitution.
        </p>
      </div>
    </section>
  );
}