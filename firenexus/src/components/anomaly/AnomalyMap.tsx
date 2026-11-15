import { useMemo } from 'react';
import type { AnomalyRecord } from '../../types';

interface AnomalyMapProps {
  anomalies: AnomalyRecord[];
  selectedAnomaly: AnomalyRecord | null;
  onSelect: (item: AnomalyRecord) => void;
}

// Approximate coordinate mappings for anomaly regions
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  'Sub-Saharan West Africa': { x: 50, y: 55 },
  'Central Africa': { x: 55, y: 62 },
  'Southern Africa': { x: 58, y: 75 },
  'East Africa': { x: 60, y: 62 },
  'Madagascar': { x: 64, y: 74 },
  'Amazon Basin': { x: 30, y: 62 },
  'Cerrado': { x: 32, y: 68 },
  'Gran Chaco': { x: 29, y: 76 },
  'Orinoco Basin': { x: 28, y: 52 },
  'Southeast Asia': { x: 80, y: 58 },
  'Mainland SE Asia': { x: 75, y: 48 },
  'Central Siberia': { x: 75, y: 24 },
  'Indian Subcontinent': { x: 70, y: 48 },
  'Western US': { x: 18, y: 38 },
  'Boreal Canada': { x: 22, y: 26 },
  'Mexico Central': { x: 20, y: 48 },
  'Mediterranean': { x: 52, y: 38 },
  'Iberian Peninsula': { x: 47, y: 38 },
  'Northern Australia': { x: 86, y: 72 },
  'Eastern Australia': { x: 90, y: 80 },
};

export default function AnomalyMap({
  anomalies,
  selectedAnomaly,
  onSelect,
}: AnomalyMapProps) {
  const points = useMemo(() => {
    return anomalies.map((a) => {
      const coord = REGION_COORDS[a.region] || { x: 50, y: 50 };
      return {
        ...a,
        x: coord.x,
        y: coord.y,
      };
    });
  }, [anomalies]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Global Anomaly Cluster Distribution</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Geographic hot-zone indicators sized by deviation intensity
          </p>
        </div>
        <span className="demo-badge">Spatial Distribution</span>
      </div>

      <div className="relative w-full aspect-[2/1] bg-midnight rounded-xl border border-border/60 overflow-hidden">
        {/* World Grid Lines */}
        <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0">
          {[20, 40, 60, 80].map((v) => (
            <line
              key={`lat-${v}`}
              x1="0"
              y1={v}
              x2="100"
              y2={v}
              stroke="#1F2E4A"
              strokeWidth="0.4"
              strokeDasharray="2 2"
            />
          ))}
          {[20, 40, 60, 80].map((v) => (
            <line
              key={`lon-${v}`}
              x1={v}
              y1="0"
              x2={v}
              y2="100"
              stroke="#1F2E4A"
              strokeWidth="0.4"
              strokeDasharray="2 2"
            />
          ))}

          {/* Continent contours */}
          <ellipse cx="20" cy="35" rx="10" ry="12" fill="#162544" opacity="0.4" />
          <ellipse cx="30" cy="68" rx="8" ry="14" fill="#162544" opacity="0.4" />
          <ellipse cx="55" cy="58" rx="9" ry="15" fill="#162544" opacity="0.4" />
          <ellipse cx="68" cy="30" rx="20" ry="12" fill="#162544" opacity="0.4" />
          <ellipse cx="86" cy="76" rx="8" ry="6" fill="#162544" opacity="0.4" />
        </svg>

        {/* Anomaly hotspots */}
        {points.map((p) => {
          const isSelected = selectedAnomaly?.id === p.id;
          const isHigh = p.score > 0.5;
          const color = isHigh ? 'bg-danger' : p.score > 0.25 ? 'bg-warning' : 'bg-cyan';

          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={`${p.region}: +${Math.round(p.score * 100)}% anomaly`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer transition-transform duration-150 ${color} ${
                isSelected
                  ? 'w-6 h-6 ring-4 ring-white ring-opacity-80 scale-125 z-20 shadow-lg'
                  : 'w-3.5 h-3.5 hover:scale-125 z-10'
              } opacity-90`}
            />
          );
        })}
      </div>
    </div>
  );
}

