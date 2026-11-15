import { motion } from 'framer-motion';
import {
  Globe2, Map, RotateCcw, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import type { ConfidenceLevel } from '../../types';

interface ExplorerControlsProps {
  viewMode: 'globe' | 'map';
  onViewModeChange: (mode: 'globe' | 'map') => void;
  showMODIS: boolean;
  showVIIRS: boolean;
  onToggleMODIS: () => void;
  onToggleVIIRS: () => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onResetCamera: () => void;
  confidenceFilter: ConfidenceLevel[];
  onToggleConfidence: (level: ConfidenceLevel) => void;
}

const CONF_LEVELS: ConfidenceLevel[] = ['low', 'nominal', 'high'];

export default function ExplorerControls({
  viewMode,
  onViewModeChange,
  showMODIS,
  showVIIRS,
  onToggleMODIS,
  onToggleVIIRS,
  autoRotate,
  onToggleAutoRotate,
  onResetCamera,
  confidenceFilter,
  onToggleConfidence,
}: ExplorerControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute top-4 left-4 z-20 glass rounded-xl p-4 space-y-4 w-52"
    >
      {/* View mode toggle */}
      <div>
        <h4 className="label-text mb-2">View Mode</h4>
        <div className="flex gap-1">
          <button
            onClick={() => onViewModeChange('globe')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'globe'
                ? 'bg-cyan/15 text-cyan border border-cyan/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light border border-transparent'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Globe
          </button>
          <button
            onClick={() => onViewModeChange('map')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'map'
                ? 'bg-cyan/15 text-cyan border border-cyan/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-light border border-transparent'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Map
          </button>
        </div>
      </div>

      {/* Layer toggles */}
      <div>
        <h4 className="label-text mb-2">Layers</h4>
        <div className="space-y-1.5">
          <button
            onClick={onToggleMODIS}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-surface-light transition-colors"
          >
            {showMODIS ? (
              <Eye className="w-3.5 h-3.5 text-fire" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span className="w-2 h-2 rounded-full bg-fire shrink-0" />
            <span className={showMODIS ? 'text-text-primary' : 'text-text-muted'}>
              MODIS
            </span>
          </button>
          <button
            onClick={onToggleVIIRS}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-surface-light transition-colors"
          >
            {showVIIRS ? (
              <Eye className="w-3.5 h-3.5 text-cyan" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span className="w-2 h-2 rounded-full bg-cyan shrink-0" />
            <span className={showVIIRS ? 'text-text-primary' : 'text-text-muted'}>
              VIIRS
            </span>
          </button>
        </div>
      </div>

      {/* Confidence filter */}
      <div>
        <h4 className="label-text mb-2">Confidence</h4>
        <div className="space-y-1.5">
          {CONF_LEVELS.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 px-2 py-1 rounded-lg text-xs cursor-pointer hover:bg-surface-light transition-colors"
            >
              <input
                type="checkbox"
                checked={confidenceFilter.includes(level)}
                onChange={() => onToggleConfidence(level)}
                className="accent-cyan w-3.5 h-3.5 rounded"
              />
              <span className="capitalize text-text-secondary">{level}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Globe-only controls */}
      {viewMode === 'globe' && (
        <div className="space-y-1.5 border-t border-border/40 pt-3">
          <button
            onClick={onToggleAutoRotate}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-surface-light transition-colors"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 ${autoRotate ? 'text-cyan' : 'text-text-muted'}`}
            />
            <span className={autoRotate ? 'text-text-primary' : 'text-text-muted'}>
              Auto-rotate {autoRotate ? 'On' : 'Off'}
            </span>
          </button>
          <button
            onClick={onResetCamera}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-surface-light transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-secondary">Reset Camera</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
