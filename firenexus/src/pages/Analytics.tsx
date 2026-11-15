import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import AnalyticsFilterBar from '../components/analytics/AnalyticsFilterBar';
import AnalyticsKpiCards from '../components/analytics/AnalyticsKpiCards';
import ScientificInsightsEngine from '../components/analytics/ScientificInsightsEngine';
import TemporalAnalyticsWorkspace from '../components/analytics/TemporalAnalyticsWorkspace';
import SpatialAnalyticsMap from '../components/analytics/SpatialAnalyticsMap';
import FRPAnalyticsWorkspace from '../components/analytics/FRPAnalyticsWorkspace';
import SensorPerformanceWorkspace from '../components/analytics/SensorPerformanceWorkspace';
import CorrelationAnalyticsWorkspace from '../components/analytics/CorrelationAnalyticsWorkspace';
import RegionalAnalyticsWorkspace from '../components/analytics/RegionalAnalyticsWorkspace';
import AnalyticsExportModal from '../components/analytics/AnalyticsExportModal';
import {
  MOCK_OBSERVATIONS,
  runSpatialMatchingEngine,
  getUniqueCountries,
  mergeObservationsWithBaseline,
} from '../data/mock/fireData';
import { observationService } from '../services/api';
import type { ConfidenceLevel, MatchingEngineParams, FireObservation } from '../types';
import {
  BarChart3,
  TrendingUp,
  Globe,
  Activity,
  Layers,
  ScatterChart,
  Compass,
} from 'lucide-react';

export default function Analytics() {
  const navigate = useNavigate();

  // Filter States
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<'ALL' | 'MODIS' | 'VIIRS'>('ALL');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel[]>([
    'high',
    'nominal',
    'low',
  ]);
  const [selectedContinent, setSelectedContinent] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [minFrp, setMinFrp] = useState<number>(0);
  const [maxFrp, setMaxFrp] = useState<number>(500);

  // UI Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Section Refs for in-page smooth navigation
  const temporalRef = useRef<HTMLDivElement>(null);
  const spatialRef = useRef<HTMLDivElement>(null);
  const frpRef = useRef<HTMLDivElement>(null);
  const sensorRef = useRef<HTMLDivElement>(null);
  const correlationRef = useRef<HTMLDivElement>(null);
  const regionalRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Master Observation Dataset (Live Backend with seamless mock fallback)
  const [allObservations, setAllObservations] = useState<FireObservation[]>(MOCK_OBSERVATIONS);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    observationService
      .getObservations({ limit: 1000 }, controller.signal)
      .then((result) => {
        if (result && Array.isArray(result.observations) && result.observations.length > 0) {
          const merged = mergeObservationsWithBaseline(result.observations, MOCK_OBSERVATIONS);
          setAllObservations(merged);
          setIsLive(true);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && err.errorCode !== 'REQUEST_ABORTED') {
          console.info('Backend API offline or unreachable, using simulated fallback dataset.');
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Unique country list filtered by continent if set
  const availableCountries = useMemo(() => {
    let list = allObservations;
    if (selectedContinent) {
      list = list.filter((o) => o.continent === selectedContinent);
    }
    return getUniqueCountries(list);
  }, [allObservations, selectedContinent]);

  // Master Filter Pipeline
  const filteredObservations = useMemo(() => {
    return allObservations.filter((obs) => {
      // Date range filter
      if (startDate && (!obs.date || obs.date < startDate)) return false;
      if (endDate && (!obs.date || obs.date > endDate)) return false;

      // Month filter (if set)
      if (selectedMonth !== null) {
        if (!obs.date || typeof obs.date !== 'string') return false;
        const parts = obs.date.split('-');
        if (parts.length >= 2) {
          const mIdx = parseInt(parts[1], 10) - 1;
          if (mIdx !== selectedMonth) return false;
        }
      }

      // Sensor filter
      if (selectedSensor === 'MODIS' && obs.satellite !== 'MODIS') return false;
      if (selectedSensor === 'VIIRS' && obs.satellite !== 'VIIRS') return false;

      // Confidence filter
      if (!selectedConfidence.includes(obs.confidence)) return false;

      // Continent filter
      if (selectedContinent && obs.continent !== selectedContinent) return false;

      // Country filter
      if (selectedCountry && obs.country !== selectedCountry) return false;

      // FRP range filter
      if (obs.frp < minFrp || obs.frp > maxFrp) return false;

      return true;
    });
  }, [
    allObservations,
    startDate,
    endDate,
    selectedMonth,
    selectedSensor,
    selectedConfidence,
    selectedContinent,
    selectedCountry,
    minFrp,
    maxFrp,
  ]);

  // Spatial-Temporal Harmonization Kernel
  const matchingParams: MatchingEngineParams = useMemo(
    () => ({
      spatialToleranceKm: 2.0,
      temporalToleranceMinutes: 90,
      confidenceRequirement: 'any',
    }),
    []
  );

  const matchingResults = useMemo(() => {
    return runSpatialMatchingEngine(filteredObservations, matchingParams);
  }, [filteredObservations, matchingParams]);

  // Reset Filters Handler
  const handleResetFilters = useCallback(() => {
    setStartDate('2024-01-01');
    setEndDate('2026-12-31');
    setSelectedMonth(null);
    setSelectedSensor('ALL');
    setSelectedConfidence(['high', 'nominal', 'low']);
    setSelectedContinent('');
    setSelectedCountry('');
    setMinFrp(0);
    setMaxFrp(500);
  }, []);

  const handlePrintReport = useCallback(() => {
    window.print();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Module Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md shadow-cyan-dim">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    Advanced Global Fire Analytics
                  </h1>
                  <span className="demo-badge">NASA FIRMS Compliant</span>
                  {isLive ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      ● Live API
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      ● Simulated Data
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-secondary max-w-3xl">
                  Comprehensive empirical analysis environment for global MODIS Terra/Aqua and
                  VIIRS Suomi-NPP/NOAA-20 active fire observation harmonization.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono print:hidden">
            <span className="px-2.5 py-1 rounded-lg bg-navy/80 border border-border/60 text-text-muted">
              Spatial Resolution: <strong className="text-cyan">1 km vs 375 m</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-navy/80 border border-border/60 text-text-muted">
              Spectral Radiance: <strong className="text-amber-400">MIR ~3.9 &mu;m</strong>
            </span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <AnalyticsFilterBar
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedSensor={selectedSensor}
          onSensorChange={setSelectedSensor}
          selectedConfidence={selectedConfidence}
          onConfidenceChange={setSelectedConfidence}
          selectedContinent={selectedContinent}
          onContinentChange={setSelectedContinent}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          availableCountries={availableCountries}
          minFrp={minFrp}
          maxFrp={maxFrp}
          onFrpRangeChange={(min, max) => {
            setMinFrp(min);
            setMaxFrp(max);
          }}
          onReset={handleResetFilters}
          onOpenExport={() => setIsExportModalOpen(true)}
          onPrintReport={handlePrintReport}
          filteredCount={filteredObservations.length}
          totalCount={allObservations.length}
        />

        {/* Section Navigation Quick Bar (Sticky Anchor Bar) */}
        <div className="sticky top-16 z-20 py-2.5 px-4 rounded-xl bg-navy/90 border border-border/70 backdrop-blur-md shadow-lg flex items-center justify-between gap-2 overflow-x-auto print:hidden">
          <span className="text-[11px] font-mono uppercase text-text-muted shrink-0 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan" />
            <span>Workspace Jump:</span>
          </span>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => scrollToSection(temporalRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <TrendingUp className="w-3 h-3 text-cyan" />
              <span>Temporal Trends</span>
            </button>
            <button
              onClick={() => scrollToSection(spatialRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Globe className="w-3 h-3 text-cyan" />
              <span>Spatial Map</span>
            </button>
            <button
              onClick={() => scrollToSection(frpRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Activity className="w-3 h-3 text-amber-400" />
              <span>FRP Energetics</span>
            </button>
            <button
              onClick={() => scrollToSection(sensorRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Layers className="w-3 h-3 text-fire" />
              <span>Sensor Benchmarking</span>
            </button>
            <button
              onClick={() => scrollToSection(correlationRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <ScatterChart className="w-3 h-3 text-cyan" />
              <span>Empirical Correlation</span>
            </button>
            <button
              onClick={() => scrollToSection(regionalRef)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-surface-light flex items-center gap-1 transition-colors whitespace-nowrap"
            >
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>Regional Burden</span>
            </button>
          </div>
        </div>

        {/* 1. Global Scientific KPI Cards (7 Metrics) */}
        <AnalyticsKpiCards
          observations={filteredObservations}
          matchedPairs={matchingResults.matchedPairs}
          onNavigateToComparison={() => navigate('/comparison')}
        />

        {/* 2. Automated Scientific Insights Engine */}
        <ScientificInsightsEngine
          observations={filteredObservations}
          matchedPairs={matchingResults.matchedPairs}
        />

        {/* 3. Advanced Temporal Analysis Workspace */}
        <div ref={temporalRef}>
          <TemporalAnalyticsWorkspace observations={filteredObservations} />
        </div>

        {/* 4. Spatial Analytics & Global Density Map */}
        <div ref={spatialRef}>
          <SpatialAnalyticsMap
            observations={filteredObservations}
            matchedPairs={matchingResults.matchedPairs}
          />
        </div>

        {/* 5. Fire Radiative Power (FRP) Energetics Workspace */}
        <div ref={frpRef}>
          <FRPAnalyticsWorkspace observations={filteredObservations} />
        </div>

        {/* 6. Sensor Performance Comparison Workspace */}
        <div ref={sensorRef}>
          <SensorPerformanceWorkspace observations={filteredObservations} />
        </div>

        {/* 7. Empirical Correlation & Covariance Workspace */}
        <div ref={correlationRef}>
          <CorrelationAnalyticsWorkspace
            matchedPairs={matchingResults.matchedPairs}
          />
        </div>

        {/* 8. Regional Biome Burden & National Aggregations */}
        <div ref={regionalRef}>
          <RegionalAnalyticsWorkspace
            observations={filteredObservations}
            selectedCountry={selectedCountry}
            onSelectCountry={setSelectedCountry}
          />
        </div>

        {/* Export Data Modal */}
        <AnalyticsExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filteredObservations={filteredObservations}
          matchedPairs={matchingResults.matchedPairs}
          onPrintReport={handlePrintReport}
        />
      </div>
    </AppLayout>
  );
}
