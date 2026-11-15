import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import DataOverviewBar from '../components/data/DataOverviewBar';
import DataSearchAndFilters, {
  type DataExplorerFilterState,
} from '../components/data/DataSearchAndFilters';
import { DataVisualizationsSuite } from '../components/data/DataVisualizationsSuite';
import DataTableView from '../components/data/DataTableView';
import GeospatialRecordMap from '../components/data/GeospatialRecordMap';
import ObservationDetailDrawer from '../components/data/ObservationDetailDrawer';
import DataInspectionTools from '../components/data/DataInspectionTools';
import DataExportModal from '../components/data/DataExportModal';
import DatasetInfoSection from '../components/data/DatasetInfoSection';
import {
  MOCK_OBSERVATIONS,
  getUniqueCountries,
  getUniqueContinents,
  mergeObservationsWithBaseline,
} from '../data/mock/fireData';
import { getObservationDayNight } from '../utils/dataExplorerUtils';
import type { FireObservation } from '../types';
import { observationService, type BackendObservationSummary } from '../services/api';
import { Database, Download, Flame, Zap, Calendar } from 'lucide-react';

const INITIAL_FILTERS: DataExplorerFilterState = {
  searchQuery: '',
  satellite: 'ALL',
  confidence: ['high', 'nominal', 'low'],
  startDate: '2024-01-01',
  endDate: '2026-12-31',
  month: null,
  dayNight: 'ALL',
  continent: '',
  country: '',
  minFrp: 0,
  maxFrp: 500,
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
};

export default function DataExplorer() {
  const navigate = useNavigate();

  // Master Filter State
  const [filters, setFilters] = useState<DataExplorerFilterState>({ ...INITIAL_FILTERS });

  // Selected Observation for detailed inspection drawer
  const [selectedObs, setSelectedObs] = useState<FireObservation | null>(null);

  // Staged multi-record selection IDs (Set)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // UI Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  // Available countries
  const availableCountries = useMemo(() => {
    let list = allObservations;
    if (filters.continent) {
      list = list.filter((o) => o.continent === filters.continent);
    }
    return getUniqueCountries(list);
  }, [allObservations, filters.continent]);

  const allContinents = useMemo(() => getUniqueContinents(allObservations), [allObservations]);

  // Filter pipeline
  const filteredObservations = useMemo(() => {
    return allObservations.filter((obs) => {
      // 1. Satellite filter
      if (filters.satellite !== 'ALL' && obs.satellite !== filters.satellite) return false;

      // 2. Confidence filter
      if (!filters.confidence.includes(obs.confidence)) return false;

      // 3. Date range filter
      if (filters.startDate && (!obs.date || obs.date < filters.startDate)) return false;
      if (filters.endDate && (!obs.date || obs.date > filters.endDate)) return false;

      // 4. Month filter
      if (filters.month !== null) {
        if (!obs.date || typeof obs.date !== 'string') return false;
        const parts = obs.date.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10) - 1;
          if (m !== filters.month) return false;
        }
      }

      // 5. Day / Night filter
      if (filters.dayNight !== 'ALL') {
        const dn = getObservationDayNight(obs);
        if (dn !== filters.dayNight) return false;
      }

      // 6. Geographic Continent & Country
      if (filters.continent && obs.continent !== filters.continent) return false;
      if (filters.country && obs.country !== filters.country) return false;

      // 7. FRP Range
      if (obs.frp < filters.minFrp || obs.frp > filters.maxFrp) return false;

      // 8. Coordinate Bounding Box
      if (obs.latitude < filters.minLat || obs.latitude > filters.maxLat) return false;
      if (obs.longitude < filters.minLon || obs.longitude > filters.maxLon) return false;

      // 9. Freeform Multi-Attribute Search Query
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const coordsStr = `${obs.latitude.toFixed(2)}, ${obs.longitude.toFixed(2)}`;
        const matches =
          obs.id.toLowerCase().includes(q) ||
          obs.country.toLowerCase().includes(q) ||
          obs.region.toLowerCase().includes(q) ||
          obs.satellite.toLowerCase().includes(q) ||
          (obs.date ? obs.date.toLowerCase().includes(q) : false) ||
          obs.confidence.toLowerCase().includes(q) ||
          coordsStr.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [allObservations, filters]);

  // Satellite breakdown counts for header telemetry
  const totalModisCount = useMemo(
    () => MOCK_OBSERVATIONS.filter((o) => o.satellite === 'MODIS').length,
    []
  );
  const totalViirsCount = useMemo(
    () => MOCK_OBSERVATIONS.filter((o) => o.satellite === 'VIIRS').length,
    []
  );
  const filteredModisCount = useMemo(
    () => filteredObservations.filter((o) => o.satellite === 'MODIS').length,
    [filteredObservations]
  );
  const filteredViirsCount = useMemo(
    () => filteredObservations.filter((o) => o.satellite === 'VIIRS').length,
    [filteredObservations]
  );

  // Selected observations objects
  const selectedObservationsList = useMemo(() => {
    return MOCK_OBSERVATIONS.filter((o) => selectedIds.has(o.id));
  }, [selectedIds]);

  // Handlers
  const handleToggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
  }, []);

  const handleOpenGlobe = useCallback(
    (obs: FireObservation) => {
      navigate('/explorer', {
        state: {
          targetObservation: obs,
          lat: obs.latitude,
          lon: obs.longitude,
        },
      });
    },
    [navigate]
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Module Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md shadow-cyan-dim">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    Global Satellite Data Explorer
                  </h1>
                  <span className="demo-badge">FIRMS Standard V6.1</span>
                  {dataSourceStatus === 'live' && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                      ● Live API ({allObservations.length} loaded{liveSummary ? ` of ${liveSummary.total_observations.toLocaleString()} global` : ''})
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
                <p className="text-xs sm:text-sm text-text-secondary max-w-3xl mt-0.5">
                  Explore, filter, inspect and understand global fire detection observations from MODIS and
                  VIIRS satellite instruments.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 font-semibold transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Center</span>
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

          {/* Header Telemetry Status Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 rounded-xl bg-navy/60 border border-border/70 text-xs">
            {/* Total Available Observations */}
            <div className="flex items-center gap-2 px-2 py-1">
              <Database className="w-3.5 h-3.5 text-cyan shrink-0" />
              <div>
                <span className="text-[10px] text-text-muted block uppercase font-semibold">Total Available</span>
                <span className="font-mono font-bold text-text-primary">
                  {filteredObservations.length !== allObservations.length
                    ? `${filteredObservations.length.toLocaleString()} / ${allObservations.length.toLocaleString()}`
                    : `${allObservations.length.toLocaleString()} Obs`}
                </span>
              </div>
            </div>

            {/* MODIS Records */}
            <div className="flex items-center gap-2 px-2 py-1">
              <Flame className="w-3.5 h-3.5 text-fire shrink-0" />
              <div>
                <span className="text-[10px] text-text-muted block uppercase font-semibold">MODIS Records</span>
                <span className="font-mono font-bold text-fire">
                  {filteredModisCount.toLocaleString()}
                  <span className="text-[10px] text-text-muted font-normal ml-1">({totalModisCount})</span>
                </span>
              </div>
            </div>

            {/* VIIRS Records */}
            <div className="flex items-center gap-2 px-2 py-1">
              <Zap className="w-3.5 h-3.5 text-cyan shrink-0" />
              <div>
                <span className="text-[10px] text-text-muted block uppercase font-semibold">VIIRS Records</span>
                <span className="font-mono font-bold text-cyan">
                  {filteredViirsCount.toLocaleString()}
                  <span className="text-[10px] text-text-muted font-normal ml-1">({totalViirsCount})</span>
                </span>
              </div>
            </div>

            {/* Selected Date Range */}
            <div className="flex items-center gap-2 px-2 py-1">
              <Calendar className="w-3.5 h-3.5 text-text-secondary shrink-0" />
              <div>
                <span className="text-[10px] text-text-muted block uppercase font-semibold">Date Range</span>
                <span className="font-mono font-bold text-text-primary text-[11px] truncate block">
                  {filters.startDate} &rarr; {filters.endDate}
                </span>
              </div>
            </div>

            {/* Data Source Status */}
            <div className="flex items-center gap-2 px-2 py-1 col-span-2 sm:col-span-1">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-[10px] text-text-muted block uppercase font-semibold">Data Source</span>
                <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1">
                  NASA FIRMS NRT
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Top Metrics Overview Bar */}
        <DataOverviewBar
          totalRecords={MOCK_OBSERVATIONS.length}
          filteredRecords={filteredObservations.length}
          observations={filteredObservations}
          totalCountriesCount={availableCountries.length}
          totalContinentsCount={allContinents.length}
        />

        {/* 2. Advanced Search & Expandable Filters */}
        <DataSearchAndFilters
          filters={filters}
          onChangeFilters={setFilters}
          onResetFilters={handleResetFilters}
          availableCountries={availableCountries}
        />

        {/* 3. Reactive Data Visualizations Suite (6 Interactive Scientific Charts) */}
        <DataVisualizationsSuite observations={filteredObservations} />

        {/* 4. Synchronized Geospatial Record Map */}
        <GeospatialRecordMap
          observations={filteredObservations}
          selectedObservation={selectedObs}
          onSelectObservation={setSelectedObs}
          onOpenGlobe={handleOpenGlobe}
        />

        {/* 5. Professional Interactive Data Table */}
        <DataTableView
          observations={filteredObservations}
          selectedObsId={selectedObs?.id ?? null}
          onSelectObservation={setSelectedObs}
          onOpenGlobe={handleOpenGlobe}
          selectedIds={selectedIds}
          onToggleSelectId={handleToggleSelectId}
          onSelectAllVisible={handleSelectAllVisible}
          onClearSelection={handleClearSelection}
          onOpenExportSelected={() => setIsExportModalOpen(true)}
          onOpenCompareSelected={() => {
            // Scroll to comparison section
            const el = document.getElementById('inspection-tools-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 6. Data Inspection Tools (Comparison, Duplicates, Quality Audit, Schema) */}
        <div id="inspection-tools-section">
          <DataInspectionTools
            observations={filteredObservations}
            selectedObservations={selectedObservationsList}
            onSelectObservation={setSelectedObs}
          />
        </div>

        {/* 7. Scientific Data Provenance & Specifications */}
        <DatasetInfoSection />

        {/* Observation Detail Inspection Drawer */}
        <ObservationDetailDrawer
          observation={selectedObs}
          allObservations={MOCK_OBSERVATIONS}
          onClose={() => setSelectedObs(null)}
          onOpenGlobe={handleOpenGlobe}
          onSelectRelatedObs={setSelectedObs}
        />

        {/* Data Export Center Modal */}
        <DataExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          filteredObservations={filteredObservations}
          selectedObservations={selectedObservationsList}
        />
      </div>
    </AppLayout>
  );
}
