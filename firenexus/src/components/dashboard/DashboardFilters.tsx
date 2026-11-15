import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, ChevronDown, ChevronUp, RotateCcw, Search,
  Download, Sparkles, X, Globe, Zap, Shield,
} from 'lucide-react';
import type { FilterState, SatelliteInstrument, ConfidenceLevel } from '../../types';
import { DEFAULT_FILTERS } from '../../types';

interface DashboardFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  countries: string[];
  continents: string[];
  onOpenExport?: () => void;
  matchingCount: number;
  totalCount: number;
}

const DATE_PRESETS = [
  { label: 'All Data (2024–2026)', start: '2024-01-01', end: '2026-12-31' },
  { label: 'Live FIRMS (2026)', start: '2026-01-01', end: '2026-12-31' },
  { label: 'All 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Q1 (Jan–Mar)', start: '2024-01-01', end: '2024-03-31' },
  { label: 'Q2 (Apr–Jun)', start: '2024-04-01', end: '2024-06-30' },
  { label: 'Q3 (Jul–Sep)', start: '2024-07-01', end: '2024-09-30' },
  { label: 'Q4 (Oct–Dec)', start: '2024-10-01', end: '2024-12-31' },
  { label: 'Peak Fire Season (Jun–Oct)', start: '2024-06-01', end: '2024-10-31' },
];

export default function DashboardFilters({
  filters,
  onChange,
  countries,
  continents,
  onOpenExport,
  matchingCount,
  totalCount,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange]
  );

  const toggleSatellite = (sat: SatelliteInstrument) => {
    const current = filters.satellites;
    if (current.includes(sat)) {
      if (current.length === 1) return; // keep at least one
      updateFilter('satellites', current.filter((s) => s !== sat));
    } else {
      updateFilter('satellites', [...current, sat]);
    }
  };

  const toggleConfidence = (level: ConfidenceLevel) => {
    const current = filters.confidence;
    if (current.includes(level)) {
      if (current.length === 1) return; // keep at least one
      updateFilter('confidence', current.filter((c) => c !== level));
    } else {
      updateFilter('confidence', [...current, level]);
    }
  };

  const resetFilters = () => {
    onChange({ ...DEFAULT_FILTERS });
  };

  // Determine active filter badges
  const activeChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];

    if (filters.searchQuery) {
      chips.push({
        label: `Search: "${filters.searchQuery}"`,
        onRemove: () => updateFilter('searchQuery', ''),
      });
    }

    if (
      filters.dateRange.start !== DEFAULT_FILTERS.dateRange.start ||
      filters.dateRange.end !== DEFAULT_FILTERS.dateRange.end
    ) {
      chips.push({
        label: `Date: ${filters.dateRange.start} → ${filters.dateRange.end}`,
        onRemove: () => updateFilter('dateRange', { ...DEFAULT_FILTERS.dateRange }),
      });
    }

    if (filters.satellites.length === 1) {
      chips.push({
        label: `Sensor: ${filters.satellites[0]}`,
        onRemove: () => updateFilter('satellites', ['MODIS', 'VIIRS']),
      });
    }

    if (filters.confidence.length < 3) {
      chips.push({
        label: `Conf: ${filters.confidence.join(', ')}`,
        onRemove: () => updateFilter('confidence', ['low', 'nominal', 'high']),
      });
    }

    if (filters.continent) {
      chips.push({
        label: `Continent: ${filters.continent}`,
        onRemove: () => updateFilter('continent', ''),
      });
    }

    if (filters.country) {
      chips.push({
        label: `Country: ${filters.country}`,
        onRemove: () => updateFilter('country', ''),
      });
    }

    if (filters.frpRange.min > 0 || filters.frpRange.max < 500) {
      chips.push({
        label: `FRP: ${filters.frpRange.min}–${filters.frpRange.max} MW`,
        onRemove: () => updateFilter('frpRange', { min: 0, max: 500 }),
      });
    }

    return chips;
  }, [filters, updateFilter]);

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-navy/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-bold text-text-primary hover:text-cyan transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Filter className="w-4 h-4" />
            </div>
            <span>Global Intelligence Filters</span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {/* Real-time Match Count */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-light border border-border text-xs">
            <span className="text-text-muted">Filtered:</span>
            <span className="font-mono font-bold text-cyan">
              {matchingCount.toLocaleString()}
            </span>
            <span className="text-text-muted">/ {totalCount.toLocaleString()}</span>
          </div>

          {activeChips.length > 0 && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-cyan/10 border border-cyan/20 text-cyan text-xs font-semibold">
              {activeChips.length} active
            </span>
          )}
        </div>

        {/* Action Controls: Export & Reset */}
        <div className="flex items-center gap-2">
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              title="Export filtered data or generate report"
            >
              <Download className="w-3.5 h-3.5 text-cyan" />
              <span>Export & Reports</span>
            </button>
          )}

          {activeChips.length > 0 && (
            <button
              onClick={resetFilters}
              className="btn-ghost text-xs py-1.5 px-2.5 text-text-muted hover:text-rose-400 flex items-center gap-1.5"
              title="Reset all filters to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="px-4 py-2 bg-surface/40 border-b border-border/40 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted font-mono text-[11px]">Applied:</span>
          {activeChips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-light border border-border text-text-primary text-xs"
            >
              <span>{chip.label}</span>
              <button
                onClick={chip.onRemove}
                className="hover:text-rose-400 text-text-muted transition-colors"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={resetFilters}
            className="text-[11px] text-cyan hover:underline ml-1 font-semibold"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expandable Filter Grid */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-4">
              {/* Row 1: Search & Date Presets */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Search Bar */}
                <div className="lg:col-span-5">
                  <label className="label-text mb-1.5 block">Search Hotspots</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search by ID (FN-000123), country, or region..."
                      value={filters.searchQuery}
                      onChange={(e) => updateFilter('searchQuery', e.target.value)}
                      className="input-field pl-9 pr-8"
                    />
                    {filters.searchQuery && (
                      <button
                        onClick={() => updateFilter('searchQuery', '')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Quick Presets */}
                <div className="lg:col-span-7">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label-text">Temporal Window Presets</label>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan" />
                      One-click window
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {DATE_PRESETS.map((preset) => {
                      const active =
                        filters.dateRange.start === preset.start &&
                        filters.dateRange.end === preset.end;
                      return (
                        <button
                          key={preset.label}
                          onClick={() =>
                            updateFilter('dateRange', {
                              start: preset.start,
                              end: preset.end,
                            })
                          }
                          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                            active
                              ? 'bg-cyan/15 text-cyan border-cyan/40 font-semibold shadow-sm'
                              : 'bg-surface-light/60 text-text-secondary border-border/80 hover:bg-surface-light hover:text-text-primary'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Date Range, Satellite, Confidence, Location, FRP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-border/40">
                {/* 1. Date Range Input */}
                <div>
                  <label className="label-text mb-1.5 block">Custom Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      min="2020-01-01"
                      max="2030-12-31"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          start: e.target.value,
                        })
                      }
                      className="input-field text-xs py-1.5 px-2"
                    />
                    <input
                      type="date"
                      min="2020-01-01"
                      max="2030-12-31"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          end: e.target.value,
                        })
                      }
                      className="input-field text-xs py-1.5 px-2"
                    />
                  </div>
                </div>

                {/* 2. Satellite Instrument */}
                <div>
                  <label className="label-text mb-1.5 block">Satellite Instrument</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSatellite('MODIS')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                        filters.satellites.includes('MODIS')
                          ? 'bg-fire/15 text-fire border-fire/40 shadow-sm'
                          : 'bg-surface-light/40 text-text-muted border-border/60 hover:text-text-secondary'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-fire" />
                      MODIS (1km)
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSatellite('VIIRS')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all ${
                        filters.satellites.includes('VIIRS')
                          ? 'bg-cyan/15 text-cyan border-cyan/40 shadow-sm'
                          : 'bg-surface-light/40 text-text-muted border-border/60 hover:text-text-secondary'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan" />
                      VIIRS (375m)
                    </button>
                  </div>
                </div>

                {/* 3. Confidence Filter */}
                <div>
                  <label className="label-text mb-1.5 block flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-text-muted" />
                    Confidence
                  </label>
                  <div className="flex gap-1.5">
                    {(['high', 'nominal', 'low'] as ConfidenceLevel[]).map((level) => {
                      const active = filters.confidence.includes(level);
                      const color =
                        level === 'high'
                          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                          : level === 'nominal'
                            ? 'text-warning border-warning/30 bg-warning/10'
                            : 'text-rose-400 border-rose-500/30 bg-rose-500/10';
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => toggleConfidence(level)}
                          className={`flex-1 py-1.5 px-1 rounded-lg border text-xs capitalize font-medium transition-all ${
                            active
                              ? `${color} font-bold shadow-sm`
                              : 'bg-surface-light/40 text-text-muted border-border/60 hover:text-text-secondary'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Continent & Country */}
                <div>
                  <label className="label-text mb-1.5 block flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-text-muted" />
                    Geographic Region
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filters.continent}
                      onChange={(e) => updateFilter('continent', e.target.value)}
                      className="input-field text-xs py-1.5 px-2"
                    >
                      <option value="">All Continents</option>
                      {continents.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filters.country}
                      onChange={(e) => updateFilter('country', e.target.value)}
                      className="input-field text-xs py-1.5 px-2"
                    >
                      <option value="">All Countries</option>
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 5. FRP Range */}
                <div>
                  <label className="label-text mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      FRP Threshold
                    </span>
                    <span className="font-mono text-[11px] text-amber-400">
                      {filters.frpRange.min}–{filters.frpRange.max} MW
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={300}
                      step={5}
                      value={filters.frpRange.min}
                      onChange={(e) =>
                        updateFilter('frpRange', {
                          ...filters.frpRange,
                          min: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 h-1.5 bg-navy rounded-lg cursor-pointer"
                    />
                    <button
                      onClick={() => updateFilter('frpRange', { min: 0, max: 500 })}
                      className="text-[10px] text-text-muted hover:text-text-primary shrink-0"
                      title="Reset FRP slider"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}