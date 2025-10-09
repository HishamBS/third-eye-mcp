/**
 * useAPI Hook - Centralized API client
 * Provides consistent API URL and fetch wrapper
 */

import { useCallback, useMemo } from 'react';
import { DEFAULT_API_URL, REQUEST_TIMEOUT, ERROR_MESSAGES } from '@third-eye/config/constants';
import type { ProblemJson } from '@third-eye/types';

export interface APIError extends Error {
  status?: number;
  problem?: ProblemJson;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

export function useAPI() {
  const apiUrl = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  }, []);

  const fetchWithTimeout = useCallback(async (
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> => {
    const { timeout = REQUEST_TIMEOUT, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: APIError = new Error(ERROR_MESSAGES.TIMEOUT);
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const apiFetch = useCallback(async <T = unknown>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> => {
    const url = endpoint.startsWith('http') ? endpoint : `${apiUrl}${endpoint}`;

    try {
      const response = await fetchWithTimeout(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Handle non-JSON responses (e.g., file downloads)
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        if (response.ok) {
          return response as unknown as T;
        }
        throw new Error(response.statusText || ERROR_MESSAGES.INTERNAL_ERROR);
      }

      // Parse JSON response
      const data = await response.json();

      // Handle error responses (RFC7807 Problem JSON or generic)
      if (!response.ok) {
        const error: APIError = new Error(
          data.detail || data.error?.detail || data.message || ERROR_MESSAGES.INTERNAL_ERROR
        );
        error.status = response.status;
        error.problem = data as ProblemJson;
        throw error;
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        // Network errors
        if (error.message === 'Failed to fetch') {
          const networkError: APIError = new Error(ERROR_MESSAGES.NETWORK_ERROR);
          networkError.status = 0;
          throw networkError;
        }
      }
      throw error;
    }
  }, [apiUrl, fetchWithTimeout]);

  const get = useCallback(<T = unknown>(endpoint: string, options?: FetchOptions) => {
    return apiFetch<T>(endpoint, { ...options, method: 'GET' });
  }, [apiFetch]);

  const post = useCallback(<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [apiFetch]);

  const put = useCallback(<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [apiFetch]);

  const patch = useCallback(<T = unknown>(endpoint: string, body?: unknown, options?: FetchOptions) => {
    return apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }, [apiFetch]);

  const del = useCallback(<T = unknown>(endpoint: string, options?: FetchOptions) => {
    return apiFetch<T>(endpoint, { ...options, method: 'DELETE' });
  }, [apiFetch]);

  return {
    apiUrl,
    fetch: apiFetch,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}

/**
 * Build full API URL
 */
export function getAPIUrl(endpoint: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
  return endpoint.startsWith('http') ? endpoint : `${base}${endpoint}`;
}
