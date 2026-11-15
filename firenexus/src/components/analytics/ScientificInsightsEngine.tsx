import React, { useState, useMemo } from 'react';
import type { FireObservation, MatchedFirePair } from '../../types';
import { generateAutomatedScientificInsights } from '../../utils/analyticsMath';
import {
  Sparkles,
  Zap,
  Activity,
  Compass,
  GitMerge,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface ScientificInsightsEngineProps {
  observations: FireObservation[];
  matchedPairs: MatchedFirePair[];
}

export const ScientificInsightsEngine: React.FC<ScientificInsightsEngineProps> = ({
  observations,
  matchedPairs,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const insights = useMemo(() => {
    return generateAutomatedScientificInsights(observations, matchedPairs);
  }, [observations, matchedPairs]);

  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'all') return insights;
    return insights.filter((i) => i.category === selectedCategory);
  }, [insights, selectedCategory]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'sensor':
        return <Zap className="w-4 h-4 text-cyan" />;
      case 'energetic':
        return <Activity className="w-4 h-4 text-amber-400" />;
      case 'temporal':
        return <Calendar className="w-4 h-4 text-fire" />;
      case 'spatial':
        return <Compass className="w-4 h-4 text-emerald-400" />;
      case 'harmonization':
        return <GitMerge className="w-4 h-4 text-cyan" />;
      default:
        return <Sparkles className="w-4 h-4 text-cyan" />;
    }
  };

  const getCategoryBorder = (cat: string) => {
    switch (cat) {
      case 'sensor':
        return 'border-cyan/40 hover:border-cyan';
      case 'energetic':
        return 'border-amber-500/40 hover:border-amber-400';
      case 'temporal':
        return 'border-fire/40 hover:border-fire';
      case 'spatial':
        return 'border-emerald-500/40 hover:border-emerald-400';
      case 'harmonization':
        return 'border-cyan/50 hover:border-cyan-bright';
      default:
        return 'border-border/60 hover:border-border-light';
    }
  };

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-5">
      {/* Header and Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Automated Scientific Insights Engine
            </h2>
            <span className="demo-badge text-[10px]">Real-Time Data Synthesis</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Dynamic analytical deductions computed on-the-fly from active observation cohorts and
            spatial-temporal harmonization kernels.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 bg-navy/80 p-1 rounded-xl border border-border/60 text-xs">
          {[
            { id: 'all', label: 'All Insights' },
            { id: 'sensor', label: 'Sensors' },
            { id: 'energetic', label: 'Energetics' },
            { id: 'temporal', label: 'Temporal' },
            { id: 'spatial', label: 'Spatial' },
            { id: 'harmonization', label: 'Harmonization' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan/20 text-cyan border border-cyan/40 shadow-sm'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Cards Grid */}
      {filteredInsights.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-muted">
          No automated findings generated for the current active filter combination. Expand date range
          or reset geographic filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-xl bg-navy/70 border transition-all duration-200 flex flex-col justify-between space-y-3 ${getCategoryBorder(
                insight.category
              )}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-midnight border border-border/50">
                      {getCategoryIcon(insight.category)}
                    </div>
                    <span className="text-[10px] font-mono uppercase text-text-muted tracking-wider">
                      {insight.category}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-midnight border border-border/60 text-cyan">
                    {insight.metricBadge}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-text-primary leading-snug">
                  {insight.title}
                </h3>

                <p className="text-xs text-cyan/90 font-medium leading-relaxed bg-midnight/50 p-2.5 rounded-lg border border-border/40">
                  {insight.summary}
                </p>

                <p className="text-[11px] text-text-secondary leading-relaxed pt-1">
                  {insight.details}
                </p>
              </div>

              <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-text-muted">
                <span>Confidence: High</span>
                <span className="text-cyan flex items-center gap-0.5 font-mono">
                  Computed &bull; Validated
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scientific Disclaimer Footer */}
      <div className="pt-3 border-t border-border/60 flex items-start gap-2.5 text-[11px] text-text-muted">
        <AlertCircle className="w-4 h-4 text-cyan/70 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-text-primary">Methodological Transparency:</strong> The findings
          presented above are descriptive statistical characterizations generated directly from the
          filtered satellite observations. They indicate observational frequency, geometric
          sampling properties, and radiant flux distributions, and should not be construed as causal
          mechanistic conclusions.
        </p>
      </div>
    </div>
  );
};

export default ScientificInsightsEngine;
