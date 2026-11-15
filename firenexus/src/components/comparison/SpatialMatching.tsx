import { motion } from 'framer-motion';
import { Grid3x3, Info } from 'lucide-react';

export default function SpatialMatching() {
  // MODIS 1km grid = 3×3 large cells; each contains ~7×7 VIIRS 375m sub-cells
  const modisSize = 3;
  const viirsPerModis = 3; // simplified visual: 3 VIIRS cells per MODIS cell edge (≈375m×3≈1125m)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-5">
        <Grid3x3 className="w-5 h-5 text-cyan" />
        <h2 className="section-title text-xl">Spatial Resolution Comparison</h2>
        <span className="demo-badge ml-2">Conceptual</span>
      </div>

      <p className="text-sm text-text-secondary mb-6 max-w-3xl">
        MODIS detects thermal anomalies at 1 km resolution, while VIIRS I-band operates at 375 m.
        This means a single MODIS pixel covers an area that contains approximately 7–9 VIIRS pixels,
        allowing VIIRS to resolve smaller fires and better locate fire fronts.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MODIS Grid */}
        <div>
          <h3 className="text-sm font-semibold text-fire mb-3 text-center">
            MODIS — 1 km Pixel Grid
          </h3>
          <div className="flex justify-center">
            <svg viewBox="0 0 240 240" className="w-56 h-56">
              {/* MODIS cells */}
              {Array.from({ length: modisSize }).map((_, row) =>
                Array.from({ length: modisSize }).map((_, col) => {
                  const x = col * 76 + 8;
                  const y = row * 76 + 8;
                  const hasDetection = (row === 1 && col === 1) || (row === 0 && col === 2);
                  return (
                    <g key={`m-${row}-${col}`}>
                      <rect
                        x={x}
                        y={y}
                        width={72}
                        height={72}
                        rx={4}
                        fill={hasDetection ? '#FF713E40' : '#1a254020'}
                        stroke={hasDetection ? '#FF713E' : '#2A3E62'}
                        strokeWidth={hasDetection ? 2 : 1}
                      />
                      {hasDetection && (
                        <text
                          x={x + 36}
                          y={y + 40}
                          textAnchor="middle"
                          fill="#FF713E"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          🔥
                        </text>
                      )}
                    </g>
                  );
                })
              )}
              {/* Label */}
              <text x={120} y={234} textAnchor="middle" fill="#64748b" fontSize="10">
                Each cell ≈ 1 km × 1 km
              </text>
            </svg>
          </div>
        </div>

        {/* VIIRS Grid */}
        <div>
          <h3 className="text-sm font-semibold text-cyan mb-3 text-center">
            VIIRS — 375 m Pixel Grid
          </h3>
          <div className="flex justify-center">
            <svg viewBox="0 0 240 240" className="w-56 h-56">
              {/* VIIRS sub-cells within the equivalent MODIS area */}
              {Array.from({ length: modisSize * viirsPerModis }).map((_, row) =>
                Array.from({ length: modisSize * viirsPerModis }).map((_, col) => {
                  const cellSize = 224 / (modisSize * viirsPerModis);
                  const x = col * cellSize + 8;
                  const y = row * cellSize + 8;
                  // Detections scattered in the area matching MODIS detections
                  const inModisCenter =
                    row >= viirsPerModis && row < viirsPerModis * 2 &&
                    col >= viirsPerModis && col < viirsPerModis * 2;
                  const inModisTopRight =
                    row < viirsPerModis &&
                    col >= viirsPerModis * 2;
                  const hasDetection =
                    (inModisCenter && ((row === 4 && col === 3) || (row === 3 && col === 4) || (row === 5 && col === 4))) ||
                    (inModisTopRight && ((row === 1 && col === 7) || (row === 0 && col === 8)));

                  return (
                    <rect
                      key={`v-${row}-${col}`}
                      x={x}
                      y={y}
                      width={cellSize - 1}
                      height={cellSize - 1}
                      rx={1}
                      fill={hasDetection ? '#00E5B050' : '#1a254015'}
                      stroke={hasDetection ? '#00E5B0' : '#2A3E6240'}
                      strokeWidth={hasDetection ? 1.5 : 0.5}
                    />
                  );
                })
              )}
              {/* MODIS outline overlay */}
              {Array.from({ length: modisSize }).map((_, row) =>
                Array.from({ length: modisSize }).map((_, col) => {
                  const blockSize = 224 / modisSize;
                  return (
                    <rect
                      key={`mo-${row}-${col}`}
                      x={col * blockSize + 8}
                      y={row * blockSize + 8}
                      width={blockSize}
                      height={blockSize}
                      fill="none"
                      stroke="#FF713E40"
                      strokeWidth={1}
                      strokeDasharray="4 2"
                    />
                  );
                })
              )}
              <text x={120} y={234} textAnchor="middle" fill="#64748b" fontSize="10">
                Each cell ≈ 375 m × 375 m
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Key takeaways */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-navy/40 border border-border">
          <p className="text-xs font-semibold text-fire mb-1">MODIS Resolution</p>
          <p className="text-xs text-text-muted">
            1 km nominal at nadir. Detects large-area thermal anomalies but may miss small or
            low-intensity fires.
          </p>
        </div>
        <div className="p-3 rounded-lg bg-navy/40 border border-border">
          <p className="text-xs font-semibold text-cyan mb-1">VIIRS Resolution</p>
          <p className="text-xs text-text-muted">
            375 m (I-band). Resolves smaller fire fronts and better localizes active burning areas
            within a scene.
          </p>
        </div>
        <div className="p-3 rounded-lg bg-navy/40 border border-border">
          <p className="text-xs font-semibold text-electric mb-1">Matching Challenge</p>
          <p className="text-xs text-text-muted">
            Multiple VIIRS detections may correspond to a single MODIS pixel. Direct count
            comparison is therefore misleading.
          </p>
        </div>
      </div>

      {/* Overpass timing note */}
      <div className="mt-4 p-3 rounded-lg bg-electric/5 border border-electric/15 flex gap-3">
        <Info className="w-4 h-4 text-electric flex-shrink-0 mt-0.5" />
        <p className="text-xs text-text-muted leading-relaxed">
          <strong className="text-text-secondary">Overpass Timing:</strong> MODIS flies on Terra
          (10:30 AM descending) and Aqua (1:30 PM ascending), while VIIRS flies on Suomi NPP
          (1:30 PM ascending) and NOAA-20 (shifted orbit). Observations from different instruments
          at the same location may be separated by hours, during which fire behavior can change
          significantly.
        </p>
      </div>
    </motion.div>
  );
}
