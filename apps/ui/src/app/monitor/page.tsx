"use client";

/**
 * Monitor Page - Tactical Operations View
 *
 * Real-time session monitoring with a conversation-based layout
 * where 8 Eyes process requests through a tactical pipeline.
 */

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useWebSocket, type WSMessage } from "@/hooks/useWebSocket";
import { useUI } from "@/contexts/UIContext";
import { EYES } from "@third-eye/types";
import { API_BASE_URL } from "@/constants/api";
import { API_ROUTES } from "@/constants/api-routes";
import {
  TacticalShell,
  type TacticalShellProps,
  type RawHistoricalEvent,
} from "./_components";

export const dynamic = "force-dynamic";

/**
 * Known Eye names for extraction from event codes - derived from SSOT
 */
const EYE_NAMES = EYES;

/**
 * Transform pipeline event from API to raw event format
 *
 * API returns events with:
 * - code: "SHARINGAN_STARTED" (uppercase, DB format)
 * - eyeId: UUID (database reference)
 * - dataJson: {...} (nested data)
 * - createdAt: timestamp
 *
 * TacticalShell expects:
 * - type: "sharingan_started" (lowercase)
 * - eye: "sharingan" (eye name string)
 * - data: {...} (flat data)
 * - timestamp: timestamp
 */
function transformPipelineEvent(
  event: Record<string, unknown>,
): RawHistoricalEvent {
  const code = (event.code as string)?.toLowerCase() ?? "";
  const eventType = code || (event.type as string) || "pipeline_event";

  // Primary: use eyeSlug from backend JOIN (authoritative)
  const eyeSlug = typeof event.eyeSlug === "string" ? event.eyeSlug : null;
  // Fallback: extract from code prefix (for backwards compat)
  const eye =
    eyeSlug ?? EYE_NAMES.find((name) => code.startsWith(name)) ?? null;

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
 * Tactical monitor content - data fetching and action handlers
 */
function TacticalMonitorContent() {
  const searchParams = useSearchParams();
  const { selectedSessionId, setSelectedSession } = useUI();
  const sessionIdFromQuery = searchParams.get("sessionId");
  const sessionId = sessionIdFromQuery ?? selectedSessionId ?? null;

  // WebSocket connection
  const { connectionStatus, subscribe } = useWebSocket({
    sessionId: sessionId ?? undefined,
  });

  // Map connection status to tactical format
  const tacticalConnectionStatus: TacticalShellProps["initialConnectionStatus"] =
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
   * Fetch historical events for the session.
   * Single source: pipeline_events table only (SSOT).
   */
  const fetchHistoricalEvents = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_EVENTS(sessionId)}`,
      );
      if (!res.ok) return;

      const result = await res.json();
      const events = (Array.isArray(result) ? result : (result.data ?? [])).map(
        transformPipelineEvent,
      );

      events.sort((a, b) => {
        const tA = new Date(
          (a.createdAt as string) ?? (a.timestamp as string),
        ).getTime();
        const tB = new Date(
          (b.createdAt as string) ?? (b.timestamp as string),
        ).getTime();
        return tA - tB;
      });

      // Inject the initial request as the first conversation entry
      // Extract from the first human_message event or routing_decision's original input
      const firstEvent = events[0];
      const humanMessageEvent = events.find(
        (e) => (e.type as string) === "human_message",
      );
      const routeEvent = events.find(
        (e) => (e.type as string) === "overseer_route",
      );

      const originalInput =
        (humanMessageEvent?.data as Record<string, unknown>)?.content ||
        (humanMessageEvent?.data as Record<string, unknown>)?.markdown ||
        (routeEvent?.data as Record<string, unknown>)?.originalInput ||
        null;

      if (originalInput && typeof originalInput === "string") {
        const initialRequestEvent = transformPipelineEvent({
          code: "HUMAN_REQUEST",
          eyeSlug: null,
          dataJson: {
            request: originalInput,
            sessionId,
            content: originalInput,
          },
          createdAt:
            firstEvent?.createdAt ??
            firstEvent?.timestamp ??
            new Date().toISOString(),
        });
        events.unshift(initialRequestEvent);
      }

      setHistoricalEvents(events);
    } catch (err) {
      console.error("Failed to fetch historical events:", err);
    }
  }, [sessionId]);

  /**
   * Fetch clarifications for the session and merge into historical events
   */
  const fetchClarifications = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_CLARIFICATIONS(sessionId)}`,
      );
      if (!res.ok) return;
      const result = await res.json();
      const clarifications = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : [];

      if (clarifications.length === 0) return;

      const syntheticEvents: RawHistoricalEvent[] = [];

      for (const c of clarifications) {
        syntheticEvents.push(
          transformPipelineEvent({
            code: "CLARIFICATION_ASKED",
            eyeSlug: c.eyeSlug || "sharingan",
            dataJson: {
              clarificationId: c.id,
              questions: c.questions,
              status: c.status,
              response: c.response,
            },
            createdAt: c.createdAt,
          }),
        );

        if (c.response && c.status === "answered") {
          syntheticEvents.push(
            transformPipelineEvent({
              code: "HUMAN_CLARIFICATION_ANSWER",
              eyeSlug: null,
              dataJson: {
                clarificationId: c.id,
                answer: c.response,
                answeredBy: c.respondedBy || "human",
              },
              createdAt: c.respondedAt || c.updatedAt,
            }),
          );
        }
      }

      if (syntheticEvents.length > 0) {
        setHistoricalEvents((prev) => {
          const merged = [...prev, ...syntheticEvents];
          merged.sort((a, b) => {
            const tA = new Date(
              (a.createdAt as string) ?? (a.timestamp as string),
            ).getTime();
            const tB = new Date(
              (b.createdAt as string) ?? (b.timestamp as string),
            ).getTime();
            return tA - tB;
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch clarifications:", err);
    }
  }, [sessionId]);

  /**
   * Fetch intent confirmations for the session and merge into events
   */
  const fetchIntentConfirmations = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_INTENT_CONFIRMATIONS(sessionId)}`,
      );
      if (!res.ok) return;
      const result = await res.json();
      const data = result.data !== undefined ? result.data : result;

      // Handle single confirmation object or array
      const confirmations = Array.isArray(data)
        ? data
        : data && typeof data === "object" && typeof data.id === "string"
          ? [data]
          : Array.isArray(data?.confirmations)
            ? data.confirmations
            : [];

      // Track pending confirmation for approval UI
      const pending = confirmations.find(
        (ic: Record<string, unknown>) => ic.status === "pending",
      );
      setIntentConfirmationId(
        pending && typeof pending.id === "string" ? pending.id : null,
      );

      // Generate synthetic events
      const syntheticEvents: RawHistoricalEvent[] = [];

      for (const ic of confirmations) {
        syntheticEvents.push(
          transformPipelineEvent({
            code: "INTENT_CONFIRMATION_REQUESTED",
            eyeSlug: ic.eyeSlug || "jogan",
            dataJson: {
              confirmationId: ic.id,
              intent: ic.intentAnalysis,
              riskLevel: ic.riskLevel,
              status: ic.status,
              planContent: ic.confirmationPrompt,
            },
            createdAt: ic.createdAt,
          }),
        );

        if (ic.status === "confirmed" || ic.status === "rejected") {
          syntheticEvents.push(
            transformPipelineEvent({
              code:
                ic.status === "confirmed"
                  ? "INTENT_CONFIRMED"
                  : "INTENT_REJECTED",
              eyeSlug: null,
              dataJson: {
                confirmationId: ic.id,
                decision: ic.status,
                response: ic.response,
              },
              createdAt: ic.respondedAt || ic.updatedAt,
            }),
          );
        }
      }

      if (syntheticEvents.length > 0) {
        setHistoricalEvents((prev) => {
          const merged = [...prev, ...syntheticEvents];
          merged.sort((a, b) => {
            const tA = new Date(
              (a.createdAt as string) ?? (a.timestamp as string),
            ).getTime();
            const tB = new Date(
              (b.createdAt as string) ?? (b.timestamp as string),
            ).getTime();
            return tA - tB;
          });
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch intent confirmations:", err);
    }
  }, [sessionId]);

  // Load data on session change
  useEffect(() => {
    if (!sessionId) return;
    setHistoricalEvents([]);
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
  const handleWebSocketMessage: TacticalShellProps["onWebSocketMessage"] =
    useCallback(
      (handler) => {
        const unsubscribe = subscribe((message: WSMessage) => {
          handler(message);

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
          body: JSON.stringify({ confirmed: true, response: "approved" }),
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
            body: JSON.stringify({
              confirmed: false,
              response: feedback || "rejected",
            }),
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
    toast.info("Export functionality coming soon");
  }, []);

  return (
    <TacticalShell
      sessionId={sessionId}
      initialEvents={historicalEvents}
      onWebSocketMessage={handleWebSocketMessage}
      onClarificationSubmit={handleClarificationSubmit}
      onPlanApprove={handlePlanApprove}
      onPlanReject={handlePlanReject}
      onExport={handleExport}
      isSubmitting={submitting}
      initialConnectionStatus={tacticalConnectionStatus}
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
        <div className="flex h-screen items-center justify-center bg-brand-paper">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-brand-accent/30 border-t-brand-accent" />
            <p className="text-sm font-medium uppercase tracking-wider text-semantic-muted">
              Initializing Monitor...
            </p>
          </div>
        </div>
      }
    >
      <TacticalMonitorContent />
    </Suspense>
  );
}
