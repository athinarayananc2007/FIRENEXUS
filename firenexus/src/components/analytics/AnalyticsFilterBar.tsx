import React from 'react';
import {
  Calendar,
  Layers,
  Flame,
  Zap,
  Globe,
  Sliders,
  RotateCcw,
  Download,
  Printer,
  Shield,
  Search,
} from 'lucide-react';
import { CONTINENTS, type ConfidenceLevel } from '../../types';

interface AnalyticsFilterBarProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  selectedMonth: number | null;
  onMonthChange: (month: number | null) => void;
  selectedSensor: 'ALL' | 'MODIS' | 'VIIRS';
  onSensorChange: (sensor: 'ALL' | 'MODIS' | 'VIIRS') => void;
  selectedConfidence: ConfidenceLevel[];
  onConfidenceChange: (levels: ConfidenceLevel[]) => void;
  selectedContinent: string;
  onContinentChange: (continent: string) => void;
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  availableCountries: string[];
  minFrp: number;
  maxFrp: number;
  onFrpRangeChange: (min: number, max: number) => void;
  onReset: () => void;
  onOpenExport: () => void;
  onPrintReport: () => void;
  filteredCount: number;
  totalCount: number;
}

const DATE_PRESETS = [
  { label: 'All Records (2024–2026)', start: '2024-01-01', end: '2026-12-31' },
  { label: 'Live FIRMS (2026)', start: '2026-01-01', end: '2026-12-31' },
  { label: 'Sahel Belt (Nov 2026)', start: '2026-11-01', end: '2026-11-30' },
  { label: 'All 2024', start: '2024-01-01', end: '2024-12-31' },
  { label: 'Boreal Summer 2024', start: '2024-06-01', end: '2024-08-31' },
  { label: 'Austral Dry 2024', start: '2024-08-01', end: '2024-10-31' },
];

const MONTH_OPTIONS = [
  { label: 'All Months', value: null },
  { label: 'Jan', value: 0 },
  { label: 'Feb', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Apr', value: 3 },
  { label: 'May', value: 4 },
  { label: 'Jun', value: 5 },
  { label: 'Jul', value: 6 },
  { label: 'Aug', value: 7 },
  { label: 'Sep', value: 8 },
  { label: 'Oct', value: 9 },
  { label: 'Nov', value: 10 },
  { label: 'Dec', value: 11 },
];

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  selectedMonth,
  onMonthChange,
  selectedSensor,
  onSensorChange,
  selectedConfidence,
  onConfidenceChange,
  selectedContinent,
  onContinentChange,
  selectedCountry,
  onCountryChange,
  availableCountries,
  minFrp,
  maxFrp,
  onFrpRangeChange,
  onReset,
  onOpenExport,
  onPrintReport,
  filteredCount,
  totalCount,
}) => {
  const isFiltered =
    (startDate !== '2024-01-01' && startDate !== '2026-11-01') ||
    endDate !== '2026-12-31' ||
    selectedMonth !== null ||
    selectedSensor !== 'ALL' ||
    selectedConfidence.length !== 3 ||
    selectedContinent !== '' ||
    selectedCountry !== '' ||
    minFrp > 0 ||
    maxFrp < 500;

  const toggleConfidence = (level: ConfidenceLevel) => {
    if (selectedConfidence.includes(level)) {
      if (selectedConfidence.length === 1) return; // Prevent empty
      onConfidenceChange(selectedConfidence.filter((l) => l !== level));
    } else {
      onConfidenceChange([...selectedConfidence, level]);
    }
  };

  return (
    <div className="card p-5 bg-surface/95 border-border/80 shadow-xl space-y-4 backdrop-blur print:hidden">
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Sensor Toggle */}
        <div className="flex items-center gap-1.5 bg-navy/80 p-1 rounded-xl border border-border/60">
          <button
            onClick={() => onSensorChange('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSensor === 'ALL'
                ? 'bg-gradient-to-r from-fire/25 to-cyan/25 text-text-primary border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-cyan" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => onSensorChange('MODIS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSensor === 'MODIS'
                ? 'bg-fire/25 text-fire border border-fire/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-fire" />
            <span>MODIS (1 km)</span>
          </button>
          <button
            onClick={() => onSensorChange('VIIRS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedSensor === 'VIIRS'
                ? 'bg-cyan/25 text-cyan border border-cyan/50 shadow-sm'
                : 'text-text-muted hover:text-text-secondary hover:bg-surface-light'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan" />
            <span>VIIRS (375 m)</span>
          </button>
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
          {DATE_PRESETS.map((p) => {
            const isActive = startDate === p.start && endDate === p.end && selectedMonth === null;
            return (
              <button
                key={p.label}
                onClick={() => {
                  onDateRangeChange(p.start, p.end);
                  onMonthChange(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-cyan/20 text-cyan border border-cyan/40'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Reset, Print, Export */}
        <div className="flex items-center gap-2">
          {isFiltered && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-fire hover:bg-fire/10 rounded-lg border border-border/60 hover:border-fire/40 transition-colors"
              title="Reset all filters to defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onPrintReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy/80 hover:bg-surface-light text-text-secondary hover:text-text-primary border border-border/60 transition-colors shadow-sm"
            title="Generate printable analytical report"
          >
            <Printer className="w-3.5 h-3.5 text-cyan" />
            <span>Print Report</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-navy hover:bg-surface-light text-cyan border border-cyan/40 hover:border-cyan transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Center</span>
          </button>
        </div>
      </div>

      {/* Secondary Controls Grid: Date pickers, Confidence, Continent, Country, FRP */}
      <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center text-xs">
        {/* Date Range Inputs */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted shrink-0" />
          <div className="flex items-center gap-1 w-full">
            <input
              type="date"
              value={startDate}
              min="2020-01-01"
              max="2030-12-31"
              onChange={(e) => onDateRangeChange(e.target.value, endDate)}
              className="w-full bg-navy/80 text-[11px] font-mono text-text-primary rounded-md border border-border/60 px-2 py-1 focus:border-cyan focus:outline-none"
            />
            <span className="text-text-muted text-[10px]">to</span>
            <input
              type="date"
              value={endDate}
              min="2020-01-01"
              max="2030-12-31"
              onChange={(e) => onDateRangeChange(startDate, e.target.value)}
              className="w-full bg-navy/80 text-[11px] font-mono text-text-primary rounded-md border border-border/60 px-2 py-1 focus:border-cyan focus:outline-none"
            />
          </div>
        </div>

        {/* Confidence Tier Toggles */}
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-text-muted shrink-0" />
          <div className="flex items-center gap-1 bg-navy/80 p-0.5 rounded-lg border border-border/60 w-full justify-between">
            <button
              onClick={() => toggleConfidence('high')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                selectedConfidence.includes('high')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-text-muted hover:text-text-secondary opacity-40'
              }`}
            >
              High
            </button>
            <button
              onClick={() => toggleConfidence('nominal')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                selectedConfidence.includes('nominal')
                  ? 'bg-cyan/20 text-cyan border border-cyan/30'
                  : 'text-text-muted hover:text-text-secondary opacity-40'
              }`}
            >
              Nominal
            </button>
            <button
              onClick={() => toggleConfidence('low')}
              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                selectedConfidence.includes('low')
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-text-muted hover:text-text-secondary opacity-40'
              }`}
            >
              Low
            </button>
          </div>
        </div>

        {/* Geographic Continent */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-text-muted shrink-0" />
          <select
            value={selectedContinent}
            onChange={(e) => {
              onContinentChange(e.target.value);
              onCountryChange('');
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

        {/* Geographic Country */}
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <select
            value={selectedCountry}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full bg-navy/80 text-text-primary text-xs rounded-md border border-border/60 px-2.5 py-1.5 focus:border-cyan focus:outline-none"
          >
            <option value="">All Countries</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Min FRP Threshold Slider */}
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-text-muted shrink-0" />
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[11px] text-text-muted whitespace-nowrap">
              FRP &ge; <span className="font-mono text-cyan font-bold">{minFrp}</span> MW
            </span>
            <input
              type="range"
              min={0}
              max={150}
              step={5}
              value={minFrp}
              onChange={(e) => onFrpRangeChange(Number(e.target.value), maxFrp)}
              className="w-full h-1.5 bg-navy rounded-lg appearance-none cursor-pointer accent-cyan"
            />
          </div>
        </div>
      </div>

      {/* Scope Indicator Pill */}
      <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <span>Active Filtered Cohort:</span>
          <span className="font-mono font-bold text-text-primary bg-navy/90 px-2 py-0.5 rounded border border-border/60">
            <span className="text-cyan">{filteredCount.toLocaleString()}</span> / {totalCount.toLocaleString()} detections{' '}
            <span className="text-text-muted text-[10px]">
              ({totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 0}%)
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px]">Month Fast Filter:</span>
          <div className="flex items-center gap-1">
            {MONTH_OPTIONS.map((m) => (
              <button
                key={m.label}
                onClick={() => onMonthChange(m.value)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  selectedMonth === m.value
                    ? 'bg-cyan/25 text-cyan font-bold border border-cyan/40'
                    : 'text-text-muted hover:text-text-secondary hover:bg-navy'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsFilterBar;

