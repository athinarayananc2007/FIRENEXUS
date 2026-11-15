import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Calendar } from 'lucide-react';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface TimeSliderProps {
  monthRange: [number, number]; // 0-11
  onMonthRangeChange: (range: [number, number]) => void;
}

export default function TimeSlider({ monthRange, onMonthRangeChange }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        const nextEnd = monthRange[1] >= 11 ? 0 : monthRange[1] + 1;
        onMonthRangeChange([0, nextEnd]);
      }, 1200);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, monthRange, onMonthRangeChange]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val <= monthRange[1]) {
      onMonthRangeChange([val, monthRange[1]]);
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val >= monthRange[0]) {
      onMonthRangeChange([monthRange[0], val]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 glass rounded-xl px-5 py-3 flex items-center gap-4 max-w-lg w-[90%]"
    >
      {/* Play / Pause */}
      <button
        onClick={handlePlayPause}
        className="btn-ghost p-1.5 rounded-lg"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <Pause className="w-4 h-4 text-cyan" />
        ) : (
          <Play className="w-4 h-4 text-cyan" />
        )}
      </button>

      {/* Current range label */}
      <div className="flex items-center gap-1.5 min-w-[110px]">
        <Calendar className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs font-medium text-text-secondary whitespace-nowrap">
          {MONTHS[monthRange[0]]} – {MONTHS[monthRange[1]]} 2024
        </span>
      </div>

      {/* Dual range sliders (layered) */}
      <div className="flex-1 relative flex flex-col gap-1">
        <input
          type="range"
          min={0}
          max={11}
          value={monthRange[0]}
          onChange={handleStartChange}
          className="w-full accent-cyan h-1 bg-border rounded cursor-pointer"
        />
        <input
          type="range"
          min={0}
          max={11}
          value={monthRange[1]}
          onChange={handleEndChange}
          className="w-full accent-fire h-1 bg-border rounded cursor-pointer"
        />
        {/* Month ticks */}
        <div className="flex justify-between mt-0.5">
          {MONTHS.map((m) => (
            <span key={m} className="text-[8px] text-text-muted">{m[0]}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
