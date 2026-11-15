import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  ExternalLink,
  Flame,
  Zap,
  Globe2,
  Copy,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  agency: string;
  url: string;
  icon: React.ElementType;
  accent: 'cyan' | 'orange' | 'mint' | 'violet';
  badge: string;
  description: string;
  datasets: string[];
  citationNote: string;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'firms',
    name: 'NASA FIRMS',
    agency: 'Fire Information for Resource Management System (EOSDIS / LANCE)',
    url: 'https://firms.modaps.eosdis.nasa.gov/',
    icon: Database,
    accent: 'cyan',
    badge: 'Near Real-Time Delivery',
    description:
      'FIRMS distributes near real-time active fire and thermal anomaly data from MODIS and VIIRS within 3 hours of satellite overpass, serving forest managers and researchers globally.',
    datasets: [
      'NRT Global Active Fire Text/CSV & Shapefile Feeds',
      'Web Fire Mapper (WFM) Interactive Cartography',
      'Ultra-Real-Time (URT) Direct Broadcast Telemetry',
    ],
    citationNote:
      'NASA FIRMS. NASA Near Real-Time and Standard Active Fire Products. Earth Science Data and Information System (EOSDIS).',
  },
  {
    id: 'modis',
    name: 'NASA MODIS Science Team',
    agency: 'Goddard Space Flight Center (Terra & Aqua Missions)',
    url: 'https://modis.gsfc.nasa.gov/',
    icon: Flame,
    accent: 'orange',
    badge: '24+ Year Heritage',
    description:
      'Home of the MODIS instrument team, providing continuous calibrated Level 1B radiances, MOD14/MYD14 thermal anomaly algorithms, and multi-decadal fire frequency baselines.',
    datasets: [
      'MOD14: Terra Active Fire & Thermal Anomalies (1 km)',
      'MYD14: Aqua Active Fire & Thermal Anomalies (1 km)',
      'MODIS Fire Radiative Power (FRP) Daily Global Gridded Products',
    ],
    citationNote:
      'Giglio, L., et al. (2016). The Collection 6 MODIS active fire detection algorithm and fire products. Remote Sensing of Environment.',
  },
  {
    id: 'viirs',
    name: 'NASA VIIRS Land Team',
    agency: 'Goddard Space Flight Center / NOAA JPSS (Suomi-NPP & NOAA Series)',
    url: 'https://viirsland.gsfc.nasa.gov/',
    icon: Zap,
    accent: 'mint',
    badge: '375 m High Resolution',
    description:
      'Manages the VIIRS Land Quality Assessment and active fire product development, delivering improved 375 m spatial resolution and enhanced sub-pixel fire sensitivity.',
    datasets: [
      'VNP14IMG: Suomi-NPP 375 m I-band Active Fire Product',
      'VJ114IMG: NOAA-20 / JPSS-1 375 m Active Fire Product',
      'VJ214IMG: NOAA-21 / JPSS-2 375 m Active Fire Product',
    ],
    citationNote:
      'Schroeder, W., et al. (2014). The New 375 m VIIRS Active Fire Detection Data: Algorithm Description and Initial Assessment.',
  },
  {
    id: 'earthdata',
    name: 'NASA Earthdata',
    agency: 'Earth Science Data and Information System (EOSDIS)',
    url: 'https://www.earthdata.nasa.gov/',
    icon: Globe2,
    accent: 'violet',
    badge: 'Open Science Data',
    description:
      'Open access gateway to NASA’s comprehensive Earth science collections, offering standardized access, programmatic APIs, and long-term scientific archival preservation.',
    datasets: [
      'EOSDIS Common Metadata Repository (CMR)',
      'NASA Earthdata Search Portal & Open Data APIs',
      'LANCE (Land, Atmosphere Near real-time Capability for EOS)',
    ],
    citationNote:
      'NASA Earth Science Data and Information System (EOSDIS). NASA Distributed Active Archive Centers (DAACs).',
  },
];

export const DataSourcesSection: React.FC = () => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getAccent = (accent: DataSource['accent']) => {
    switch (accent) {
      case 'cyan':
        return { text: 'text-cyan', border: 'border-cyan/40', bg: 'bg-cyan/15', glow: 'shadow-cyan-dim' };
      case 'orange':
        return { text: 'text-fire', border: 'border-fire/40', bg: 'bg-fire/15', glow: 'shadow-fire-dim' };
      case 'mint':
        return { text: 'text-mint', border: 'border-mint/40', bg: 'bg-mint/15', glow: 'shadow-mint-dim' };
      case 'violet':
        return { text: 'text-purple-300', border: 'border-purple-400/40', bg: 'bg-purple-500/15', glow: 'shadow-purple-dim' };
    }
  };

  return (
    <section id="sources-section" className="space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan/15 border border-cyan/40 flex items-center justify-center text-cyan shadow-md shadow-cyan-dim">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                Data Sources &amp; References
              </h2>
              <span className="demo-badge">Official NASA Portals</span>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Official NASA satellite remote sensing documentation, data distribution portals, and scientific teams.
            </p>
          </div>
        </div>

        <div className="text-xs text-text-muted flex items-center gap-2">
          <span>All sources link directly to official NASA systems</span>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DATA_SOURCES.map((source, idx) => {
          const accent = getAccent(source.accent);
          const Icon = source.icon;
          const isCopied = copiedUrl === source.url;

          return (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`card p-6 bg-surface/95 border ${accent.border} shadow-xl flex flex-col justify-between space-y-5 hover:bg-surface-light transition-all duration-300 group`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${accent.bg} ${accent.text} border ${accent.border} shadow-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-text-primary group-hover:text-cyan transition-colors">
                          {source.name}
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${accent.bg} ${accent.text} border ${accent.border}`}>
                          {source.badge}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{source.agency}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopy(source.url)}
                    className="p-1.5 rounded-lg bg-navy/80 hover:bg-surface border border-border/60 text-text-muted hover:text-text-primary transition-colors shrink-0"
                    title="Copy URL"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed">
                  {source.description}
                </p>

                {/* Key Datasets List */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] font-bold text-text-primary uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-cyan" /> Core Products &amp; Feeds:
                  </div>
                  <ul className="space-y-1 text-xs text-text-secondary">
                    {source.datasets.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 bg-midnight/50 p-2 rounded-lg border border-border/40 font-mono text-[11px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${accent.bg} border ${accent.border} mt-1.5 shrink-0`} />
                        <span className="leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Buttons & Citation Footer */}
              <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[11px] font-mono text-text-muted truncate max-w-[280px]">
                  {source.url}
                </span>

                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl ${accent.bg} ${accent.text} border ${accent.border} font-semibold transition-all hover:scale-105 shadow-sm`}
                >
                  <span>Open Portal</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Attribution & Open Science Commitment */}
      <div className="p-4 rounded-xl bg-navy/60 border border-border/70 flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan shrink-0" />
          <span>
            FIRENEXUS operates strictly under NASA open science principles, utilizing publicly available satellite observational schemas and attributing all underlying instrument teams.
          </span>
        </div>
      </div>
    </section>
  );
};

export default DataSourcesSection;
