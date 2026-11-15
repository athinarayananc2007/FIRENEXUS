import { Globe2, GitCompareArrows, BarChart3, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface Capability {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Globe2,
    title: 'Global Fire Monitoring',
    description:
      'Track active fire detections across every continent in near real-time using harmonized multi-satellite observations.',
    color: 'text-cyan',
  },
  {
    icon: GitCompareArrows,
    title: 'Satellite Data Harmonization',
    description:
      'Seamlessly merge MODIS and VIIRS observations into a unified dataset for consistent cross-sensor analysis.',
    color: 'text-electric',
  },
  {
    icon: BarChart3,
    title: 'Historical Fire Analysis',
    description:
      'Analyze years of fire data to uncover seasonal patterns, long-term trends, and regional anomalies.',
    color: 'text-fire',
  },
  {
    icon: Layers,
    title: 'Multi-dimensional Exploration',
    description:
      'Explore fire observations through maps, time series, comparisons, calendars, and anomaly detection views.',
    color: 'text-fire-bright',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function PlatformOverview() {
  return (
    <section className="py-24 sm:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-midnight via-navy/50 to-midnight pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-3xl sm:text-4xl">
            A Unified Platform for{' '}
            <span className="text-cyan">Fire Intelligence</span>
          </h2>
          <p className="mt-4 text-text-secondary max-w-2xl mx-auto text-lg">
            FIRENEXUS brings together NASA&apos;s flagship fire-detection instruments
            into one cohesive analytical experience.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={cap.title}
                variants={cardVariants}
                className="card-hover flex flex-col items-center text-center p-6 group"
              >
                <div className="w-14 h-14 rounded-xl bg-surface-light flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Icon className={`w-7 h-7 ${cap.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  {cap.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {cap.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
