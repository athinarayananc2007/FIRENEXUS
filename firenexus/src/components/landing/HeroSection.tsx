import { Link } from 'react-router-dom';
import { ArrowRight, Telescope, Radio, Shield, Globe2 } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroGlobe from './HeroGlobe';

export default function HeroSection() {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-20 pb-12">
      {/* Atmospheric Rim Lighting Behind the Globe */}
      <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[550px] h-[550px] bg-cyan/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[420px] h-[420px] bg-fire/5 rounded-full blur-[110px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* Left: Copy & Scientific Value Proposition (5 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' as const }}
            className="lg:col-span-5 text-center lg:text-left space-y-6"
          >
            {/* Mission status pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-border/80 text-xs">
              <span className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
              <span className="text-text-secondary font-medium">Earth Observation Command</span>
              <span className="text-text-muted">|</span>
              <span className="font-mono text-cyan text-[11px]">NASA FIRMS Harmonization</span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1]"
            >
              <span className="text-text-primary block">SEE FIRE ACTIVITY.</span>
              <span className="bg-gradient-to-r from-cyan via-mint to-fire bg-clip-text text-transparent block mt-1">
                UNDERSTAND OUR PLANET.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
              className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              Explore global fire activity through harmonized satellite observations from NASA&apos;s
              MODIS and VIIRS instruments.
            </motion.p>

            {/* Main Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="flex flex-col sm:flex-row gap-3.5 justify-center lg:justify-start pt-2"
            >
              <Link to="/explorer" className="btn-primary text-sm px-6 py-3 font-semibold shadow-lg shadow-cyan-dim">
                Explore Global Earth
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <Link to="/about" className="btn-secondary text-sm px-6 py-3 font-medium">
                <Telescope className="w-4 h-4 text-electric" />
                Discover the Science
              </Link>
            </motion.div>

            {/* Scientific Credentials Strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65, duration: 0.8 }}
              className="pt-4 grid grid-cols-3 gap-3 border-t border-border/40 text-left"
            >
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Globe2 className="w-3 h-3 text-cyan" /> Geographic Scope
                </p>
                <p className="text-xs font-bold text-text-primary mt-0.5">Global Geographic Scope</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Radio className="w-3 h-3 text-fire" /> Resolution
                </p>
                <p className="text-xs font-bold text-text-primary mt-0.5">375m &amp; 1km</p>
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1 font-mono">
                  <Shield className="w-3 h-3 text-emerald-400" /> Platform
                </p>
                <p className="text-xs font-bold text-text-primary mt-0.5">Open Science</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: High-Fidelity 3D Earth Globe Visual (7 cols on lg) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 1, ease: 'easeOut' as const }}
            className="lg:col-span-7 h-[460px] sm:h-[540px] lg:h-[620px] w-full"
          >
            <HeroGlobe />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
