import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  getObservationDayNight,
} from '../../utils/dataExplorerUtils';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Globe2,
  Flame,
  Zap,
  Sun,
  Moon,
  Columns,
  Download,
  GitCompare,
  CheckSquare,
  Square,
  Search,
  X,
  Thermometer,
} from 'lucide-react';

export type TableSortField =
  | 'id'
  | 'date'
  | 'time'
  | 'latitude'
  | 'longitude'
  | 'satellite'
  | 'confidence'
  | 'brightness'
  | 'frp'
  | 'country'
  | 'region';

interface DataTableViewProps {
  observations: FireObservation[];
  selectedObsId: string | null;
  onSelectObservation: (obs: FireObservation) => void;
  onOpenGlobe: (obs: FireObservation) => void;
  selectedIds: Set<string>;
  onToggleSelectId: (id: string) => void;
  onSelectAllVisible: (ids: string[]) => void;
  onClearSelection: () => void;
  onOpenExportSelected: () => void;
  onOpenCompareSelected: () => void;
}

export const DataTableView: React.FC<DataTableViewProps> = ({
  observations,
  selectedObsId,
  onSelectObservation,
  onOpenGlobe,
  selectedIds,
  onToggleSelectId,
  onSelectAllVisible,
  onClearSelection,
  onOpenExportSelected,
  onOpenCompareSelected,
}) => {
  const [sortField, setSortField] = useState<TableSortField>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [inTableSearch, setInTableSearch] = useState('');

  // Column visibility state (matching all specified scientific columns)
  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    date: true,
    time: true,
    latitude: true,
    longitude: true,
    satellite: true,
    confidence: true,
    brightness: true,
    frp: true,
    dayNight: true,
    region: true,
  });

  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // In-table search filter
  const filteredBySearch = useMemo(() => {
    if (!inTableSearch.trim()) return observations;
    const q = inTableSearch.toLowerCase().trim();
    return observations.filter((o) =>
      o.id.toLowerCase().includes(q) ||
      (o.date ? o.date.includes(q) : false) ||
      (o.time ? o.time.includes(q) : false) ||
      o.satellite.toLowerCase().includes(q) ||
      o.confidence.toLowerCase().includes(q) ||
      o.country.toLowerCase().includes(q) ||
      o.region.toLowerCase().includes(q) ||
      o.latitude.toFixed(3).includes(q) ||
      o.longitude.toFixed(3).includes(q)
    );
  }, [observations, inTableSearch]);

  // Sorting
  const sortedObservations = useMemo(() => {
    return [...filteredBySearch].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredBySearch, sortField, sortAsc]);

  // Reset page when dataset or search changes (React state adjustment during render)
  const [prevDatasetLength, setPrevDatasetLength] = useState(filteredBySearch.length);
  const [prevPageSize, setPrevPageSize] = useState(pageSize);

  if (prevDatasetLength !== filteredBySearch.length || prevPageSize !== pageSize) {
    setPrevDatasetLength(filteredBySearch.length);
    setPrevPageSize(pageSize);
    setCurrentPage(1);
  }

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(sortedObservations.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedObservations.slice(start, start + pageSize);
  }, [sortedObservations, currentPage, pageSize]);

  const handleSort = (field: TableSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const isAllPageSelected =
    pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      onClearSelection();
    } else {
      onSelectAllVisible(pageItems.map((p) => p.id));
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="card p-0 overflow-hidden bg-surface/95 border-border/80 shadow-2xl relative space-y-0">
      {/* Table Toolbar */}
      <div className="p-3.5 sm:p-4 bg-navy/80 border-b border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Quick In-Table Search & Status */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={inTableSearch}
              onChange={(e) => setInTableSearch(e.target.value)}
              placeholder="Quick table search (ID, Country, Sensor, Lat/Lon)..."
              className="w-full pl-9 pr-8 py-1.5 bg-surface text-text-primary rounded-lg border border-border/60 text-xs focus:outline-none focus:border-cyan/50 font-mono"
            />
            {inTableSearch && (
              <button
                onClick={() => setInTableSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <span className="text-[11px] text-text-muted font-mono whitespace-nowrap">
            {sortedObservations.length.toLocaleString()} records
          </span>
        </div>

        {/* Right: Column Visibility, Rows Selector & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Column Visibility Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-surface border border-border/70 text-text-secondary hover:text-text-primary rounded-lg text-xs transition-colors"
            >
              <Columns className="w-3.5 h-3.5 text-cyan" />
              <span>Columns</span>
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 p-2 bg-surface border border-border rounded-xl shadow-2xl z-30 space-y-1 text-xs">
                <div className="text-[10px] font-bold text-text-muted uppercase px-2 py-1 border-b border-border/60 flex justify-between items-center">
                  <span>Toggle Columns</span>
                  <button onClick={() => setIsColumnDropdownOpen(false)} className="hover:text-text-primary">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.id} onChange={() => toggleColumn('id')} />
                  <span>Observation ID</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.date} onChange={() => toggleColumn('date')} />
                  <span>Acquisition Date</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.time} onChange={() => toggleColumn('time')} />
                  <span>Acquisition Time</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.latitude} onChange={() => toggleColumn('latitude')} />
                  <span>Latitude</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.longitude} onChange={() => toggleColumn('longitude')} />
                  <span>Longitude</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.satellite} onChange={() => toggleColumn('satellite')} />
                  <span>Satellite</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.confidence} onChange={() => toggleColumn('confidence')} />
                  <span>Confidence</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.brightness} onChange={() => toggleColumn('brightness')} />
                  <span>Brightness (K)</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.frp} onChange={() => toggleColumn('frp')} />
                  <span>Fire Radiative Power</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.dayNight} onChange={() => toggleColumn('dayNight')} />
                  <span>Day/Night</span>
                </label>
                <label className="flex items-center gap-2 px-2 py-1 hover:bg-navy/60 rounded cursor-pointer">
                  <input type="checkbox" checked={visibleColumns.region} onChange={() => toggleColumn('region')} />
                  <span>Region &amp; Country</span>
                </label>
              </div>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 bg-navy px-2 py-1 rounded-lg border border-border/60 text-[11px] text-text-muted">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent font-bold text-text-primary focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-surface">10</option>
              <option value={15} className="bg-surface">15</option>
              <option value={25} className="bg-surface">25</option>
              <option value={50} className="bg-surface">50</option>
              <option value={100} className="bg-surface">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Staging Banner */}
      {selectedIds.size > 0 && (
        <div className="bg-gradient-to-r from-navy via-surface to-navy px-4 py-2 border-b border-cyan/40 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            <span className="font-mono text-text-primary">
              <strong className="text-cyan font-bold">{selectedIds.size}</strong> record
              {selectedIds.size > 1 ? 's' : ''} staged for inspection
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size === 2 && (
              <button
                onClick={onOpenCompareSelected}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 transition-colors"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare Selected (2)</span>
              </button>
            )}

            <button
              onClick={onOpenExportSelected}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selected ({selectedIds.size})</span>
            </button>

            <button
              onClick={onClearSelection}
              className="text-text-muted hover:text-text-primary text-[11px] underline px-2"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Scientific Data Table */}
      <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 z-10 bg-navy/95 border-b border-border/80 text-text-muted uppercase text-[10px] tracking-wider backdrop-blur font-sans">
            <tr>
              {/* Row Select All */}
              <th className="p-3 w-10 text-center">
                <button
                  onClick={handleToggleSelectAll}
                  className="p-1 hover:text-cyan transition-colors"
                  title={isAllPageSelected ? 'Deselect all visible' : 'Select all visible'}
                >
                  {isAllPageSelected ? (
                    <CheckSquare className="w-4 h-4 text-cyan" />
                  ) : (
                    <Square className="w-4 h-4 text-text-muted" />
                  )}
                </button>
              </th>

              {/* 1. Observation ID */}
              {visibleColumns.id && (
                <th
                  onClick={() => handleSort('id')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Observation ID</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 2. Acquisition Date */}
              {visibleColumns.date && (
                <th
                  onClick={() => handleSort('date')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Acquisition Date</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 3. Acquisition Time */}
              {visibleColumns.time && (
                <th
                  onClick={() => handleSort('time')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Acquisition Time</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 4. Latitude */}
              {visibleColumns.latitude && (
                <th
                  onClick={() => handleSort('latitude')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Latitude</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 5. Longitude */}
              {visibleColumns.longitude && (
                <th
                  onClick={() => handleSort('longitude')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Longitude</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 6. Satellite */}
              {visibleColumns.satellite && (
                <th
                  onClick={() => handleSort('satellite')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Satellite</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 7. Confidence */}
              {visibleColumns.confidence && (
                <th
                  onClick={() => handleSort('confidence')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Confidence</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* 8. Brightness Temperature */}
              {visibleColumns.brightness && (
                <th
                  onClick={() => handleSort('brightness')}
                  className="p-3 font-semibold cursor-pointer hover:text-cyan text-cyan"
                >
                  <div className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    <span>Brightness Temp</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              )}

              {/* 9. Fire Radiative Power */}
              {visibleColumns.frp && (
                <th
                  onClick={() => handleSort('frp')}
                  className="p-3 font-semibold cursor-pointer hover:text-amber-400 text-amber-400"
                >
                  <div className="flex items-center gap-1">
                    <span>FRP (MW)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              )}

              {/* 10. Day/Night */}
              {visibleColumns.dayNight && (
                <th className="p-3 font-semibold text-center">
                  <span>Day/Night</span>
                </th>
              )}

              {/* Region & Country */}
              {visibleColumns.region && (
                <th
                  onClick={() => handleSort('country')}
                  className="p-3 font-semibold cursor-pointer hover:text-text-primary"
                >
                  <div className="flex items-center gap-1">
                    <span>Country &amp; Region</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted" />
                  </div>
                </th>
              )}

              {/* Actions */}
              <th className="p-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40 text-text-secondary">
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-12 text-center text-text-muted font-sans text-xs">
                  No satellite observations match your active search and filter combinations.
                </td>
              </tr>
            ) : (
              pageItems.map((obs) => {
                const isSelected = selectedObsId === obs.id;
                const isChecked = selectedIds.has(obs.id);
                const isModis = obs.satellite === 'MODIS';
                const dayNight = getObservationDayNight(obs);

                return (
                  <tr
                    key={obs.id}
                    onClick={() => onSelectObservation(obs)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan/15 text-text-primary font-bold'
                        : isChecked
                        ? 'bg-navy/70 text-text-primary'
                        : 'hover:bg-navy/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="p-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectId(obs.id);
                      }}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-cyan" />
                      ) : (
                        <Square className="w-4 h-4 text-text-muted hover:text-text-secondary" />
                      )}
                    </td>

                    {/* ID */}
                    {visibleColumns.id && (
                      <td className="p-3 font-bold text-cyan font-mono hover:underline">
                        {obs.id}
                      </td>
                    )}

                    {/* Date */}
                    {visibleColumns.date && (
                      <td className="p-3 whitespace-nowrap text-text-primary">
                        {obs.date || 'N/A'}
                      </td>
                    )}

                    {/* Time */}
                    {visibleColumns.time && (
                      <td className="p-3 whitespace-nowrap text-text-muted text-[11px]">
                        {obs.time ? `${obs.time} UTC` : 'N/A'}
                      </td>
                    )}

                    {/* Latitude */}
                    {visibleColumns.latitude && (
                      <td className="p-3 whitespace-nowrap text-text-secondary">
                        {obs.latitude >= 0 ? `+${obs.latitude.toFixed(4)}°` : `${obs.latitude.toFixed(4)}°`}
                      </td>
                    )}

                    {/* Longitude */}
                    {visibleColumns.longitude && (
                      <td className="p-3 whitespace-nowrap text-text-secondary">
                        {obs.longitude >= 0 ? `+${obs.longitude.toFixed(4)}°` : `${obs.longitude.toFixed(4)}°`}
                      </td>
                    )}

                    {/* Satellite */}
                    {visibleColumns.satellite && (
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isModis
                              ? 'bg-fire/20 text-fire border border-fire/40'
                              : 'bg-cyan/20 text-cyan border border-cyan/40'
                          }`}
                        >
                          {isModis ? <Flame className="w-2.5 h-2.5" /> : <Zap className="w-2.5 h-2.5" />}
                          {obs.satellite}
                        </span>
                      </td>
                    )}

                    {/* Confidence */}
                    {visibleColumns.confidence && (
                      <td className="p-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                            obs.confidence === 'high'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : obs.confidence === 'nominal'
                              ? 'bg-cyan/20 text-cyan border border-cyan/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {obs.confidence}
                        </span>
                      </td>
                    )}

                    {/* Brightness Temperature */}
                    {visibleColumns.brightness && (
                      <td className="p-3 font-semibold text-cyan">
                        {obs.brightness.toFixed(1)} <span className="text-[10px] text-text-muted">K</span>
                      </td>
                    )}

                    {/* Fire Radiative Power */}
                    {visibleColumns.frp && (
                      <td className="p-3 font-bold text-amber-400">
                        {obs.frp.toFixed(1)} <span className="text-[10px] font-normal text-text-muted">MW</span>
                      </td>
                    )}

                    {/* Day / Night */}
                    {visibleColumns.dayNight && (
                      <td className="p-3 text-center">
                        {dayNight === 'D' ? (
                          <span
                            className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-sans font-semibold bg-amber-400/10 px-1.5 py-0.5 rounded"
                            title="Daytime pass"
                          >
                            <Sun className="w-3 h-3" /> Day
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-cyan text-[10px] font-sans font-semibold bg-cyan/10 px-1.5 py-0.5 rounded"
                            title="Nighttime pass"
                          >
                            <Moon className="w-3 h-3" /> Night
                          </span>
                        )}
                      </td>
                    )}

                    {/* Region */}
                    {visibleColumns.region && (
                      <td className="p-3 text-[11px] whitespace-nowrap text-text-secondary">
                        <span className="font-semibold text-text-primary">{obs.country}</span>
                        <span className="text-text-muted"> ({obs.region})</span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectObservation(obs);
                          }}
                          className="p-1.5 rounded-lg bg-navy hover:bg-surface border border-border/60 text-text-muted hover:text-cyan transition-colors"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenGlobe(obs);
                          }}
                          className="p-1.5 rounded-lg bg-navy hover:bg-surface border border-border/60 text-text-muted hover:text-fire transition-colors"
                          title="Locate on 3D Earth Explorer"
                        >
                          <Globe2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="p-3 sm:p-4 bg-navy/80 border-t border-border/70 flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted font-sans">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-text-primary">{sortedObservations.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-text-primary">
              {Math.min(currentPage * pageSize, sortedObservations.length)}
            </strong>{' '}
            of <strong className="text-text-primary">{sortedObservations.length.toLocaleString()}</strong> results
          </span>
        </div>

        {/* Pagination Page Controls */}
        <div className="flex items-center gap-1 font-mono">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-border/60 bg-navy hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-text-secondary transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-border/60 bg-navy hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-text-secondary transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-1 font-semibold text-text-primary text-xs font-sans">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-border/60 bg-navy hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-text-secondary transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-border/60 bg-navy hover:bg-surface disabled:opacity-30 disabled:pointer-events-none text-text-secondary transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataTableView;
