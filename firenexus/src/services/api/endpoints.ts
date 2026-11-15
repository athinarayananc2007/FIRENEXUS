// ──────────────────────────────────────────────
// FIRENEXUS — Canonical Backend API Endpoints
// ──────────────────────────────────────────────

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api/v1';

export const ENDPOINTS = {
  HEALTH: '/health',
  AVAILABILITY: '/availability',
  OBSERVATIONS: {
    LIST: '/observations',
    DETAIL: (id: string | number) => `/observations/${id}`,
    SUMMARY: '/observations/summary',
  },
  HARMONIZATION: {
    SUMMARY: '/harmonization/summary',
    MATCHES: '/harmonization/matches',
    MATCH_DETAIL: (id: string | number) => `/harmonization/matches/${id}`,
    EVENTS: '/harmonization/events',
    EVENT_DETAIL: (id: string | number) => `/harmonization/events/${id}`,
    OBSERVATIONS: '/harmonization/observations',
  },
  ANALYTICS: {
    FRP: '/analytics/frp',
    FRP_COMPARISON: '/analytics/frp/comparison',
    CALIBRATION: '/analytics/calibration',
    ANOMALIES: '/analytics/anomalies',
    TRENDS: '/analytics/trends',
    DIURNAL: '/analytics/diurnal',
    SUMMARY: '/analytics/summary',
  },
  INGESTION: {
    STATUS: '/ingestion/status',
    LOGS: '/ingestion/logs',
  },
} as const;
