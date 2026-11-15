import { Grid3x3, Info } from 'lucide-react';

export default function ResolutionComparison() {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Grid3x3 className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Spatial Resolution &amp; Pixel Footprint Comparison
            </h2>
            <span className="demo-badge text-[10px]">Geometric Scaling</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Physical footprint disparity: MODIS 1 km nominal active-fire pixel vs VIIRS 375 m I-band resolution
          </p>
        </div>
      </div>

      {/* Main Comparison Container */}
      <div className="glass border border-border/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-6">
        {/* Visual Scale Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* SVG Geometric Footprint Demonstration */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-xl bg-midnight/70 border border-border/60">
            <svg viewBox="0 0 320 320" className="w-full max-w-[280px] h-auto overflow-visible">
              <defs>
                <pattern id="gridSub" width="37.5" height="37.5" patternUnits="userSpaceOnUse">
                  <rect width="37.5" height="37.5" fill="none" stroke="#00E5B0" strokeWidth="0.75" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* MODIS 1 km Outer Boundary */}
              <rect
                x="10"
                y="10"
                width="300"
                height="300"
                rx="8"
                fill="#FF713E10"
                stroke="#FF713E"
                strokeWidth="2.5"
                strokeDasharray="6 4"
              />

              {/* VIIRS 375m Sub-pixel Grid */}
              <g transform="translate(10, 10)">
                {Array.from({ length: 8 }).map((_, r) =>
                  Array.from({ length: 8 }).map((_, c) => {
                    const isFire = (r === 2 && c === 2) || (r === 2 && c === 3);
                    return (
                      <rect
                        key={`${r}-${c}`}
                        x={c * 37.5}
                        y={r * 37.5}
                        width={37.5}
                        height={37.5}
                        fill={isFire ? '#00E5B035' : 'transparent'}
                        stroke="#00E5B0"
                        strokeWidth={isFire ? 1.5 : 0.6}
                        strokeOpacity={isFire ? 0.9 : 0.25}
                      />
                    );
                  }),
                )}

                {/* Sub-pixel Fire Front Pinpoint */}
                <circle cx="93.75" cy="93.75" r="10" fill="#FF713E" className="animate-ping opacity-75" />
                <circle cx="93.75" cy="93.75" r="6" fill="#FF713E" />
                <text x="110" y="98" fill="#FF713E" fontSize="11" fontWeight="bold">
                  Active Flame (20 m)
                </text>
              </g>

              {/* Dimension Annotations */}
              <text x="160" y="325" textAnchor="middle" fill="#FF713E" fontSize="11" fontWeight="bold" fontFamily="monospace">
                MODIS Pixel: 1,000 m (1.0 km²)
              </text>
            </svg>

            <div className="mt-3 text-center text-xs text-text-muted space-y-0.5">
              <span className="text-fire font-bold block">1 MODIS Pixel = ~7.1 VIIRS Pixels</span>
              <span className="text-[11px] text-text-secondary block">
                Outer dashed box: MODIS footprint. Inner teal cells: VIIRS 375 m footprints.
              </span>
            </div>
          </div>

          {/* Analytical Explanation */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h3 className="text-base font-bold text-text-primary mb-1">
                Sub-Pixel Detection Geometry
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Active wildfires typically occupy only a small fraction (0.01% to 1%) of an orbital sensor's instantaneous field of view. The differing ground sampling distances fundamentally alter thermal radiance integration:
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-surface/50 border border-border/70">
                <span className="font-bold text-fire block mb-0.5">
                  MODIS 1 km Spatial Averaging:
                </span>
                <span className="text-text-secondary leading-snug block">
                  A small 20-meter burning flame is optically averaged across an entire 1,000,000 m² (1 km²) pixel. The thermal signature must be intensely hot to elevate the pixel's mean brightness temperature above background noise. When detected, the observation represents a 1 km² region of uncertainty.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface/50 border border-border/70">
                <span className="font-bold text-cyan block mb-0.5">
                  VIIRS 375 m Sub-Pixel Precision:
                </span>
                <span className="text-text-secondary leading-snug block">
                  With a ground pixel area of only 140,625 m² (~7x smaller than MODIS), the same 20-meter flame contributes a much higher fraction of radiant energy to its pixel. VIIRS therefore detects smaller, cooler, and early-stage fires, while accurately outlining fire perimeters and active fronts.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface/50 border border-border/70">
                <span className="font-bold text-purple-300 block mb-0.5">
                  Swath-Edge Bow-Tie Distortion:
                </span>
                <span className="text-text-secondary leading-snug block">
                  Due to panoramic distortion, MODIS pixels expand from 1.0 km at nadir to ~4.8 km at scan edges. In contrast, VIIRS employs onboard hardware pixel aggregation that constrains pixel growth to &le;750 m across the entire 3,040 km swath.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scientific Neutrality Notice */}
        <div className="p-4 rounded-xl bg-navy/80 border border-border/80 text-xs text-text-secondary flex items-start gap-3 shadow-md">
          <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-cyan font-semibold">
              Sensor Nuance &amp; Saturation Limits:{' '}
            </strong>
            It is scientifically inaccurate to claim that VIIRS always detects every fire missed by MODIS. For massive, high-intensity wildfire complexes, the high-gain VIIRS 375 m I4 band saturates at ~367 K, requiring dual-gain fallback to M-band channels (750 m), whereas MODIS Band 21 was purpose-built with a high saturation ceiling (~500 K) that reliably captures extreme pyro-convective firestorms. Both sensors complement each other within a unified harmonization system.
          </p>
        </div>
      </div>
    </section>
  );
}