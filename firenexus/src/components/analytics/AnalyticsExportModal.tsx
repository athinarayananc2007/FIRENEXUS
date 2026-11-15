import React from 'react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { Download, X, FileSpreadsheet, Layers, GitMerge, Printer } from 'lucide-react';

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredObservations: FireObservation[];
  matchedPairs: MatchedFirePair[];
  onPrintReport: () => void;
}

export const AnalyticsExportModal: React.FC<AnalyticsExportModalProps> = ({
  isOpen,
  onClose,
  filteredObservations,
  matchedPairs,
  onPrintReport,
}) => {
  if (!isOpen) return null;

  // 1. Export Filtered Observations CSV
  const handleExportFilteredObservations = () => {
    const headers = [
      'ObservationID',
      'Satellite',
      'Date',
      'TimeUTC',
      'Latitude',
      'Longitude',
      'FRP_MW',
      'BrightnessTemp_K',
      'Confidence',
      'Country',
      'Region',
      'Status',
    ];

    const rows = filteredObservations.map((o) => [
      o.id,
      o.satellite,
      o.date ?? 'N/A',
      o.time ?? 'N/A',
      o.latitude.toFixed(4),
      o.longitude.toFixed(4),
      o.frp.toFixed(1),
      o.brightness.toFixed(1),
      o.confidence,
      `"${o.country}"`,
      `"${o.region}"`,
      o.status,
    ]);

    downloadCsv(`firenexus_filtered_observations_${filteredObservations.length}.csv`, headers, rows);
  };

  // 2. Export Analytical Summary CSV
  const handleExportSummaryCsv = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const buckets = Array.from({ length: 12 }, (_, i) => ({
      month: months[i],
      modis: 0,
      viirs: 0,
      total: 0,
      frpSum: 0,
    }));

    filteredObservations.forEach((o) => {
      if (!o.date || typeof o.date !== 'string') return;
      const parts = o.date.split('-');
      if (parts.length >= 2) {
        const m = parseInt(parts[1], 10) - 1;
        if (m >= 0 && m < 12) {
          buckets[m].total += 1;
          if (o.satellite === 'MODIS') buckets[m].modis += 1;
          else buckets[m].viirs += 1;
          buckets[m].frpSum += o.frp;
        }
      }
    });

    const headers = ['Month', 'MODIS_Count', 'VIIRS_Count', 'Total_Observations', 'Mean_FRP_MW'];
    const rows = buckets.map((b) => [
      b.month,
      b.modis,
      b.viirs,
      b.total,
      b.total > 0 ? (b.frpSum / b.total).toFixed(1) : '0.0',
    ]);

    downloadCsv('firenexus_monthly_analytics_summary.csv', headers, rows);
  };

  // 3. Export Matched Pairs CSV
  const handleExportMatchedPairsCsv = () => {
    const headers = [
      'PairID',
      'MODIS_ID',
      'VIIRS_ID',
      'Date',
      'MODIS_Time',
      'VIIRS_Time',
      'Distance_km',
      'TimeDiff_minutes',
      'MODIS_FRP_MW',
      'VIIRS_FRP_MW',
      'FRPRatio_VIIRS_to_MODIS',
      'Country',
    ];

    const rows = matchedPairs.map((p) => [
      p.id,
      p.modis.id,
      p.viirs.id,
      p.modis.date ?? 'N/A',
      p.modis.time ?? 'N/A',
      p.viirs.time ?? 'N/A',
      p.distanceKm.toFixed(2),
      p.timeDiffMinutes,
      p.modis.frp.toFixed(1),
      p.viirs.frp.toFixed(1),
      (p.viirs.frp / Math.max(0.1, p.modis.frp)).toFixed(2),
      `"${p.modis.country}"`,
    ]);

    downloadCsv(`firenexus_matched_pairs_${matchedPairs.length}.csv`, headers, rows);
  };

  // CSV download helper
  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="card w-full max-w-xl bg-surface/95 border-cyan/40 shadow-2xl p-6 space-y-6 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Scientific Analytics Export Center
              </h3>
              <p className="text-xs text-text-muted">
                Download structured datasets reflecting the currently filtered analytical cohort
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-navy transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          {/* Option 1: Filtered Observations */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Active Filtered Observations CSV
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Complete observation telemetry rows including lat/lon, times, FRP, brightness, and
                  jurisdictions.
                </p>
                <div className="text-[10px] text-cyan font-mono mt-1">
                  {filteredObservations.length.toLocaleString()} rows ready
                </div>
              </div>
            </div>
            <button
              onClick={handleExportFilteredObservations}
              disabled={filteredObservations.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 2: Monthly Summary */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Monthly Aggregated Summary CSV
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  12 calendar months with MODIS vs VIIRS counts, total detections, and mean FRP.
                </p>
                <div className="text-[10px] text-amber-400 font-mono mt-1">
                  12 monthly aggregated bins
                </div>
              </div>
            </div>
            <button
              onClick={handleExportSummaryCsv}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 3: Candidate Matched Pairs */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <GitMerge className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Candidate Matched Pairs CSV
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Co-incident MODIS &amp; VIIRS associations with Haversine distance (&Delta;d) and
                  temporal delta (&Delta;t).
                </p>
                <div className="text-[10px] text-emerald-400 font-mono mt-1">
                  {matchedPairs.length.toLocaleString()} paired associations
                </div>
              </div>
            </div>
            <button
              onClick={handleExportMatchedPairsCsv}
              disabled={matchedPairs.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 4: Printable Analytical Report */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Printer className="w-5 h-5 text-fire shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Printable Scientific Analytical Report
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Formatted browser printable summary document suitable for PDF export and dossier
                  archival.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onPrintReport();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-fire/20 hover:bg-fire/30 text-fire border border-fire/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <span>Format: UTF-8 RFC 4180 Standard CSV</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-navy text-text-secondary hover:text-text-primary border border-border/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsExportModal;

