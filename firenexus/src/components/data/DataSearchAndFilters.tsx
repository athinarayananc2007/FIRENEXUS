import React, { useState } from 'react';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Flame,
  Zap,
  Globe,
  Sliders,
  Sun,
  Moon,
  Shield,
  MapPin,
} from 'lucide-react';
import { CONTINENTS, type ConfidenceLevel, type SatelliteInstrument } from '../../types';

export interface DataExplorerFilterState {
  searchQuery: string;
  satellite: SatelliteInstrument | 'ALL';
  confidence: ConfidenceLevel[];
  startDate: string;
  endDate: string;
  month: number | null;
  dayNight: 'ALL' | 'D' | 'N';
  continent: string;
  country: string;
  minFrp: number;
  maxFrp: number;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

interface DataSearchAndFiltersProps {
  filters: DataExplorerFilterState;
  onChangeFilters: (newFilters: DataExplorerFilterState) => void;
  onResetFilters: () => void;
  availableCountries: string[];
}

const SEARCH_SUGGESTIONS = [
  { label: 'MODIS High Conf', query: 'MODIS high' },
  { label: 'Amazon Basin', query: 'Amazon Basin' },
  { label: 'California', query: 'California' },
  { label: 'Boreal Canada', query: 'Canada' },
  { label: 'Australia Savanna', query: 'Australia' },
  { label: 'Central Africa', query: 'DR Congo' },
];

export const DataSearchAndFilters: React.FC<DataSearchAndFiltersProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  availableCountries,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters (ignoring default baseline settings)
  const activeFilterCount = [
    filters.searchQuery !== '',
    filters.satellite !== 'ALL',
    filters.confidence.length !== 3,
    (filters.startDate !== '2024-01-01' && filters.startDate !== '2026-11-01') || filters.endDate !== '2026-12-31',
    filters.month !== null,
    filters.dayNight !== 'ALL',
    filters.continent !== '',
    filters.country !== '',
    filters.minFrp > 0 || filters.maxFrp < 500,
    filters.minLat > -90 || filters.maxLat < 90,
    filters.minLon > -180 || filters.maxLon < 180,
  ].filter(Boolean).length;

  const handleUpdate = (partial: Partial<DataExplorerFilterState>) => {
    onChangeFilters({ ...filters, ...partial });
  };

  const handleToggleConfidence = (lvl: ConfidenceLevel) => {
    if (filters.confidence.includes(lvl)) {
      if (filters.confidence.length === 1) return; // Prevent deselecting all
      handleUpdate({ confidence: filters.confidence.filter((c) => c !== lvl) });
    } else {
      handleUpdate({ confidence: [...filters.confidence, lvl] });
    }
  };

  return (
    <div className="card p-4 sm:p-5 bg-surface/95 border-border/80 shadow-xl space-y-4">
      {/* Top Search Bar & Accordion Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Advanced Global Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-cyan absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleUpdate({ searchQuery: e.target.value })}
            placeholder="Search by ID, coordinates, country, region, satellite (Terra/Aqua/NOAA), date, confidence..."
            className="w-full bg-navy/90 text-xs text-text-primary pl-10 pr-9 py-2.5 rounded-xl border border-border/70 focus:border-cyan focus:outline-none placeholder:text-text-muted shadow-inner"
          />
          {filters.searchQuery && (
            <button
              onClick={() => handleUpdate({ searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Toggle Filters Button & Reset */}
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl bg-navy/80 hover:bg-fire/15 text-text-muted hover:text-fire border border-border/60 hover:border-fire/40 transition-colors"
              title="Reset all search queries and filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isExpanded || activeFilterCount > 0
                ? 'bg-cyan/20 text-cyan border border-cyan/50 shadow-cyan-dim'
                : 'bg-navy/90 text-text-secondary hover:text-text-primary border border-border/70 hover:bg-surface-light'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan text-midnight text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick Search Suggestions Chips */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[11px] text-text-muted flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-cyan" /> Suggested:
        </span>
        {SEARCH_SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => handleUpdate({ searchQuery: s.query })}
            className="px-2 py-0.5 rounded-full text-[10px] bg-navy/80 hover:bg-surface-light text-text-secondary hover:text-cyan border border-border/50 hover:border-cyan/40 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Expandable Multi-Criteria Filter Drawer */}
      {isExpanded && (
        <div className="pt-4 border-t border-border/60 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* 1. Satellite Sensor Toggle */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan" />
                Satellite Instrument
              </label>
              <div className="grid grid-cols-3 gap-1 bg-navy/80 p-1 rounded-lg border border-border/60 text-center font-semibold text-[11px]">
                <button
                  onClick={() => handleUpdate({ satellite: 'ALL' })}
                  className={`py-1 rounded transition-colors ${
                    filters.satellite === 'ALL'
                      ? 'bg-surface text-text-primary border border-cyan/40 shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => handleUpdate({ satellite: 'MODIS' })}
                  className={`py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                    filters.satellite === 'MODIS'
                      ? 'bg-fire/20 text-fire border border-fire/40 shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Flame className="w-3 h-3" /> MODIS
                </button>
                <button
                  onClick={() => handleUpdate({ satellite: 'VIIRS' })}
                  className={`py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                    filters.satellite === 'VIIRS'
                      ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Zap className="w-3 h-3" /> VIIRS
                </button>
              </div>
            </div>

            {/* 2. Confidence Tier Checkboxes */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Confidence Threshold
              </label>
              <div className="grid grid-cols-3 gap-1 bg-navy/80 p-1 rounded-lg border border-border/60 text-center font-bold text-[10px]">
                <button
                  onClick={() => handleToggleConfidence('high')}
                  className={`py-1 rounded transition-colors ${
                    filters.confidence.includes('high')
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-text-muted opacity-40'
                  }`}
                >
                  High
                </button>
                <button
                  onClick={() => handleToggleConfidence('nominal')}
                  className={`py-1 rounded transition-colors ${
                    filters.confidence.includes('nominal')
                      ? 'bg-cyan/20 text-cyan border border-cyan/30 shadow-sm'
                      : 'text-text-muted opacity-40'
                  }`}
                >
                  Nominal
                </button>
                <button
                  onClick={() => handleToggleConfidence('low')}
                  className={`py-1 rounded transition-colors ${
                    filters.confidence.includes('low')
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
                      : 'text-text-muted opacity-40'
                  }`}
                >
                  Low
                </button>
              </div>
            </div>

            {/* 3. Day / Night Overpass Flag */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                Solar Day / Night
              </label>
              <div className="grid grid-cols-3 gap-1 bg-navy/80 p-1 rounded-lg border border-border/60 text-center font-semibold text-[11px]">
                <button
                  onClick={() => handleUpdate({ dayNight: 'ALL' })}
                  className={`py-1 rounded transition-colors ${
                    filters.dayNight === 'ALL'
                      ? 'bg-surface text-text-primary border border-border/70'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  All Overpasses
                </button>
                <button
                  onClick={() => handleUpdate({ dayNight: 'D' })}
                  className={`py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                    filters.dayNight === 'D'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-400" /> Day (D)
                </button>
                <button
                  onClick={() => handleUpdate({ dayNight: 'N' })}
                  className={`py-1 rounded transition-colors flex items-center justify-center gap-1 ${
                    filters.dayNight === 'N'
                      ? 'bg-cyan/20 text-cyan border border-cyan/40'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Moon className="w-3 h-3 text-cyan" /> Night (N)
                </button>
              </div>
            </div>

            {/* 4. Geographic Continent & Country */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan" />
                Continent &amp; Jurisdiction
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={filters.continent}
                  onChange={(e) =>
                    handleUpdate({ continent: e.target.value, country: '' })
                  }
                  className="w-full bg-navy/80 text-[11px] text-text-primary rounded-md border border-border/60 px-2 py-1.5 focus:border-cyan focus:outline-none"
                >
                  <option value="">All Continents</option>
                  {CONTINENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.country}
                  onChange={(e) => handleUpdate({ country: e.target.value })}
                  className="w-full bg-navy/80 text-[11px] text-text-primary rounded-md border border-border/60 px-2 py-1.5 focus:border-cyan focus:outline-none"
                >
                  <option value="">All Countries</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Secondary Grid: Date range, FRP sliders, and Coordinate Bounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-border/40 text-xs">
            {/* Date Range & Fast Presets */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan" /> Acquisition Date Range
                </span>
                <span className="text-[10px] font-mono text-cyan">Date Range</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.startDate}
                  min="2020-01-01"
                  max="2030-12-31"
                  onChange={(e) => handleUpdate({ startDate: e.target.value })}
                  className="w-full bg-navy/80 text-[11px] font-mono text-text-primary rounded-md border border-border/60 px-2 py-1 focus:border-cyan focus:outline-none"
                />
                <span className="text-text-muted text-[10px]">to</span>
                <input
                  type="date"
                  value={filters.endDate}
                  min="2020-01-01"
                  max="2030-12-31"
                  onChange={(e) => handleUpdate({ endDate: e.target.value })}
                  className="w-full bg-navy/80 text-[11px] font-mono text-text-primary rounded-md border border-border/60 px-2 py-1 focus:border-cyan focus:outline-none"
                />
              </div>
            </div>

            {/* FRP Range Sliders */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-text-muted font-semibold flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Fire Radiative Power (FRP)
                </label>
                <span className="font-mono text-amber-400 font-bold">
                  {filters.minFrp} &ndash; {filters.maxFrp} MW
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={0}
                  max={250}
                  step={5}
                  value={filters.minFrp}
                  onChange={(e) => handleUpdate({ minFrp: Number(e.target.value) })}
                  className="w-full h-1.5 bg-navy rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>

            {/* Latitude & Longitude Range Inputs */}
            <div className="space-y-1.5">
              <label className="text-text-muted font-semibold text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan" /> Coordinate Bounds (&deg;)
                </span>
                <span className="text-[10px] font-mono text-text-muted">Global Box</span>
              </label>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1">
                  <span className="text-text-muted text-[10px]">Lat:</span>
                  <input
                    type="number"
                    min={-90}
                    max={90}
                    value={filters.minLat}
                    onChange={(e) => handleUpdate({ minLat: Number(e.target.value) })}
                    className="w-1/2 bg-navy/80 text-text-primary rounded px-1.5 py-0.5 border border-border/60"
                  />
                  <span>&ndash;</span>
                  <input
                    type="number"
                    min={-90}
                    max={90}
                    value={filters.maxLat}
                    onChange={(e) => handleUpdate({ maxLat: Number(e.target.value) })}
                    className="w-1/2 bg-navy/80 text-text-primary rounded px-1.5 py-0.5 border border-border/60"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-text-muted text-[10px]">Lon:</span>
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    value={filters.minLon}
                    onChange={(e) => handleUpdate({ minLon: Number(e.target.value) })}
                    className="w-1/2 bg-navy/80 text-text-primary rounded px-1.5 py-0.5 border border-border/60"
                  />
                  <span>&ndash;</span>
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    value={filters.maxLon}
                    onChange={(e) => handleUpdate({ maxLon: Number(e.target.value) })}
                    className="w-1/2 bg-navy/80 text-text-primary rounded px-1.5 py-0.5 border border-border/60"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSearchAndFilters;

