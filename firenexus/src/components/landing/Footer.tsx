import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Explore Earth', to: '/explorer' },
  { label: 'Global Dashboard', to: '/dashboard' },
  { label: 'Compare Satellites', to: '/comparison' },
  { label: 'Analytics', to: '/analytics' },
  { label: 'About', to: '/about' },
];

const DATA_SOURCES = [
  { label: 'NASA FIRMS', href: '#' },
  { label: 'NASA Earthdata', href: '#' },
  { label: 'MODIS Fire Products', href: '#' },
  { label: 'VIIRS Active Fire', href: '#' },
];

const CURRENT_YEAR = 2026;

export default function Footer() {
  return (
    <footer className="border-t border-border bg-navy/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Platform */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-fire-bright" />
              <span className="text-lg font-bold text-text-primary">
                FIRE<span className="text-cyan">NEXUS</span>
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              A unified satellite fire intelligence platform that harmonizes
              NASA MODIS and VIIRS observations for global fire monitoring,
              analysis, and exploration.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Navigation
            </h4>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Data Sources */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Data Sources
            </h4>
            <ul className="space-y-2">
              {DATA_SOURCES.map((source) => (
                <li key={source.label}>
                  <a
                    href={source.href}
                    className="text-sm text-text-muted hover:text-text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Credits */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
              Credits
            </h4>
            <p className="text-sm text-text-secondary leading-relaxed">
              Fire data sourced from NASA&apos;s Fire Information for Resource
              Management System (FIRMS). Satellite imagery and instruments by
              NASA Goddard Space Flight Center.
            </p>
            <p className="text-sm text-text-muted mt-3">
              Built for educational and research purposes. All data is
              simulated.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            &copy; {CURRENT_YEAR} FIRENEXUS. All rights reserved.
          </p>
          <p className="text-xs text-text-muted">
            Simulated data &middot; Not affiliated with NASA
          </p>
        </div>
      </div>
    </footer>
  );
}
