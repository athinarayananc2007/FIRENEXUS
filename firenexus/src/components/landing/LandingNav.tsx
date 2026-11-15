import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Menu, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Explore Earth', to: '/explorer' },
  { label: 'Global Dashboard', to: '/dashboard' },
  { label: 'Compare Satellites', to: '/comparison' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'About', to: '/about' },
];

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-fire/15 border border-fire/30 flex items-center justify-center group-hover:bg-fire/25 group-hover:border-fire/50 transition-all duration-300 shadow-[0_0_12px_rgba(255,113,62,0.25)]">
              <Flame className="w-4 h-4 text-fire" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-fire">FIRE</span>
              <span className="text-text-primary">NEXUS</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-all rounded-lg hover:bg-surface/80 hover:border hover:border-border/60"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Link to="/explorer" className="btn-primary hidden sm:inline-flex text-sm py-2 px-4 shadow-[0_0_15px_rgba(0,229,176,0.25)]">
              <Sparkles className="w-3.5 h-3.5" />
              Launch Explorer
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-text-primary" /> : <Menu className="w-5 h-5 text-text-secondary" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-midnight/95 backdrop-blur-2xl border-t border-border/80 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface/60 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/explorer"
                onClick={() => setMobileOpen(false)}
                className="btn-primary w-full justify-center text-sm mt-2"
              >
                Launch Explorer
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
