import React from 'react';
import {
  Database,
  Flame,
  Zap,
  ShieldCheck,
  Globe2,
  Filter,
} from 'lucide-react';
import type { FireObservation } from '../../types';

interface DataOverviewBarProps {
  totalRecords: number;
  filteredRecords: number;
  observations: FireObservation[];
  totalCountriesCount: number;
  totalContinentsCount: number;
}

export const DataOverviewBar: React.FC<DataOverviewBarProps> = ({
  totalRecords,
  filteredRecords,
  observations,
  totalCountriesCount,
  totalContinentsCount,
}) => {
  const modisCount = observations.filter((o) => o.satellite === 'MODIS').length;
  const viirsCount = observations.filter((o) => o.satellite === 'VIIRS').length;
  const highConfCount = observations.filter((o) => o.confidence === 'high').length;

  const modisPct = filteredRecords > 0 ? Math.round((modisCount / filteredRecords) * 100) : 0;
  const viirsPct = filteredRecords > 0 ? Math.round((viirsCount / filteredRecords) * 100) : 0;
  const highConfPct = filteredRecords > 0 ? Math.round((highConfCount / filteredRecords) * 100) : 0;
  const filteredPct = totalRecords > 0 ? Math.round((filteredRecords / totalRecords) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total in Dataset */}
        <div className="card p-4 bg-surface/95 border-border/80 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Total Database
            </span>
            <Database className="w-3.5 h-3.5 text-cyan" />
          </div>
          <div className="text-xl font-extrabold font-mono text-text-primary">
            {totalRecords.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Global active fire pixels</div>
        </div>

        {/* Current Filtered Record Count */}
        <div className="card p-4 bg-surface/95 border-cyan/40 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-cyan">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              Filtered Records
            </span>
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-extrabold font-mono text-cyan">
            {filteredRecords.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">{filteredPct}% of total cohort</div>
        </div>

        {/* MODIS Records */}
        <div className="card p-4 bg-surface/95 border-fire/30 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-fire">
            <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3" /> MODIS (1 km)
            </span>
            <span className="text-[10px] font-mono bg-fire/15 px-1 rounded">{modisPct}%</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-fire">
            {modisCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Terra &amp; Aqua passes</div>
        </div>

        {/* VIIRS Records */}
        <div className="card p-4 bg-surface/95 border-cyan/30 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-cyan">
            <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> VIIRS (375 m)
            </span>
            <span className="text-[10px] font-mono bg-cyan/15 px-1 rounded">{viirsPct}%</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-cyan">
            {viirsCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Suomi-NPP &amp; NOAA-20</div>
        </div>

        {/* High Confidence Records */}
        <div className="card p-4 bg-surface/95 border-emerald-500/30 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> High Confidence
            </span>
            <span className="text-[10px] font-mono bg-emerald-500/15 px-1 rounded">{highConfPct}%</span>
          </div>
          <div className="text-xl font-extrabold font-mono text-emerald-400">
            {highConfCount.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-muted">Strict algorithm check</div>
        </div>

        {/* Geographic Coverage */}
        <div className="card p-4 bg-surface/95 border-border/80 shadow-md flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Globe2 className="w-3 h-3 text-cyan" /> Geographic Scope
            </span>
          </div>
          <div className="text-xl font-extrabold font-mono text-text-primary">
            {totalCountriesCount}{' '}
            <span className="text-xs font-normal text-text-muted">countries</span>
          </div>
          <div className="text-[10px] text-text-muted">{totalContinentsCount} continents recorded</div>
        </div>
      </div>
    </div>
  );
};

export default DataOverviewBar;

