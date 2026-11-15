import React from 'react';
import type { FireObservation, EnrichedCalendarDay } from '../../types';
import { Download, X, FileSpreadsheet, Calendar, Layers } from 'lucide-react';

interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedYear: number;
  selectedDate: string | null;
  dailyObservations: FireObservation[];
  enrichedMap: Map<string, EnrichedCalendarDay>;
  allObservations: FireObservation[];
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  selectedYear,
  selectedDate,
  dailyObservations,
  enrichedMap,
  allObservations,
}) => {
  if (!isOpen) return null;

  // 1. Export Daily Observations CSV
  const handleExportDailyCsv = () => {
    if (!selectedDate || dailyObservations.length === 0) return;

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

    const rows = dailyObservations.map((o) => [
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

    downloadCsv(`firenexus_daily_${selectedDate}.csv`, headers, rows);
  };

  // 2. Export Monthly Aggregations CSV
  const handleExportMonthlyCsv = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      monthName: months[i],
      monthIndex: i + 1,
      total: 0,
      modis: 0,
      viirs: 0,
      highConf: 0,
      totalFrp: 0,
      avgFrp: 0,
    }));

    allObservations.forEach((obs) => {
      if (!obs.date || typeof obs.date !== 'string') return;
      const parts = obs.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          monthlyStats[mIdx].total += 1;
          if (obs.satellite === 'MODIS') monthlyStats[mIdx].modis += 1;
          else monthlyStats[mIdx].viirs += 1;
          if (obs.confidence === 'high') monthlyStats[mIdx].highConf += 1;
          monthlyStats[mIdx].totalFrp += obs.frp;
        }
      }
    });

    monthlyStats.forEach((s) => {
      s.avgFrp = s.total > 0 ? Math.round((s.totalFrp / s.total) * 10) / 10 : 0;
    });

    const headers = [
      'Month',
      'MonthNumber',
      'Year',
      'TotalDetections',
      'MODIS_Detections',
      'VIIRS_Detections',
      'HighConfidence_Count',
      'AverageFRP_MW',
    ];

    const rows = monthlyStats.map((m) => [
      m.monthName,
      m.monthIndex,
      selectedYear,
      m.total,
      m.modis,
      m.viirs,
      m.highConf,
      m.avgFrp.toFixed(1),
    ]);

    downloadCsv(`firenexus_monthly_summary_${selectedYear}.csv`, headers, rows);
  };

  // 3. Export Full Annual Calendar Dataset CSV
  const handleExportAnnualDatasetCsv = () => {
    const headers = [
      'Date',
      'DayOfYear',
      'TotalDetections',
      'MODIS_Count',
      'VIIRS_Count',
      'HighConfidence_Count',
      'MeanFRP_MW',
      'IntensityTier',
    ];

    // Collect all dates in sorted order
    const sortedDates = Array.from(enrichedMap.keys()).sort();

    const rows = sortedDates.map((dateStr) => {
      const item = enrichedMap.get(dateStr)!;
      const dateObj = new Date(`${dateStr}T00:00:00Z`);
      const start = new Date(dateObj.getFullYear(), 0, 0);
      const diff = dateObj.getTime() - start.getTime();
      const doy = Math.floor(diff / (1000 * 60 * 60 * 24));

      return [
        item.date,
        doy,
        item.count,
        item.modisCount,
        item.viirsCount,
        item.highConf,
        item.avgFrp.toFixed(1),
        item.intensity,
      ];
    });

    downloadCsv(`firenexus_annual_calendar_${selectedYear}.csv`, headers, rows);
  };

  // Helper download function
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
                Export Fire Activity Data
              </h3>
              <p className="text-xs text-text-muted">
                Download structured CSV datasets for geospatial and scientific analysis
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

        {/* Export Options Cards */}
        <div className="space-y-3">
          {/* Option 1: Selected Day Observations */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-fire shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Selected Day Telemetry ({selectedDate || 'No date selected'})
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Full granular observation rows including lat/lon, time, confidence, FRP, and biome
                  for the active date.
                </p>
                <div className="text-[10px] text-cyan font-mono mt-1">
                  {dailyObservations.length} observations ready
                </div>
              </div>
            </div>
            <button
              onClick={handleExportDailyCsv}
              disabled={!selectedDate || dailyObservations.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-fire/20 hover:bg-fire/30 text-fire border border-fire/40 disabled:opacity-30 disabled:hover:bg-fire/20 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 2: Monthly Summary CSV */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Monthly Aggregation Summary ({selectedYear})
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  12 monthly rows with MODIS vs VIIRS counts, high confidence totals, and average FRP.
                </p>
                <div className="text-[10px] text-cyan font-mono mt-1">
                  12 calendar months • {allObservations.length} total fires
                </div>
              </div>
            </div>
            <button
              onClick={handleExportMonthlyCsv}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 3: Annual Calendar Heatmap CSV */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Annual Calendar Heatmap Dataset ({selectedYear})
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Daily continuous matrix: date, day of year, sensor counts, average FRP, and 5-tier
                  heat intensity index.
                </p>
                <div className="text-[10px] text-emerald-400 font-mono mt-1">
                  {enrichedMap.size} recorded active days
                </div>
              </div>
            </div>
            <button
              onClick={handleExportAnnualDatasetCsv}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <span>Format: UTF-8 Encoded CSV</span>
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

export default CalendarExportModal;
