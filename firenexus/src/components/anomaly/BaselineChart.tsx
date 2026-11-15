import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { AnomalyRecord } from '../../types';

interface BaselineChartProps {
  anomaly: AnomalyRecord | null;
}

export default function BaselineChart({ anomaly }: BaselineChartProps) {
  if (!anomaly) {
    return (
      <div className="card p-6 flex items-center justify-center h-[240px]">
        <p className="text-sm text-text-muted">Select an anomaly record to inspect baseline comparison</p>
      </div>
    );
  }

  const chartData = [
    {
      name: anomaly.region,
      Baseline: anomaly.baseline,
      Observed: anomaly.observed,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">
            Observed vs Baseline Deviation: {anomaly.region}
          </h3>
          <p className="text-xs text-text-muted mt-0.5">{anomaly.description}</p>
        </div>
        <span className="demo-badge">Historical Baseline</span>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#17243B',
                borderColor: '#1F2E4A',
                borderRadius: '8px',
                color: '#F1F5FF',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Baseline" fill="#64748b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Observed" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

