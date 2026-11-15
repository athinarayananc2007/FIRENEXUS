import React from 'react';
import type { FireObservation } from '../../types';
import {
  Download,
  X,
  FileSpreadsheet,
  CheckSquare,
  FileCode,
  Layers,
} from 'lucide-react';
import {
  getObservationInstrument,
  getObservationDayNight,
} from '../../utils/dataExplorerUtils';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredObservations: FireObservation[];
  selectedObservations: FireObservation[];
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  isOpen,
  onClose,
  filteredObservations,
  selectedObservations,
}) => {
  if (!isOpen) return null;

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

  const getCsvRows = (list: FireObservation[]) => {
    return list.map((o) => [
      o.id,
      o.date ?? 'N/A',
      o.time ?? 'N/A',
      o.latitude.toFixed(5),
      o.longitude.toFixed(5),
      o.satellite,
      `"${getObservationInstrument(o)}"`,
      o.confidence,
      o.frp.toFixed(1),
      o.brightness.toFixed(1),
      getObservationDayNight(o),
      `"${o.country}"`,
      `"${o.region}"`,
      `"${o.continent}"`,
      o.status,
    ]);
  };

  const csvHeaders = [
    'ObservationID',
    'AcquisitionDate',
    'AcquisitionTimeUTC',
    'Latitude',
    'Longitude',
    'Satellite',
    'Instrument',
    'Confidence',
    'FRP_MW',
    'Brightness_K',
    'DayNight',
    'Country',
    'Region',
    'Continent',
    'DataStatus',
  ];

  // 1. Export Filtered Records
  const handleExportFiltered = () => {
    downloadCsv(
      `firenexus_filtered_records_${filteredObservations.length}.csv`,
      csvHeaders,
      getCsvRows(filteredObservations)
    );
  };

  // 2. Export Selected Records
  const handleExportSelected = () => {
    if (selectedObservations.length === 0) return;
    downloadCsv(
      `firenexus_selected_records_${selectedObservations.length}.csv`,
      csvHeaders,
      getCsvRows(selectedObservations)
    );
  };

  // 3. Export Metadata JSON
  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(
        selectedObservations.length > 0 ? selectedObservations : filteredObservations,
        null,
        2
      )
    )}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `firenexus_records_export.json`;
    link.click();
  };

  // 4. Export Regional Summary CSV
  const handleExportSummaryCsv = () => {
    const map = new Map<string, { total: number; modis: number; viirs: number; frpSum: number }>();
    filteredObservations.forEach((o) => {
      const c = o.country || 'Unknown';
      if (!map.has(c)) map.set(c, { total: 0, modis: 0, viirs: 0, frpSum: 0 });
      const entry = map.get(c)!;
      entry.total += 1;
      if (o.satellite === 'MODIS') entry.modis += 1;
      else entry.viirs += 1;
      entry.frpSum += o.frp;
    });

    const headers = ['Country', 'TotalDetections', 'MODIS_Count', 'VIIRS_Count', 'Mean_FRP_MW'];
    const rows = Array.from(map.entries()).map(([country, val]) => [
      `"${country}"`,
      val.total,
      val.modis,
      val.viirs,
      val.total > 0 ? (val.frpSum / val.total).toFixed(1) : '0.0',
    ]);

    downloadCsv('firenexus_country_summary.csv', headers, rows);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="card w-full max-w-xl bg-surface/98 border-cyan/40 shadow-2xl p-6 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan/20 text-cyan flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Global Fire Data Export Center
              </h3>
              <p className="text-xs text-text-muted">
                Download structured NASA FIRMS-compliant observations in CSV or JSON
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

        {/* Options */}
        <div className="space-y-3">
          {/* Option 1: All Filtered Records */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-cyan shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Export All Filtered Records (CSV)
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Complete telemetry for all {filteredObservations.length.toLocaleString()}{' '}
                  observations matching your active filters.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportFiltered}
              disabled={filteredObservations.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 2: Selected Records Only */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Export Staged Records ({selectedObservations.length} Selected)
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Download only the records you explicitly checked in the data table.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportSelected}
              disabled={selectedObservations.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>

          {/* Option 3: Metadata JSON */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  Download GeoJSON / Science Metadata (JSON)
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Structured JSON payload suitable for API pipelines and GIS scripts.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          </div>

          {/* Option 4: Regional Summary */}
          <div className="p-4 rounded-xl bg-navy/70 border border-border/60 hover:border-cyan/40 transition-colors flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-fire shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-text-primary">
                  National / Jurisdiction Summary (CSV)
                </h4>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Country-by-country aggregated active fire anomaly counts and average FRP.
                </p>
              </div>
            </div>
            <button
              onClick={handleExportSummaryCsv}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-fire/20 hover:bg-fire/30 text-fire border border-fire/40 transition-colors shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <span>Standards: RFC 4180 CSV &bull; WGS84 Geodetic Datum</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-navy hover:bg-surface text-text-secondary hover:text-text-primary border border-border/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataExportModal;

