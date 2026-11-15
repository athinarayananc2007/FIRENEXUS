import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

export default function GlobeLegend() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="absolute bottom-16 left-4 z-20 glass rounded-xl p-4 min-w-[180px]"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
        Legend
      </h4>

      {/* Satellite markers */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-fire shrink-0" />
          <span className="text-xs text-text-secondary">MODIS Detection</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan shrink-0" />
          <span className="text-xs text-text-secondary">VIIRS Detection</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="border-t border-border/40 pt-3 mb-3">
        <p className="text-xs text-text-muted mb-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Confidence
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fire opacity-40 shrink-0" />
            <span className="text-[10px] text-text-muted">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-fire opacity-70 shrink-0" />
            <span className="text-[10px] text-text-muted">Nominal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-fire shrink-0" />
            <span className="text-[10px] text-text-muted">High</span>
          </div>
        </div>
      </div>

      {/* FRP scale */}
      <div className="border-t border-border/40 pt-3">
        <p className="text-xs text-text-muted mb-1.5">FRP Scale</p>
        <div className="h-2 rounded-full bg-gradient-to-r from-fire-dim via-fire to-fire-bright" />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-text-muted">Low</span>
          <span className="text-[10px] text-text-muted">High</span>
        </div>
      </div>
    </motion.div>
  );
}
