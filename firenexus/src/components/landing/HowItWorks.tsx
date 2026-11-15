import { Satellite, Database, GitMerge, Sparkles, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: 1,
    icon: Satellite,
    title: 'Satellite Observations',
    description:
      "NASA's Terra, Aqua, Suomi NPP, and NOAA-20 satellites continuously scan the Earth, detecting thermal anomalies with MODIS and VIIRS instruments.",
  },
  {
    number: 2,
    icon: Database,
    title: 'Data Standardization',
    description:
      'Raw sensor readings are calibrated, geolocated, and converted to standardized fire products including brightness temperature and fire radiative power.',
  },
  {
    number: 3,
    icon: GitMerge,
    title: 'Spatial & Temporal Matching',
    description:
      'Observations from different instruments are aligned in space and time, resolving overlapping detections and ensuring consistent geolocation.',
  },
  {
    number: 4,
    icon: Sparkles,
    title: 'Harmonization',
    description:
      'Cross-sensor biases are corrected and confidence levels are unified, producing a single coherent fire activity dataset from multiple sources.',
  },
  {
    number: 5,
    icon: BarChart3,
    title: 'Global Analysis & Visualization',
    description:
      'The harmonized dataset powers interactive maps, trend analyses, anomaly detection, and multi-dimensional exploration in the FIRENEXUS platform.',
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="section-title text-3xl sm:text-4xl">
            From <span className="text-fire">Satellite</span> to{' '}
            <span className="text-cyan">Insight</span>
          </h2>
          <p className="mt-4 text-text-secondary max-w-2xl mx-auto text-lg">
            How FIRENEXUS transforms raw satellite data into actionable fire
            intelligence in five steps.
          </p>
        </motion.div>

        <div className="relative">
          {/* Vertical connecting line (desktop) */}
          <div className="hidden md:block absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-fire via-cyan to-electric opacity-30" />

          <div className="space-y-10 md:space-y-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  custom={i}
                  variants={stepVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-60px' }}
                  className="relative flex items-start gap-6 md:gap-8"
                >
                  {/* Number circle */}
                  <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-full bg-surface border-2 border-border-light flex items-center justify-center">
                    <span className="text-lg font-bold text-cyan">
                      {String(step.number).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Content card */}
                  <div className="card-hover flex-1 flex items-start gap-4 p-5">
                    <div className="w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-cyan" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
