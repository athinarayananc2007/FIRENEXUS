import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { FireObservation } from '../../types';
import { computeRegionActivity } from '../../data/mock/fireData';

interface RegionRankingProps {
  observations: FireObservation[];
}

export default function RegionRanking({ observations }: RegionRankingProps) {
  const regions = useMemo(
    () => computeRegionActivity(observations).slice(0, 10),
    [observations],
  );

  const maxCount = regions.length > 0 ? regions[0].observationCount : 1;

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Top Regions by Activity
      </h3>

      <div className="overflow-y-auto flex-1 -mr-2 pr-2 space-y-2">
        {regions.map((region, idx) => (
          <motion.div
            key={region.region}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group"
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="w-6 text-right text-xs font-bold text-text-muted">
                #{idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {region.region}
                </p>
                <p className="text-xs text-text-muted">{region.country}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-text-primary">
                  {region.observationCount}
                </p>
                <p className="text-xs text-text-muted">
                  Avg {region.avgFrp} MW ·{' '}
                  <span
                    className={
                      region.dominantSatellite === 'MODIS'
                        ? 'text-fire'
                        : 'text-cyan'
                    }
                  >
                    {region.dominantSatellite}
                  </span>
                </p>
              </div>
            </div>
            {/* Bar */}
            <div className="ml-9 h-1.5 rounded-full bg-navy overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor:
                    region.dominantSatellite === 'MODIS'
                      ? '#FF713E'
                      : '#00E5B0',
                }}
                initial={{ width: 0 }}
                animate={{
                  width: `${(region.observationCount / maxCount) * 100}%`,
                }}
                transition={{ duration: 0.6, delay: idx * 0.05 }}
              />
            </div>
          </motion.div>
        ))}

        {regions.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">
            No data for current filters.
          </p>
        )}
      </div>
    </div>
  );
}
