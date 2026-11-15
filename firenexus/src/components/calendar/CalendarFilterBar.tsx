import React from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
  Download,
  Flame,
  Zap,
  Layers,
  Globe,
  Sliders,
} from 'lucide-react';
import { CONTINENTS } from '../../types';

interface CalendarFilterBarProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedSensor: 'ALL' | 'MODIS' | 'VIIRS';
  onSensorChange: (sensor: 'ALL' | 'MODIS' | 'VIIRS') => void;
  selectedContinent: string;
  onContinentChange: (continent: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  availableCountries: string[];
  minFrp: number;
  onMinFrpChange: (minFrp: number) => void;
  onReset: () => void;
  onOpenExport: () => void;
  totalFilteredCount: number;
  totalUnfilteredCount: number;
}

const AVAILABLE_YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
  selectedYear,
  onYearChange,
  selectedSensor,
  onSensorChange,
  selectedContinent,
  onContinentChange,
  selectedCountry,
  onCountryChange,
  availableCountries,
  minFrp,
  onMinFrpChange,
  onReset,
  onOpenExport,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  const isFiltered =
    (selectedYear !== 2024 && selectedYear !== 2026) ||
    selectedSensor !== 'ALL' ||
    selectedContinent !== '' ||
    selectedCountry !== '' ||
    minFrp > 0;

  const handlePrevYear = () => {
    const currentIndex = AVAILABLE_YEARS.indexOf(selectedYear);
    if (currentIndex > 0) {
      onYearChange(AVAILABLE_YEARS[currentIndex - 1]);
    }
  };

  const handleNextYear = () => {
    const currentIndex = AVAILABLE_YEARS.indexOf(selectedYear);
    if (currentIndex < AVAILABLE_YEARS.length - 1) {
      onYearChange(AVAILABLE_YEARS[currentIndex + 1]);
    }
  };

  return (
    <div className="card p-4 lg:p-5 bg-surface/90 border-border/80 shadow-md backdrop-blur space-y-4">
      {/* Top row: Year Navigation, Sensor Filters, and Export Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Year Navigator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-text-primary font-bold text-sm">
            <CalendarIcon className="w-4 h-4 text-cyan" />
            <span>Target Year:</span>
          </div>

          <div className="flex items-center bg-navy/90 rounded-lg border border-border/70 p-0.5 shadow-inner">
            <button
              onClick={handlePrevYear}
              disabled={selectedYear <= AVAILABLE_YEARS[0]}
              title="Previous Year"
              className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-muted transition-colors rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center px-2">
              <select
                value={selectedYear}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="bg-transparent font-mono font-extrabold text-sm text-cyan cursor-pointer focus:outline-none"
              >
                {AVAILABLE_YEARS.map((yr) => (
                  <option key={yr} value={yr} className="bg-surface text-text-primary">
                    {yr} {yr === 2024 ? '(Observed)' : '(Harmonized)'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleNextYear}
              disabled={selectedYear >= AVAILABLE_YEARS[AVAILABLE_YEARS.length - 1]}
              title="Next Year"
              className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-muted transition-colors rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sensor Toggle Pills */}
        <div className="flex items-center gap-1.5 bg-navy/80 p-1 rounded-lg border border-border/60">
          <button
            onClick={() => onSensorChange('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedSensor === 'ALL'
                ? 'bg-gradient-to-r from-fire/30 to-cyan/30 text-text-primary border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => onSensorChange('MODIS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedSensor === 'MODIS'
                ? 'bg-fire/25 text-fire border border-fire/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-fire" />
            <span>MODIS Only</span>
          </button>
          <button
            onClick={() => onSensorChange('VIIRS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              selectedSensor === 'VIIRS'
                ? 'bg-cyan/25 text-cyan border border-cyan/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan" />
            <span>VIIRS Only</span>
          </button>
        </div>

        {/* Action Buttons: Reset & Export */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg text-text-muted hover:text-fire hover:bg-fire/10 border border-border/50 hover:border-fire/40 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy/90 hover:bg-surface-light text-cyan border border-cyan/30 hover:border-cyan transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Geographic, FRP slider, and filter count indicator */}
      <div className="pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 items-center">
        {/* Continent Select */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-text-muted shrink-0" />
          <div className="relative flex-1">
            <select
              value={selectedContinent}
              onChange={(e) => {
                onContinentChange(e.target.value);
                onCountryChange(''); // clear country when continent changes
              }}
              className="w-full bg-navy/80 text-text-primary text-xs rounded-md border border-border/60 px-2.5 py-1.5 focus:border-cyan focus:outline-none"
            >
              <option value="">All Continents</option>
              {CONTINENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Country Select */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted shrink-0" />
          <div className="relative flex-1">
            <select
              value={selectedCountry}
              onChange={(e) => onCountryChange(e.target.value)}
              className="w-full bg-navy/80 text-text-primary text-xs rounded-md border border-border/60 px-2.5 py-1.5 focus:border-cyan focus:outline-none"
            >
              <option value="">All Countries</option>
              {availableCountries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Min FRP Slider */}
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-text-muted shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] text-text-muted whitespace-nowrap">
              Min FRP: <span className="font-mono text-cyan font-semibold">{minFrp} MW</span>
            </span>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={minFrp}
              onChange={(e) => onMinFrpChange(Number(e.target.value))}
              className="w-full h-1.5 bg-navy rounded-lg appearance-none cursor-pointer accent-cyan"
            />
          </div>
        </div>

        {/* Live Filter Counter */}
        <div className="flex items-center justify-between md:justify-end gap-2 text-xs">
          <span className="text-text-muted">Active Scope:</span>
          <span className="font-mono font-bold text-text-primary bg-navy/90 px-2.5 py-1 rounded border border-border/60">
            <span className="text-cyan">{totalFilteredCount.toLocaleString()}</span>
            <span className="text-text-muted"> / {totalUnfilteredCount.toLocaleString()}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilterBar;

