/**
 * FIRENEXUS Futuristic Space Scientific Design System Tokens
 * Harmonized color palette for 2D charts, Leaflet overlays, Three.js, and canvas.
 */

export const PALETTE = {
  // Space Canvas & Surfaces
  deepSpace: '#070B18',
  midnightNavy: '#111C32',
  elevatedSurface: '#17243B',
  surfaceLight: '#1E2D4A',
  surfaceLighter: '#253757',

  // Structural & Borders
  border: '#1F2E4A',
  borderLight: '#2A3E62',
  borderBright: '#3B537F',

  // Scientific Accents & Instruments
  electricMint: '#00E5B0',     // VIIRS Primary & High Performance
  satelliteCyan: '#00B8D9',    // Harmonized Science & Telemetry
  solarOrange: '#FF713E',      // MODIS Primary & Thermal Emission
  auroraViolet: '#A78BFA',     // Atmospheric Glow & Deep Space Accent

  // Semantic
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#00E5B0',

  // Typography
  primaryText: '#F1F5FF',
  secondaryText: '#94A3B8',
  mutedText: '#64748B',
} as const;

export const SENSOR_COLORS = {
  MODIS: {
    primary: PALETTE.solarOrange,
    bright: '#FF8A5B',
    dim: 'rgba(255, 113, 62, 0.18)',
    glow: 'rgba(255, 113, 62, 0.45)',
    name: 'MODIS (Terra & Aqua)',
    resolution: '1 km',
  },
  VIIRS: {
    primary: PALETTE.electricMint,
    cyan: PALETTE.satelliteCyan,
    dim: 'rgba(0, 229, 176, 0.18)',
    glow: 'rgba(0, 229, 176, 0.45)',
    name: 'VIIRS (Suomi NPP & NOAA-20)',
    resolution: '375 m',
  },
  HARMONIZED: {
    primary: PALETTE.satelliteCyan,
    dim: 'rgba(0, 184, 217, 0.18)',
    glow: 'rgba(0, 184, 217, 0.45)',
  },
  ATMOSPHERE: {
    primary: PALETTE.auroraViolet,
    dim: 'rgba(167, 139, 250, 0.18)',
  },
} as const;

