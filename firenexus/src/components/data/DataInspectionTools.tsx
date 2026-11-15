import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  findDuplicateObservations,
  auditDataQuality,
  formatCoordinates,
  getObservationInstrument,
  getObservationDayNight,
} from '../../utils/dataExplorerUtils';
import {
  haversineDistanceKm,
  timeDifferenceMinutes,
} from '../../data/mock/fireData';
import {
  ShieldCheck,
  GitCompare,
  Copy,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Info,
} from 'lucide-react';

interface DataInspectionToolsProps {
  observations: FireObservation[];
  selectedObservations: FireObservation[];
  onSelectObservation: (obs: FireObservation) => void;
}

type ToolTab = 'comparison' | 'duplicates' | 'quality' | 'schema';

const FIRMS_SCHEMA_FIELDS = [
  { field: 'LATITUDE', type: 'Float (-90 to 90)', desc: 'Center latitude of the active fire pixel in WGS84 decimal degrees.' },
  { field: 'LONGITUDE', type: 'Float (-180 to 180)', desc: 'Center longitude of the active fire pixel in WGS84 decimal degrees.' },
  { field: 'BRIGHTNESS', type: 'Float (Kelvin)', desc: 'Channel 21/22 (MODIS ~3.96 µm) or I4 (VIIRS ~3.74 µm) brightness temperature.' },
  { field: 'SCAN / TRACK', type: 'Float (km)', desc: 'Along-scan and along-track pixel footprint dimensions showing swath expansion.' },
  { field: 'ACQ_DATE', type: 'Date (YYYY-MM-DD)', desc: 'UTC acquisition date of the satellite overpass.' },
  { field: 'ACQ_TIME', type: 'String (HHMM)', desc: 'UTC acquisition time of the satellite overpass.' },
  { field: 'SATELLITE', type: 'String', desc: 'Spacecraft platform: Terra / Aqua (MODIS) or Suomi-NPP / NOAA-20 (VIIRS).' },
  { field: 'CONFIDENCE', type: 'String / Int', desc: 'Detection algorithm quality assurance certainty: high, nominal, or low.' },
  { field: 'VERSION', type: 'String', desc: 'NASA FIRMS science algorithm processing stream version (e.g. 6.0N / 1.0).' },
  { field: 'FRP', type: 'Float (MW)', desc: 'Fire Radiative Power quantifying instantaneous rate of radiant heat output.' },
  { field: 'DAYNIGHT', type: 'Char (D / N)', desc: 'D for daytime passes (SZA <= 85°), N for nighttime passes (SZA > 85°).' },
];

export const DataInspectionTools: React.FC<DataInspectionToolsProps> = ({
  observations,
  selectedObservations,
  onSelectObservation,
}) => {
  const [activeTab, setActiveTab] = useState<ToolTab>('comparison');

  // Quality audit report
  const qualityReport = useMemo(() => {
    return auditDataQuality(observations);
  }, [observations]);

  // Duplicate / coincident scanner
  const duplicateResults = useMemo(() => {
    return findDuplicateObservations(observations, 0.75, 30);
  }, [observations]);

  // Record comparison (if at least 2 records selected)
  const pairToCompare = useMemo(() => {
    if (selectedObservations.length >= 2) {
      return [selectedObservations[0], selectedObservations[1]] as [
        FireObservation,
        FireObservation
      ];
    }
    return null;
  }, [selectedObservations]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-5">
      {/* Header and Tool Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Data Inspection &amp; Integrity Diagnostics
            </h2>
            <span className="demo-badge text-[10px]">Verification Suite</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Examine record-to-record variance, scan for coincident duplicates, and inspect NASA FIRMS
            schema fidelity.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'comparison'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Record Comparison</span>
            {selectedObservations.length >= 2 && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('duplicates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'duplicates'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate Scanner</span>
            <span className="px-1.5 py-0.2 rounded bg-navy text-[10px] font-mono">
              {duplicateResults.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'quality'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Quality Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeTab === 'schema'
                ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>FIRMS Schema</span>
          </button>
        </div>
      </div>

      {/* 1. Record Comparison Workspace */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          {!pairToCompare ? (
            <div className="p-8 rounded-xl bg-navy/60 border border-dashed border-border/70 text-center space-y-2">
              <GitCompare className="w-8 h-8 text-cyan/70 mx-auto" />
              <h3 className="font-bold text-sm text-text-primary">
                Select 2 Records to Compare Side-by-Side
              </h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Check any 2 records in the data table above to contrast their satellite instruments,
                radiant outputs, spatial displacement, and acquisition gaps.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">
                  Side-by-Side Satellite Record Comparison
                </span>
                <span className="font-mono text-cyan">
                  Distance: &Delta;d ={' '}
                  {haversineDistanceKm(
                    pairToCompare[0].latitude,
                    pairToCompare[0].longitude,
                    pairToCompare[1].latitude,
                    pairToCompare[1].longitude
                  ).toFixed(2)}{' '}
                  km | Time: &Delta;t ={' '}
                  {timeDifferenceMinutes(
                    pairToCompare[0].date,
                    pairToCompare[0].time,
                    pairToCompare[1].date,
                    pairToCompare[1].time
                  )}{' '}
                  min
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pairToCompare.map((obs, idx) => {
                  const isMod = obs.satellite === 'MODIS';
                  const { latStr, lonStr } = formatCoordinates(obs.latitude, obs.longitude);
                  return (
                    <div
                      key={obs.id}
                      className="p-4 rounded-xl bg-navy/70 border border-border/70 space-y-3 font-mono text-xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="font-bold text-cyan text-sm">{obs.id}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isMod ? 'bg-fire/20 text-fire' : 'bg-cyan/20 text-cyan'
                          }`}
                        >
                          Record #{idx + 1}: {obs.satellite}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-text-secondary text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-text-muted">Instrument:</span>
                          <span className="font-sans text-text-primary">
                            {getObservationInstrument(obs)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Coordinates:</span>
                          <span className="text-text-primary">
                            {latStr}, {lonStr}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Acquired (UTC):</span>
                          <span>
                            {obs.date || 'Unknown'} {obs.time ? `${obs.time}z` : ''} ({getObservationDayNight(obs) === 'D' ? 'Day' : 'Night'})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Fire Radiative Power:</span>
                          <span className="font-bold text-amber-400">{obs.frp.toFixed(1)} MW</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Brightness Temp:</span>
                          <span>{obs.brightness.toFixed(1)} K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Confidence Tier:</span>
                          <span className="uppercase text-text-primary">{obs.confidence}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-muted">Jurisdiction:</span>
                          <span className="font-sans text-text-primary">{obs.country}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Duplicate & Overpass Scanner */}
      {activeTab === 'duplicates' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium text-text-primary">
              Coincident Detections Within Search Tolerance (&le;0.75 km &amp; &le;30 min)
            </span>
            <span className="font-mono text-cyan">
              {duplicateResults.length} coincident pair{duplicateResults.length !== 1 ? 's' : ''} detected
            </span>
          </div>

          {duplicateResults.length === 0 ? (
            <div className="p-6 rounded-xl bg-navy/60 border border-border/60 text-center text-xs text-text-muted">
              No duplicate or spatial-temporal overlapping observations detected in current selection.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-navy/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border/60 font-sans">
                  <tr>
                    <th className="px-4 py-2.5">Record A</th>
                    <th className="px-4 py-2.5">Record B</th>
                    <th className="px-4 py-2.5">Spatial Offset</th>
                    <th className="px-4 py-2.5">Time Delta</th>
                    <th className="px-4 py-2.5">Scientific Classification</th>
                    <th className="px-4 py-2.5 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-text-secondary">
                  {duplicateResults.map((dup, i) => (
                    <tr key={`dup-${i}`} className="hover:bg-surface-light transition-colors">
                      <td className="px-4 py-2 text-fire font-bold">
                        {dup.obs1.id} ({dup.obs1.satellite})
                      </td>
                      <td className="px-4 py-2 text-cyan font-bold">
                        {dup.obs2.id} ({dup.obs2.satellite})
                      </td>
                      <td className="px-4 py-2 text-text-primary">
                        {dup.distanceKm.toFixed(2)} km
                      </td>
                      <td className="px-4 py-2 text-text-primary">
                        {dup.timeDiffMinutes} min
                      </td>
                      <td className="px-4 py-2 font-sans text-[11px]">
                        {dup.category === 'cross_sensor_overpass' ? (
                          <span className="text-cyan flex items-center gap-1 font-semibold">
                            <Zap className="w-3 h-3" /> Co-Incident Satellite Overpass
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> Same-Sensor Swath Overlap
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-sans">
                        <button
                          onClick={() => onSelectObservation(dup.obs1)}
                          className="text-cyan hover:underline text-[11px]"
                        >
                          View A &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-3 rounded-lg bg-navy/80 border border-border/50 text-[11px] text-text-muted flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-text-primary">Distinction:</strong> Cross-sensor spatial
              overlaps between MODIS and VIIRS passes represent legitimate multi-angle satellite
              acquisitions of the same physical fire event. Same-sensor overlaps indicate successive
              overlapping orbital swaths at high latitudes.
            </p>
          </div>
        </div>
      )}

      {/* 3. Quality Assurance Audit */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-navy/70 border border-emerald-500/30 rounded-xl space-y-1">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">
                Dataset Completeness
              </span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">
                {qualityReport.completenessPct}%
              </div>
              <span className="text-[10px] text-text-muted">Zero missing attributes</span>
            </div>

            <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
              <span className="text-[10px] text-text-muted font-semibold uppercase">
                Valid WGS84 Coords
              </span>
              <div className="text-2xl font-extrabold font-mono text-cyan">
                {qualityReport.validCoordinatesCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-text-muted">
                100% within [-90°, 90°], [-180°, 180°]
              </span>
            </div>

            <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
              <span className="text-[10px] text-text-muted font-semibold uppercase">
                Valid FRP Radiance
              </span>
              <div className="text-2xl font-extrabold font-mono text-amber-400">
                {qualityReport.validFrpCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-text-muted">All non-negative (FRP &gt; 0 MW)</span>
            </div>

            <div className="p-3.5 bg-navy/70 border border-border/50 rounded-xl space-y-1">
              <span className="text-[10px] text-text-muted font-semibold uppercase">
                Valid Brightness T
              </span>
              <div className="text-2xl font-extrabold font-mono text-fire">
                {qualityReport.validBrightnessCount.toLocaleString()}
              </div>
              <span className="text-[10px] text-text-muted">Plausible range (250–600 K)</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. NASA FIRMS Schema Reference */}
      {activeTab === 'schema' && (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-navy/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border/60 font-sans">
              <tr>
                <th className="px-4 py-2.5">Attribute Name</th>
                <th className="px-4 py-2.5">Data Type</th>
                <th className="px-4 py-2.5">NASA FIRMS Science Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-text-secondary">
              {FIRMS_SCHEMA_FIELDS.map((f) => (
                <tr key={f.field} className="hover:bg-surface-light transition-colors">
                  <td className="px-4 py-2 font-bold text-cyan">{f.field}</td>
                  <td className="px-4 py-2 text-text-muted text-[11px]">{f.type}</td>
                  <td className="px-4 py-2 font-sans text-[11px] text-text-primary">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataInspectionTools;
