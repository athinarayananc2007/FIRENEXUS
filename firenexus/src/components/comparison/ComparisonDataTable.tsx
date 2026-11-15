import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown, Search, ChevronLeft, ChevronRight,
  Globe2, FileSpreadsheet,
} from 'lucide-react';
import type { MatchedFirePair } from '../../types';

interface ComparisonDataTableProps {
  matchedPairs: MatchedFirePair[];
}

type SortKey =
  | 'id'
  | 'distanceKm'
  | 'timeDiffMinutes'
  | 'modisFrp'
  | 'viirsFrp'
  | 'frpDiff'
  | 'status';
type SortDir = 'asc' | 'desc';

export default function ComparisonDataTable({
  matchedPairs,
}: ComparisonDataTableProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('distanceKm');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sorting
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Filtered & Sorted pairs
  const processedData = useMemo(() => {
    let result = matchedPairs;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.modis.id.toLowerCase().includes(q) ||
          p.viirs.id.toLowerCase().includes(q) ||
          p.modis.region.toLowerCase().includes(q) ||
          p.modis.country.toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      let av: any;
      let bv: any;
      if (sortKey === 'modisFrp') {
        av = a.modis.frp;
        bv = b.modis.frp;
      } else if (sortKey === 'viirsFrp') {
        av = a.viirs.frp;
        bv = b.viirs.frp;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      return sortDir === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [matchedPairs, searchTerm, sortKey, sortDir]);

  // Pagination
  const totalItems = processedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'pair_id',
      'modis_id',
      'viirs_id',
      'date',
      'modis_time',
      'viirs_time',
      'distance_km',
      'time_difference_min',
      'modis_frp_mw',
      'viirs_frp_mw',
      'frp_difference_mw',
      'modis_confidence',
      'viirs_confidence',
      'matching_status',
      'region',
      'country',
    ];

    const rows = matchedPairs.map((p) => [
      p.id,
      p.modis.id,
      p.viirs.id,
      p.modis.date ?? 'N/A',
      p.modis.time ?? 'N/A',
      p.viirs.time ?? 'N/A',
      p.distanceKm,
      p.timeDiffMinutes,
      p.modis.frp,
      p.viirs.frp,
      p.frpDiff,
      p.modis.confidence,
      p.viirs.confidence,
      p.status,
      `"${p.modis.region}"`,
      `"${p.modis.country}"`,
    ]);

    const csvContent = [
      '# FIRENEXUS Spatial-Temporal Matched Observation Pairs',
      '# Candidate Demonstration Dataset - Algorithm Evaluation Only',
      `# Export Timestamp: ${new Date().toISOString()}`,
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `firenexus_matched_pairs_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInGlobe = (p: MatchedFirePair) => {
    navigate('/explorer', {
      state: {
        targetLocation: {
          lat: p.modis.latitude,
          lon: p.modis.longitude,
          name: `${p.modis.region}, ${p.modis.country}`,
        },
      },
    });
  };

  return (
    <section className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Candidate Spatial Matching Table
            </h2>
            <span className="demo-badge text-[10px]">Paired Registry</span>
          </div>
          <p className="text-xs text-text-secondary">
            Verified candidate pairings between Terra/Aqua MODIS and Suomi-NPP/NOAA-20 VIIRS observations
          </p>
        </div>

        {/* Actions: Search, Show count, Export CSV */}
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search by ID, country, region..."
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

          <button
            onClick={handleExportCSV}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
            title="Export candidate matched pairs as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Pairs CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="glass border border-border/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-navy/60 text-text-muted">
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 font-semibold text-left select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    MODIS Observation
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 font-semibold text-left select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    VIIRS Observation
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('distanceKm')}
                  className="py-3 px-4 font-semibold text-left select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Distance (km)
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('timeDiffMinutes')}
                  className="py-3 px-4 font-semibold text-left select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Time Delta (&Delta;t)
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('modisFrp')}
                  className="py-3 px-4 font-semibold text-right select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    MODIS FRP
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('viirsFrp')}
                  className="py-3 px-4 font-semibold text-right select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    VIIRS FRP
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('frpDiff')}
                  className="py-3 px-4 font-semibold text-right select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1 justify-end">
                    FRP Delta
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-4 font-semibold text-left select-none cursor-pointer hover:text-text-primary whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    Match Status
                    <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-3 px-4 text-right font-semibold text-text-muted">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((p) => {
                const statusColor =
                  p.status === 'high_confidence_match'
                    ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                    : p.status === 'candidate_match'
                      ? 'text-purple-300 bg-purple-500/15 border-purple-500/30'
                      : 'text-amber-400 bg-amber-500/15 border-amber-500/30';

                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/40 hover:bg-surface-light/60 transition-colors"
                  >
                    {/* MODIS Observation */}
                    <td className="py-2.5 px-4 font-mono font-bold text-fire whitespace-nowrap">
                      <div>{p.modis.id}</div>
                      <div className="text-[10px] text-text-muted font-normal">
                        {p.modis.date || 'N/A'} {p.modis.time || ''} ({p.modis.confidence})
                      </div>
                    </td>

                    {/* VIIRS Observation */}
                    <td className="py-2.5 px-4 font-mono font-bold text-cyan whitespace-nowrap">
                      <div>{p.viirs.id}</div>
                      <div className="text-[10px] text-text-muted font-normal">
                        {p.viirs.date || 'N/A'} {p.viirs.time || ''} ({p.viirs.confidence})
                      </div>
                    </td>

                    {/* Distance (km) */}
                    <td className="py-2.5 px-4 font-mono text-text-primary whitespace-nowrap">
                      {p.distanceKm} km
                    </td>

                    {/* Time Delta (min) */}
                    <td className="py-2.5 px-4 font-mono text-text-secondary whitespace-nowrap">
                      {p.timeDiffMinutes} min
                    </td>

                    {/* MODIS FRP */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-fire whitespace-nowrap">
                      {p.modis.frp} MW
                    </td>

                    {/* VIIRS FRP */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-cyan whitespace-nowrap">
                      {p.viirs.frp} MW
                    </td>

                    {/* FRP Delta */}
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                        p.frpDiff > 0 ? 'text-cyan' : p.frpDiff < 0 ? 'text-fire' : 'text-text-muted'
                      }`}
                    >
                      {p.frpDiff > 0 ? '+' : ''}
                      {p.frpDiff} MW
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}
                      >
                        {p.status === 'high_confidence_match'
                          ? 'High Confidence'
                          : p.status === 'candidate_match'
                            ? 'Candidate Match'
                            : 'Marginal Match'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenInGlobe(p)}
                        className="btn-ghost p-1.5 text-cyan hover:text-cyan-light rounded-lg hover:bg-surface"
                        title="Focus on 3D Earth Globe"
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
                    No candidate matched pairs found for the current matching tolerance or search query.
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
            candidate pairs
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
    </section>
  );
}