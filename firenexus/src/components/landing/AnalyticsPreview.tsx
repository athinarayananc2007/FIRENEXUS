import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Map, TrendingUp, BarChart3, CalendarDays } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  MOCK_OBSERVATIONS,
  computeMonthlyActivity,
  computeCalendarData,
} from '../../data/mock/fireData';
import type { MonthlyActivity, CalendarDay as CalDay } from '../../types';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

/* ─── Mini Fire Map ─── */
function MiniFireMap() {
  const dots = useMemo(
    () =>
      MOCK_OBSERVATIONS.slice(0, 300).map((obs) => ({
        x: ((obs.longitude + 180) / 360) * 100,
        y: ((90 - obs.latitude) / 180) * 100,
        id: obs.id,
        color: obs.satellite === 'MODIS' ? '#4cc9f0' : '#FF713E',
      })),
    [],
  );

  return (
    <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <rect width="100" height="50" fill="#0f1729" rx="2" />
      {/* Simple grid lines */}
      {[25, 50, 75].map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={50} stroke="#1F2E4A" strokeWidth="0.2" />
      ))}
      {[12.5, 25, 37.5].map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={100} y2={y} stroke="#1F2E4A" strokeWidth="0.2" />
      ))}
      {/* Fire dots */}
      {dots.map((d) => (
        <circle
          key={d.id}
          cx={d.x}
          cy={d.y / 2}
          r={0.4}
          fill={d.color}
          opacity={0.7}
        />
      ))}
    </svg>
  );
}

/* ─── Trend Chart ─── */
function TrendChart({ data }: { data: MonthlyActivity[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: '#17243B',
            border: '1px solid #1F2E4A',
            borderRadius: 8,
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="totalCount"
          stroke="#00E5B0"
          fill="#00E5B0"
          fillOpacity={0.15}
          strokeWidth={2}
          name="Total Fires"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ─── Comparison Chart ─── */
function ComparisonChart({ data }: { data: MonthlyActivity[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1F2E4A" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{
            background: '#17243B',
            border: '1px solid #1F2E4A',
            borderRadius: 8,
            fontSize: 11,
          }}
        />
        <Bar dataKey="modisCount" fill="#4cc9f0" name="MODIS" radius={[2, 2, 0, 0]} />
        <Bar dataKey="viirsCount" fill="#FF713E" name="VIIRS" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Calendar Heatmap ─── */
function CalendarHeatmap({ data }: { data: CalDay[] }) {
  const intensityColors = ['#17243B', '#00E5B033', '#00E5B066', '#00E5B099', '#00E5B0'];
  // Show first 90 days
  const cells = data.slice(0, 90);
  const cols = 13;

  return (
    <div className="flex flex-wrap gap-[2px]">
      {cells.map((day) => (
        <div
          key={day.date}
          className="rounded-sm"
          style={{
            width: `calc((100% - ${(cols - 1) * 2}px) / ${cols})`,
            aspectRatio: '1',
            backgroundColor: intensityColors[day.intensity] || intensityColors[0],
          }}
          title={`${day.date}: ${day.count} fires`}
        />
      ))}
    </div>
  );
}

/* ─── Main Component ─── */
export default function AnalyticsPreview() {
  const monthly = useMemo(() => computeMonthlyActivity(MOCK_OBSERVATIONS), []);
  const calendar = useMemo(() => computeCalendarData(MOCK_OBSERVATIONS), []);

  const cards = [
    {
      title: 'Global Fire Map',
      icon: Map,
      description: 'Live fire detections plotted across the globe.',
      content: <MiniFireMap />,
    },
    {
      title: 'Activity Trend',
      icon: TrendingUp,
      description: 'Monthly fire observation totals over time.',
      content: <TrendChart data={monthly} />,
    },
    {
      title: 'MODIS vs VIIRS',
      icon: BarChart3,
      description: 'Side-by-side instrument detection comparison.',
      content: <ComparisonChart data={monthly} />,
    },
    {
      title: 'Fire Calendar',
      icon: CalendarDays,
      description: 'Daily fire intensity heatmap.',
      content: <CalendarHeatmap data={calendar} />,
    },
  ];

  return (
    <section className="py-24 sm:py-32 relative">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-3xl sm:text-4xl">
            Analytics at a <span className="text-cyan">Glance</span>
          </h2>
          <p className="mt-4 text-text-secondary max-w-2xl mx-auto text-lg">
            Preview the kinds of insights FIRENEXUS delivers — from spatial
            mapping to temporal trends.
          </p>
          <span className="demo-badge mt-4 inline-flex">Simulated Data</span>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid sm:grid-cols-2 gap-6"
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.title}
                variants={cardVariants}
                className="card-hover p-5 relative"
              >
                <span className="demo-badge absolute top-3 right-3 text-[10px]">Demo</span>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-cyan" />
                  <h3 className="text-sm font-semibold text-text-primary">{card.title}</h3>
                </div>
                <p className="text-xs text-text-muted mb-4">{card.description}</p>
                <div className="min-h-[140px]">{card.content}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
