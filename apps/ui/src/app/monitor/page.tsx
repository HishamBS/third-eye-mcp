"use client";

/**
 * Monitor Page - Theatrical Experience
 *
 * Real-time session monitoring transformed into a live theatrical performance
 * where 8 AI characters (Eyes) perform their roles on stage.
 */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useWebSocket, type WSMessage } from "@/hooks/useWebSocket";
import { useUI } from "@/contexts/UIContext";
import { API_BASE_URL } from "@/consts/api";
import { API_ROUTES } from "@/constants/api-routes";
import {
  TheatreShell,
  type TheatreShellProps,
  type RawHistoricalEvent,
} from "./_components";
import type { ConnectionStatus } from "@/components/theatre";

export const dynamic = "force-dynamic";

/**
 * Known Eye names for extraction from event codes
 */
const EYE_NAMES = [
  "sharingan",
  "kyuubi",
  "jogan",
  "rinnegan",
  "mangekyo",
  "tenseigan",
  "byakugan",
  "overseer",
] as const;

/**
 * Transform pipeline event from API to theatre event format
 *
 * API returns events with:
 * - code: "SHARINGAN_STARTED" (uppercase, DB format)
 * - eyeId: UUID (database reference)
 * - dataJson: {...} (nested data)
 * - createdAt: timestamp
 *
 * Theatre expects:
 * - type: "sharingan_started" (lowercase, matches THEATRE_EVENT_TEMPLATES)
 * - eye: "sharingan" (eye name string)
 * - data: {...} (flat data)
 * - timestamp: timestamp
 */
function transformPipelineEvent(
  event: Record<string, unknown>,
): RawHistoricalEvent {
  // Transform code to type (lowercase, matching theatre templates)
  const code = (event.code as string)?.toLowerCase() ?? "";
  const eventType = code || (event.type as string) || "pipeline_event";

  // Extract eye name from code prefix (e.g., "sharingan_started" -> "sharingan")
  const eye = EYE_NAMES.find((name) => code.startsWith(name)) ?? "overseer";

  return {
    ...event,
    type: eventType,
    eye: eye,
    timestamp: (event.createdAt as string) ?? (event.timestamp as string),
    data:
      (event.dataJson as Record<string, unknown>) ??
      (event.data as Record<string, unknown>) ??
      {},
  } as RawHistoricalEvent;
}

/**
 * Clarification item from API
 */
interface ClarificationItem {
  readonly id: string;
  readonly field: string;
  readonly question: string;
  readonly status: string;
  readonly answer?: string;
}

/**
 * Main theatre monitor content
 */
function TheatreMonitorContent() {
  const searchParams = useSearchParams();
  const { selectedSessionId, setSelectedSession } = useUI();
  const sessionIdFromQuery = searchParams.get("sessionId");
  const sessionId = sessionIdFromQuery ?? selectedSessionId ?? null;

  // WebSocket connection - pass sessionId to connect to session-specific events
  const { connectionStatus, subscribe } = useWebSocket({
    sessionId: sessionId ?? undefined,
  });

  // Map connection status to theatre format
  const theatreConnectionStatus: ConnectionStatus =
    connectionStatus === "connected"
      ? "connected"
      : connectionStatus === "reconnecting"
        ? "reconnecting"
        : "disconnected";

  // Intent confirmation state
  const [intentConfirmationId, setIntentConfirmationId] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  // Historical events loaded on mount
  const [historicalEvents, setHistoricalEvents] = useState<
    RawHistoricalEvent[]
  >([]);

  // Sync session from query params
  useEffect(() => {
    if (sessionIdFromQuery && sessionIdFromQuery !== selectedSessionId) {
      setSelectedSession(sessionIdFromQuery);
    }
  }, [sessionIdFromQuery, selectedSessionId, setSelectedSession]);

  /**
   * Fetch historical events for the session (events that happened before page load)
   */
  const fetchHistoricalEvents = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_EVENTS(sessionId)}`,
      );
      if (res.ok) {
        const result = await res.json();
        // Handle both { data: [...] } and direct array responses
        const events = Array.isArray(result) ? result : (result.data ?? []);
        // Transform events from API format to theatre format
        const transformedEvents = events.map(transformPipelineEvent);
        setHistoricalEvents(transformedEvents);
      }
    } catch (err) {
      console.error("Failed to fetch historical events:", err);
    }
  }, [sessionId]);

  /**
   * Fetch clarifications for the session
   */
  const fetchClarifications = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_CLARIFICATIONS(sessionId)}`,
      );
      if (res.ok) {
        // Process clarifications if needed
      }
    } catch (err) {
      console.error("Failed to fetch clarifications:", err);
    }
  }, [sessionId]);

  /**
   * Fetch intent confirmations for the session
   */
  const fetchIntentConfirmations = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_INTENT_CONFIRMATIONS(sessionId)}`,
      );
      if (res.ok) {
        const result = await res.json();
        const data = result.data !== undefined ? result.data : result;

        if (data && typeof data === "object" && typeof data.id === "string") {
          setIntentConfirmationId(data.id);
        } else {
          setIntentConfirmationId(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch intent confirmations:", err);
    }
  }, [sessionId]);

  // Load data on session change
  useEffect(() => {
    if (!sessionId) return;
    // Clear historical events when session changes to avoid stale data
    setHistoricalEvents([]);
    // Fetch fresh data for the new session
    fetchHistoricalEvents();
    fetchClarifications();
    fetchIntentConfirmations();
  }, [
    sessionId,
    fetchHistoricalEvents,
    fetchClarifications,
    fetchIntentConfirmations,
  ]);

  /**
   * Subscribe to WebSocket messages and return handler
   */
  const handleWebSocketMessage: TheatreShellProps["onWebSocketMessage"] =
    useCallback(
      (handler) => {
        const unsubscribe = subscribe((message: WSMessage) => {
          // Pass message to theatre handler
          handler(message);

          // Handle clarification answered event
          if (message.type === "clarification_answered") {
            fetchClarifications();
          }
        });

        return unsubscribe;
      },
      [subscribe, fetchClarifications],
    );

  /**
   * Submit clarification answer
   */
  const handleClarificationSubmit = useCallback(
    async (clarificationId: string, answer: string) => {
      if (!sessionId) return;

      setSubmitting(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}${API_ROUTES.SESSION_CLARIFICATION_VALIDATE(sessionId, clarificationId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answer }),
          },
        );

        if (res.ok) {
          const result = await res.json();
          const data = result.data || result;

          if (data.valid) {
            toast.success("Answer submitted successfully");
            await fetchClarifications();
          } else {
            toast.error(data.reason || "Answer validation failed", {
              description: data.suggestion,
            });
          }
        } else {
          toast.error("Failed to submit answer");
        }
      } catch (err) {
        console.error("Failed to submit clarification:", err);
        toast.error("Failed to submit answer");
      } finally {
        setSubmitting(false);
      }
    },
    [sessionId, fetchClarifications],
  );

  /**
   * Approve plan (intent confirmation)
   */
  const handlePlanApprove = useCallback(async () => {
    if (!intentConfirmationId) {
      toast.error("No plan pending approval");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.INTENT_CONFIRMATION_SUBMIT(intentConfirmationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: "approved" }),
        },
      );

      if (res.ok) {
        toast.success("Plan approved - proceeding with execution");
        await fetchIntentConfirmations();
      } else {
        const text = await res.text();
        toast.error(`Failed to approve plan: ${text}`);
      }
    } catch (err) {
      console.error("Failed to approve plan:", err);
      toast.error("Failed to approve plan");
    } finally {
      setSubmitting(false);
    }
  }, [intentConfirmationId, fetchIntentConfirmations]);

  /**
   * Reject plan with optional feedback
   */
  const handlePlanReject = useCallback(
    async (feedback?: string) => {
      if (!intentConfirmationId) {
        toast.error("No plan pending rejection");
        return;
      }

      setSubmitting(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}${API_ROUTES.INTENT_CONFIRMATION_SUBMIT(intentConfirmationId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response: "rejected", feedback }),
          },
        );

        if (res.ok) {
          toast.success("Plan rejected - task halted");
          await fetchIntentConfirmations();
        } else {
          const text = await res.text();
          toast.error(`Failed to reject plan: ${text}`);
        }
      } catch (err) {
        console.error("Failed to reject plan:", err);
        toast.error("Failed to reject plan");
      } finally {
        setSubmitting(false);
      }
    },
    [intentConfirmationId, fetchIntentConfirmations],
  );

  /**
   * Export session transcript
   */
  const handleExport = useCallback(() => {
    // Export functionality - can be expanded later
    toast.info("Export functionality coming soon");
  }, []);

  return (
    <TheatreShell
      sessionId={sessionId}
      initialEvents={historicalEvents}
      onWebSocketMessage={handleWebSocketMessage}
      onClarificationSubmit={handleClarificationSubmit}
      onPlanApprove={handlePlanApprove}
      onPlanReject={handlePlanReject}
      onExport={handleExport}
      initialConnectionStatus={theatreConnectionStatus}
      className="h-screen"
    />
  );
}

/**
 * Monitor Page with Suspense boundary
 */
export default function MonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-amber-500/80 text-sm font-medium tracking-wider uppercase">
              Opening Curtains...
            </p>
          </div>
        </div>
      }
    >
      <TheatreMonitorContent />
    </Suspense>
  );
}
