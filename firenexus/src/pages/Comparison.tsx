import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCompareArrows, Globe2,
} from 'lucide-react';
import type { FilterState, MatchingEngineParams, FireObservation, MatchedFirePair } from '../types';
import { DEFAULT_FILTERS } from '../types';
import {
  MOCK_OBSERVATIONS,
  filterObservations,
  runSpatialMatchingEngine,
  getUniqueCountries,
  getUniqueContinents,
  mergeObservationsWithBaseline,
} from '../data/mock/fireData';
import { observationService, harmonizationService } from '../services/api';

import AppLayout from '../components/layout/AppLayout';
import SensorOverview from '../components/comparison/SensorOverview';
import SideBySideSummary from '../components/comparison/SideBySideSummary';
import ComparisonFilterBar from '../components/comparison/ComparisonFilterBar';
import ComparisonMap from '../components/comparison/ComparisonMap';
import SpatialMatchingEngine from '../components/comparison/SpatialMatchingEngine';
import TemporalComparison from '../components/comparison/TemporalComparison';
import FRPComparison from '../components/comparison/FRPComparison';
import ResolutionComparison from '../components/comparison/ResolutionComparison';
import HarmonizationInsights from '../components/comparison/HarmonizationInsights';
import ComparisonDataTable from '../components/comparison/ComparisonDataTable';

export default function Comparison() {
  const navigate = useNavigate();

  // General Filter State
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS });

  // Spatial-Temporal Matching Parameters
  const [matchingParams, setMatchingParams] = useState<MatchingEngineParams>({
    spatialToleranceKm: 2.0,
    temporalToleranceMinutes: 90,
    confidenceRequirement: 'any',
  });

  // Master Observation Dataset (Live Backend with seamless mock fallback)
  const [allObservations, setAllObservations] = useState<FireObservation[]>(MOCK_OBSERVATIONS);
  const [liveMatches, setLiveMatches] = useState<MatchedFirePair[] | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // 1. Fetch live observations
    observationService
      .getObservations({ limit: 1000 }, controller.signal)
      .then((result) => {
        if (result && Array.isArray(result.observations)) {
          const merged = mergeObservationsWithBaseline(result.observations, MOCK_OBSERVATIONS);
          setAllObservations(merged);
          setIsLive(true);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && err.errorCode !== 'REQUEST_ABORTED') {
          console.info('Backend observation API offline or unreachable, using fallback dataset.');
        }
      });

    // 2. Fetch live harmonization matches
    harmonizationService
      .getMatches({ limit: 500 }, controller.signal)
      .then((result) => {
        if (result && Array.isArray(result.matches)) {
          setLiveMatches(result.matches);
          setIsLive(true);
        }
      })
      .catch(() => {
        // Fallback to client-side spatial matching engine
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Filter observations dynamically
  const filteredData = useMemo(
    () => filterObservations(allObservations, filters),
    [allObservations, filters],
  );

  // Execute mathematical spatial matching engine (with live matches integration if present)
  const matchingResults = useMemo(() => {
    if (liveMatches && liveMatches.length > 0) {
      const totalModis = filteredData.filter((o) => o.satellite === 'MODIS').length;
      const totalViirs = filteredData.filter((o) => o.satellite === 'VIIRS').length;
      const matchCount = liveMatches.length;
      const matchRatePct = totalModis > 0 ? (matchCount / totalModis) * 100 : 0;
      const meanDist =
        liveMatches.reduce((acc, m) => acc + m.distanceKm, 0) / (matchCount || 1);
      const meanTime =
        liveMatches.reduce((acc, m) => acc + m.timeDiffMinutes, 0) / (matchCount || 1);
      const meanBias =
        liveMatches.reduce((acc, m) => acc + m.frpDiff, 0) / (matchCount || 1);

      return {
        matchedPairs: liveMatches,
        modisOnly: filteredData.filter(
          (o) => o.satellite === 'MODIS' && !liveMatches.some((m) => m.modis.id === o.id),
        ),
        viirsOnly: filteredData.filter(
          (o) => o.satellite === 'VIIRS' && !liveMatches.some((m) => m.viirs.id === o.id),
        ),
        totalModis,
        totalViirs,
        matchRatePct: Number(matchRatePct.toFixed(1)),
        unmatchedRatePct: Number(Math.max(0, 100 - matchRatePct).toFixed(1)),
        meanDistanceKm: Number(meanDist.toFixed(2)),
        meanTimeDiffMin: Number(meanTime.toFixed(1)),
        meanFrpBias: Number(meanBias.toFixed(1)),
      };
    }
    return runSpatialMatchingEngine(filteredData, matchingParams);
  }, [filteredData, matchingParams, liveMatches]);

  const countries = useMemo(() => getUniqueCountries(allObservations), [allObservations]);
  const continents = useMemo(() => getUniqueContinents(allObservations), [allObservations]);

  const handleSelectDatePreset = useCallback((start: string, end: string) => {
    setFilters((prev) => ({
      ...prev,
      dateRange: { start, end },
    }));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* 1. Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-cyan/15 border border-cyan/30 text-cyan">
                <GitCompareArrows className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    MODIS vs VIIRS Satellite Comparison &amp; Harmonization
                  </h1>
                  <span className="demo-badge text-xs">Research Platform</span>
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
                <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-4xl">
                  Cross-sensor active fire inter-comparison, spatial-temporal bipartite candidate association, resolution scaling, and energy calibration
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/explorer')}
              className="btn-primary text-xs sm:text-sm py-2 px-4 flex items-center gap-2 shadow-lg shadow-cyan-dim"
              title="Launch interactive 3D WebGL Earth Globe"
            >
              <Globe2 className="w-4 h-4" />
              <span>Launch 3D Explorer</span>
            </button>
          </div>
        </div>

        {/* 2. Interactive Filter Bar */}
        <ComparisonFilterBar
          filters={filters}
          onChangeFilters={setFilters}
          matchingParams={matchingParams}
          onChangeMatchingParams={setMatchingParams}
          countries={countries}
          continents={continents}
          matchedCount={matchingResults.matchedPairs.length}
          totalCount={filteredData.length}
        />

        {/* 3. Sensor Overview (Terra/Aqua MODIS vs SNPP/NOAA-20 VIIRS) */}
        <SensorOverview />

        {/* 4. Side-by-Side Sensor Inter-Comparison Metrics */}
        <SideBySideSummary observations={filteredData} />

        {/* 5. Interactive Geographical Comparison Map */}
        <ComparisonMap
          observations={filteredData}
          matchedPairs={matchingResults.matchedPairs}
        />

        {/* 6. Spatial-Temporal Matching Engine */}
        <SpatialMatchingEngine
          params={matchingParams}
          onChangeParams={setMatchingParams}
          results={matchingResults}
        />

        {/* 7. Temporal Comparison (Monthly, Daily, Diurnal Timing, Seasonal) */}
        <TemporalComparison
          observations={filteredData}
          onSelectDatePreset={handleSelectDatePreset}
        />

        {/* 8. Fire Radiative Power (FRP) Inter-Comparison & Scatter Correlation */}
        <FRPComparison
          observations={filteredData}
          matchedPairs={matchingResults.matchedPairs}
        />

        {/* 9. Spatial Resolution & Footprint Scale Graphic */}
        <ResolutionComparison />

        {/* 10. Harmonization Insights & Processing Pipeline */}
        <HarmonizationInsights results={matchingResults} />

        {/* 11. Comparison Data Table */}
        <ComparisonDataTable matchedPairs={matchingResults.matchedPairs} />
      </div>
    </AppLayout>
  );
}