import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin, Globe, Search, ArrowRight, Compass,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import {
  computeRegionActivity,
  computeContinentActivity,
} from '../../data/mock/fireData';

interface RegionalIntelligenceProps {
  observations: FireObservation[];
  onFilterCountry?: (country: string) => void;
  onFilterContinent?: (continent: string) => void;
}

export default function RegionalIntelligence({
  observations,
  onFilterCountry,
  onFilterContinent,
}: RegionalIntelligenceProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Top regions
  const allRegions = useMemo(
    () => computeRegionActivity(observations),
    [observations],
  );

  const filteredRegions = useMemo(() => {
    if (!searchTerm.trim()) return allRegions.slice(0, 10);
    const q = searchTerm.toLowerCase().trim();
    return allRegions
      .filter(
        (r) =>
          r.region.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.continent.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [allRegions, searchTerm]);

  // Continent statistics
  const continents = useMemo(
    () => computeContinentActivity(observations),
    [observations],
  );

  const maxRegionCount = allRegions.length > 0 ? allRegions[0].observationCount : 1;
  const maxContinentCount = continents.length > 0 ? continents[0].count : 1;

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl p-5 flex flex-col justify-between backdrop-blur-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Regional Fire Intelligence
            </h3>
            <p className="text-xs text-text-secondary">
              Continental density and high-activity biome clusters
            </p>
          </div>
        </div>

        {/* Search Input for Regions */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search continent, country..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field text-xs py-1.5 pl-8 pr-3 w-full"
          />
        </div>
      </div>

      {/* Two Column Layout: Continental Activity + Top Ranked Regions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Continental Distribution */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan" />
              <span>Continental Breakdown</span>
            </h4>
            <span className="text-[11px] text-text-muted font-mono">
              {continents.length} continents
            </span>
          </div>

          <div className="space-y-2.5">
            {continents.map((cont) => (
              <div
                key={cont.continent}
                onClick={() => onFilterContinent?.(cont.continent)}
                className="group p-2.5 rounded-xl bg-surface/40 hover:bg-surface-light border border-border/60 hover:border-cyan/40 transition-all cursor-pointer"
                title={`Filter dashboard to ${cont.continent}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-text-primary group-hover:text-cyan transition-colors">
                    {cont.continent}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-text-primary font-bold">
                      {cont.count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      ({cont.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress Meter */}
                <div className="h-1.5 rounded-full bg-navy overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(cont.count / maxContinentCount) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted mt-1.5">
                  <span>Avg FRP: <strong className="text-amber-400 font-mono">{cont.avgFrp} MW</strong></span>
                  <span className="group-hover:text-cyan flex items-center gap-0.5 transition-colors">
                    Filter <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Top 10 Regions Ranking */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-fire" />
              <span>Highest Detection Biomes</span>
            </h4>
            <span className="text-[11px] text-text-muted font-mono">
              Top 10 hotspots
            </span>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {filteredRegions.map((reg, idx) => (
              <motion.div
                key={reg.region}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onFilterCountry?.(reg.country)}
                className="group p-2.5 rounded-xl bg-surface/30 hover:bg-surface-light border border-border/50 hover:border-cyan/40 transition-all cursor-pointer flex items-center gap-3"
                title={`Filter to ${reg.country}`}
              >
                {/* Rank Badge */}
                <span className="w-5 text-center font-mono text-xs font-bold text-text-muted">
                  #{idx + 1}
                </span>

                {/* Region & Country */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-primary group-hover:text-cyan truncate transition-colors">
                    {reg.region}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">
                    {reg.country} · {reg.continent}
                  </p>
                </div>

                {/* Meter & Statistics */}
                <div className="w-28 hidden sm:block">
                  <div className="h-1.5 rounded-full bg-navy overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(reg.observationCount / maxRegionCount) * 100}%`,
                        backgroundColor:
                          reg.dominantSatellite === 'MODIS' ? '#FF713E' : '#00E5B0',
                      }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-text-primary">
                    {reg.observationCount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-text-muted">
                    Avg <span className="text-amber-400 font-mono">{reg.avgFrp} MW</span> ·{' '}
                    <span
                      className={
                        reg.dominantSatellite === 'MODIS' ? 'text-fire' : 'text-cyan'
                      }
                    >
                      {reg.dominantSatellite}
                    </span>
                  </p>
                </div>
              </motion.div>
            ))}

            {filteredRegions.length === 0 && (
              <p className="text-xs text-text-muted text-center py-6">
                No matching geographic regions found for "{searchTerm}".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}