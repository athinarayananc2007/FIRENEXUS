import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, ShieldCheck, Flame, Layers,
} from 'lucide-react';
import type { FireObservation } from '../../types';
import { computeSensorFRPStats } from '../../data/mock/fireData';

interface SideBySideSummaryProps {
  observations: FireObservation[];
}

export default function SideBySideSummary({ observations }: SideBySideSummaryProps) {
  const modis = useMemo(
    () => observations.filter((o) => o.satellite === 'MODIS'),
    [observations],
  );
  const viirs = useMemo(
    () => observations.filter((o) => o.satellite === 'VIIRS'),
    [observations],
  );

  const total = observations.length || 1;
  const modisPct = Math.round((modis.length / total) * 1000) / 10;
  const viirsPct = Math.round((viirs.length / total) * 1000) / 10;

  const frpStats = useMemo(() => computeSensorFRPStats(observations), [observations]);

  const modisHighConf = modis.filter((o) => o.confidence === 'high').length;
  const viirsHighConf = viirs.filter((o) => o.confidence === 'high').length;

  const modisHighConfPct = modis.length ? Math.round((modisHighConf / modis.length) * 1000) / 10 : 0;
  const viirsHighConfPct = viirs.length ? Math.round((viirsHighConf / viirs.length) * 1000) / 10 : 0;

  const ratio = modis.length > 0 ? (viirs.length / modis.length).toFixed(2) : '1.00';

  const metrics = [
    {
      title: 'Active Fire Detections',
      modisVal: modis.length.toLocaleString(),
      modisSub: `${modisPct}% of total`,
      viirsVal: viirs.length.toLocaleString(),
      viirsSub: `${viirsPct}% of total`,
      unit: 'observations',
      ratioLabel: `1 : ${ratio} (VIIRS : MODIS)`,
      icon: Flame,
    },
    {
      title: 'Mean Fire Radiative Power',
      modisVal: `${frpStats.modisMean}`,
      modisSub: `Peak: ${frpStats.modisMax} MW`,
      viirsVal: `${frpStats.viirsMean}`,
      viirsSub: `Peak: ${frpStats.viirsMax} MW`,
      unit: 'MW',
      ratioLabel: `Bias: ${(frpStats.viirsMean - frpStats.modisMean).toFixed(1)} MW`,
      icon: Zap,
    },
    {
      title: 'Median Fire Radiative Power',
      modisVal: `${frpStats.modisMedian}`,
      modisSub: '50th percentile energy',
      viirsVal: `${frpStats.viirsMedian}`,
      viirsSub: '50th percentile energy',
      unit: 'MW',
      ratioLabel: 'Median Robustness',
      icon: Zap,
    },
    {
      title: 'High Confidence Observations',
      modisVal: modisHighConf.toLocaleString(),
      modisSub: `${modisHighConfPct}% of MODIS`,
      viirsVal: viirsHighConf.toLocaleString(),
      viirsSub: `${viirsHighConfPct}% of VIIRS`,
      unit: 'detections',
      ratioLabel: `Delta: ${(viirsHighConfPct - modisHighConfPct).toFixed(1)}%`,
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan/15 border border-cyan/30 text-cyan">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Side-by-Side Sensor Inter-Comparison
            </h2>
            <span className="demo-badge text-[10px]">Dual-Sensor Metrics</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Statistical alignment between MODIS 1 km and VIIRS 375 m observations across the filtered cohort
          </p>
        </div>
      </div>

      {/* 4 Comparative Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05, duration: 0.35 }}
            className="glass border border-border/80 rounded-2xl p-4 shadow-xl flex flex-col justify-between hover:border-cyan/40 transition-all backdrop-blur-xl"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  {card.title}
                </span>
                <card.icon className="w-4 h-4 text-cyan" />
              </div>

              {/* Side-by-side Values */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* MODIS */}
                <div className="p-2.5 rounded-xl bg-fire/10 border border-fire/25">
                  <span className="text-[10px] font-bold text-fire uppercase block">MODIS</span>
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className="text-xl font-mono font-extrabold text-fire">
                      {card.modisVal}
                    </span>
                    <span className="text-[10px] text-text-muted">{card.unit}</span>
                  </div>
                  <span className="text-[10px] text-text-muted block truncate">
                    {card.modisSub}
                  </span>
                </div>

                {/* VIIRS */}
                <div className="p-2.5 rounded-xl bg-cyan/10 border border-cyan/25">
                  <span className="text-[10px] font-bold text-cyan uppercase block">VIIRS</span>
                  <div className="flex items-baseline gap-1 my-0.5">
                    <span className="text-xl font-mono font-extrabold text-cyan">
                      {card.viirsVal}
                    </span>
                    <span className="text-[10px] text-text-muted">{card.unit}</span>
                  </div>
                  <span className="text-[10px] text-text-muted block truncate">
                    {card.viirsSub}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Ratio Strip */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-text-muted">
              <span>Sensor Relationship</span>
              <span className="font-mono font-bold text-text-primary">
                {card.ratioLabel}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}