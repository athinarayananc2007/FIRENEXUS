import { useState, useMemo, useCallback, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import CalendarFilterBar from '../components/calendar/CalendarFilterBar';
import AnnualHeatmapCalendar from '../components/calendar/AnnualHeatmapCalendar';
import DailyObservationDetails from '../components/calendar/DailyObservationDetails';
import MonthlyActivitySection from '../components/calendar/MonthlyActivitySection';
import DailyTimelineChart from '../components/calendar/DailyTimelineChart';
import SeasonalAnalysis from '../components/calendar/SeasonalAnalysis';
import HistoricalYearComparison from '../components/calendar/HistoricalYearComparison';
import CalendarExportModal from '../components/calendar/CalendarExportModal';
import { MOCK_OBSERVATIONS, computeEnrichedCalendarMap, mergeObservationsWithBaseline } from '../data/mock/fireData';
import { observationService } from '../services/api';
import type { FireObservation } from '../types';
import { Calendar as CalendarIcon, Sparkles, Layers } from 'lucide-react';

export default function FireCalendar() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>('2024-08-15');
  const [selectedSensor, setSelectedSensor] = useState<'ALL' | 'MODIS' | 'VIIRS'>('ALL');
  const [selectedContinent, setSelectedContinent] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [minFrp, setMinFrp] = useState<number>(0);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  // Extract unique sorted list of available countries from dataset
  const availableCountries = useMemo(() => {
    let source = allObservations;
    if (selectedContinent) {
      source = source.filter((o) => o.continent === selectedContinent);
    }
    const set = new Set<string>();
    source.forEach((o) => {
      if (o.country) set.add(o.country);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allObservations, selectedContinent]);

  // Comprehensive observation filtering
  const filteredObservations = useMemo(() => {
    return allObservations.filter((obs) => {
      // Sensor filter
      if (selectedSensor === 'MODIS' && obs.satellite !== 'MODIS') return false;
      if (selectedSensor === 'VIIRS' && obs.satellite !== 'VIIRS') return false;

      // Continent filter
      if (selectedContinent && obs.continent !== selectedContinent) return false;

      // Country filter
      if (selectedCountry && obs.country !== selectedCountry) return false;

      // Min FRP filter
      if (minFrp > 0 && obs.frp < minFrp) return false;

      return true;
    });
  }, [allObservations, selectedSensor, selectedContinent, selectedCountry, minFrp]);

  // Precompute enriched calendar map for the heatmap
  const enrichedMap = useMemo(() => {
    return computeEnrichedCalendarMap(filteredObservations);
  }, [filteredObservations]);

  // Observations specifically for the selected date
  const selectedDateObservations = useMemo(() => {
    if (!selectedDate) return [];
    return filteredObservations.filter((obs) => obs.date === selectedDate);
  }, [selectedDate, filteredObservations]);

  // Year Change handler with auto-selected date
  const handleYearChange = useCallback((newYear: number) => {
    setSelectedYear(newYear);
    const datesInYear = allObservations
      .map((o) => o.date)
      .filter((d): d is string => typeof d === 'string' && d.startsWith(`${newYear}-`))
      .sort();
    if (datesInYear.length > 0) {
      setSelectedDate(datesInYear[0]);
    } else {
      setSelectedDate(`${newYear}-08-15`);
    }
  }, [allObservations]);

  // Reset filters
  const handleResetFilters = useCallback(() => {
    const defaultYear = 2024;
    setSelectedYear(defaultYear);
    setSelectedMonth(null);
    setSelectedSensor('ALL');
    setSelectedContinent('');
    setSelectedCountry('');
    setMinFrp(0);
    const datesInYear = allObservations
      .map((o) => o.date)
      .filter((d): d is string => typeof d === 'string' && d.startsWith(`${defaultYear}-`))
      .sort();
    setSelectedDate(datesInYear.length > 0 ? datesInYear[0] : `${defaultYear}-08-15`);
  }, [allObservations]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Module Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-fire/20 border border-fire/40 flex items-center justify-center text-fire shadow-md shadow-fire/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    Global Fire Activity Calendar
                  </h1>
                  <span className="demo-badge">Multi-Sensor Matrix</span>
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
                  Multi-sensor temporal matrix harmonizing MODIS Terra/Aqua and VIIRS Suomi-NPP/NOAA-20
                  active fire anomaly records across all 366 days.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Capability Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy/80 border border-border/60 text-text-muted">
              <Layers className="w-3.5 h-3.5 text-cyan" />
              <span>Dual-Sensor Harmonized</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-navy/80 border border-border/60 text-text-muted">
              <Sparkles className="w-3.5 h-3.5 text-fire" />
              <span>5-Tier Intensity Scale</span>
            </span>
          </div>
        </div>

        {/* Global Filter Bar */}
        <CalendarFilterBar
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          selectedSensor={selectedSensor}
          onSensorChange={setSelectedSensor}
          selectedContinent={selectedContinent}
          onContinentChange={setSelectedContinent}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          availableCountries={availableCountries}
          minFrp={minFrp}
          onMinFrpChange={setMinFrp}
          onReset={handleResetFilters}
          onOpenExport={() => setIsExportModalOpen(true)}
          totalFilteredCount={filteredObservations.length}
          totalUnfilteredCount={MOCK_OBSERVATIONS.length}
        />

        {/* Section 1: Annual 12-Month Heatmap Calendar */}
        <AnnualHeatmapCalendar
          year={selectedYear}
          enrichedMap={enrichedMap}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          selectedSensor={selectedSensor}
        />

        {/* Section 2: Selected Day Telemetry Details Drawer */}
        <DailyObservationDetails
          selectedDate={selectedDate}
          observations={selectedDateObservations}
          onClearDate={() => setSelectedDate(null)}
        />

        {/* Section 3: Monthly Fire Dynamics & Phenology */}
        <MonthlyActivitySection
          observations={filteredObservations}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />

        {/* Section 4: Continuous Temporal Timeline Chart */}
        <DailyTimelineChart
          observations={filteredObservations}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Section 5: Seasonal Phenology & Hemispheric Regimes */}
        <SeasonalAnalysis observations={filteredObservations} />

        {/* Section 6: Historical Multi-Year Comparison */}
        <HistoricalYearComparison
          observations={filteredObservations}
          selectedYear={selectedYear}
          onSelectYear={setSelectedYear}
        />

        {/* Export Data Modal */}
        <CalendarExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          selectedYear={selectedYear}
          selectedDate={selectedDate}
          dailyObservations={selectedDateObservations}
          enrichedMap={enrichedMap}
          allObservations={filteredObservations}
        />
      </div>
    </AppLayout>
  );
}
