import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Table } from 'lucide-react';
import { MOCK_OBSERVATIONS, getComparisonTable } from '../../data/mock/fireData';

export default function ComparisonTable() {
  const rows = useMemo(() => getComparisonTable(MOCK_OBSERVATIONS), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-5">
        <Table className="w-5 h-5 text-cyan" />
        <h2 className="section-title text-xl">Sensor Specifications & Statistics</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 border-b border-border text-text-muted font-semibold uppercase tracking-wider text-xs">
                Parameter
              </th>
              <th className="text-left px-4 py-3 border-b border-border font-semibold uppercase tracking-wider text-xs text-fire">
                MODIS
              </th>
              <th className="text-left px-4 py-3 border-b border-border font-semibold uppercase tracking-wider text-xs text-cyan">
                VIIRS
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.parameter}
                className={`transition-colors hover:bg-surface-light ${
                  i % 2 === 0 ? 'bg-navy/30' : 'bg-transparent'
                }`}
              >
                <td className="px-4 py-3 text-text-secondary font-medium">
                  {row.parameter}
                </td>
                <td className="px-4 py-3 text-fire-bright font-mono">
                  {row.modis}
                </td>
                <td className="px-4 py-3 text-cyan font-mono">
                  {row.viirs}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-text-muted italic">
        Statistics derived from simulated demonstration data. Detection counts are not directly comparable between sensors due to differing spatial resolutions and algorithms.
      </p>
    </motion.div>
  );
}
