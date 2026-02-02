"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/consts/api";

/**
 * Raw session from API response
 * Per R07: Strict typing for API responses
 */
export interface RawSession {
  readonly sessionId: string;
  readonly status: string;
  readonly createdAt: string;
  readonly eventCount?: number;
  readonly lastActivity?: string;
  readonly agentName?: string;
  readonly model?: string;
  readonly displayName?: string;
}

/**
 * Normalized session for internal use
 * Per R07: Strict typing with parsed dates
 */
export interface NormalizedSession {
  readonly sessionId: string;
  readonly status: string;
  readonly createdAt: Date;
  readonly eventCount: number;
  readonly lastActivity: Date;
  readonly agentName: string;
  readonly model: string;
  readonly displayName: string;
}

/**
 * Options for the useSessionList hook
 */
export interface UseSessionListOptions {
  /** Whether to auto-poll for updates */
  autoPoll?: boolean;
  /** Poll interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Whether to fetch immediately on mount */
  fetchOnMount?: boolean;
  /** Whether the hook is enabled (for conditional fetching) */
  enabled?: boolean;
}

const DEFAULT_POLL_INTERVAL = 5000;

/**
 * Normalize a raw session from API to internal format
 */
function normalizeSession(raw: RawSession): NormalizedSession {
  const createdAt = new Date(raw.createdAt);
  const lastActivity = raw.lastActivity ? new Date(raw.lastActivity) : createdAt;
  const displayName = raw.displayName || raw.agentName || raw.sessionId;

  return {
    sessionId: raw.sessionId,
    status: raw.status,
    createdAt,
    eventCount: raw.eventCount ?? 0,
    lastActivity,
    agentName: raw.agentName || displayName,
    model: raw.model || "Unknown",
    displayName,
  };
}

/**
 * Custom hook for fetching and managing session list
 *
 * Per R01: SSOT for session fetching logic
 * Per R04: Optimized with AbortController for cleanup
 * Per R07: Strict typing throughout
 *
 * @example
 * // Basic usage with auto-polling
 * const { sessions, loading, error, refetch } = useSessionList({ autoPoll: true });
 *
 * @example
 * // Fetch only when dropdown opens
 * const { sessions, loading, refetch } = useSessionList({ enabled: isOpen, fetchOnMount: false });
 */
export function useSessionList(options: UseSessionListOptions = {}) {
  const {
    autoPoll = false,
    pollInterval = DEFAULT_POLL_INTERVAL,
    fetchOnMount = true,
    enabled = true,
  } = options;

  const [sessions, setSessions] = useState<NormalizedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/session/active`, {
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result;
      const rawSessions: RawSession[] = data.sessions || [];

      const normalized = rawSessions
        .map(normalizeSession)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setSessions(normalized);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("[useSessionList] Failed to fetch sessions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return fetchSessions(controller.signal);
  }, [fetchSessions]);

  // Initial fetch and polling
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (fetchOnMount) {
      fetchSessions(controller.signal);
    }

    if (autoPoll) {
      intervalRef.current = setInterval(() => {
        fetchSessions(controller.signal);
      }, pollInterval);
    }

    return () => {
      controller.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, fetchOnMount, autoPoll, pollInterval, fetchSessions]);

  /**
   * Delete a single session
   */
  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/session/bulk`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionIds: [sessionId] }),
        });

        if (response.ok) {
          setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
          return true;
        }
        return false;
      } catch (err) {
        console.error("[useSessionList] Failed to delete session:", err);
        return false;
      }
    },
    [],
  );

  /**
   * Delete all sessions
   */
  const deleteAllSessions = useCallback(async (): Promise<number> => {
    const sessionIds = sessions.map((s) => s.sessionId);
    if (sessionIds.length === 0) return 0;

    try {
      const response = await fetch(`${API_BASE_URL}/api/session/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds }),
      });

      if (response.ok) {
        const result = await response.json();
        const deletedCount = result.data?.deleted || 0;
        setSessions([]);
        return deletedCount;
      }
      return 0;
    } catch (err) {
      console.error("[useSessionList] Failed to delete all sessions:", err);
      return 0;
    }
  }, [sessions]);

  /**
   * Find a session by ID
   */
  const findSession = useCallback(
    (sessionId: string | null): NormalizedSession | undefined => {
      if (!sessionId) return undefined;
      return sessions.find((s) => s.sessionId === sessionId);
    },
    [sessions],
  );

  /**
   * Filter sessions by search query
   */
  const filterSessions = useCallback(
    (query: string): NormalizedSession[] => {
      if (!query.trim()) return sessions;
      const lowerQuery = query.toLowerCase();
      return sessions.filter(
        (s) =>
          s.sessionId.toLowerCase().includes(lowerQuery) ||
          s.displayName.toLowerCase().includes(lowerQuery) ||
          s.agentName.toLowerCase().includes(lowerQuery),
      );
    },
    [sessions],
  );

  return useMemo(
    () => ({
      sessions,
      loading,
      error,
      refetch,
      deleteSession,
      deleteAllSessions,
      findSession,
      filterSessions,
    }),
    [
      sessions,
      loading,
      error,
      refetch,
      deleteSession,
      deleteAllSessions,
      findSession,
      filterSessions,
    ],
  );
}
