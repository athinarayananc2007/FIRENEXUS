import React, { useState, useMemo } from 'react';
import type { EnrichedCalendarDay } from '../../types';
import { Calendar as CalendarIcon, Info, Sparkles, X } from 'lucide-react';

interface AnnualHeatmapCalendarProps {
  year: number;
  enrichedMap: Map<string, EnrichedCalendarDay>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  selectedSensor: 'ALL' | 'MODIS' | 'VIIRS';
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const AnnualHeatmapCalendar: React.FC<AnnualHeatmapCalendarProps> = ({
  year,
  enrichedMap,
  selectedDate,
  onSelectDate,
  selectedMonth,
  onSelectMonth,
  selectedSensor,
}) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Month metadata: day count and starting day of week
  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      // Days in month: day 0 of monthIndex + 1 gives the last day of monthIndex
      const daysCount = new Date(year, monthIndex + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

      // Aggregate counts for month header
      let totalMonthCount = 0;
      let monthFrpSum = 0;
      let daysWithFires = 0;

      const days = Array.from({ length: daysCount }, (_, d) => {
        const dayNum = d + 1;
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(dayNum).padStart(2, '0');
        const dateStr = `${year}-${mm}-${dd}`;
        const dayInfo = enrichedMap.get(dateStr);

        let count = 0;
        let modis = 0;
        let viirs = 0;
        let avgFrp = 0;
        let highConf = 0;

        if (dayInfo) {
          if (selectedSensor === 'MODIS') {
            count = dayInfo.modisCount;
          } else if (selectedSensor === 'VIIRS') {
            count = dayInfo.viirsCount;
          } else {
            count = dayInfo.count;
          }
          modis = dayInfo.modisCount;
          viirs = dayInfo.viirsCount;
          avgFrp = dayInfo.avgFrp;
          highConf = dayInfo.highConf;

          if (count > 0) {
            totalMonthCount += count;
            monthFrpSum += avgFrp * count;
            daysWithFires += 1;
          }
        }

        // Compute intensity based on filtered count
        let intensity = 0;
        if (count >= 13) intensity = 4;
        else if (count >= 8) intensity = 3;
        else if (count >= 4) intensity = 2;
        else if (count >= 1) intensity = 1;

        return {
          date: dateStr,
          dayNum,
          count,
          modis,
          viirs,
          avgFrp,
          highConf,
          intensity,
        };
      });

      const avgFrpMonth =
        totalMonthCount > 0 ? Math.round((monthFrpSum / totalMonthCount) * 10) / 10 : 0;

      return {
        monthIndex,
        name: MONTH_NAMES[monthIndex],
        firstDayOfWeek,
        daysCount,
        days,
        totalMonthCount,
        avgFrpMonth,
        daysWithFires,
      };
    });
  }, [year, enrichedMap, selectedSensor]);

  // Active hover info lookup
  const hoveredInfo = useMemo(() => {
    if (!hoveredDate) return null;
    const dayInfo = enrichedMap.get(hoveredDate);
    const dateObj = new Date(`${hoveredDate}T00:00:00Z`);
    const formatted = dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });

    if (!dayInfo) {
      return {
        dateStr: hoveredDate,
        formatted,
        count: 0,
        modis: 0,
        viirs: 0,
        avgFrp: 0,
        highConf: 0,
      };
    }

    return {
      dateStr: hoveredDate,
      formatted,
      count:
        selectedSensor === 'MODIS'
          ? dayInfo.modisCount
          : selectedSensor === 'VIIRS'
          ? dayInfo.viirsCount
          : dayInfo.count,
      modis: dayInfo.modisCount,
      viirs: dayInfo.viirsCount,
      avgFrp: dayInfo.avgFrp,
      highConf: dayInfo.highConf,
    };
  }, [hoveredDate, enrichedMap, selectedSensor]);

  // Style helper based on sensor mode and intensity
  const getCellClasses = (intensity: number, isSelected: boolean) => {
    let base = 'transition-all duration-150 border ';

    if (isSelected) {
      base += 'ring-2 ring-cyan ring-offset-1 ring-offset-midnight scale-110 z-10 shadow-lg font-bold ';
    }

    if (intensity === 0) {
      return base + 'bg-navy/70 border-border/30 text-text-muted hover:border-border/80 hover:bg-navy';
    }

    if (selectedSensor === 'VIIRS') {
      switch (intensity) {
        case 1:
          return base + 'bg-cyan/20 border-cyan/30 text-cyan-light hover:border-cyan';
        case 2:
          return base + 'bg-cyan/40 border-cyan/50 text-cyan-light hover:border-cyan';
        case 3:
          return base + 'bg-cyan/70 border-cyan/80 text-text-primary hover:border-cyan-bright';
        case 4:
          return (
            base +
            'bg-cyan-bright border-cyan-bright text-midnight font-bold shadow-sm shadow-cyan/50'
          );
      }
    }

    // Default or MODIS: warm fire hues
    switch (intensity) {
      case 1:
        return base + 'bg-fire/20 border-fire/30 text-text-secondary hover:border-fire';
      case 2:
        return base + 'bg-fire/40 border-fire/50 text-text-primary hover:border-fire';
      case 3:
        return base + 'bg-fire/70 border-fire/80 text-text-primary hover:border-fire-bright';
      case 4:
        return (
          base +
          'bg-fire-bright border-fire-bright text-midnight font-bold shadow-sm shadow-fire/50'
        );
      default:
        return base + 'bg-navy/70 border-border/30 text-text-muted';
    }
  };

  const visibleMonths =
    selectedMonth === null
      ? monthsData
      : monthsData.filter((m) => m.monthIndex === selectedMonth);

  return (
    <div className="card p-5 lg:p-6 bg-surface/95 border-border/80 shadow-xl space-y-5">
      {/* Calendar Header with Scope and Hover Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cyan" />
              Annual Fire Activity Heatmap ({year})
            </h2>
            {selectedMonth !== null && (
              <button
                onClick={() => onSelectMonth(null)}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan/20 text-cyan border border-cyan/40 hover:bg-cyan/30 transition-colors"
                title="Show all 12 months"
              >
                <span>{MONTH_NAMES[selectedMonth]} Only</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            Continuous daily satellite active fire anomaly density. Click any day to inspect
            localized observations and coordinate telemetry.
          </p>
        </div>

        {/* Floating Telemetry Info Pill for Hovered / Selected Day */}
        <div className="min-w-[280px] bg-navy/90 border border-border/70 rounded-xl px-4 py-2 flex items-center justify-between text-xs shadow-inner">
          {hoveredInfo ? (
            <div className="w-full flex items-center justify-between gap-3">
              <div>
                <span className="font-mono font-bold text-cyan">{hoveredInfo.formatted}</span>
                <div className="text-[10px] text-text-muted">
                  MODIS: <span className="text-fire font-semibold">{hoveredInfo.modis}</span> |
                  VIIRS: <span className="text-cyan font-semibold">{hoveredInfo.viirs}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-text-primary text-sm">
                  {hoveredInfo.count}
                </span>{' '}
                <span className="text-[10px] text-text-muted">fires</span>
                <div className="text-[10px] text-text-secondary">
                  Avg FRP: <span className="font-mono text-cyan">{hoveredInfo.avgFrp} MW</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-text-muted flex items-center gap-2 py-1">
              <Info className="w-4 h-4 text-cyan/70 shrink-0" />
              <span className="text-[11px]">Hover over any cell or click a date to view details</span>
            </div>
          )}
        </div>
      </div>

      {/* 12-Month Heatmap Grid */}
      <div
        className={`grid gap-4 ${
          selectedMonth !== null
            ? 'grid-cols-1 max-w-xl mx-auto'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
      >
        {visibleMonths.map((m) => {
          const isMonthFocused = selectedMonth === m.monthIndex;

          return (
            <div
              key={m.name}
              className={`bg-midnight/70 rounded-xl border p-3.5 transition-all duration-200 flex flex-col justify-between ${
                isMonthFocused
                  ? 'border-cyan/70 shadow-lg shadow-cyan-dim/40 bg-surface/90'
                  : 'border-border/60 hover:border-border-light'
              }`}
            >
              {/* Month Card Header */}
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-border/40">
                <button
                  onClick={() => onSelectMonth(isMonthFocused ? null : m.monthIndex)}
                  className="group flex items-center gap-1.5 text-left focus:outline-none"
                  title={isMonthFocused ? 'Show all months' : `Focus on ${m.name}`}
                >
                  <span className="font-bold text-sm text-text-primary group-hover:text-cyan transition-colors">
                    {m.name}
                  </span>
                  <span className="text-[10px] text-text-muted group-hover:text-text-secondary">
                    {isMonthFocused ? '(close)' : ''}
                  </span>
                </button>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      m.totalMonthCount > 0
                        ? 'bg-fire/20 text-fire border border-fire/30'
                        : 'bg-navy text-text-muted border border-border/40'
                    }`}
                  >
                    {m.totalMonthCount} fires
                  </span>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                {WEEKDAY_HEADERS.map((w, idx) => (
                  <span
                    key={`${m.name}-${w}-${idx}`}
                    className="text-[9px] font-mono text-text-muted font-semibold"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Blank padding cells before the 1st of the month */}
                {Array.from({ length: m.firstDayOfWeek }, (_, padIdx) => (
                  <div
                    key={`pad-${m.name}-${padIdx}`}
                    className="aspect-square rounded-[3px] opacity-10 bg-navy/20"
                  />
                ))}

                {/* Actual day cells */}
                {m.days.map((day) => {
                  const isSelected = selectedDate === day.date;

                  return (
                    <button
                      key={day.date}
                      onClick={() => onSelectDate(day.date)}
                      onMouseEnter={() => setHoveredDate(day.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className={`aspect-square rounded-[3px] text-[9px] font-mono flex items-center justify-center relative cursor-pointer ${getCellClasses(
                        day.intensity,
                        isSelected
                      )}`}
                      title={`${day.date}: ${day.count} fires (${day.modis} MODIS, ${day.viirs} VIIRS)`}
                    >
                      <span className="text-[8px]">{day.dayNum}</span>
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan shadow-sm shadow-cyan" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Month Footer metrics */}
              <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between text-[10px] text-text-muted">
                <span>
                  Active Days: <strong className="text-text-secondary">{m.daysWithFires}</strong> /{' '}
                  {m.daysCount}
                </span>
                <span>
                  Avg FRP: <strong className="text-cyan font-mono">{m.avgFrpMonth} MW</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Intensity Legend */}
      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan" />
          <span className="font-semibold text-text-primary text-xs">Observation Heat Scale:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-navy/70 border border-border/40" />
            <span className="text-[11px] text-text-muted">0 fires</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-fire/20 border border-fire/30" />
            <span className="text-[11px] text-text-secondary">1 - 3 (Low)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-fire/40 border border-fire/50" />
            <span className="text-[11px] text-text-secondary">4 - 7 (Moderate)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-fire/70 border border-fire/80" />
            <span className="text-[11px] text-text-primary">8 - 12 (Elevated)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-[3px] bg-fire-bright border-fire-bright shadow-sm shadow-fire/50" />
            <span className="text-[11px] text-text-primary font-bold">13+ (Peak Hotspot)</span>
          </div>
        </div>

        <div className="text-[11px] text-text-muted">
          Year {year} •{' '}
          {year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
            ? '366 Days (Leap Year)'
            : '365 Days'}
        </div>
      </div>
    </div>
  );
};

export default AnnualHeatmapCalendar;

