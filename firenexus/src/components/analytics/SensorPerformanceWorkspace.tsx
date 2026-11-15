import React, { useMemo } from 'react';
import type { FireObservation } from '../../types';
import {
  Layers,
  Info,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface SensorPerformanceWorkspaceProps {
  observations: FireObservation[];
}

const CONFIDENCE_COLORS = {
  high: '#10b981',
  nominal: '#00E5B0',
  low: '#f59e0b',
};

export const SensorPerformanceWorkspace: React.FC<SensorPerformanceWorkspaceProps> = ({
  observations,
}) => {
  const modisObs = useMemo(
    () => observations.filter((o) => o.satellite === 'MODIS'),
    [observations]
  );
  const viirsObs = useMemo(
    () => observations.filter((o) => o.satellite === 'VIIRS'),
    [observations]
  );

  // Confidence distribution comparison
  const { modisConfidence, viirsConfidence } = useMemo(() => {
    const computeSplit = (arr: FireObservation[]) => {
      let high = 0;
      let nominal = 0;
      let low = 0;
      arr.forEach((o) => {
        if (o.confidence === 'high') high += 1;
        else if (o.confidence === 'nominal') nominal += 1;
        else low += 1;
      });
      const tot = arr.length || 1;
      return [
        { name: 'High', value: high, pct: Math.round((high / tot) * 100) },
        { name: 'Nominal', value: nominal, pct: Math.round((nominal / tot) * 100) },
        { name: 'Low', value: low, pct: Math.round((low / tot) * 100) },
      ];
    };

    return {
      modisConfidence: computeSplit(modisObs),
      viirsConfidence: computeSplit(viirsObs),
    };
  }, [modisObs, viirsObs]);

  // Detection yield multiplier by continent
  const continentYield = useMemo(() => {
    const map = new Map<string, { modis: number; viirs: number }>();
    observations.forEach((o) => {
      const c = o.continent || 'Other';
      if (!map.has(c)) map.set(c, { modis: 0, viirs: 0 });
      const entry = map.get(c)!;
      if (o.satellite === 'MODIS') entry.modis += 1;
      else entry.viirs += 1;
    });

    return Array.from(map.entries())
      .map(([continent, counts]) => {
        const ratio =
          counts.modis > 0 ? Math.round((counts.viirs / counts.modis) * 10) / 10 : 0;
        return {
          continent,
          MODIS: counts.modis,
          VIIRS: counts.viirs,
          Multiplier: ratio,
        };
      })
      .sort((a, b) => b.VIIRS - a.VIIRS);
  }, [observations]);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Sensor Footprint &amp; Physical Performance Benchmarking
            </h2>
            <span className="demo-badge text-[10px]">Harmonization Science</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Rigorous cross-instrument comparison contrasting spatial sampling geometries, scan-angle
            pixel distortion, and algorithmic detection sensitivity.
          </p>
        </div>
      </div>

      {/* Sensor Specification Matrix */}
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-navy/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-navy/90 text-text-muted uppercase text-[10px] tracking-wider border-b border-border/60 font-mono">
            <tr>
              <th className="px-4 py-3">Specification Parameter</th>
              <th className="px-4 py-3 text-fire">MODIS (Aqua &amp; Terra)</th>
              <th className="px-4 py-3 text-cyan">VIIRS (Suomi-NPP &amp; NOAA-20)</th>
              <th className="px-4 py-3 text-text-primary">Harmonization Impact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono text-text-secondary">
            <tr className="hover:bg-surface-light transition-colors">
              <td className="px-4 py-2.5 font-bold text-text-primary font-sans">
                Nominal Nadir Resolution
              </td>
              <td className="px-4 py-2.5 text-fire font-bold">1,000 m (1.0 km)</td>
              <td className="px-4 py-2.5 text-cyan font-bold">375 m (0.375 km)</td>
              <td className="px-4 py-2.5 font-sans text-[11px] text-text-muted">
                1 MODIS pixel footprint contains ~7.1 VIIRS 375 m pixels at nadir.
              </td>
            </tr>
            <tr className="hover:bg-surface-light transition-colors">
              <td className="px-4 py-2.5 font-bold text-text-primary font-sans">
                Scan-Edge Pixel Size
              </td>
              <td className="px-4 py-2.5 text-fire">~4.8 km &times; 2.0 km (Bowtie)</td>
              <td className="px-4 py-2.5 text-cyan">~0.8 km &times; 0.8 km (Aggregation)</td>
              <td className="px-4 py-2.5 font-sans text-[11px] text-text-muted">
                VIIRS on-board aggregation suppresses the geometrical bowtie effect.
              </td>
            </tr>
            <tr className="hover:bg-surface-light transition-colors">
              <td className="px-4 py-2.5 font-bold text-text-primary font-sans">Swath Width</td>
              <td className="px-4 py-2.5 text-fire">2,330 km (~85% daily equatorial)</td>
              <td className="px-4 py-2.5 text-cyan">3,000 km (100% global daily)</td>
              <td className="px-4 py-2.5 font-sans text-[11px] text-text-muted">
                VIIRS eliminates inter-swath orbital orbital gaps at the equator.
              </td>
            </tr>
            <tr className="hover:bg-surface-light transition-colors">
              <td className="px-4 py-2.5 font-bold text-text-primary font-sans">
                Active Fire Channels
              </td>
              <td className="px-4 py-2.5 text-fire">Bands 21/22 (3.96 &mu;m) &amp; B31 (11 &mu;m)</td>
              <td className="px-4 py-2.5 text-cyan">I4 (3.74 &mu;m) &amp; I5 (11.45 &mu;m) + M13</td>
              <td className="px-4 py-2.5 font-sans text-[11px] text-text-muted">
                VIIRS uses dual-gain M13 channel (~4.05 &mu;m) to prevent detector saturation.
              </td>
            </tr>
            <tr className="hover:bg-surface-light transition-colors">
              <td className="px-4 py-2.5 font-bold text-text-primary font-sans">
                Historical Climatology
              </td>
              <td className="px-4 py-2.5 text-fire">2000–Present (24+ continuous years)</td>
              <td className="px-4 py-2.5 text-cyan">2012–Present (Suomi-NPP), 2017– (NOAA-20)</td>
              <td className="px-4 py-2.5 font-sans text-[11px] text-text-muted">
                MODIS provides the definitive long-term satellite climate record (CDR).
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Side-by-Side Confidence Distributions & Regional Multiplier */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Dual Donut Confidence Charts */}
        <div className="bg-navy/60 p-4 sm:p-5 rounded-xl border border-border/60 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Algorithm Confidence Distributions
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan" /> Nominal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Low
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* MODIS Donut */}
            <div className="space-y-1 text-center">
              <span className="text-xs font-bold text-fire">MODIS (1 km)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modisConfidence}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      <Cell fill={CONFIDENCE_COLORS.high} />
                      <Cell fill={CONFIDENCE_COLORS.nominal} />
                      <Cell fill={CONFIDENCE_COLORS.low} />
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-navy/95 border border-border/80 p-2 rounded shadow text-[11px] font-mono">
                              <div>
                                {d.name} Confidence: {d.value} ({d.pct}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {modisObs.length.toLocaleString()} fires
              </div>
            </div>

            {/* VIIRS Donut */}
            <div className="space-y-1 text-center">
              <span className="text-xs font-bold text-cyan">VIIRS (375 m)</span>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={viirsConfidence}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      <Cell fill={CONFIDENCE_COLORS.high} />
                      <Cell fill={CONFIDENCE_COLORS.nominal} />
                      <Cell fill={CONFIDENCE_COLORS.low} />
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-navy/95 border border-border/80 p-2 rounded shadow text-[11px] font-mono">
                              <div>
                                {d.name} Confidence: {d.value} ({d.pct}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[11px] text-text-muted font-mono">
                {viirsObs.length.toLocaleString()} fires
              </div>
            </div>
          </div>
        </div>

        {/* Regional Detection Multiplier */}
        <div className="bg-navy/60 p-4 sm:p-5 rounded-xl border border-border/60 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan" />
              VIIRS-to-MODIS Detection Multiplier by Continent
            </span>
            <span className="text-[10px] font-mono text-cyan">VIIRS Count / MODIS Count</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={continentYield}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis type="number" stroke="#64748b" fontSize={10} unit="x" />
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
                          <div className="text-amber-400 font-bold border-t border-border/40 pt-1">
                            Multiplier: {d.Multiplier}x VIIRS yield
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="Multiplier" fill="#00E5B0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scientific Stance Callout */}
      <div className="p-4 rounded-xl bg-navy/80 border border-border/60 text-xs text-text-secondary flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-bold text-text-primary">
            Neutral Scientific Stance: Complementarity &ne; Superiority
          </h4>
          <p className="leading-relaxed">
            Remote sensing science emphasizes that neither sensor is universally "better". While
            VIIRS's 375 m pixel size provides superior resolution for small agricultural fires and
            sharp perimeter mapping, MODIS's historical depth spanning more than two decades makes it
            indispensable for long-term climate modeling. Harmonization models (such as those employed
            in FIRENEXUS) calibrate cross-sensor scaling factors so scientists can reliably transition
            from MODIS to VIIRS without introducing artificial trends into global climate datasets.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SensorPerformanceWorkspace;
