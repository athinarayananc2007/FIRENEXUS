// ──────────────────────────────────────────────
// FIRENEXUS — Analytics API Service
// ──────────────────────────────────────────────

import { apiRequest } from './apiClient';
import { ENDPOINTS } from './endpoints';
import type {
  BackendFrpStats,
  BackendTrendPoint,
  BackendDiurnalResponse,
} from './types';

export const analyticsService = {
  /**
   * Fetches parametric and non-parametric Fire Radiative Power (FRP) statistics.
   */
  async getFrpStats(
    params: {
      sensor?: 'MODIS' | 'VIIRS';
      date_start?: string;
      date_end?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<BackendFrpStats> {
    const res = await apiRequest<BackendFrpStats>(ENDPOINTS.ANALYTICS.FRP, {
      params,
      signal,
    });
    return res.data;
  },

  /**
   * Fetches paired MODIS vs VIIRS FRP comparison metrics.
   */
  async getFrpComparison(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const res = await apiRequest<Record<string, unknown>>(ENDPOINTS.ANALYTICS.FRP_COMPARISON, {
      signal,
    });
    return res.data;
  },

  /**
   * Fetches temporal active fire trends aggregated by day, week, or month.
   */
  async getTrends(
    params: {
      period?: 'day' | 'week' | 'month';
      sensor?: 'MODIS' | 'VIIRS';
      start_date?: string;
      end_date?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<BackendTrendPoint[]> {
    const res = await apiRequest<BackendTrendPoint[]>(ENDPOINTS.ANALYTICS.TRENDS, {
      params,
      signal,
    });
    return res.data || [];
  },

  /**
   * Fetches diurnal hourly fire detection distribution and satellite sampling profiles.
   */
  async getDiurnal(
    params: {
      sensor?: 'MODIS' | 'VIIRS';
      start_date?: string;
      end_date?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<BackendDiurnalResponse> {
    const res = await apiRequest<BackendDiurnalResponse>(ENDPOINTS.ANALYTICS.DIURNAL, {
      params,
      signal,
    });
    return res.data;
  },

  /**
   * Fetches consolidated high-level analytics summary.
   */
  async getSummary(signal?: AbortSignal): Promise<Record<string, unknown>> {
    const res = await apiRequest<Record<string, unknown>>(ENDPOINTS.ANALYTICS.SUMMARY, {
      signal,
    });
    return res.data;
  },
};
