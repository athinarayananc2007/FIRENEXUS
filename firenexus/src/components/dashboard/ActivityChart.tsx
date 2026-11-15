import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { FireObservation } from '../../types';
import { computeMonthlyActivity } from '../../data/mock/fireData';

interface ActivityChartProps {
  observations: FireObservation[];
}

export default function ActivityChart({ observations }: ActivityChartProps) {
  const data = useMemo(
    () => computeMonthlyActivity(observations),
    [observations],
  );

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="section-title">Monthly Activity Trends</h2>
        <span className="demo-badge">Simulated Data</span>
      </div>

      <div className="card">
        <ResponsiveContainer width="100%" height={360}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradModis" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF713E" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#FF713E" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradViirs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E5B0" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00E5B0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#1F2E4A' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#1F2E4A' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#17243B',
                border: '1px solid #1F2E4A',
                borderRadius: '8px',
                color: '#F1F5FF',
              }}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8', fontSize: 13 }}
            />
            <Area
              type="monotone"
              dataKey="modisCount"
              name="MODIS"
              stackId="1"
              stroke="#FF713E"
              fill="url(#gradModis)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="viirsCount"
              name="VIIRS"
              stackId="1"
              stroke="#00E5B0"
              fill="url(#gradViirs)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
