import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { MOCK_OBSERVATIONS, computeMonthlyActivity } from '../../data/mock/fireData';

const MODIS_COLOR = '#FF713E';
const VIIRS_COLOR = '#00E5B0';
const CHART_BG = '#17243B';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#1a2540',
    border: '1px solid #1F2E4A',
    borderRadius: '8px',
    color: '#F1F5FF',
    fontSize: '12px',
  },
  itemStyle: { color: '#F1F5FF' },
};

export default function ComparisonCharts() {
  const monthly = useMemo(() => computeMonthlyActivity(MOCK_OBSERVATIONS), []);

  const pieData = useMemo(() => {
    const modis = MOCK_OBSERVATIONS.filter(o => o.satellite === 'MODIS').length;
    const viirs = MOCK_OBSERVATIONS.filter(o => o.satellite === 'VIIRS').length;
    return [
      { name: 'MODIS', value: modis },
      { name: 'VIIRS', value: viirs },
    ];
  }, []);

  const confidenceData = useMemo(() => {
    const levels = ['low', 'nominal', 'high'] as const;
    return levels.map(level => ({
      confidence: level.charAt(0).toUpperCase() + level.slice(1),
      MODIS: MOCK_OBSERVATIONS.filter(o => o.satellite === 'MODIS' && o.confidence === level).length,
      VIIRS: MOCK_OBSERVATIONS.filter(o => o.satellite === 'VIIRS' && o.confidence === level).length,
    }));
  }, []);

  const frpData = useMemo(() => {
    const bins = [
      { label: '0–20 MW', min: 0, max: 20 },
      { label: '20–50 MW', min: 20, max: 50 },
      { label: '50–100 MW', min: 50, max: 100 },
      { label: '100+ MW', min: 100, max: Infinity },
    ];
    return bins.map(bin => ({
      range: bin.label,
      MODIS: MOCK_OBSERVATIONS.filter(
        o => o.satellite === 'MODIS' && o.frp >= bin.min && o.frp < bin.max
      ).length,
      VIIRS: MOCK_OBSERVATIONS.filter(
        o => o.satellite === 'VIIRS' && o.frp >= bin.min && o.frp < bin.max
      ).length,
    }));
  }, []);

  const PIE_COLORS = [MODIS_COLOR, VIIRS_COLOR];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-cyan" />
        <h2 className="section-title text-xl">Statistical Comparison</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Detection Counts */}
        <div className="card" style={{ backgroundColor: CHART_BG }}>
          <h3 className="text-sm font-semibold text-text-secondary mb-4">
            Monthly Detection Counts
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="modisCount" name="MODIS" fill={MODIS_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="viirsCount" name="VIIRS" fill={VIIRS_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overall Ratio */}
        <div className="card" style={{ backgroundColor: CHART_BG }}>
          <h3 className="text-sm font-semibold text-text-secondary mb-4">
            Overall Detection Ratio
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(1)}%`
                }
                labelLine={{ stroke: '#64748b' }}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Confidence Distribution */}
        <div className="card" style={{ backgroundColor: CHART_BG }}>
          <h3 className="text-sm font-semibold text-text-secondary mb-4">
            Confidence Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={confidenceData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
              <XAxis
                dataKey="confidence"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="MODIS" fill={MODIS_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="VIIRS" fill={VIIRS_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* FRP Distribution */}
        <div className="card" style={{ backgroundColor: CHART_BG }}>
          <h3 className="text-sm font-semibold text-text-secondary mb-4">
            FRP Distribution Comparison
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={frpData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
              <XAxis
                dataKey="range"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1F2E4A' }}
                tickLine={false}
              />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
              <Bar dataKey="MODIS" fill={MODIS_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="VIIRS" fill={VIIRS_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-muted italic">
        All charts use simulated demonstration data. Differences in detection counts reflect sensor characteristics — VIIRS 375m resolution detects more, smaller hotspots than MODIS 1km.
      </p>
    </motion.div>
  );
}
