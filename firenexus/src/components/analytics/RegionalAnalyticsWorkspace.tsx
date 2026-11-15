import React, { useState, useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  Globe,
  Search,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RegionalAnalyticsWorkspaceProps {
  observations: FireObservation[];
  selectedCountry: string;
  onSelectCountry: (country: string) => void;
}

type SortField = 'total' | 'modis' | 'viirs' | 'avgFrp' | 'highConf';

export const RegionalAnalyticsWorkspace: React.FC<RegionalAnalyticsWorkspaceProps> = ({
  observations,
  selectedCountry,
  onSelectCountry,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('total');
  const [sortAsc, setSortAsc] = useState(false);

  // Continental summary for bar chart
  const continentalSummary = useMemo(() => {
    const map = new Map<string, { modis: number; viirs: number; total: number; frpSum: number }>();

    observations.forEach((o) => {
      const c = o.continent || 'Other';
      if (!map.has(c)) {
        map.set(c, { modis: 0, viirs: 0, total: 0, frpSum: 0 });
      }
      const entry = map.get(c)!;
      entry.total += 1;
      if (o.satellite === 'MODIS') entry.modis += 1;
      else entry.viirs += 1;
      entry.frpSum += o.frp;
    });

    return Array.from(map.entries())
      .map(([continent, counts]) => ({
        continent,
        MODIS: counts.modis,
        VIIRS: counts.viirs,
        Total: counts.total,
        avgFrp: counts.total > 0 ? Math.round((counts.frpSum / counts.total) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.Total - a.Total);
  }, [observations]);

  // Country-level breakdown table
  const countryTableData = useMemo(() => {
    const map = new Map<
      string,
      {
        country: string;
        continent: string;
        modis: number;
        viirs: number;
        total: number;
        highConf: number;
        frpSum: number;
      }
    >();

    observations.forEach((o) => {
      const country = o.country || 'Unknown';
      if (!map.has(country)) {
        map.set(country, {
          country,
          continent: o.continent || 'Other',
          modis: 0,
          viirs: 0,
          total: 0,
          highConf: 0,
          frpSum: 0,
        });
      }
      const entry = map.get(country)!;
      entry.total += 1;
      if (o.satellite === 'MODIS') entry.modis += 1;
      else entry.viirs += 1;
      if (o.confidence === 'high') entry.highConf += 1;
      entry.frpSum += o.frp;
    });

    let list = Array.from(map.values()).map((c) => ({
      ...c,
      avgFrp: c.total > 0 ? Math.round((c.frpSum / c.total) * 10) / 10 : 0,
      highConfPct: c.total > 0 ? Math.round((c.highConf / c.total) * 100) : 0,
    }));

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) => c.country.toLowerCase().includes(q) || c.continent.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let diff = 0;
      if (sortField === 'total') diff = b.total - a.total;
      else if (sortField === 'modis') diff = b.modis - a.modis;
      else if (sortField === 'viirs') diff = b.viirs - a.viirs;
      else if (sortField === 'avgFrp') diff = b.avgFrp - a.avgFrp;
      else if (sortField === 'highConf') diff = b.highConfPct - a.highConfPct;
      return sortAsc ? -diff : diff;
    });

    return list;
  }, [observations, searchQuery, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Regional Biome Burden &amp; National Aggregations
            </h2>
            <span className="demo-badge text-[10px]">Geographic Drilldown</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Continental distribution rankings and country-level active fire anomaly densities with
            sensor attribution.
          </p>
        </div>

        {selectedCountry && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Filtered to:</span>
            <span className="font-bold text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/30">
              {selectedCountry}
            </span>
            <button
              onClick={() => onSelectCountry('')}
              className="text-text-muted hover:text-text-primary underline text-[11px]"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Continental Burden Bar Chart */}
      <div className="bg-navy/60 p-4 sm:p-5 rounded-xl border border-border/60 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-text-primary flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cyan" />
            Continental Active-Fire Volume by Sensor
          </span>
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-fire" /> MODIS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan" /> VIIRS
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={continentalSummary}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis
                type="category"
                dataKey="continent"
                stroke="#64748b"
                fontSize={10}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-navy/95 border border-border/80 p-2.5 rounded-lg shadow-xl text-xs space-y-1 font-mono">
                        <div className="font-bold text-text-primary font-sans border-b border-border/50 pb-1">
                          {d.continent}
                        </div>
                        <div className="text-fire">MODIS: {d.MODIS}</div>
                        <div className="text-cyan">VIIRS: {d.VIIRS}</div>
                        <div className="text-text-primary border-t border-border/40 pt-1 flex justify-between">
                          <span>Total:</span>
                          <span className="font-bold">{d.Total}</span>
                        </div>
                        <div className="text-amber-400">Mean FRP: {d.avgFrp} MW</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="MODIS" stackId="a" fill="#FF713E" radius={[0, 0, 0, 0]} />
              <Bar dataKey="VIIRS" stackId="a" fill="#00E5B0" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Country Table with Search & Sort */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search countries, continents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy/80 text-xs text-text-primary pl-9 pr-3 py-1.5 rounded-lg border border-border/60 focus:border-cyan focus:outline-none placeholder:text-text-muted"
            />
          </div>

          <span className="text-[11px] text-text-muted font-mono">
            {countryTableData.length} countries recorded in current cohort
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-navy/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border/60 font-sans">
              <tr>
                <th className="px-4 py-3">Country / Jurisdiction</th>
                <th className="px-4 py-3">Continent</th>
                <th
                  onClick={() => toggleSort('total')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan transition-colors"
                >
                  <span className="flex items-center gap-1">
                    Total Fires <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('modis')}
                  className="px-4 py-3 cursor-pointer hover:text-fire transition-colors"
                >
                  <span className="flex items-center gap-1 text-fire">
                    MODIS <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('viirs')}
                  className="px-4 py-3 cursor-pointer hover:text-cyan transition-colors"
                >
                  <span className="flex items-center gap-1 text-cyan">
                    VIIRS <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('avgFrp')}
                  className="px-4 py-3 cursor-pointer hover:text-amber-400 transition-colors"
                >
                  <span className="flex items-center gap-1 text-amber-400">
                    Mean FRP <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => toggleSort('highConf')}
                  className="px-4 py-3 cursor-pointer hover:text-emerald-400 transition-colors"
                >
                  <span className="flex items-center gap-1 text-emerald-400">
                    High Conf % <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right">Scope Filter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-text-secondary">
              {countryTableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-text-muted font-sans text-xs">
                    No geographical entries match your search criteria.
                  </td>
                </tr>
              ) : (
                countryTableData.map((row) => {
                  const isCurrent = selectedCountry === row.country;
                  return (
                    <tr
                      key={row.country}
                      className={`hover:bg-surface-light transition-colors ${
                        isCurrent ? 'bg-cyan/10 font-bold' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-bold text-text-primary font-sans">
                        {row.country}
                      </td>
                      <td className="px-4 py-2.5 text-text-muted font-sans">{row.continent}</td>
                      <td className="px-4 py-2.5 font-bold text-text-primary">
                        {row.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-fire">{row.modis.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-cyan">{row.viirs.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-amber-400 font-bold">{row.avgFrp} MW</td>
                      <td className="px-4 py-2.5 text-emerald-400">{row.highConfPct}%</td>
                      <td className="px-4 py-2.5 text-right font-sans">
                        <button
                          onClick={() => onSelectCountry(isCurrent ? '' : row.country)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                            isCurrent
                              ? 'bg-cyan/20 text-cyan border border-cyan/40'
                              : 'bg-navy/80 hover:bg-surface text-text-muted hover:text-text-primary border border-border/50'
                          }`}
                        >
                          {isCurrent ? 'Clear Filter' : 'Filter Scope'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RegionalAnalyticsWorkspace;
