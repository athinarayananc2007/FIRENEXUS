import React, { useMemo } from 'react';
import type { FireObservation } from '../../types';
import { computeMultiYearComparison } from '../../data/mock/fireData';
import {
  History,
  TrendingUp,
  TrendingDown,
  Flame,
  Zap,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface HistoricalYearComparisonProps {
  observations: FireObservation[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
}

export const HistoricalYearComparison: React.FC<HistoricalYearComparisonProps> = ({
  observations,
  selectedYear,
  onSelectYear,
}) => {
  const multiYearRecords = useMemo(() => {
    return computeMultiYearComparison(observations);
  }, [observations]);

  const chartData = useMemo(() => {
    return [...multiYearRecords]
      .reverse()
      .map((r) => ({
        year: String(r.year),
        MODIS: r.modisTotal,
        VIIRS: r.viirsTotal,
        Total: r.totalHotspots,
        AvgFRP: r.avgFrp,
      }));
  }, [multiYearRecords]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
            <History className="w-5 h-5 text-cyan" />
            Historical Multi-Year Comparison (2021 – 2024)
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Interannual active-fire frequency baselines harmonized across orbital drift and sensor
            calibration epochs.
          </p>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-1.5 font-mono">
          <CalendarCheck className="w-4 h-4 text-cyan" />
          <span>Active Baseline: {selectedYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy/90 text-text-muted font-mono uppercase text-[10px] tracking-wider border-b border-border/60">
              <tr>
                <th className="px-3.5 py-3">Year</th>
                <th className="px-3.5 py-3">Total Fires</th>
                <th className="px-3.5 py-3">MODIS</th>
                <th className="px-3.5 py-3">VIIRS</th>
                <th className="px-3.5 py-3">Avg FRP</th>
                <th className="px-3.5 py-3">Peak Month</th>
                <th className="px-3.5 py-3 text-right">YoY Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono text-text-secondary">
              {multiYearRecords.map((r) => {
                const isSelected = selectedYear === r.year;
                const isPositive = r.yoyChangePct > 0;

                return (
                  <tr
                    key={r.year}
                    onClick={() => onSelectYear(r.year)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan/15 font-bold text-text-primary'
                        : 'hover:bg-surface-light'
                    }`}
                  >
                    <td className="px-3.5 py-3 flex items-center gap-1.5">
                      <span className="font-bold text-text-primary">{r.year}</span>
                      {r.year === 2024 ? (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-cyan/20 text-cyan border border-cyan/40">
                          Observed
                        </span>
                      ) : (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-navy text-text-muted border border-border/40">
                          Harmonized
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-bold text-text-primary">
                      {r.totalHotspots.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-3 text-fire">
                      {r.modisTotal.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-3 text-cyan">
                      {r.viirsTotal.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-3 text-amber-400">
                      {r.avgFrp} MW
                    </td>
                    <td className="px-3.5 py-3 font-sans text-xs text-text-secondary">
                      {r.peakMonth}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPositive
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        {isPositive ? `+${r.yoyChangePct}%` : `${r.yoyChangePct}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Grouped Bar Chart */}
        <div className="bg-navy/60 p-4 rounded-xl border border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary">Annual Detections by Sensor</span>
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan" /> VIIRS
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis
                  dataKey="year"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                            Year {d.year}
                          </div>
                          <div className="text-fire flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3" /> MODIS:
                            </span>
                            <span>{d.MODIS}</span>
                          </div>
                          <div className="text-cyan flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" /> VIIRS:
                            </span>
                            <span>{d.VIIRS}</span>
                          </div>
                          <div className="text-text-primary border-t border-border/40 pt-1 flex items-center justify-between gap-3">
                            <span>Total Detections:</span>
                            <span className="font-bold">{d.Total}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ display: 'none' }} />
                <Bar dataKey="MODIS" fill="#FF713E" radius={[3, 3, 0, 0]} />
                <Bar dataKey="VIIRS" fill="#00E5B0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scientific Note on Baseline Harmonization */}
      <div className="p-3.5 rounded-lg bg-navy/80 border border-border/50 text-xs text-text-secondary flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-cyan/70 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-primary">Harmonization Caveat:</strong> Historical records
          prior to 2024 are standardized to remove instrument drift and changes in orbital equatorial
          crossing times (ECT). Terra's drifting orbit from 2020 onward alters solar illumination
          angles and peak fire diurnal sampling, necessitating FIRENEXUS's sensor normalization
          equations for accurate interannual trend reporting.
        </p>
      </div>
    </div>
  );
};

export default HistoricalYearComparison;

