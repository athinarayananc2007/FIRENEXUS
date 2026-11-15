import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

interface CoordinateDisplayProps {
  latitude: number | null;
  longitude: number | null;
}

export default function CoordinateDisplay({ latitude, longitude }: CoordinateDisplayProps) {
  const formatCoord = (value: number, isLat: boolean): string => {
    const abs = Math.abs(value);
    const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');
    return `${abs.toFixed(4)}° ${dir}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 right-4 z-20 glass rounded-lg px-3 py-2"
    >
      <div className="flex items-center gap-2 text-xs">
        <Crosshair className="w-3.5 h-3.5 text-cyan" />
        {latitude !== null && longitude !== null ? (
          <span className="font-mono text-text-secondary">
            {formatCoord(latitude, true)}, {formatCoord(longitude, false)}
          </span>
        ) : (
          <span className="font-mono text-text-muted">— , —</span>
        )}
      </div>
    </motion.div>
  );
}
