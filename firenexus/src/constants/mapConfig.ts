// ──────────────────────────────────────────────
// FIRENEXUS — Centralized Basemap & Cartography Configuration
// Provides high-reliability, unwatermarked dark gray canvas map services from Esri ArcGIS Online
// with transparent geographic boundaries and labels.
// Completely eliminates third-party "API Key Required" watermarks without requiring an API key.
// ──────────────────────────────────────────────

export const BASEMAP_CONFIG = {
  // Base dark slate canvas (oceans and landmasses)
  darkBaseUrl:
    'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  // Reference overlay (borders, coastlines, and geographic labels with transparent alpha)
  darkReferenceUrl:
    'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  // Authoritative attribution string
  attribution:
    '&copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a> &copy; NASA FIRMS',
  maxNativeZoom: 16,
  maxZoom: 19,
};
