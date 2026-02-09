/**
 * Conversation Timeline Hook - Phase 5
 *
 * React hooks for fetching and managing conversation timeline data.
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { ConversationEventRecord } from "@/components/conversation/ConversationTimeline";
import { API_BASE_URL } from "@/constants/api";

/**
 * Hook to fetch conversation timeline for a specific session
 */
export function useConversationTimeline(sessionId: string | null) {
  const [events, setEvents] = useState<ConversationEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!sessionId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation-events/session/${sessionId}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch conversation timeline: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Failed to fetch conversation timeline",
        );
      }

      setEvents(data.data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return {
    events,
    loading,
    error,
    refetch: fetchTimeline,
  };
}

/**
 * Hook to fetch recent conversation events across all sessions
 */
export function useRecentConversationEvents(limit: number = 50) {
  const [events, setEvents] = useState<ConversationEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecentEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation-events/recent?limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch recent events: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch recent events");
      }

      setEvents(data.data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentEvents();
  }, [fetchRecentEvents]);

  return {
    events,
    loading,
    error,
    refetch: fetchRecentEvents,
  };
}

/**
 * Hook to fetch conversation events by type
 */
export function useConversationEventsByType(
  sessionId: string | null,
  eventType: string,
) {
  const [events, setEvents] = useState<ConversationEventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEventsByType = useCallback(async () => {
    if (!sessionId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/conversation-events/session/${sessionId}/type/${eventType}`,
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch events by type: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch events by type");
      }

      setEvents(data.data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, eventType]);

  useEffect(() => {
    fetchEventsByType();
  }, [fetchEventsByType]);

  return {
    events,
    loading,
    error,
    refetch: fetchEventsByType,
  };
}
