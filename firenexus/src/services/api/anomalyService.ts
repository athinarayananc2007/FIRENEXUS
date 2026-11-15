// ──────────────────────────────────────────────
// FIRENEXUS — Anomaly Detection API Service
// Read-only retrieval of detected active fire anomalies
// ──────────────────────────────────────────────

import { apiRequest } from './apiClient';
import { ENDPOINTS } from './endpoints';
import type { BackendAnomalyRecord, PaginationMeta } from './types';

export interface GetAnomaliesResult {
  anomalies: BackendAnomalyRecord[];
  pagination: PaginationMeta;
}

export const anomalyService = {
  /**
   * Fetches detected anomaly records safely via read-only endpoint.
   * Does not require admin credentials.
   */
  async getAnomalies(
    params: {
      page?: number;
      limit?: number;
      anomaly_type?: string;
      severity?: string;
      start_date?: string;
      end_date?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<GetAnomaliesResult> {
    const res = await apiRequest<BackendAnomalyRecord[]>(ENDPOINTS.ANALYTICS.ANOMALIES, {
      params,
      signal,
    });

    const anomalies = res.data || [];
    const pagination: PaginationMeta = res.pagination || {
      page: params.page || 1,
      limit: params.limit || anomalies.length,
      total: anomalies.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    };

    return { anomalies, pagination };
  },
};
