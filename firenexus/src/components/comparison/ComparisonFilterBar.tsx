import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter, ChevronDown, ChevronUp, RotateCcw,
  Sparkles, Globe, Zap, Shield, GitMerge,
} from 'lucide-react';
import type { FilterState, ConfidenceLevel, MatchingEngineParams } from '../../types';
import { DEFAULT_FILTERS } from '../../types';

interface ComparisonFilterBarProps {
  filters: FilterState;
  onChangeFilters: (filters: FilterState) => void;
  matchingParams: MatchingEngineParams;
  onChangeMatchingParams: (params: MatchingEngineParams) => void;
  countries: string[];
  continents: string[];
  matchedCount: number;
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

export default function ComparisonFilterBar({
  filters,
  onChangeFilters,
  matchingParams,
  onChangeMatchingParams,
  countries,
  continents,
  matchedCount,
  totalCount,
}: ComparisonFilterBarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    onChangeFilters({ ...filters, [key]: value });
  };

  const toggleConfidence = (level: ConfidenceLevel) => {
    const current = filters.confidence;
    if (current.includes(level)) {
      if (current.length === 1) return;
      updateFilter('confidence', current.filter((c) => c !== level));
    } else {
      updateFilter('confidence', [...current, level]);
    }
  };

  const resetAll = () => {
    onChangeFilters({ ...DEFAULT_FILTERS });
    onChangeMatchingParams({
      spatialToleranceKm: 2.0,
      temporalToleranceMinutes: 90,
      confidenceRequirement: 'any',
    });
  };

  const isFiltered = useMemo(() => {
    return (
      filters.dateRange.start !== DEFAULT_FILTERS.dateRange.start ||
      filters.dateRange.end !== DEFAULT_FILTERS.dateRange.end ||
      filters.confidence.length < 3 ||
      filters.continent !== '' ||
      filters.country !== '' ||
      filters.frpRange.min > 0 ||
      filters.frpRange.max < 500 ||
      matchingParams.spatialToleranceKm !== 2.0 ||
      matchingParams.temporalToleranceMinutes !== 90
    );
  }, [filters, matchingParams]);

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 bg-navy/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 text-sm font-bold text-text-primary hover:text-cyan transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Filter className="w-4 h-4" />
            </div>
            <span>Comparison &amp; Matching Filters</span>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {/* Real-time Match Telemetry */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-light border border-border text-xs">
            <span className="text-text-muted">Cohort:</span>
            <span className="font-mono font-bold text-cyan">
              {totalCount.toLocaleString()}
            </span>
            <span className="text-text-muted">| Matched:</span>
            <span className="font-mono font-bold text-purple-300">
              {matchedCount.toLocaleString()} pairs
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={resetAll}
              className="btn-ghost text-xs py-1.5 px-2.5 text-text-muted hover:text-rose-400 flex items-center gap-1.5"
              title="Reset all filters to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Controls */}
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
              {/* Row 1: Date Presets & Custom Range */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label-text">Temporal Window Presets</label>
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan" />
                      Synchronized across MODIS &amp; VIIRS
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

                <div className="lg:col-span-4">
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
              </div>

              {/* Row 2: Geographic Region, Confidence, FRP Range, Matching Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/40">
                {/* 1. Geographical Filter */}
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

                {/* 2. Confidence Level */}
                <div>
                  <label className="label-text mb-1.5 block flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-text-muted" />
                    Detection Confidence
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

                {/* 3. FRP Min Threshold */}
                <div>
                  <label className="label-text mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      FRP Range
                    </span>
                    <span className="font-mono text-[11px] text-amber-400">
                      {filters.frpRange.min}–{filters.frpRange.max} MW
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={250}
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
                </div>

                {/* 4. Spatial Matching Quick Indicator */}
                <div className="p-2.5 rounded-xl bg-surface/50 border border-border text-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="flex items-center gap-1">
                      <GitMerge className="w-3.5 h-3.5 text-purple-300" />
                      Matching Tolerances
                    </span>
                    <span className="font-mono text-purple-300 font-bold">
                      {matchingParams.spatialToleranceKm} km / {matchingParams.temporalToleranceMinutes} min
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted mt-1">
                    Fine-tune in the Spatial Matching Engine below
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}