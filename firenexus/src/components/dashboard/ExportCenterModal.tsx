import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download, FileSpreadsheet, FileJson, Printer,
  X, Check, AlertCircle,
} from 'lucide-react';
import type { FireObservation, FilterState, KpiMetrics } from '../../types';

interface ExportCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredObservations: FireObservation[];
  filters: FilterState;
  metrics: KpiMetrics;
}

export default function ExportCenterModal({
  isOpen,
  onClose,
  filteredObservations,
  filters,
  metrics,
}: ExportCenterModalProps) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Export CSV
  const handleExportCSV = () => {
    const headers = [
      'id',
      'latitude',
      'longitude',
      'brightness_k',
      'acq_date',
      'acq_time_utc',
      'satellite',
      'confidence',
      'frp_mw',
      'country',
      'region',
      'continent',
      'data_status',
    ];

    const rows = filteredObservations.map((obs) => [
      obs.id,
      obs.latitude,
      obs.longitude,
      obs.brightness,
      obs.date ?? 'N/A',
      obs.time ?? 'N/A',
      obs.satellite,
      obs.confidence,
      obs.frp,
      `"${obs.country}"`,
      `"${obs.region}"`,
      `"${obs.continent}"`,
      'simulated_demonstration',
    ]);

    const csvContent = [
      '# FIRENEXUS Global Wildfire Intelligence Platform',
      '# Synthetic Satellite Observation Dataset - Demonstration Only',
      `# Export Timestamp: ${new Date().toISOString()}`,
      `# Observation Count: ${filteredObservations.length}`,
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `firenexus_observations_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('CSV Export downloaded successfully');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 2. Export JSON Summary
  const handleExportJSON = () => {
    const summaryData = {
      platform: 'FIRENEXUS Global Wildfire Intelligence',
      exportDate: new Date().toISOString(),
      disclaimer: 'Simulated demonstration dataset; not live NASA telemetry.',
      appliedFilters: filters,
      kpis: {
        totalHotspots: metrics.totalHotspots,
        modisDetections: metrics.modisCount,
        viirsDetections: metrics.viirsCount,
        avgFrpMw: metrics.avgFrp,
        maxFrpMw: metrics.maxFrp,
        highConfidenceRatePct: metrics.highConfRate,
        activeRegionsCount: metrics.activeRegions,
        period: metrics.observationPeriod,
      },
      sampleObservations: filteredObservations.slice(0, 50),
    };

    const blob = new Blob([JSON.stringify(summaryData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `firenexus_summary_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess('JSON Summary downloaded successfully');
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  // 3. Trigger Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl glass border border-border/80 rounded-2xl p-6 shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-light"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-primary">
                Export &amp; Intelligence Reports
              </h3>
              <span className="demo-badge text-[10px]">Data Center</span>
            </div>
            <p className="text-xs text-text-secondary">
              Export currently filtered observations ({filteredObservations.length.toLocaleString()} points)
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {downloadSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Option 1: CSV */}
          <div
            onClick={handleExportCSV}
            className="p-4 rounded-xl bg-surface/40 hover:bg-surface-light border border-border/70 hover:border-cyan/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <FileSpreadsheet className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-text-primary mb-1">
                CSV Observations
              </h4>
              <p className="text-[11px] text-text-muted">
                Comma-separated file with full coordinates, FRP, and satellite tags.
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-emerald-400 group-hover:underline flex items-center gap-1">
              <span>Download CSV</span>
            </button>
          </div>

          {/* Option 2: JSON */}
          <div
            onClick={handleExportJSON}
            className="p-4 rounded-xl bg-surface/40 hover:bg-surface-light border border-border/70 hover:border-cyan/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <FileJson className="w-6 h-6 text-cyan mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-text-primary mb-1">
                JSON Analytics
              </h4>
              <p className="text-[11px] text-text-muted">
                Machine-readable summary of computed KPIs, regional rankings, and filters.
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-cyan group-hover:underline flex items-center gap-1">
              <span>Download JSON</span>
            </button>
          </div>

          {/* Option 3: Print */}
          <div
            onClick={handlePrint}
            className="p-4 rounded-xl bg-surface/40 hover:bg-surface-light border border-border/70 hover:border-cyan/50 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <Printer className="w-6 h-6 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-bold text-text-primary mb-1">
                Print Briefing
              </h4>
              <p className="text-[11px] text-text-muted">
                Formatted printer-friendly executive summary and intelligence layout.
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-amber-400 group-hover:underline flex items-center gap-1">
              <span>Print Page</span>
            </button>
          </div>
        </div>

        {/* Scientific Disclaimer Note */}
        <div className="p-3.5 rounded-xl bg-navy/80 border border-border/60 text-[11px] text-text-muted flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-text-secondary">Export Policy:</strong> All exports reflect the currently active filters and contain synthesized thermal anomalies generated for algorithm testing and frontend architecture evaluation.
          </p>
        </div>
      </motion.div>
    </div>
  );
}