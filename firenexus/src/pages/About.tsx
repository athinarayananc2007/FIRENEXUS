import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import AboutHero from '../components/about/AboutHero';
import MissionOverviewSection from '../components/about/MissionOverviewSection';
import SatelliteScienceSection from '../components/about/SatelliteScienceSection';
import HarmonizationWorkflowSection from '../components/about/HarmonizationWorkflowSection';
import HowItWorksSection from '../components/about/HowItWorksSection';
import GlobalImpactSection from '../components/about/GlobalImpactSection';
import DataSourcesSection from '../components/about/DataSourcesSection';
import ScientificLimitationsSection from '../components/about/ScientificLimitationsSection';
import { Flame, Sparkles, Heart } from 'lucide-react';

export default function About() {
  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-in fade-in duration-300">
        {/* 1. Hero Section with Animated Earth Visualization */}
        <AboutHero />

        {/* 2. Project Overview: Understanding the Mission */}
        <MissionOverviewSection />

        {/* 3. The Science Behind the Project (MODIS vs VIIRS) */}
        <SatelliteScienceSection />

        {/* 4. Harmonization Workflow (7-Stage Pipeline) */}
        <HarmonizationWorkflowSection />

        {/* 5. How It Works (6-Phase Interactive Stepper) */}
        <HowItWorksSection />

        {/* 6. Global Impact & Potential Applications */}
        <GlobalImpactSection />

        {/* 7. Data Sources & Official NASA References */}
        <DataSourcesSection />

        {/* 8. Scientific Limitations & Methodology Transparency */}
        <ScientificLimitationsSection />

        {/* Presentation Footer Attribution */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="pt-8 pb-12 border-t border-border/60 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Flame className="w-4 h-4 text-fire" />
            <span>FIRENEXUS &bull; NASA Space Apps Challenge 2024</span>
            <Sparkles className="w-3.5 h-3.5 text-mint" />
          </div>

          <p className="text-xs text-text-secondary max-w-2xl mx-auto leading-relaxed">
            FIRENEXUS is an exploratory scientific demonstration and remote sensing analytics platform.
            All satellite data references describe publicly available NASA and NOAA data products distributed through NASA EOSDIS, LANCE, and FIRMS.
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-muted pt-2">
            <span>Built with precision for global wildland science</span>
            <Heart className="w-3 h-3 text-fire fill-fire/20" />
            <span>Harmonizing Earth observation data</span>
          </div>
        </motion.footer>
      </div>
    </AppLayout>
  );
}
