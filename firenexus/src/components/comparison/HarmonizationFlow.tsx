import { motion } from 'framer-motion';
import {
  Database, MapPin, Clock, ShieldCheck, Layers, Merge,
  AlertTriangle, ArrowDown,
} from 'lucide-react';

interface FlowStep {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: FlowStep[] = [
  {
    number: 1,
    title: 'Data Standardization',
    description:
      'Normalize field names, coordinate systems, and attribute schemas from both MODIS and VIIRS data products into a unified internal format.',
    icon: Database,
    color: 'text-electric',
  },
  {
    number: 2,
    title: 'Spatial Matching',
    description:
      'Identify overlapping detection areas using spatial proximity analysis. MODIS 1 km pixels may contain multiple VIIRS 375 m detections.',
    icon: MapPin,
    color: 'text-cyan',
  },
  {
    number: 3,
    title: 'Temporal Matching',
    description:
      'Align observations within satellite overpass time windows. Aqua/Terra and Suomi NPP/NOAA-20 have different equatorial crossing times.',
    icon: Clock,
    color: 'text-warning',
  },
  {
    number: 4,
    title: 'Quality Assessment',
    description:
      'Evaluate confidence levels, brightness temperatures, and environmental conditions (cloud cover, sun glint) to weight detection reliability.',
    icon: ShieldCheck,
    color: 'text-cyan',
  },
  {
    number: 5,
    title: 'Duplicate Handling',
    description:
      'Resolve co-located detections from near-simultaneous overpasses. Determine whether paired observations represent the same fire event.',
    icon: Layers,
    color: 'text-fire',
  },
  {
    number: 6,
    title: 'Harmonized Output',
    description:
      'Produce a unified fire activity product with provenance tracking, combined confidence scores, and cross-referenced source records.',
    icon: Merge,
    color: 'text-electric',
  },
];

export default function HarmonizationFlow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-6">
        <Merge className="w-5 h-5 text-cyan" />
        <h2 className="section-title text-xl">Harmonization Workflow</h2>
        <span className="demo-badge ml-2">Conceptual</span>
      </div>

      <p className="text-sm text-text-secondary mb-6 max-w-3xl">
        Combining MODIS and VIIRS active fire data requires careful harmonization to account for
        differing spatial resolutions, overpass schedules, and detection algorithms. The following
        outlines the conceptual processing pipeline.
      </p>

      {/* Flow steps */}
      <div className="space-y-1">
        {STEPS.map((step, i) => (
          <div key={step.number}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-navy/40 border border-border hover:border-border-light transition-colors"
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-light flex items-center justify-center">
                <span className="text-sm font-bold text-text-primary">{step.number}</span>
              </div>

              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-text-primary mb-1">{step.title}</h3>
                <p className="text-xs text-text-muted leading-relaxed">{step.description}</p>
              </div>
            </motion.div>

            {/* Arrow connector */}
            {i < STEPS.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ArrowDown className="w-4 h-4 text-border-light" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-6 p-4 rounded-lg bg-warning/5 border border-warning/20 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-warning mb-1">Important Disclaimer</p>
          <p className="text-xs text-text-muted leading-relaxed">
            This visualization demonstrates the conceptual harmonization workflow. Actual
            algorithmic harmonization requires validated processing pipelines, peer-reviewed
            methodologies, and rigorous quality control that are not yet implemented in this
            demonstration platform.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
