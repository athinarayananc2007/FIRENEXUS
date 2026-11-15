import React from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Satellite,
  GitCompare,
  Layers,
  Globe2,
  Sparkles,
  Database,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import HeroEarthAnimation from './HeroEarthAnimation';

export const AboutHero: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[540px] lg:min-h-[600px] flex items-center justify-center rounded-3xl overflow-hidden border border-border/80 bg-gradient-to-b from-navy/90 via-midnight/95 to-deep-space p-6 sm:p-10 lg:p-16 shadow-2xl">
      {/* Animated Earth with Satellite Orbits */}
      <HeroEarthAnimation />

      {/* Atmospheric Vignette Gradients */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-[1]" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan/10 blur-[120px] rounded-full pointer-events-none z-[1]" />
      <div className="absolute -bottom-24 right-10 w-[400px] h-[250px] bg-fire/10 blur-[100px] rounded-full pointer-events-none z-[1]" />

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        {/* Presentation Badges */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-2.5"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-fire/15 text-fire border border-fire/35 shadow-sm shadow-fire-dim">
            <Flame className="w-3.5 h-3.5" />
            NASA Space Apps Challenge
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan/15 text-cyan border border-cyan/35 shadow-sm shadow-cyan-dim">
            <Satellite className="w-3.5 h-3.5" />
            EOS Remote Sensing
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-mint/15 text-mint border border-mint/35">
            <Sparkles className="w-3.5 h-3.5" />
            Harmonization Architecture
          </span>
        </motion.div>

        {/* Main Heading & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-3"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-text-primary uppercase font-display">
            ABOUT <span className="text-transparent bg-clip-text bg-gradient-to-r from-fire via-amber-400 to-cyan">FIRENEXUS</span>
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-cyan tracking-wide font-sans">
            Bridging Satellite Observations. Understanding Global Fire Activity.
          </p>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl mx-auto"
        >
          FIRENEXUS is a global fire observation and satellite data exploration platform designed to
          bring MODIS and VIIRS fire detection observations together through a harmonized analytical
          framework.
        </motion.p>

        {/* Quick Nav Anchors */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium"
        >
          <button
            onClick={() => scrollTo('mission-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-cyan/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan" /> Mission Overview
          </button>
          <button
            onClick={() => scrollTo('science-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-fire/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Satellite className="w-3.5 h-3.5 text-fire" /> Satellite Science
          </button>
          <button
            onClick={() => scrollTo('workflow-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-cyan/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <GitCompare className="w-3.5 h-3.5 text-mint" /> Harmonization Workflow
          </button>
          <button
            onClick={() => scrollTo('process-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-cyan/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan" /> How It Works
          </button>
          <button
            onClick={() => scrollTo('impact-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-amber-400/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Global Impact
          </button>
          <button
            onClick={() => scrollTo('sources-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-cyan/40 text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-cyan" /> Data Sources
          </button>
          <button
            onClick={() => scrollTo('limitations-section')}
            className="px-3 py-1.5 rounded-lg bg-surface/80 hover:bg-surface-light border border-border/80 hover:border-borderBright text-text-secondary hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" /> Limitations
          </button>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="pt-4 flex justify-center text-text-muted"
        >
          <ChevronDown className="w-5 h-5 text-cyan/70" />
        </motion.div>
      </div>
    </section>
  );
};

export default AboutHero;
