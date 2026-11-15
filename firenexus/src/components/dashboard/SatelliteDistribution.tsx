import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { FireObservation } from '../../types';

interface SatelliteDistributionProps {
  observations: FireObservation[];
}

const COLORS = { MODIS: '#FF713E', VIIRS: '#00E5B0' } as const;

interface SliceData {
  name: string;
  value: number;
  percentage: string;
}

export default function SatelliteDistribution({
  observations,
}: SatelliteDistributionProps) {
  const data = useMemo<SliceData[]>(() => {
    const modis = observations.filter(o => o.satellite === 'MODIS').length;
    const viirs = observations.filter(o => o.satellite === 'VIIRS').length;
    const total = modis + viirs || 1;
    return [
      {
        name: 'MODIS',
        value: modis,
        percentage: ((modis / total) * 100).toFixed(1),
      },
      {
        name: 'VIIRS',
        value: viirs,
        percentage: ((viirs / total) * 100).toFixed(1),
      },
    ];
  }, [observations]);

  return (
    <div className="card h-full">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Satellite Distribution
      </h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map(entry => (
              <Cell
                key={entry.name}
                fill={COLORS[entry.name as keyof typeof COLORS]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#17243B',
              border: '1px solid #1F2E4A',
              borderRadius: '8px',
              color: '#F1F5FF',
            }}
            formatter={(value: any, name: any) => [
              `${Number(value ?? 0).toLocaleString()} observations`,
              String(name ?? ''),
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 13, color: '#94a3b8' }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 mt-2">
        {data.map(d => (
          <div key={d.name} className="text-center">
            <p
              className="text-2xl font-bold"
              style={{ color: COLORS[d.name as keyof typeof COLORS] }}
            >
              {d.percentage}%
            </p>
            <p className="text-xs text-text-muted">{d.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
