import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight,
  Calendar, FastForward,
} from 'lucide-react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AdvancedTimelineProps {
  selectedMonth: number | null; // 0-11 or null for All Year
  onSelectMonth: (month: number | null) => void;
  selectedYear: number;
  onSelectYear: (year: number) => void;
  visibleCount: number;
  monthlyCounts: number[];
}

export default function AdvancedTimeline({
  selectedMonth,
  onSelectMonth,
  selectedYear,
  onSelectYear,
  visibleCount,
  monthlyCounts,
}: AdvancedTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const delay = Math.round(1400 / playbackSpeed);
      intervalRef.current = setInterval(() => {
        const nextMonth = selectedMonth === null || selectedMonth >= 11 ? 0 : selectedMonth + 1;
        onSelectMonth(nextMonth);
      }, delay);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed, selectedMonth, onSelectMonth]);

  const handlePrev = useCallback(() => {
    if (selectedMonth === null) {
      onSelectMonth(11);
    } else {
      onSelectMonth(selectedMonth <= 0 ? 11 : selectedMonth - 1);
    }
  }, [selectedMonth, onSelectMonth]);

  const handleNext = useCallback(() => {
    if (selectedMonth === null) {
      onSelectMonth(0);
    } else {
      onSelectMonth(selectedMonth >= 11 ? 0 : selectedMonth + 1);
    }
  }, [selectedMonth, onSelectMonth]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    onSelectMonth(null);
  }, [onSelectMonth]);

  const maxMonthCount = Math.max(...monthlyCounts, 1);

  return (
    <div className="w-full max-w-4xl mx-auto glass border border-border/80 rounded-2xl shadow-xl px-3.5 py-2.5 sm:px-4 sm:py-3 backdrop-blur-xl">
      {/* Top Status & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        {/* Playback & Step Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`p-2 rounded-xl border transition-all ${
              isPlaying
                ? 'bg-cyan text-midnight border-cyan font-bold shadow-md shadow-cyan-dim'
                : 'btn-ghost glass text-cyan border-border/60 hover:bg-surface-light'
            }`}
            title={isPlaying ? 'Pause Playback' : 'Play Timeline'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={handlePrev}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="btn-ghost p-1.5 rounded-lg text-text-muted hover:text-text-primary"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />

          {/* Speed Toggle */}
          <button
            onClick={() => setPlaybackSpeed((s) => (s === 0.5 ? 1 : s === 1 ? 2 : 0.5))}
            className="btn-ghost text-[10px] font-mono px-2 py-1 rounded-lg border border-border/60 text-text-secondary hover:text-text-primary flex items-center gap-1"
            title="Change Playback Speed"
          >
            <FastForward className="w-3 h-3 text-cyan" />
            <span>{playbackSpeed}x</span>
          </button>

          {/* Reset / All Months Button */}
          <button
            onClick={handleReset}
            className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all ${
              selectedMonth === null
                ? 'bg-cyan/15 text-cyan border border-cyan/40 font-bold'
                : 'text-text-muted hover:text-text-primary border border-border/40'
            }`}
            title="Show All Months"
          >
            All Year
          </button>
        </div>

        {/* Current Time Period Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-text-primary">
            <Calendar className="w-3.5 h-3.5 text-fire" />
            <span className="font-semibold">
              {selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Full Year ${selectedYear}`}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] bg-navy/80 px-2.5 py-1 rounded-lg border border-border/60">
            <span className="text-cyan font-bold">{visibleCount.toLocaleString()}</span>
            <span className="text-text-muted">hotspots</span>
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => onSelectYear(Number(e.target.value))}
            className="bg-navy border border-border/60 text-text-primary text-[11px] font-mono py-1 px-2 rounded-lg focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
            <option value={2022}>2022</option>
          </select>
        </div>
      </div>

      {/* Interactive 12-Month Scrub Bar with Monthly Relative Activity Bars */}
      <div className="grid grid-cols-12 gap-1 pt-1 border-t border-border/40">
        {MONTH_NAMES.map((name, idx) => {
          const isSelected = selectedMonth === idx;
          const count = monthlyCounts[idx] || 0;
          const barHeightPct = Math.max(15, Math.round((count / maxMonthCount) * 100));

          return (
            <button
              key={name}
              onClick={() => onSelectMonth(idx)}
              className={`group flex flex-col items-center justify-end p-1 rounded-lg transition-all relative ${
                isSelected
                  ? 'bg-cyan/20 border border-cyan/50 text-cyan shadow-sm shadow-cyan-dim'
                  : 'hover:bg-surface-light border border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {/* Mini relative fire density bar */}
              <div className="w-full h-5 flex items-end justify-center mb-1">
                <div
                  className={`w-full max-w-[12px] rounded-t-sm transition-all duration-300 ${
                    isSelected ? 'bg-cyan' : 'bg-fire/40 group-hover:bg-fire/80'
                  }`}
                  style={{ height: `${barHeightPct}%` }}
                />
              </div>

              {/* Month abbreviation */}
              <span className={`text-[10px] font-mono ${isSelected ? 'font-bold text-cyan' : ''}`}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
