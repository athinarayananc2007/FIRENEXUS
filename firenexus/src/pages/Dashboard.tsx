import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe2, Download, BarChart2, Database,
} from 'lucide-react';
import type { FilterState, ConfidenceLevel, FireObservation } from '../types';
import { DEFAULT_FILTERS } from '../types';
import {
  MOCK_OBSERVATIONS,
  filterObservations,
  computeKpiMetrics,
  getUniqueCountries,
  getUniqueContinents,
  mergeObservationsWithBaseline,
} from '../data/mock/fireData';
import { observationService, type BackendObservationSummary } from '../services/api';

import AppLayout from '../components/layout/AppLayout';
import StatsCards from '../components/dashboard/StatsCards';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import HotspotMap from '../components/dashboard/HotspotMap';
import TemporalAnalytics from '../components/dashboard/TemporalAnalytics';
import SatelliteComparison from '../components/dashboard/SatelliteComparison';
import RegionalIntelligence from '../components/dashboard/RegionalIntelligence';
import IntensityAnalytics from '../components/dashboard/IntensityAnalytics';
import ConfidenceAnalytics from '../components/dashboard/ConfidenceAnalytics';
import RecentObservations from '../components/dashboard/RecentObservations';
import ExportCenterModal from '../components/dashboard/ExportCenterModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Master Observation Dataset (Live Backend with seamless mock fallback)
  const [allObservations, setAllObservations] = useState<FireObservation[]>(MOCK_OBSERVATIONS);
  const [liveSummary, setLiveSummary] = useState<BackendObservationSummary | null>(null);
  const [dataSourceStatus, setDataSourceStatus] = useState<'live' | 'live_empty' | 'fallback'>('fallback');

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      observationService.getObservations({ limit: 1000 }, controller.signal),
      observationService.getSummary({}, controller.signal).catch(() => null),
    ])
      .then(([obsResult, summaryResult]) => {
        if (obsResult && Array.isArray(obsResult.observations) && obsResult.observations.length > 0) {
          const merged = mergeObservationsWithBaseline(obsResult.observations, MOCK_OBSERVATIONS);
          setAllObservations(merged);
          setDataSourceStatus('live');
        }
        if (summaryResult) {
          setLiveSummary(summaryResult);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && err.errorCode !== 'REQUEST_ABORTED') {
          console.info('Backend API offline or unreachable, using simulated fallback dataset.');
          setDataSourceStatus('fallback');
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Dynamic filter application across observations
  const filteredData = useMemo(
    () => filterObservations(allObservations, filters),
    [allObservations, filters],
  );

  // Centralized KPI calculation across active filtered cohort
  const metrics = useMemo(() => {
    return computeKpiMetrics(filteredData);
  }, [filteredData]);

  // Unique country & continent lists for filter selectors
  const countries = useMemo(
    () => getUniqueCountries(allObservations),
    [allObservations],
  );
  const continents = useMemo(
    () => getUniqueContinents(allObservations),
    [allObservations],
  );

  // Cross-component filter handlers
  const handleSelectDatePreset = useCallback((start: string, end: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start, end },
    }));
  }, []);

  const handleFilterCountry = useCallback((country: string) => {
    setFilters((prev) => ({
      ...prev,
      country: prev.country === country ? '' : country,
    }));
  }, []);

  const handleFilterContinent = useCallback((continent: string) => {
    setFilters((prev) => ({
      ...prev,
      continent: prev.continent === continent ? '' : continent,
    }));
  }, []);

  const handleFilterConfidence = useCallback((conf: ConfidenceLevel[]) => {
    setFilters((prev) => ({
      ...prev,
      confidence: conf,
    }));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* 1. Dashboard Executive Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan/15 border border-cyan/30 text-cyan">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    Global Intelligence Dashboard
                  </h1>
                  <span className="demo-badge text-xs">Mission Analytics</span>
                  {dataSourceStatus === 'live' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      ● Live API ({allObservations.length.toLocaleString()} loaded{liveSummary ? ` · ${liveSummary.total_observations.toLocaleString()} live FIRMS` : ''})
                    </span>
                  )}
                  {dataSourceStatus === 'live_empty' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan/15 border border-cyan/30 text-cyan">
                      ● Live API (0 records recorded)
                    </span>
                  )}
                  {dataSourceStatus === 'fallback' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      ● Simulated Fallback Data
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-text-secondary mt-1">
                  Global MODIS &amp; VIIRS active wildfire observation telemetry, radiant power dynamics, and sensor inter-comparison
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsExportOpen(true)}
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5 flex items-center gap-2"
              title="Download CSV, JSON summary, or print briefing"
            >
              <Download className="w-4 h-4 text-cyan" />
              <span>Export &amp; Briefings</span>
            </button>

            <button
              onClick={() => navigate('/explorer')}
              className="btn-primary text-xs sm:text-sm py-2 px-4 flex items-center gap-2 shadow-lg shadow-cyan-dim"
              title="Open full interactive 3D WebGL Earth Explorer"
            >
              <Globe2 className="w-4 h-4" />
              <span>Launch 3D Explorer</span>
            </button>
          </div>
        </div>

        {/* Live Empty Data Notice Banner */}
        {dataSourceStatus === 'live_empty' && (
          <div className="glass border-cyan/30 bg-cyan/5 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in">
            <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Live Backend Connected — 0 Active Fire Records</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                The backend API is operational with zero active fire observations currently recorded in the database.
                Trigger an ingestion run via backend CLI to ingest satellite active fire observations.
              </p>
            </div>
          </div>
        )}

        {/* 2. Global Intelligence Filter System */}
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          countries={countries}
          continents={continents}
          onOpenExport={() => setIsExportOpen(true)}
          matchingCount={filteredData.length}
          totalCount={allObservations.length}
        />

        {/* 3. Global KPI Cards (Total Hotspots, MODIS, VIIRS, Average FRP + Sparklines) */}
        <StatsCards metrics={metrics} />

        {/* 4. Global Fire Distribution (Interactive Leaflet Map with Sensor Sizing & 3D Navigation) */}
        <HotspotMap observations={filteredData} />

        {/* 5. Temporal Fire Analytics (Monthly, Daily, Seasonal, and Baseline Trends) */}
        <TemporalAnalytics
          observations={filteredData}
          onSelectDatePreset={handleSelectDatePreset}
          activeFilterRange={filters.dateRange}
        />

        {/* 6. Satellite Sensor Comparison: MODIS vs VIIRS */}
        <SatelliteComparison observations={filteredData} />

        {/* 7. Regional Intelligence (Continental Distribution & Top High-Risk Biomes) */}
        <RegionalIntelligence
          observations={filteredData}
          onFilterCountry={handleFilterCountry}
          onFilterContinent={handleFilterContinent}
        />

        {/* 8. Two-Column Analytical Matrix: Fire Intensity (FRP) & Detection Confidence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IntensityAnalytics observations={filteredData} />
          <ConfidenceAnalytics
            observations={filteredData}
            onFilterConfidence={handleFilterConfidence}
          />
        </div>

        {/* 9. Recent Fire Observations Interactive Data Table */}
        <RecentObservations observations={filteredData} />

        {/* 10. Export & Reports Modal */}
        <ExportCenterModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          filteredObservations={filteredData}
          filters={filters}
          metrics={metrics}
        />
      </div>
    </AppLayout>
  );
}