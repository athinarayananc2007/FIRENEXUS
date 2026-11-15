import React from 'react';
import { motion } from 'framer-motion';
import {
  Trees,
  Wheat,
  Wind,
  LineChart,
  ShieldAlert,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

interface ImpactDomain {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
  description: string;
  targetStakeholders: string;
  concreteExample: string;
}

const IMPACT_DOMAINS: ImpactDomain[] = [
  {
    id: 'forest',
    title: 'Forest Fire Monitoring',
    subtitle: 'Wildland Protection & Wilderness Surveillance',
    icon: Trees,
    accent: 'text-mint bg-mint/15 border-mint/40',
    description:
      'Provides synoptic coverage over remote boreal taiga, tropical rainforests, and mountain ranges where ground lookout towers and local sensor networks are nonexistent.',
    targetStakeholders: 'National Forest Services, Park Rangers & Wildland Fire Agencies',
    concreteExample:
      'Tracking perimeter spread dynamics across remote Canadian and Siberian boreal forests during extreme summer heatwaves.',
  },
  {
    id: 'agriculture',
    title: 'Agricultural Burning Analysis',
    subtitle: 'Crop Residue & Biomass Management',
    icon: Wheat,
    accent: 'text-amber-400 bg-amber-400/15 border-amber-400/40',
    description:
      'Distinguishes seasonal agricultural stubble burning and prescribed pasture management from unconstrained wildfires, enabling regional air quality forecasting.',
    targetStakeholders: 'Agricultural Ministries, Environmental Protection Boards & Agronomists',
    concreteExample:
      'Quantifying post-harvest paddy residue fires across the Indo-Gangetic Plains to correlate seasonal haze formation.',
  },
  {
    id: 'environment',
    title: 'Environmental Research',
    subtitle: 'Aerosol Transport & Ecological Recovery',
    icon: Wind,
    accent: 'text-cyan bg-cyan/15 border-cyan/40',
    description:
      'Supplies fire radiative energy data to atmospheric transport models simulating pyrocumulonimbus smoke injection, fine particulate matter (PM2.5), and greenhouse gas fluxes.',
    targetStakeholders: 'Atmospheric Chemists, Meteorologists & Public Health Researchers',
    concreteExample:
      'Modeling trans-boundary smoke transport from Australian bushfires and its deposition over Pacific ocean marine ecosystems.',
  },
  {
    id: 'climate',
    title: 'Climate-Related Studies',
    subtitle: 'Decadal Carbon Budgets & Feedback Loops',
    icon: LineChart,
    accent: 'text-purple-300 bg-purple-500/15 border-purple-400/40',
    description:
      'Establishes continuous, multi-decadal baseline records essential for quantifying feedback loops between global warming, prolonged droughts, and elevated fire severity.',
    targetStakeholders: 'IPCC Climate Modelers, Earth System Scientists & Climatologists',
    concreteExample:
      'Calculating annual carbon releases from degraded tropical peatland smoldering in Southeast Asia and the Amazon basin.',
  },
  {
    id: 'trends',
    title: 'Fire Activity Trend Analysis',
    subtitle: 'Seasonality Shifts & Geographic Expansions',
    icon: Sparkles,
    accent: 'text-fire bg-fire/15 border-fire/40',
    description:
      'Analyzes shifts in fire season start dates, duration, peak burning months, and geographic migrations toward higher latitudes and elevation zones.',
    targetStakeholders: 'Conservation Biologists, Geographers & University Research Labs',
    concreteExample:
      'Identifying poleward shifts in Arctic tundra wildfire ignitions triggered by earlier snowmelt and dry lightning storms.',
  },
  {
    id: 'decision',
    title: 'Scientific Decision Support',
    subtitle: 'Open Data & Reproducible Research',
    icon: GraduationCap,
    accent: 'text-cyan bg-cyan/15 border-cyan/40',
    description:
      'Delivers open-access, cross-calibrated datasets and analytical tooling that support peer-reviewed scientific studies and international policy development.',
    targetStakeholders: 'Academic Researchers, Policy Advisors & Non-Governmental Organizations',
    concreteExample:
      'Providing standardized observational data for United Nations Environment Programme (UNEP) global wildfire risk assessments.',
  },
];

export const GlobalImpactSection: React.FC = () => {
  return (
    <section id="impact-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-dim">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Global Impact &amp; Applications
              </h2>
              <span className="demo-badge">Science &amp; Society</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Empowering Earth system research, atmospheric chemistry, conservation biology, and climate science.
            </p>
          </div>
        </div>
      </div>

      {/* 6 Application Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {IMPACT_DOMAINS.map((domain, idx) => {
          const Icon = domain.icon;

          return (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.07 }}
              className="card p-5 bg-surface/90 border-border/80 hover:bg-surface-light hover:border-cyan/40 shadow-xl flex flex-col justify-between space-y-4 group transition-all duration-300"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${domain.accent} shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-midnight text-text-muted border border-border/60">
                    Domain 0{idx + 1}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-text-primary group-hover:text-cyan transition-colors">
                    {domain.title}
                  </h3>
                  <div className="text-xs text-text-muted mt-0.5">{domain.subtitle}</div>
                </div>

                <p className="text-xs text-text-secondary leading-relaxed">
                  {domain.description}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border/50 text-[11px]">
                <div className="text-text-muted">
                  <strong className="text-text-secondary">Stakeholders:</strong> {domain.targetStakeholders}
                </div>
                <div className="p-2 rounded bg-midnight/70 border border-border/50 text-text-secondary leading-relaxed font-sans">
                  <strong className="text-cyan">Case:</strong> {domain.concreteExample}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mandatory Scientific Responsibility Disclaimer */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy via-surface to-navy border border-amber-500/40 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Responsible Scientific Use &amp; Platform Scope</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          <strong>Important Advisory:</strong> FIRENEXUS is an observational research, data harmonization,
          and educational analytics platform developed for the NASA Space Apps Challenge. 
          <strong> It does NOT independently predict future fire ignitions, simulate fire propagation perimeters, or provide certified emergency public evacuation alerts.</strong> Emergency responders and public safety officials must always consult official government meteorological agencies, local fire management services, and certified civil protection bulletins for real-time tactical safety guidance.
        </p>
      </div>
    </section>
  );
};

export default GlobalImpactSection;
