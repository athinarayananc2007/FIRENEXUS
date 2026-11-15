import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X, MapPin, Thermometer, Zap, Clock, ShieldCheck,
  Database, Info, ChevronLeft, ChevronRight, Copy, Check,
} from 'lucide-react';
import type { FireObservation } from '../../types';

interface ObservationPanelProps {
  observation: FireObservation | null;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  currentIndex?: number;
  totalCount?: number;
}

export default function ObservationPanel({
  observation,
  onClose,
  onNavigate,
  currentIndex = 1,
  totalCount = 1,
}: ObservationPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!observation) return null;

  const confidenceColor =
    observation.confidence === 'high'
      ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
      : observation.confidence === 'nominal'
        ? 'text-warning bg-warning/15 border-warning/30'
        : 'text-danger bg-danger/15 border-danger/30';

  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return `${Math.abs(val).toFixed(4)}° ${dir}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${observation.latitude.toFixed(6)}, ${observation.longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      key={observation.id}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="absolute top-3 right-3 bottom-3 w-88 max-w-[calc(100vw-24px)] z-30 glass border border-border/80 rounded-2xl shadow-2xl flex flex-col backdrop-blur-xl overflow-hidden"
    >
      {/* Top Navigation & Actions Bar */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span>Observation</span>
          <span className="font-mono font-bold text-text-primary">
            {currentIndex} of {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('prev')}
            disabled={totalCount <= 1}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30"
            title="Previous Hotspot"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            disabled={totalCount <= 1}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary disabled:opacity-30"
            title="Next Hotspot"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            title="Close Telemetry"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Title & Sensor Badge */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-mono text-base font-extrabold text-cyan">{observation.id}</h3>
            <span className="text-[10px] text-text-muted">High-Fidelity Telemetry Record</span>
          </div>
          <span
            className={`badge px-2.5 py-1 text-[11px] font-semibold ${
              observation.satellite === 'MODIS' ? 'badge-fire' : 'badge-cyan'
            }`}
          >
            {observation.satellite} Instrument
          </span>
        </div>

        {/* Geographic Location Box */}
        <div className="bg-navy/80 border border-border/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-start gap-2.5 text-text-primary">
            <MapPin className="w-4 h-4 text-fire shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {observation.region}, {observation.country}
              </p>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">
                Continent: <strong className="text-text-secondary">{observation.continent}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/40 font-mono text-[11px]">
            <span className="text-text-secondary">
              {formatCoord(observation.latitude, true)}, {formatCoord(observation.longitude, false)}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-cyan hover:underline p-1 rounded"
              title="Copy decimal coordinates"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Sensor Telemetry Measurements */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* FRP */}
          <div className="bg-navy/60 border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-text-muted text-[10px] mb-1">
              <Zap className="w-3 h-3 text-fire" />
              <span>Radiative Power</span>
            </div>
            <p className="text-lg font-bold font-mono text-fire">{observation.frp} MW</p>
            <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan to-fire"
                style={{ width: `${Math.min(100, (observation.frp / 250) * 100)}%` }}
              />
            </div>
          </div>

          {/* Brightness Temperature */}
          <div className="bg-navy/60 border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-text-muted text-[10px] mb-1">
              <Thermometer className="w-3 h-3 text-cyan" />
              <span>Brightness Temp</span>
            </div>
            <p className="text-lg font-bold font-mono text-text-primary">{observation.brightness} K</p>
            <p className="text-[10px] text-text-muted mt-1">Calibrated Infrared</p>
          </div>

          {/* Confidence */}
          <div className="bg-navy/60 border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-text-muted text-[10px] mb-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Confidence</span>
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border mt-1 ${confidenceColor}`}
            >
              {observation.confidence}
            </span>
          </div>

          {/* Date & Time */}
          <div className="bg-navy/60 border border-border/60 rounded-xl p-3">
            <div className="flex items-center gap-1 text-text-muted text-[10px] mb-1">
              <Clock className="w-3 h-3 text-electric" />
              <span>Timestamp (UTC)</span>
            </div>
            <p className="font-mono text-xs font-semibold text-text-primary mt-1">{observation.time ? `${observation.time} UTC` : 'N/A'}</p>
            <p className="font-mono text-[10px] text-text-muted">{observation.date || 'Unknown date'}</p>
          </div>
        </div>

        {/* Scientific Source & Methodology Section */}
        <div className="bg-navy/40 border border-border/60 rounded-xl p-3 space-y-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Database className="w-3.5 h-3.5 text-electric shrink-0" />
            <span>
              <strong>Data Source:</strong> NASA FIRMS Active Fire Protocols (Harmonized Feed Prototype)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-warning/90">
            <Info className="w-3.5 h-3.5 text-warning shrink-0" />
            <span>
              <strong>Simulation Status:</strong> Demonstration Mock Record — Not Verified Live Fire Incident
            </span>
          </div>
        </div>
      </div>

      {/* Footer Close Button */}
      <div className="p-3 bg-navy/80 border-t border-border/60 flex items-center justify-between">
        <span className="text-[10px] text-text-muted font-mono">
          Lat/Lon: {observation.latitude.toFixed(4)}°, {observation.longitude.toFixed(4)}°
        </span>
        <button
          onClick={onClose}
          className="btn-secondary text-xs py-1.5 px-3"
        >
          Close Panel
        </button>
      </div>
    </motion.div>
  );
}
