import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FireObservation } from '../../types';
import {
  Flame,
  Zap,
  Clock,
  MapPin,
  Globe2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  Download,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface DailyObservationDetailsProps {
  selectedDate: string | null;
  observations: FireObservation[];
  onClearDate: () => void;
}

export const DailyObservationDetails: React.FC<DailyObservationDetailsProps> = ({
  selectedDate,
  observations,
  onClearDate,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sensorFilter, setSensorFilter] = useState<'ALL' | 'MODIS' | 'VIIRS'>('ALL');
  const [sortBy, setSortBy] = useState<'frp_desc' | 'frp_asc' | 'time_asc' | 'time_desc'>('frp_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Formatted date string
  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const dateObj = new Date(`${selectedDate}T00:00:00Z`);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }, [selectedDate]);

  // Day of year calculation
  const dayOfYear = useMemo(() => {
    if (!selectedDate) return 0;
    const dateObj = new Date(`${selectedDate}T00:00:00Z`);
    const start = new Date(dateObj.getFullYear(), 0, 0);
    const diff = dateObj.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }, [selectedDate]);

  // Daily summary metrics
  const stats = useMemo(() => {
    const total = observations.length;
    const modis = observations.filter((o) => o.satellite === 'MODIS').length;
    const viirs = observations.filter((o) => o.satellite === 'VIIRS').length;
    const highConf = observations.filter((o) => o.confidence === 'high').length;
    const meanFrp =
      total > 0
        ? Math.round((observations.reduce((s, o) => s + o.frp, 0) / total) * 10) / 10
        : 0;
    const maxFrp =
      total > 0 ? Math.round(Math.max(...observations.map((o) => o.frp)) * 10) / 10 : 0;

    // Regions summary
    const regionCounts = new Map<string, number>();
    observations.forEach((o) => {
      regionCounts.set(o.region, (regionCounts.get(o.region) || 0) + 1);
    });
    const topRegions = Array.from(regionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([b]) => b);

    return { total, modis, viirs, highConf, meanFrp, maxFrp, topBiomes: topRegions };
  }, [observations]);

  // Filter & sort table rows
  const filteredRows = useMemo(() => {
    let result = [...observations];

    // Sensor filter
    if (sensorFilter !== 'ALL') {
      result = result.filter((o) => o.satellite === sensorFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.country.toLowerCase().includes(q) ||
          o.region.toLowerCase().includes(q) ||
          o.satellite.toLowerCase().includes(q) ||
          `${o.latitude}, ${o.longitude}`.includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'frp_desc') return b.frp - a.frp;
      if (sortBy === 'frp_asc') return a.frp - b.frp;
      if (sortBy === 'time_asc') return (a.time ?? '').localeCompare(b.time ?? '');
      if (sortBy === 'time_desc') return (b.time ?? '').localeCompare(a.time ?? '');
      return 0;
    });

    return result;
  }, [observations, sensorFilter, searchQuery, sortBy]);

  // Reset page when filters change
  const currentFilterKey = `${searchQuery}-${sensorFilter}-${sortBy}-${selectedDate}`;
  const [prevFilterKey, setPrevFilterKey] = useState(currentFilterKey);

  if (prevFilterKey !== currentFilterKey) {
    setPrevFilterKey(currentFilterKey);
    setCurrentPage(1);
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage]);

  // CSV download for the selected day
  const handleDownloadDayCsv = () => {
    if (!selectedDate || observations.length === 0) return;

    const headers = [
      'ObservationID',
      'Satellite',
      'Date',
      'TimeUTC',
      'Latitude',
      'Longitude',
      'FRP_MW',
      'Confidence',
      'BrightnessTemp_K',
      'Country',
      'Region',
      'DataStatus',
    ];

    const rows = observations.map((o) => [
      o.id,
      o.satellite,
      o.date ?? 'N/A',
      o.time ?? 'N/A',
      o.latitude.toFixed(4),
      o.longitude.toFixed(4),
      o.frp.toFixed(1),
      o.confidence,
      o.brightness.toFixed(1),
      `"${o.country}"`,
      `"${o.region}"`,
      o.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `firenexus_observations_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExploreOnGlobe = (obs: FireObservation) => {
    navigate('/explorer', {
      state: {
        targetObservation: obs,
        lat: obs.latitude,
        lon: obs.longitude,
      },
    });
  };

  if (!selectedDate) {
    return (
      <div className="card p-8 bg-surface/90 border-dashed border-border/70 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-navy/80 border border-border/60 mx-auto flex items-center justify-center text-text-muted">
          <Globe2 className="w-6 h-6 text-cyan/70" />
        </div>
        <h3 className="text-base font-bold text-text-primary">No Date Selected</h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          Click on any day within the 12-month annual heatmap above to inspect localized thermal
          anomaly telemetry, sensor verification, and spatial coordinates.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-fire/40 shadow-xl space-y-5 animate-in fade-in duration-300">
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fire animate-pulse" />
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Daily Telemetry: {formattedDate}
            </h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-navy border border-border/60 text-text-muted">
              Day {dayOfYear} of 366
            </span>
          </div>
          <p className="text-xs text-text-secondary">
            Harmonized satellite observation package. All thermal anomaly footprints detected by
            MODIS Terra/Aqua and VIIRS Suomi-NPP/NOAA-20.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadDayCsv}
            disabled={observations.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-navy/90 hover:bg-surface-light text-cyan border border-cyan/40 hover:border-cyan disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Day CSV</span>
          </button>
          <button
            onClick={onClearDate}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary bg-navy/60 hover:bg-navy rounded-lg border border-border/60 transition-colors"
            title="Deselect date"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Daily KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-navy/70 border border-border/50 rounded-lg">
          <div className="text-[10px] text-text-muted font-medium">Total Detections</div>
          <div className="text-lg font-bold font-mono text-text-primary mt-0.5">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-secondary mt-0.5">Active thermal pixels</div>
        </div>

        <div className="p-3 bg-navy/70 border border-fire/30 rounded-lg">
          <div className="text-[10px] text-fire font-medium flex items-center gap-1">
            <Flame className="w-3 h-3" /> MODIS 1km
          </div>
          <div className="text-lg font-bold font-mono text-fire mt-0.5">{stats.modis}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {stats.total > 0 ? Math.round((stats.modis / stats.total) * 100) : 0}% share
          </div>
        </div>

        <div className="p-3 bg-navy/70 border border-cyan/30 rounded-lg">
          <div className="text-[10px] text-cyan font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" /> VIIRS 375m
          </div>
          <div className="text-lg font-bold font-mono text-cyan mt-0.5">{stats.viirs}</div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {stats.total > 0 ? Math.round((stats.viirs / stats.total) * 100) : 0}% share
          </div>
        </div>

        <div className="p-3 bg-navy/70 border border-border/50 rounded-lg">
          <div className="text-[10px] text-text-muted font-medium">Mean Radiative Power</div>
          <div className="text-lg font-bold font-mono text-cyan mt-0.5">{stats.meanFrp} MW</div>
          <div className="text-[10px] text-text-secondary mt-0.5">Peak: {stats.maxFrp} MW</div>
        </div>

        <div className="p-3 bg-navy/70 border border-border/50 rounded-lg">
          <div className="text-[10px] text-text-muted font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-emerald-400" /> High Confidence
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {stats.highConf}
          </div>
          <div className="text-[10px] text-text-secondary mt-0.5">
            {stats.total > 0 ? Math.round((stats.highConf / stats.total) * 100) : 0}% verified
          </div>
        </div>

        <div className="p-3 bg-navy/70 border border-border/50 rounded-lg">
          <div className="text-[10px] text-text-muted font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" /> Primary Biomes
          </div>
          <div className="text-xs font-semibold text-text-primary mt-0.5 truncate">
            {stats.topBiomes.length > 0 ? stats.topBiomes[0] : 'None'}
          </div>
          <div className="text-[10px] text-text-secondary mt-0.5 truncate">
            {stats.topBiomes.slice(1).join(', ') || 'Global'}
          </div>
        </div>
      </div>

      {/* Observation Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, country, biome, coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy/80 text-xs text-text-primary pl-9 pr-3 py-1.5 rounded-lg border border-border/60 focus:border-cyan focus:outline-none placeholder:text-text-muted"
            />
          </div>

          {/* Sub-Sensor Toggle */}
          <div className="flex items-center gap-1 bg-navy/80 p-0.5 rounded-lg border border-border/60 text-xs">
            <button
              onClick={() => setSensorFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                sensorFilter === 'ALL'
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              All Sensors
            </button>
            <button
              onClick={() => setSensorFilter('MODIS')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                sensorFilter === 'MODIS'
                  ? 'bg-fire/20 text-fire'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              MODIS
            </button>
            <button
              onClick={() => setSensorFilter('VIIRS')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                sensorFilter === 'VIIRS'
                  ? 'bg-cyan/20 text-cyan'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              VIIRS
            </button>
          </div>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted text-[11px]">Sort By:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-navy/80 text-text-primary text-xs rounded-lg border border-border/60 px-2.5 py-1 focus:border-cyan focus:outline-none"
          >
            <option value="frp_desc">Highest FRP (MW)</option>
            <option value="frp_asc">Lowest FRP (MW)</option>
            <option value="time_asc">Earliest Time (UTC)</option>
            <option value="time_desc">Latest Time (UTC)</option>
          </select>
        </div>
      </div>

      {/* Observations Table */}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-navy/90 text-text-muted font-mono uppercase text-[10px] tracking-wider border-b border-border/60">
            <tr>
              <th className="px-3.5 py-2.5">Observation ID</th>
              <th className="px-3.5 py-2.5">Sensor</th>
              <th className="px-3.5 py-2.5">Coordinates</th>
              <th className="px-3.5 py-2.5">UTC Time</th>
              <th className="px-3.5 py-2.5">Confidence</th>
              <th className="px-3.5 py-2.5">FRP (MW)</th>
              <th className="px-3.5 py-2.5">Biome / Country</th>
              <th className="px-3.5 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono text-text-secondary">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-text-muted font-sans text-xs">
                  No fire observations match your active search or sensor criteria for this date.
                </td>
              </tr>
            ) : (
              pageRows.map((obs) => {
                const isModis = obs.satellite === 'MODIS';
                return (
                  <tr
                    key={obs.id}
                    className="hover:bg-navy/50 transition-colors group"
                  >
                    <td className="px-3.5 py-2.5 font-bold text-text-primary">
                      {obs.id}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isModis
                            ? 'bg-fire/20 text-fire border border-fire/40'
                            : 'bg-cyan/20 text-cyan border border-cyan/40'
                        }`}
                      >
                        {isModis ? <Flame className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                        {obs.satellite}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-text-muted">
                      {obs.latitude >= 0 ? `${obs.latitude.toFixed(3)}°N` : `${Math.abs(obs.latitude).toFixed(3)}°S`},{' '}
                      {obs.longitude >= 0 ? `${obs.longitude.toFixed(3)}°E` : `${Math.abs(obs.longitude).toFixed(3)}°W`}
                    </td>
                    <td className="px-3.5 py-2.5 flex items-center gap-1 text-text-muted">
                      <Clock className="w-3 h-3 text-cyan/70" />
                      <span>{obs.time || 'N/A'}</span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          obs.confidence === 'high'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : obs.confidence === 'nominal'
                            ? 'bg-cyan/20 text-cyan border border-cyan/30'
                            : 'bg-navy text-text-muted border border-border/40'
                        }`}
                      >
                        {obs.confidence}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-text-primary">
                      <span className="text-cyan font-mono">{obs.frp.toFixed(1)}</span>{' '}
                      <span className="text-[10px] text-text-muted font-normal">MW</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-text-muted font-sans text-xs">
                      <span className="text-text-primary">{obs.country}</span>
                      <span className="text-text-muted text-[10px] block truncate max-w-[140px]">
                        {obs.region}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-sans">
                      <button
                        onClick={() => handleExploreOnGlobe(obs)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-navy/80 hover:bg-cyan/20 text-cyan hover:text-cyan-bright border border-cyan/30 hover:border-cyan transition-colors"
                        title="Open this observation on the 3D Earth Globe"
                      >
                        <Globe2 className="w-3 h-3" />
                        <span>Globe</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
        <span className="text-text-muted">
          Showing <span className="text-text-primary font-mono">{filteredRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="text-text-primary font-mono">{Math.min(currentPage * pageSize, filteredRows.length)}</span> of{' '}
          <span className="text-cyan font-mono font-bold">{filteredRows.length}</span> daily detections
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-2.5 py-1 bg-navy/80 border border-border/60 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-muted transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>
          <span className="text-text-secondary font-mono px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="flex items-center gap-1 px-2.5 py-1 bg-navy/80 border border-border/60 rounded text-text-muted hover:text-text-primary disabled:opacity-30 disabled:hover:text-text-muted transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyObservationDetails;
