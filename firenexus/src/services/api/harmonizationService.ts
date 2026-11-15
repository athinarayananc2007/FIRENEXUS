// ──────────────────────────────────────────────
// FIRENEXUS — Harmonization API Service
// ──────────────────────────────────────────────

import { apiRequest } from './apiClient';
import { ENDPOINTS } from './endpoints';
import { adaptMatchPair } from './adapters';
import type { MatchedFirePair } from '../../types';
import type {
  BackendHarmonizationSummary,
  BackendCrossSensorMatch,
  BackendFireEvent,
  PaginationMeta,
} from './types';

export interface GetMatchesResult {
  matches: MatchedFirePair[];
  pagination: PaginationMeta;
}

export interface GetEventsResult {
  events: BackendFireEvent[];
  pagination: PaginationMeta;
}

export const harmonizationService = {
  /**
   * Fetches overall harmonization summary metrics.
   */
  async getSummary(signal?: AbortSignal): Promise<BackendHarmonizationSummary> {
    const res = await apiRequest<BackendHarmonizationSummary>(ENDPOINTS.HARMONIZATION.SUMMARY, {
      signal,
    });
    return res.data;
  },

  /**
   * Fetches paginated cross-sensor match pairs.
   */
  async getMatches(
    params: {
      page?: number;
      limit?: number;
      min_confidence_score?: number;
      start_date?: string;
      end_date?: string;
    } = {},
    signal?: AbortSignal,
  ): Promise<GetMatchesResult> {
    const res = await apiRequest<BackendCrossSensorMatch[]>(ENDPOINTS.HARMONIZATION.MATCHES, {
      params,
      signal,
    });

    const matches = (res.data || []).map(adaptMatchPair);
    const pagination: PaginationMeta = res.pagination || {
      page: params.page || 1,
      limit: params.limit || matches.length,
      total: matches.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    };

    return { matches, pagination };
  },

  /**
   * Fetches paginated spatiotemporally clustered fire events.
   */
  async getEvents(
    params: {
      page?: number;
      limit?: number;
      start_date?: string;
      end_date?: string;
      min_observations?: number;
    } = {},
    signal?: AbortSignal,
  ): Promise<GetEventsResult> {
    const res = await apiRequest<BackendFireEvent[]>(ENDPOINTS.HARMONIZATION.EVENTS, {
      params,
      signal,
    });

    const events = res.data || [];
    const pagination: PaginationMeta = res.pagination || {
      page: params.page || 1,
      limit: params.limit || events.length,
      total: events.length,
      pages: 1,
      has_next: false,
      has_prev: false,
    };

    return { events, pagination };
  },
};
