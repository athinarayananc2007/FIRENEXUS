// ──────────────────────────────────────────────
// FIRENEXUS — Observation API Service
// ──────────────────────────────────────────────

import { apiRequest } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { adaptObservation } from './adapters';
import type { FireObservation } from '../../types';
import type {
  BackendObservation,
  BackendObservationSummary,
  ObservationQueryParams,
  PaginationMeta,
} from './types';

export interface GetObservationsResult {
  observations: FireObservation[];
  pagination: PaginationMeta;
}

export const observationService = {
  /**
   * Fetches paginated, filtered fire observations.
   */
  async getObservations(
    params: ObservationQueryParams = {},
    signal?: AbortSignal,
  ): Promise<GetObservationsResult> {
    const queryParams: Record<string, string | number | boolean | undefined | null> = {
      page_size: params.limit || (params as any).page_size || 1000,
      ...params,
    };
    const res = await apiRequest<BackendObservation[]>(ENDPOINTS.OBSERVATIONS.LIST, {
      params: queryParams,
      signal,
    });

    const observations = (res.data || []).map(adaptObservation);
    const pagination: PaginationMeta = res.pagination || {
      page: params.page || 1,
      limit: params.limit || observations.length,
      total: observations.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    };

    return { observations, pagination };
  },

  /**
   * Fetches single observation by unique ID.
   */
  async getObservationById(
    id: string | number,
    signal?: AbortSignal,
  ): Promise<FireObservation> {
    const res = await apiRequest<BackendObservation>(ENDPOINTS.OBSERVATIONS.DETAIL(id), {
      signal,
    });
    return adaptObservation(res.data);
  },

  /**
   * Fetches consolidated observation summary metrics.
   */
  async getSummary(
    params: {
      sensor?: 'MODIS' | 'VIIRS';
      date_start?: string;
      date_end?: string;
      country?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<BackendObservationSummary> {
    const res = await apiRequest<BackendObservationSummary>(ENDPOINTS.OBSERVATIONS.SUMMARY, {
      params,
      signal,
    });
    return res.data;
  },
};
