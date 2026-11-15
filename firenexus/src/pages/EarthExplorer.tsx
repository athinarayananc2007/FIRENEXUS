import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import GlobeView from '../components/explorer/GlobeView';
import MapView2D from '../components/explorer/MapView2D';
import ExplorerSidebar from '../components/explorer/ExplorerSidebar';
import ObservationPanel from '../components/explorer/ObservationPanel';
import AdvancedTimeline from '../components/explorer/AdvancedTimeline';
import CoordinateDisplay from '../components/explorer/CoordinateDisplay';
import { MOCK_OBSERVATIONS, mergeObservationsWithBaseline } from '../data/mock/fireData';
import { observationService } from '../services/api';
import type { FireObservation, ConfidenceLevel } from '../types';

export default function EarthExplorer() {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'globe' | 'map'>('globe');
  const [showMODIS, setShowMODIS] = useState(true);
  const [showVIIRS, setShowVIIRS] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel[]>([
    'high',
    'nominal',
    'low',
  ]);
  const [minFrp, setMinFrp] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = full year
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const stateObs = (location.state as any)?.targetObservation as FireObservation | undefined;
  const [prevLocationKey, setPrevLocationKey] = useState(location.key);
  const [selectedObs, setSelectedObs] = useState<FireObservation | null>(() => stateObs ?? null);
  const [targetLocation, setTargetLocation] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(() => stateObs ? { lat: stateObs.latitude, lon: stateObs.longitude, name: stateObs.id } : null);

  if (prevLocationKey !== location.key) {
    setPrevLocationKey(location.key);
    if (stateObs) {
      setSelectedObs(stateObs);
      setTargetLocation({ lat: stateObs.latitude, lon: stateObs.longitude, name: stateObs.id });
    }
  }
  const [coords, setCoords] = useState<{ lat: number | null; lon: number | null }>({
    lat: null,
    lon: null,
  });

  const [layerSettings, setLayerSettings] = useState({
    showHeatmap: false,
    sizeByFrp: true,
    showAtmosphere: true,
  });

  const handleToggleLayerSetting = useCallback((key: 'showHeatmap' | 'sizeByFrp' | 'showAtmosphere') => {
    setLayerSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleToggleConfidence = useCallback((level: ConfidenceLevel) => {
    setConfidenceFilter((prev) => {
      if (prev.includes(level)) {
        // Prevent deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== level);
      }
      return [...prev, level];
    });
  }, []);

  const handleHoverCoordinates = useCallback((lat: number | null, lon: number | null) => {
    setCoords({ lat, lon });
  }, []);

  // Master Observation Dataset (Live Backend with seamless mock fallback)
  const [allObservations, setAllObservations] = useState<FireObservation[]>(MOCK_OBSERVATIONS);
  const [, setIsLive] = useState(false);

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

  // Compute monthly activity distribution for the scrub bar
  const monthlyCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    allObservations.forEach((obs) => {
      if (obs?.date && typeof obs.date === 'string' && obs.date.includes('-')) {
        const parts = obs.date.split('-');
        if (parts.length >= 2) {
          const obsYear = parseInt(parts[0], 10);
          if (obsYear === selectedYear) {
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              counts[mIdx] += 1;
            }
          }
        }
      }
    });
    // Fallback across all observations if the selected year has no data
    if (counts.every((c) => c === 0)) {
      allObservations.forEach((obs) => {
        if (obs?.date && typeof obs.date === 'string' && obs.date.includes('-')) {
          const parts = obs.date.split('-');
          if (parts.length >= 2) {
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) {
              counts[mIdx] += 1;
            }
          }
        }
      });
    }
    return counts;
  }, [allObservations, selectedYear]);

  // Filter observations based on all active parameters
  const filteredObservations = useMemo(() => {
    return allObservations.filter((obs) => {
      if (obs.satellite === 'MODIS' && !showMODIS) return false;
      if (obs.satellite === 'VIIRS' && !showVIIRS) return false;
      if (!confidenceFilter.includes(obs.confidence)) return false;
      if (obs.frp < minFrp) return false;

      // Temporal month filter (if specific month is selected)
      if (selectedMonth !== null) {
        if (!obs.date || typeof obs.date !== 'string') return false;
        const parts = obs.date.split('-');
        if (parts.length < 2) return false;
        const obsMonth = parseInt(parts[1], 10) - 1;
        if (obsMonth !== selectedMonth) return false;
      }

      return true;
    });
  }, [allObservations, showMODIS, showVIIRS, confidenceFilter, minFrp, selectedMonth]);

  // Dynamic telemetry counts matching current state
  const counts = useMemo(() => {
    let modis = 0;
    let viirs = 0;
    let high = 0;
    let nominal = 0;
    let low = 0;

    filteredObservations.forEach((obs) => {
      if (obs.satellite === 'MODIS') modis += 1;
      else viirs += 1;

      if (obs.confidence === 'high') high += 1;
      else if (obs.confidence === 'nominal') nominal += 1;
      else low += 1;
    });

    return {
      total: filteredObservations.length,
      modis,
      viirs,
      high,
      nominal,
      low,
    };
  }, [filteredObservations]);

  // Stepping through observations in telemetry panel
  const handleObservationNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (filteredObservations.length === 0) return;
      const currentIndex = selectedObs
        ? filteredObservations.findIndex((o) => o.id === selectedObs.id)
        : -1;

      let nextIndex = 0;
      if (direction === 'next') {
        nextIndex = currentIndex >= filteredObservations.length - 1 ? 0 : currentIndex + 1;
      } else {
        nextIndex = currentIndex <= 0 ? filteredObservations.length - 1 : currentIndex - 1;
      }

      setSelectedObs(filteredObservations[nextIndex]);
    },
    [filteredObservations, selectedObs],
  );

  const selectedObservationIndex = useMemo(() => {
    if (!selectedObs) return 0;
    const idx = filteredObservations.findIndex((o) => o.id === selectedObs.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [filteredObservations, selectedObs]);

  return (
    <AppLayout>
      <div className="flex flex-col w-full h-[calc(100vh-3.5rem)] bg-transparent overflow-hidden">
        {/* 1. Main Geospatial Exploration Area — Centered Globe & Responsive Viewport */}
        <div className="relative flex-1 w-full min-h-0 overflow-hidden flex items-center justify-center">
          {viewMode === 'globe' ? (
            <GlobeView
              observations={filteredObservations}
              selectedObservation={selectedObs}
              onSelectObservation={setSelectedObs}
              autoRotate={autoRotate}
              onHoverCoordinates={handleHoverCoordinates}
              targetLocation={targetLocation}
              sizeByFrp={layerSettings.sizeByFrp}
              showAtmosphere={layerSettings.showAtmosphere}
            />
          ) : (
            <MapView2D
              observations={filteredObservations}
              selectedObservation={selectedObs}
              onSelectObservation={setSelectedObs}
              onHoverCoordinates={handleHoverCoordinates}
              targetLocation={targetLocation}
              showHeatmap={layerSettings.showHeatmap}
              sizeByFrp={layerSettings.sizeByFrp}
            />
          )}

          {/* Unified, Collapsible Scientific Explorer Sidebar (Overlays within upper area only) */}
          <ExplorerSidebar
            isOpen={sidebarOpen}
            onToggleOpen={() => setSidebarOpen((p) => !p)}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showMODIS={showMODIS}
            showVIIRS={showVIIRS}
            onToggleMODIS={() => setShowMODIS((prev) => !prev)}
            onToggleVIIRS={() => setShowVIIRS((prev) => !prev)}
            confidenceFilter={confidenceFilter}
            onToggleConfidence={handleToggleConfidence}
            minFrp={minFrp}
            onMinFrpChange={setMinFrp}
            autoRotate={autoRotate}
            onToggleAutoRotate={() => setAutoRotate((prev) => !prev)}
            onResetCamera={() => {
              setTargetLocation(null);
            }}
            onSelectLocation={(loc) => {
              setTargetLocation(loc);
            }}
            counts={counts}
            layerSettings={layerSettings}
            onToggleLayerSetting={handleToggleLayerSetting}
          />

          {/* Live Geographic Coordinate Display (Bottom Right of visualization area) */}
          <CoordinateDisplay latitude={coords.lat} longitude={coords.lon} />

          {/* Detailed Observation Telemetry Panel (Slides from Right over visualization area) */}
          <ObservationPanel
            observation={selectedObs}
            onClose={() => setSelectedObs(null)}
            onNavigate={handleObservationNavigate}
            currentIndex={selectedObservationIndex}
            totalCount={filteredObservations.length}
          />
        </div>

        {/* 2. Dedicated Bottom Layout Section for Timeline — Never Covers or Overlaps the 3D Earth */}
        <div className="flex-shrink-0 w-full border-t border-border/80 bg-navy/95 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-2.5 z-20">
          <AdvancedTimeline
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            visibleCount={filteredObservations.length}
            monthlyCounts={monthlyCounts}
          />
        </div>
      </div>
    </AppLayout>
  );
}
