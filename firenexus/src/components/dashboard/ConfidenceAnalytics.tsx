import { useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Shield, Info,
} from 'lucide-react';
import type { FireObservation, ConfidenceLevel } from '../../types';
import { computeConfidenceBreakdown } from '../../data/mock/fireData';

interface ConfidenceAnalyticsProps {
  observations: FireObservation[];
  onFilterConfidence?: (conf: ConfidenceLevel[]) => void;
}

export default function ConfidenceAnalytics({
  observations,
  onFilterConfidence,
}: ConfidenceAnalyticsProps) {
  const breakdown = useMemo(
    () => computeConfidenceBreakdown(observations),
    [observations],
  );

  return (
    <div className="glass border border-border/80 rounded-2xl shadow-xl p-5 flex flex-col justify-between backdrop-blur-xl space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Detection Confidence Analytics
            </h3>
            <p className="text-xs text-text-secondary">
              Algorithmic quality categorization and false-alarm suppression
            </p>
          </div>
        </div>
        <span className="demo-badge text-[10px]">Data Quality</span>
      </div>

      {/* Confidence Level Progress Rows */}
      <div className="space-y-3">
        {breakdown.map((item) => {
          const isHigh = item.confidence === 'high';
          const isNominal = item.confidence === 'nominal';

          const colorClass = isHigh
            ? 'text-emerald-400 bg-emerald-500'
            : isNominal
              ? 'text-warning bg-amber-400'
              : 'text-rose-400 bg-rose-400';

          const borderClass = isHigh
            ? 'border-emerald-500/30 hover:border-emerald-500/60'
            : isNominal
              ? 'border-warning/30 hover:border-warning/60'
              : 'border-rose-500/30 hover:border-rose-500/60';

          const Icon = isHigh ? ShieldCheck : isNominal ? Shield : ShieldAlert;

          return (
            <div
              key={item.confidence}
              onClick={() => onFilterConfidence?.([item.confidence])}
              className={`p-3 rounded-xl bg-surface/40 hover:bg-surface-light border ${borderClass} transition-all cursor-pointer group`}
              title={`Filter dashboard to ${item.confidence} confidence only`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                  <span className="font-bold text-text-primary capitalize group-hover:text-cyan transition-colors">
                    {item.confidence} Confidence
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-text-primary">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 rounded-full bg-navy overflow-hidden">
                <div
                  className={`h-full rounded-full ${colorClass.split(' ')[1]} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>

              {/* Sensor Distribution & Avg FRP */}
              <div className="flex items-center justify-between text-[10px] text-text-muted mt-2">
                <span>
                  Sensor Split:{' '}
                  <strong className="text-fire font-mono">{item.modis} MODIS</strong> /{' '}
                  <strong className="text-cyan font-mono">{item.viirs} VIIRS</strong>
                </span>
                <span>
                  Mean FRP:{' '}
                  <strong className="text-amber-400 font-mono">{item.avgFrp} MW</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Algorithmic Methodology Note */}
      <div className="pt-2 border-t border-border/50 text-[11px] text-text-muted flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-cyan shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-secondary">Quality Assurance:</strong> High confidence denotes thermal anomaly radiance exceeding background noise by &gt;3σ with cloud-mask and glint clearing.
        </p>
      </div>
    </div>
  );
}