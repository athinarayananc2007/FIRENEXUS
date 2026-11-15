// ──────────────────────────────────────────────
// FIRENEXUS — Centralized Fetch API Client
// ──────────────────────────────────────────────

import { API_BASE_URL } from './endpoints';
import { ApiError, type ApiErrorResponse, type ApiSuccessResponse } from './types';

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Builds full URL with properly escaped search query parameters.
 */
export function buildUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Core HTTP Request method with automatic timeout, signal chaining,
 * and RFC 7807 problem details parsing.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessResponse<T>> {
  const { timeoutMs = 8000, params, signal: externalSignal, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Request to ${path} timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  // If external signal is provided, forward its abort
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason));
  }

  const url = buildUrl(path, params);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      if (isJson) {
        const errorJson = (await response.json()) as ApiErrorResponse;
        throw new ApiError({
          status: 'error',
          error_code: errorJson.error_code || `HTTP_${response.status}`,
          message: errorJson.message || response.statusText,
          status_code: errorJson.status_code || response.status,
          details: errorJson.details,
        });
      } else {
        const text = await response.text();
        throw new ApiError({
          status: 'error',
          error_code: `HTTP_${response.status}`,
          message: text || response.statusText,
          status_code: response.status,
        });
      }
    }

    if (!isJson) {
      throw new ApiError({
        status: 'error',
        error_code: 'INVALID_RESPONSE_TYPE',
        message: 'Expected application/json response from backend API',
        status_code: 500,
      });
    }

    const data = (await response.json()) as ApiSuccessResponse<T>;
    return data;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof ApiError) {
      throw err;
    }

    const error = err as Error;
    if (error.name === 'AbortError') {
      throw new ApiError({
        status: 'error',
        error_code: 'REQUEST_ABORTED',
        message: error.message || 'The request was aborted or timed out',
        status_code: 408,
      });
    }

    throw new ApiError({
      status: 'error',
      error_code: 'NETWORK_ERROR',
      message: error.message || 'Failed to connect to backend server',
      status_code: 0,
    });
  }
}

/**
 * Checks whether the backend API is online and responding to health checks.
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await apiRequest<{ status: string }>('/health', { timeoutMs: 2500 });
    return res.data?.status === 'healthy' || res.status === 'success';
  } catch {
    return false;
  }
}
