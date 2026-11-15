import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { AnomalyRecord } from '../../types';

interface AnomalyTimelineProps {
  anomalies: AnomalyRecord[];
}

export default function AnomalyTimeline({ anomalies }: AnomalyTimelineProps) {
  const chartData = anomalies.slice(0, 10).map((a) => ({
    name: a.region,
    score: Math.round(a.score * 100),
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Top 10 Anomaly Severity Scores (%)</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Dotted red line indicates +50% threshold for critical escalation
          </p>
        </div>
        <span className="demo-badge">Simulated</span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
            <XAxis type="number" stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#17243B',
                borderColor: '#1F2E4A',
                borderRadius: '8px',
                color: '#F1F5FF',
              }}
              formatter={(val: any) => [`+${val}% deviation`, 'Anomaly Severity']}
            />
            <ReferenceLine x={50} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Elevated (50%)', fill: '#ef4444', fontSize: 10, position: 'top' }} />
            <Bar dataKey="score" fill="#FF713E" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

