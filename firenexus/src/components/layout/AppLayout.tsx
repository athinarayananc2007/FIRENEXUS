import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Globe2, GitCompareArrows, CalendarDays,
  BarChart3, AlertTriangle, Database, Info, Menu, X, Flame, Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/explorer', label: 'Earth Explorer', icon: Globe2 },
  { path: '/comparison', label: 'Compare', icon: GitCompareArrows },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/anomaly', label: 'Anomalies', icon: AlertTriangle },
  { path: '/data', label: 'Data', icon: Database },
  { path: '/about', label: 'About', icon: Info },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent relative">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/80">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-fire/15 border border-fire/30 flex items-center justify-center group-hover:bg-fire/25 group-hover:border-fire/50 transition-all duration-300 shadow-[0_0_12px_rgba(255,113,62,0.25)]">
              <Flame className="w-4 h-4 text-fire" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-fire">FIRE</span>
              <span className="text-text-primary">NEXUS</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan/10 text-cyan border border-cyan/25">
              <Sparkles className="w-2.5 h-2.5 text-mint" />
              v2.5
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-cyan/15 text-cyan border border-cyan/35 shadow-[0_0_14px_rgba(0,184,217,0.2)] font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface/80 hover:border hover:border-border/60'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${active ? 'text-mint' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions / Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            <button
              className="lg:hidden btn-ghost p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5 text-text-primary" /> : <Menu className="w-5 h-5 text-text-secondary" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 top-14 z-40 bg-midnight/95 backdrop-blur-2xl lg:hidden border-b border-border/80"
          >
            <nav className="flex flex-col p-4 gap-1.5">
              {NAV_ITEMS.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                      active
                        ? 'bg-cyan/15 text-cyan border border-cyan/30 shadow-[0_0_12px_rgba(0,184,217,0.25)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface/60'
                    }`}
                  >
                    <item.icon className="w-5 h-5 text-mint" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Content: Sits cleanly in Layer 2 above background particles */}
      <main className="pt-14 relative z-10">
        {children}
      </main>
    </div>
  );
}
