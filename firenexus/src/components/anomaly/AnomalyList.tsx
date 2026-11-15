import { AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { AnomalyRecord } from '../../types';

interface AnomalyListProps {
  anomalies: AnomalyRecord[];
  selectedAnomaly: AnomalyRecord | null;
  onSelect: (item: AnomalyRecord) => void;
}

export default function AnomalyList({
  anomalies,
  selectedAnomaly,
  onSelect,
}: AnomalyListProps) {
  return (
    <div className="card p-6 flex flex-col h-[520px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Regional Anomaly Index</h3>
          <p className="text-xs text-text-muted mt-0.5">Ranked deviation against baseline</p>
        </div>
        <span className="demo-badge">Algorithm Demo</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {anomalies.map((item) => {
          const isSelected = selectedAnomaly?.id === item.id;
          const isSevere = item.score > 0.5;
          const isModerate = item.score > 0.25 && item.score <= 0.5;

          return (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-fire bg-surface-light shadow-md'
                  : 'border-border/60 bg-navy/60 hover:bg-surface-light'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSevere ? (
                    <AlertTriangle className="w-4 h-4 text-danger" />
                  ) : isModerate ? (
                    <TrendingUp className="w-4 h-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-cyan" />
                  )}
                  <h4 className="text-sm font-semibold text-text-primary">{item.region}</h4>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSevere
                      ? 'bg-danger/20 text-danger border border-danger/40'
                      : isModerate
                        ? 'bg-warning/20 text-warning border border-warning/40'
                        : 'bg-cyan/20 text-cyan border border-cyan/40'
                  }`}
                >
                  +{Math.round(item.score * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted mt-2 pt-2 border-t border-border/40">
                <span>Observed: <strong className="text-text-primary">{item.observed}</strong></span>
                <span>Baseline: <strong className="text-text-secondary">{item.baseline}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

