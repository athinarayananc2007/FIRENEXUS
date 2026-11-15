import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, Search, ChevronLeft, ChevronRight,
  Copy, Check, X, Globe2,
} from 'lucide-react';
import type { FireObservation } from '../../types';

interface RecentObservationsProps {
  observations: FireObservation[];
}

type SortKey = 'id' | 'date' | 'time' | 'latitude' | 'longitude' | 'satellite' | 'confidence' | 'frp';
type SortDir = 'asc' | 'desc';

export default function RecentObservations({
  observations,
}: RecentObservationsProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedObs, setSelectedObs] = useState<FireObservation | null>(null);
  const [copied, setCopied] = useState(false);

  // Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(1);
  };

  // Filtered & Sorted observations
  const processedData = useMemo(() => {
    let result = observations;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.region.toLowerCase().includes(q) ||
          o.country.toLowerCase().includes(q) ||
          o.satellite.toLowerCase().includes(q) ||
          (o.date ? o.date.includes(q) : false),
      );
    }

    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av);
      const sb = String(bv);
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [observations, searchTerm, sortKey, sortDir]);

  // Pagination calculation
  const totalItems = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleCopyCoords = (lat: number, lon: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleOpenInGlobe = (obs: FireObservation) => {
    navigate('/explorer', {
      state: { targetLocation: { lat: obs.latitude, lon: obs.longitude, name: `${obs.region}, ${obs.country}` } },
    });
  };

  const columns: { key: SortKey; label: string; align?: 'left' | 'right' }[] = [
    { key: 'id', label: 'Observation ID' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time (UTC)' },
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' },
    { key: 'satellite', label: 'Instrument' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'frp', label: 'FRP (MW)', align: 'right' },
  ];

  return (
    <section className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Recent Fire Observations
            </h2>
            <span className="demo-badge text-[10px]">Real-Time Feed</span>
          </div>
          <p className="text-xs text-text-secondary">
            Verified thermal anomalies recorded during polar-orbiting satellite overpasses
          </p>
        </div>

        {/* Search & Page Size */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by ID, country, sensor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs py-1.5 pl-9 pr-3 w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input-field text-xs py-1 px-2"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass border border-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-navy/60 text-text-muted">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`py-3 px-4 font-semibold select-none cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3 text-text-muted" />
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 text-right font-semibold text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((obs) => {
                const isModis = obs.satellite === 'MODIS';
                const isSelected = selectedObs?.id === obs.id;
                return (
                  <tr
                    key={obs.id}
                    onClick={() => setSelectedObs(obs)}
                    className={`border-b border-border/40 hover:bg-surface-light/60 transition-colors cursor-pointer ${isSelected ? 'bg-surface-light border-cyan/40' : ''
                      }`}
                  >
                    {/* ID */}
                    <td className="py-2.5 px-4 font-mono font-bold text-cyan">
                      {obs.id}
                    </td>

                    {/* Date */}
                    <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">
                      {obs.date || 'N/A'}
                    </td>

                    {/* Time */}
                    <td className="py-2.5 px-4 font-mono text-text-muted">
                      {obs.time || 'N/A'}
                    </td>

                    {/* Lat */}
                    <td className="py-2.5 px-4 font-mono text-text-secondary">
                      {obs.latitude.toFixed(4)}°
                    </td>

                    {/* Lon */}
                    <td className="py-2.5 px-4 font-mono text-text-secondary">
                      {obs.longitude.toFixed(4)}°
                    </td>

                    {/* Satellite */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${isModis
                            ? 'text-fire bg-fire/15 border border-fire/30'
                            : 'text-cyan bg-cyan/15 border border-cyan/30'
                          }`}
                      >
                        {obs.satellite}
                      </span>
                    </td>

                    {/* Confidence */}
                    <td className="py-2.5 px-4 capitalize whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${obs.confidence === 'high'
                            ? 'text-emerald-400 bg-emerald-500/15'
                            : obs.confidence === 'nominal'
                              ? 'text-warning bg-warning/15'
                              : 'text-rose-400 bg-rose-500/15'
                          }`}
                      >
                        {obs.confidence}
                      </span>
                    </td>

                    {/* FRP (MW) */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-400">
                      {obs.frp} MW
                    </td>

                    {/* Action Button */}
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenInGlobe(obs)}
                        className="btn-ghost p-1.5 text-cyan hover:text-cyan-light rounded-lg hover:bg-surface"
                        title="Explore on 3D Earth Globe"
                      >
                        <Globe2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-text-muted">
                    No fire observations matching current filters or search term.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-navy/60 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-text-muted">
            Showing <strong className="text-text-primary">{startIndex + 1}</strong> to{' '}
            <strong className="text-text-primary">
              {Math.min(startIndex + pageSize, totalItems)}
            </strong>{' '}
            of <strong className="text-text-primary">{totalItems.toLocaleString()}</strong>{' '}
            observations
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono text-text-secondary">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Observation Telemetry Modal */}
      <AnimatePresence>
        {selectedObs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg glass border border-border/80 rounded-2xl p-6 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedObs(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2.5 rounded-xl border ${selectedObs.satellite === 'MODIS'
                      ? 'bg-fire/20 text-fire border-fire/30'
                      : 'bg-cyan/20 text-cyan border-cyan/30'
                    }`}
                >
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-mono text-text-primary">
                      {selectedObs.id}
                    </h3>
                    <span className="demo-badge text-[10px]">Simulated Data</span>
                  </div>
                  <p className="text-xs text-text-secondary">
                    {selectedObs.region}, {selectedObs.country} ({selectedObs.continent})
                  </p>
                </div>
              </div>

              {/* Detailed Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Geographic Coordinates</span>
                  <div className="flex items-center justify-between font-mono font-bold text-text-primary">
                    <span>
                      {selectedObs.latitude.toFixed(4)}°, {selectedObs.longitude.toFixed(4)}°
                    </span>
                    <button
                      onClick={() => handleCopyCoords(selectedObs.latitude, selectedObs.longitude)}
                      className="text-text-muted hover:text-cyan"
                      title="Copy coordinates"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Satellite Instrument</span>
                  <span
                    className={`font-bold font-mono ${selectedObs.satellite === 'MODIS' ? 'text-fire' : 'text-cyan'
                      }`}
                  >
                    {selectedObs.satellite} ({selectedObs.satellite === 'MODIS' ? '1 km nadir' : '375 m I-band'})
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Overpass Date & Time</span>
                  <span className="font-mono text-text-primary">
                    {selectedObs.date} at {selectedObs.time} UTC
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Detection Confidence</span>
                  <span
                    className={`font-bold capitalize ${selectedObs.confidence === 'high'
                        ? 'text-emerald-400'
                        : selectedObs.confidence === 'nominal'
                          ? 'text-warning'
                          : 'text-rose-400'
                      }`}
                  >
                    {selectedObs.confidence} Confidence
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Fire Radiative Power</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {selectedObs.frp} MW
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface/50 border border-border/60">
                  <span className="text-text-muted block mb-1">Brightness Temperature</span>
                  <span className="font-mono font-bold text-text-primary text-sm">
                    {selectedObs.brightness} K
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleOpenInGlobe(selectedObs);
                  }}
                  className="flex-1 btn-primary py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  <Globe2 className="w-4 h-4" />
                  <span>Explore on 3D Earth Globe</span>
                </button>
                <button
                  onClick={() => setSelectedObs(null)}
                  className="btn-secondary py-2.5 text-xs px-4"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}