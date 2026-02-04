"use client";

/**
 * Monitor Page - The Crown Jewel
 *
 * Real-time session monitoring with 5-tab structure.
 * Professional implementation with SSOT constants, strict typing, and no hardcoded values.
 */

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Eye,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  exportSession,
  type ExportFormat,
  type ExportEvent,
} from "@third-eye/utils";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/GlassCard";
import { useWebSocket, type WSMessage } from "@/hooks/useWebSocket";
import { useUI } from "@/contexts/UIContext";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
  STATUS_BG_COLORS,
} from "@/constants/color-mappings";
import {
  ConversationEntry,
  type ConversationEntryData,
} from "@/components/monitor/ConversationEntry";
import { TabButton } from "@/components/monitor/TabButton";
import { StatusBadge } from "@/components/monitor/StatusBadge";
import { ViewModeDescription } from "@/components/ViewModeToggle";
import { RoutingDecisionPanel } from "@/components/monitor/RoutingDecisionPanel";
import { ConversationTimeline } from "@/components/conversation/ConversationTimeline";
import { useConversationTimeline } from "@/hooks/useConversationTimeline";
import type { EyeName } from "@third-eye/types";
import { API_BASE_URL } from "@/consts/api";
import { API_ROUTES } from "@/constants/api-routes";
import {
  MONITOR_TABS,
  MonitorTabId,
  SpeakerType,
  type Speaker,
  ApprovalStatus,
} from "@third-eye/constants";
import type { EyeSequence } from "@third-eye/eyes";

export const dynamic = "force-dynamic";

interface SessionSummary {
  readonly sessionId: string;
  readonly status: string;
  readonly eventCount: number;
  readonly eyes: readonly string[];
  readonly createdAt: Date;
}

interface ApiPipelineEvent {
  readonly id: string;
  readonly sessionId: string;
  readonly type: string;
  readonly eye?: string | null;
  readonly code?: string | null;
  readonly md?: string | null;
  readonly dataJson?: Record<string, unknown> | null;
  readonly createdAt: string;
}

interface ClarificationItem {
  readonly id: string;
  readonly field: string;
  readonly question: string;
  readonly status: string;
}

interface ResolvedClarificationItem extends ClarificationItem {
  readonly answer: string;
  readonly answeredAt: Date;
}

interface IntentData {
  readonly intentAnalysis?: Record<string, unknown>;
  readonly confirmationPrompt?: string;
  readonly response?: string;
  readonly userIdentity?: string;
}

interface EvidenceData {
  readonly mangekyo: Record<string, unknown> | null;
  readonly tenseigan: Record<string, unknown> | null;
  readonly byakugan: Record<string, unknown> | null;
}

/**
 * Normalize eye name - just format normalization, no hardcoded validation
 * Per SSOT: We can't hardcode valid eye names, they come from database
 */
function normalizeEyeName(value?: string | null): EyeName | undefined {
  if (!value) return undefined;
  // Normalize format (replace hyphens/colons with underscores) and return as EyeName
  // No validation against hardcoded list - database is SSOT
  const normalized = value.replace(/[-:]/g, "_");
  return normalized as EyeName;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function firstString(values: ReadonlyArray<unknown>): string | undefined {
  for (const value of values) {
    const str = getString(value);
    if (str) return str;
  }
  return undefined;
}

function deriveSpeaker(params: {
  readonly type?: string;
  readonly eye?: string;
  readonly data?: Record<string, unknown>;
  readonly speaker?: string;
}): Speaker {
  const candidateSpeaker =
    params.speaker ||
    (params.data ? getString(params.data.speaker) : undefined);

  if (candidateSpeaker === SpeakerType.AGENT) return SpeakerType.AGENT;
  if (candidateSpeaker === SpeakerType.HUMAN) return SpeakerType.HUMAN;

  const resolvedEye =
    normalizeEyeName(candidateSpeaker) ||
    normalizeEyeName(params.eye) ||
    (params.data ? normalizeEyeName(getString(params.data.eye)) : undefined);

  if (resolvedEye) {
    return resolvedEye;
  }

  if (params.type === "agent_message" || params.type === "agent_response") {
    return SpeakerType.AGENT;
  }

  if (
    params.type === "user_input" ||
    params.type === "user_input_request" ||
    params.type === "user_input_received"
  ) {
    return SpeakerType.HUMAN;
  }

  return SpeakerType.OVERSEER;
}

function normalizeApiEvent(event: ApiPipelineEvent): ConversationEntryData {
  const data = asRecord(event.dataJson);
  const message =
    firstString([event.md, data?.md, data?.details, data?.summary]) ||
    "Processing...";

  // Phase 18: Extract stage field from event data
  const stageValue = data?.stage || event.stage;
  const stage =
    stageValue === "guidance" || stageValue === "validation"
      ? stageValue
      : undefined;

  return {
    id: event.id,
    timestamp: new Date(event.createdAt),
    speaker: deriveSpeaker({
      type: event.type,
      eye: event.eye || undefined,
      data,
    }),
    message,
    stage,
    metadata: {
      code: event.code || undefined,
      dataJson: data,
    },
  };
}

/**
 * Convert ConversationEntryData to ExportEvent for export utilities
 */
function toExportEvent(
  entry: ConversationEntryData,
  sessionId: string,
): ExportEvent {
  // Extract eyeId/eyeName from speaker if it's an eye
  const speakerStr = String(entry.speaker);
  const isEye =
    speakerStr !== "agent" &&
    speakerStr !== "human" &&
    speakerStr !== "overseer";
  const eyeId = isEye ? speakerStr : undefined;
  const eyeName = isEye ? speakerStr : undefined;

  return {
    id: entry.id,
    sessionId,
    eyeId,
    eyeName,
    stage: entry.stage,
    status: entry.metadata?.code,
    message: entry.message,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp.toISOString()
        : String(entry.timestamp),
    data: entry.metadata?.dataJson,
  };
}

function normalizeWebSocketMessage(
  message: WSMessage,
): ConversationEntryData | null {
  const payload = asRecord(message.data);
  if (!payload) return null;

  const result = asRecord(payload.result);
  const ui = asRecord(payload.ui);
  const timestampMs =
    typeof payload.timestamp === "number"
      ? payload.timestamp
      : message.timestamp;

  const idParts = [
    getString(payload.runId),
    getString(payload.eventType),
    getString(payload.status),
    getString(payload.eye),
    timestampMs ? String(timestampMs) : undefined,
  ].filter(Boolean);

  const id =
    idParts.length > 0 ? `ws-${idParts.join(":")}` : `ws-${Date.now()}`;

  const code =
    getString(payload.code) || (result ? getString(result.code) : undefined);

  const messageText =
    firstString([
      ui?.details,
      ui?.summary,
      ui?.title,
      payload.md,
      result?.md,
      payload.error,
    ]) || "Processing...";

  // Phase 18: Extract stage field from WebSocket payload
  const stageValue = payload.stage;
  const stage =
    stageValue === "guidance" || stageValue === "validation"
      ? stageValue
      : undefined;

  return {
    id,
    timestamp: new Date(timestampMs),
    speaker: deriveSpeaker({
      type: getString(payload.eventType) || message.type,
      eye: getString(payload.eye),
      data: payload,
      speaker: getString(payload.speaker),
    }),
    message: messageText,
    stage,
    metadata: {
      code: code || undefined,
      dataJson: payload,
    },
  };
}

function MonitorContent() {
  const searchParams = useSearchParams();
  const { selectedSessionId, setSelectedSession, viewMode } = useUI();
  const sessionIdFromQuery = searchParams.get("sessionId");
  const sessionId = sessionIdFromQuery ?? selectedSessionId ?? null;

  const [entries, setEntries] = useState<readonly ConversationEntryData[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<MonitorTabId>(
    MonitorTabId.TIMELINE,
  );

  const [clarifications, setClarifications] = useState<{
    readonly outstanding: readonly ClarificationItem[];
    readonly resolved: readonly ResolvedClarificationItem[];
  }>({ outstanding: [], resolved: [] });

  const [intentData, setIntentData] = useState<IntentData | null>(null);
  const [evidenceData, setEvidenceData] = useState<EvidenceData>({
    mangekyo: null,
    tenseigan: null,
    byakugan: null,
  });
  const [routingDecision, setRoutingDecision] = useState<EyeSequence | null>(
    null,
  );

  // State for clarification response form
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({});
  const [submittingClarification, setSubmittingClarification] = useState<
    string | null
  >(null);

  // State for intent confirmation actions
  const [intentConfirmationId, setIntentConfirmationId] = useState<
    string | null
  >(null);
  const [submittingIntent, setSubmittingIntent] = useState(false);

  // Phase 5: Narrative timeline hook
  const {
    events: narrativeEvents,
    loading: narrativeLoading,
    error: narrativeError,
  } = useConversationTimeline(sessionId);

  const { connectionStatus, subscribe } = useWebSocket();

  useEffect(() => {
    if (sessionIdFromQuery && sessionIdFromQuery !== selectedSessionId) {
      setSelectedSession(sessionIdFromQuery);
    }
  }, [sessionIdFromQuery, selectedSessionId, setSelectedSession]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [summaryRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE_URL}${API_ROUTES.SESSION_BY_ID(sessionId)}`),
          fetch(`${API_BASE_URL}${API_ROUTES.SESSION_EVENTS(sessionId)}`),
        ]);

        if (!summaryRes.ok || !eventsRes.ok) {
          throw new Error("Failed to load session data");
        }

        const summaryResult = await summaryRes.json();
        const eventsResult = await eventsRes.json();

        // Handle wrapped response from createSuccessResponse
        const summaryData = summaryResult.data || summaryResult;
        const eventsData = eventsResult.data || eventsResult;

        setSummary({
          sessionId: summaryData.id || sessionId,
          status: summaryData.status || "unknown",
          eventCount: eventsData.length || 0,
          eyes: Array.isArray(summaryData.eyes) ? summaryData.eyes : [],
          createdAt: new Date(summaryData.createdAt || Date.now()),
        });

        const normalizedEntries = Array.isArray(eventsData)
          ? eventsData.map((event: ApiPipelineEvent) =>
              normalizeApiEvent(event),
            )
          : [];

        setEntries(normalizedEntries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  // Pipeline state for pause/resume display
  const [pipelineState, setPipelineState] = useState<{
    status: string;
    pauseReason: string | null;
    awaitingClarification: boolean;
    awaitingConfirmation: boolean;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribe((message) => {
      try {
        if (message.type === "pipeline_event") {
          const entry = normalizeWebSocketMessage(message);
          if (entry) {
            // Deduplication: Check if entry with same ID already exists
            setEntries((prev) => {
              const existingIds = new Set(prev.map((e) => e.id));
              if (existingIds.has(entry.id)) {
                // Skip duplicate
                return prev;
              }
              return [...prev, entry];
            });
          }
        }

        // Handle pipeline paused event
        if (message.type === "pipeline_paused") {
          const payload = message.data as Record<string, unknown> | undefined;
          setPipelineState({
            status: "paused",
            pauseReason: (payload?.reason as string) ?? "Awaiting input",
            awaitingClarification:
              (payload?.awaitingClarification as boolean) ?? false,
            awaitingConfirmation:
              (payload?.awaitingConfirmation as boolean) ?? false,
          });
        }

        // Handle pipeline resumed event
        if (message.type === "pipeline_resumed") {
          setPipelineState((prev) => ({
            ...(prev ?? {
              pauseReason: null,
              awaitingClarification: false,
              awaitingConfirmation: false,
            }),
            status: "running",
            pauseReason: null,
          }));
        }

        // Handle clarification answered event
        if (message.type === "clarification_answered") {
          // Refresh clarifications list
          fetchClarifications();
        }
      } catch (err) {
        console.error("Failed to process WebSocket message:", err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, subscribe, fetchClarifications]);

  useEffect(() => {
    if (autoScroll && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoScroll]);

  const fetchClarifications = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_CLARIFICATIONS(sessionId)}`,
      );
      if (res.ok) {
        const result = await res.json();
        // Backend returns array directly (wrapped in createSuccessResponse)
        const data = result.data || result;
        const clarificationsArray = Array.isArray(data) ? data : [];

        const outstanding: ClarificationItem[] = [];
        const resolved: ResolvedClarificationItem[] = [];

        for (const q of clarificationsArray) {
          // Server data must have ID - skip malformed items
          if (q && typeof q === "object" && q.id) {
            if (q.answer) {
              resolved.push({
                id: q.id,
                field: q.field || "unknown",
                question: q.text || q.question || "",
                answer: q.answer,
                answeredAt: new Date(q.answeredAt || Date.now()),
                status: "resolved",
              });
            } else {
              outstanding.push({
                id: q.id,
                field: q.field || "unknown",
                question: q.text || q.question || "",
                status: "pending",
              });
            }
          }
        }

        setClarifications({ outstanding, resolved });
      }
    } catch (err) {
      console.error("Failed to fetch clarifications:", err);
    }
  }, [sessionId]);

  const fetchIntentConfirmations = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_INTENT_CONFIRMATIONS(sessionId)}`,
      );
      if (res.ok) {
        const result = await res.json();
        // Backend returns single object or null (wrapped in createSuccessResponse)
        const data = result.data !== undefined ? result.data : result;

        if (data && typeof data === "object") {
          // Store the confirmation ID for later submission
          if (typeof data.id === "string") {
            setIntentConfirmationId(data.id);
          }

          setIntentData({
            intentAnalysis: data.intentAnalysis as
              | Record<string, unknown>
              | undefined,
            confirmationPrompt:
              typeof data.confirmationPrompt === "string"
                ? data.confirmationPrompt
                : undefined,
            response:
              typeof data.response === "string" ? data.response : undefined,
            userIdentity:
              typeof data.userIdentity === "string"
                ? data.userIdentity
                : undefined,
          });
        } else {
          // No pending intent confirmations
          setIntentConfirmationId(null);
          setIntentData(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch intent confirmations:", err);
    }
  }, [sessionId]);

  const fetchRoutingDecision = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ROUTES.SESSION_ROUTING(sessionId)}`,
      );
      if (res.ok) {
        const result = await res.json();
        // Backend returns { routing: { flow, taskType, reasoning, recommendedEye } } or { routing: null }
        const data = result.data || result;
        if (data && data.routing) {
          setRoutingDecision(data.routing);
        }
      }
    } catch (err) {
      console.error("Failed to fetch routing decision:", err);
    }
  }, [sessionId]);

  useEffect(() => {
    const mangekyoEvent = entries.find((e) => e.speaker === "mangekyo");
    const tenseiganEvent = entries.find((e) => e.speaker === "tenseigan");
    const byakuganEvent = entries.find((e) => e.speaker === "byakugan");

    setEvidenceData({
      mangekyo: mangekyoEvent?.metadata?.dataJson || null,
      tenseigan: tenseiganEvent?.metadata?.dataJson || null,
      byakugan: byakuganEvent?.metadata?.dataJson || null,
    });
  }, [entries]);

  useEffect(() => {
    if (!sessionId) return;
    fetchClarifications();
    fetchIntentConfirmations();
    fetchRoutingDecision();
  }, [
    sessionId,
    fetchClarifications,
    fetchIntentConfirmations,
    fetchRoutingDecision,
  ]);

  /**
   * Submit a clarification answer
   */
  const handleSubmitClarification = useCallback(
    async (clarificationId: string) => {
      if (!sessionId) return;

      const answer = clarificationAnswers[clarificationId]?.trim();
      if (!answer) {
        toast.error("Please provide an answer");
        return;
      }

      setSubmittingClarification(clarificationId);

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
            // Clear the answer field and refresh clarifications
            setClarificationAnswers((prev) => {
              const next = { ...prev };
              delete next[clarificationId];
              return next;
            });
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
        setSubmittingClarification(null);
      }
    },
    [sessionId, clarificationAnswers, fetchClarifications],
  );

  /**
   * Submit intent confirmation (approve/reject)
   */
  const handleIntentConfirmation = useCallback(
    async (response: "approved" | "rejected") => {
      if (!intentConfirmationId) {
        toast.error("No intent confirmation pending");
        return;
      }

      setSubmittingIntent(true);

      try {
        const res = await fetch(
          `${API_BASE_URL}${API_ROUTES.INTENT_CONFIRMATION_SUBMIT(intentConfirmationId)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ response }),
          },
        );

        if (res.ok) {
          toast.success(
            response === "approved"
              ? "Intent approved - proceeding with task"
              : "Intent rejected - task halted",
          );
          await fetchIntentConfirmations();
        } else {
          const text = await res.text();
          toast.error(`Failed to ${response} intent: ${text}`);
        }
      } catch (err) {
        console.error("Failed to submit intent confirmation:", err);
        toast.error("Failed to submit intent confirmation");
      } finally {
        setSubmittingIntent(false);
      }
    },
    [intentConfirmationId, fetchIntentConfirmations],
  );

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-brand-paper">
        <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
              >
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                  Real-time
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-brand-foreground">
                  Monitor
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <GlassCard className="py-12">
            <p className="text-lg text-brand-foreground mb-2">
              No Session Selected
            </p>
            <p className="text-sm text-semantic-muted mb-6">
              Select a session to watch real-time agent conversations
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-accent/90 transition-colors"
            >
              <span>Back to Dashboard</span>
            </Link>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-paper">
        <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
              >
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                  Real-time
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-brand-foreground">
                  Monitor
                </h1>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-6"
          >
            <p className="text-sm text-brand-primary">{error}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-paper">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
              >
                ← Home
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                    Real-time Monitor
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        connectionStatus === "connected"
                          ? `${STATUS_BG_COLORS.success} animate-pulse`
                          : connectionStatus === "reconnecting"
                            ? `${STATUS_BG_COLORS.warning} animate-pulse`
                            : STATUS_BG_COLORS.error
                      }`}
                    />
                    <span className="text-xs text-semantic-muted">
                      {connectionStatus === "connected"
                        ? "Live"
                        : connectionStatus === "reconnecting"
                          ? "Reconnecting..."
                          : "Disconnected"}
                    </span>
                  </div>
                </div>
                <h1 className="mt-1 text-2xl font-semibold text-brand-foreground">
                  Session {sessionId?.slice(0, 8)}...
                </h1>
                {summary && (
                  <p className="mt-1 text-sm text-semantic-muted">
                    Status: {summary.status} · {summary.eventCount} events
                    {summary.eyes &&
                      summary.eyes.length > 0 &&
                      ` · Eyes: ${summary.eyes.join(", ")}`}
                  </p>
                )}
                {/* Pipeline state indicator */}
                {pipelineState && pipelineState.status === "paused" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-medium text-yellow-400">
                      <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                      Pipeline Paused
                      {pipelineState.pauseReason &&
                        ` - ${pipelineState.pauseReason}`}
                    </span>
                    {pipelineState.awaitingClarification && (
                      <span className="text-xs text-yellow-400">
                        Awaiting clarification
                      </span>
                    )}
                    {pipelineState.awaitingConfirmation && (
                      <span className="text-xs text-purple-400">
                        Awaiting confirmation
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-semantic-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-brand-outline bg-brand-paper text-brand-accent focus:ring-brand-accent"
                />
                Auto-scroll
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <ViewModeDescription />

        <div
          className="mt-6 mb-6 flex gap-2 border-b border-brand-outline/30"
          role="tablist"
        >
          {MONITOR_TABS.filter(
            (tab) => viewMode === "expert" || tab.id !== MonitorTabId.RAW_JSON,
          ).map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>

        <GlassCard className="p-6">
          {activeTab === MonitorTabId.TIMELINE && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-brand-foreground">
                  Timeline
                </h2>
                <div className="flex items-center gap-4">
                  <div className="text-xs text-semantic-muted">
                    {entries.length} {entries.length === 1 ? "event" : "events"}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const sid = sessionId || "unknown";
                        const exportEvents = entries.map((e) =>
                          toExportEvent(e, sid),
                        );
                        const createdAtStr = entries[0]?.timestamp
                          ? entries[0].timestamp.toISOString()
                          : undefined;
                        exportSession("markdown", sid, exportEvents, {
                          agent: "Third Eye MCP",
                          createdAt: createdAtStr,
                        });
                      }}
                      className="flex items-center gap-1 rounded-md bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-accent/20 transition-colors"
                      title="Export as Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                      MD
                    </button>
                    <button
                      onClick={() => {
                        const sid = sessionId || "unknown";
                        const exportEvents = entries.map((e) =>
                          toExportEvent(e, sid),
                        );
                        const createdAtStr = entries[0]?.timestamp
                          ? entries[0].timestamp.toISOString()
                          : undefined;
                        exportSession("pdf", sid, exportEvents, {
                          agent: "Third Eye MCP",
                          createdAt: createdAtStr,
                        });
                      }}
                      className="flex items-center gap-1 rounded-md bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-accent/20 transition-colors"
                      title="Export as PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => {
                        const sid = sessionId || "unknown";
                        const exportEvents = entries.map((e) =>
                          toExportEvent(e, sid),
                        );
                        const createdAtStr = entries[0]?.timestamp
                          ? entries[0].timestamp.toISOString()
                          : undefined;
                        exportSession("json", sid, exportEvents, {
                          agent: "Third Eye MCP",
                          createdAt: createdAtStr,
                        });
                      }}
                      className="flex items-center gap-1 rounded-md bg-brand-accent/10 px-3 py-1.5 text-xs font-medium text-brand-accent hover:bg-brand-accent/20 transition-colors"
                      title="Export as JSON"
                    >
                      <Download className="h-3.5 w-3.5" />
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
              ) : entries.length === 0 ? (
                <div className="py-16 text-center">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-semantic-muted" />
                  <p className="text-lg text-brand-foreground mb-2">
                    No Conversation Yet
                  </p>
                  <p className="text-sm text-semantic-muted">
                    Waiting for agent to start communicating...
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {entries.map((entry, index) => (
                    <ConversationEntry
                      key={entry.id}
                      entry={entry}
                      index={index}
                    />
                  ))}
                  <div ref={conversationEndRef} />
                </div>
              )}
            </>
          )}

          {activeTab === MonitorTabId.NARRATIVE && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-brand-foreground">
                  Narrative
                </h2>
                <p className="text-sm text-semantic-muted mt-1">
                  Human-readable conversation flow showing the story of pipeline
                  execution
                </p>
              </div>
              <ConversationTimeline
                events={narrativeEvents}
                loading={narrativeLoading}
                error={narrativeError}
              />
            </>
          )}

          {activeTab === MonitorTabId.ROUTING && (
            <RoutingDecisionPanel
              routing={routingDecision}
              sessionId={sessionId || undefined}
            />
          )}

          {activeTab === MonitorTabId.CLARIFICATIONS && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-brand-foreground">
                  Clarifications
                </h2>
                <p className="text-sm text-semantic-muted mt-1">
                  Questions and answers that clarify task requirements
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-brand-accent mb-3">
                    Outstanding
                  </h3>
                  <div className="space-y-3">
                    {clarifications.outstanding.length === 0 ? (
                      <div
                        className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_BG_COLORS_SUBTLE.warning} p-4`}
                      >
                        <p className={`text-sm ${STATUS_TEXT_COLORS.warning}`}>
                          No pending clarifications
                        </p>
                      </div>
                    ) : (
                      clarifications.outstanding.map((c) => (
                        <div
                          key={c.id}
                          className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_BG_COLORS_SUBTLE.warning} p-4`}
                        >
                          <p
                            className={`text-xs ${STATUS_TEXT_COLORS.warning} mb-1 font-semibold uppercase`}
                          >
                            {c.field}
                          </p>
                          <p
                            className={`text-sm ${STATUS_TEXT_COLORS.warning} mb-3`}
                          >
                            {c.question}
                          </p>
                          {/* Clarification response form */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type your answer..."
                              value={clarificationAnswers[c.id] || ""}
                              onChange={(e) =>
                                setClarificationAnswers((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitClarification(c.id);
                                }
                              }}
                              className="flex-1 px-3 py-2 text-sm bg-brand-paper border border-brand-outline/40 rounded-lg text-brand-foreground placeholder:text-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                              disabled={submittingClarification === c.id}
                            />
                            <button
                              onClick={() => handleSubmitClarification(c.id)}
                              disabled={
                                submittingClarification === c.id ||
                                !clarificationAnswers[c.id]?.trim()
                              }
                              className="px-4 py-2 text-sm font-medium bg-brand-accent text-brand-foreground rounded-lg hover:bg-brand-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {submittingClarification === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Submit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h3
                    className={`text-sm font-semibold ${STATUS_TEXT_COLORS.success} mb-3`}
                  >
                    Resolved
                  </h3>
                  <div className="space-y-3">
                    {clarifications.resolved.length === 0 ? (
                      <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                        <p className="text-sm text-semantic-muted">
                          No resolved clarifications yet
                        </p>
                      </div>
                    ) : (
                      clarifications.resolved.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4"
                        >
                          <p className="text-xs text-semantic-muted mb-1 font-semibold uppercase">
                            {c.field}
                          </p>
                          <p className="text-sm text-semantic-muted font-medium mb-1">
                            {c.question}
                          </p>
                          <p
                            className={`text-sm ${STATUS_TEXT_COLORS.success}`}
                          >
                            {c.answer}
                          </p>
                          <p className="text-xs text-semantic-muted mt-2">
                            Answered: {new Date(c.answeredAt).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === MonitorTabId.INTENT && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-brand-foreground">
                  Intent Confirmation
                </h2>
                <p className="text-sm text-semantic-muted mt-1">
                  Human approval of scope and effort before work proceeds
                </p>
              </div>
              <div className="space-y-4">
                {intentData ? (
                  <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-brand-foreground">
                          Intent Analysis
                        </p>
                        {intentData.intentAnalysis && (
                          <div className="mt-2 space-y-1 text-xs text-semantic-muted">
                            {Object.entries(intentData.intentAnalysis).map(
                              ([key, value]) => (
                                <p key={key}>
                                  <span className="font-semibold uppercase">
                                    {key}:
                                  </span>{" "}
                                  {Array.isArray(value)
                                    ? value.join(", ")
                                    : String(value)}
                                </p>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                      <StatusBadge
                        status={
                          intentData.response === "approved"
                            ? ApprovalStatus.APPROVED
                            : intentData.response === "rejected"
                              ? ApprovalStatus.REJECTED
                              : ApprovalStatus.PENDING
                        }
                        size="sm"
                      />
                    </div>
                    {intentData.confirmationPrompt && (
                      <div className="mt-4 rounded-lg border border-brand-outline/30 bg-brand-paperElev/50 p-3">
                        <p className="text-xs text-semantic-muted mb-1">
                          Confirmation Prompt:
                        </p>
                        <p className="text-sm text-semantic-muted">
                          {intentData.confirmationPrompt}
                        </p>
                      </div>
                    )}
                    {intentData.response === "approved" &&
                      intentData.userIdentity && (
                        <div className="mt-3 flex items-center gap-2">
                          <StatusBadge
                            status={ApprovalStatus.APPROVED}
                            size="sm"
                          />
                          <span
                            className={`text-sm font-semibold ${STATUS_TEXT_COLORS.success}`}
                          >
                            Approved by {intentData.userIdentity}
                          </span>
                        </div>
                      )}

                    {/* Approve/Reject buttons - only show when pending */}
                    {!intentData.response && intentConfirmationId && (
                      <div className="mt-6 pt-4 border-t border-brand-outline/30">
                        <p className="text-sm text-semantic-muted mb-4">
                          Please review the intent analysis above and decide
                          whether to proceed:
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleIntentConfirmation("approved")}
                            disabled={submittingIntent}
                            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${STATUS_BG_COLORS.success} text-brand-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {submittingIntent ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                            Approve & Proceed
                          </button>
                          <button
                            onClick={() => handleIntentConfirmation("rejected")}
                            disabled={submittingIntent}
                            className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${STATUS_BG_COLORS.error} text-brand-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {submittingIntent ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Reject & Stop
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-sm text-semantic-muted">
                      Intent confirmation data will appear here when Jōgan runs
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === MonitorTabId.EVIDENCE && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-brand-foreground">
                  Evidence & Validation
                </h2>
                <p className="text-sm text-semantic-muted mt-1">
                  Quality gates, code review, and factual verification results
                </p>
              </div>
              <div className="space-y-6">
                <div>
                  <h3
                    className={`text-sm font-semibold ${STATUS_TEXT_COLORS.info} mb-3`}
                  >
                    Code Review (Mangekyō)
                  </h3>
                  {evidenceData.mangekyo ? (
                    <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                      {evidenceData.mangekyo.qualityScore &&
                        typeof evidenceData.mangekyo.qualityScore ===
                          "number" && (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-brand-foreground">
                                Quality Score
                              </span>
                              <span
                                className={`text-lg font-semibold ${STATUS_TEXT_COLORS.success}`}
                              >
                                {evidenceData.mangekyo.qualityScore}/100
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-brand-paperElev">
                              <div
                                className={`h-2 rounded-full ${STATUS_BG_COLORS.success}`}
                                style={{
                                  width: `${evidenceData.mangekyo.qualityScore}%`,
                                }}
                              />
                            </div>
                          </>
                        )}
                      {evidenceData.mangekyo.issues &&
                        Array.isArray(evidenceData.mangekyo.issues) && (
                          <div className="mt-3 space-y-2">
                            {evidenceData.mangekyo.issues.map(
                              (issue, idx: number) => (
                                <p
                                  key={idx}
                                  className="text-sm text-semantic-muted"
                                >
                                  •{" "}
                                  {typeof issue === "string"
                                    ? issue
                                    : JSON.stringify(issue)}
                                </p>
                              ),
                            )}
                          </div>
                        )}
                      {!evidenceData.mangekyo.qualityScore &&
                        !evidenceData.mangekyo.issues && (
                          <pre className="text-xs text-semantic-muted overflow-x-auto">
                            {JSON.stringify(evidenceData.mangekyo, null, 2)}
                          </pre>
                        )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                      <p className="text-sm text-semantic-muted">
                        No code review data yet
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3
                    className={`text-sm font-semibold ${STATUS_TEXT_COLORS.info} mb-3`}
                  >
                    Evidence Validation (Tenseigan)
                  </h3>
                  {evidenceData.tenseigan ? (
                    <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                      {evidenceData.tenseigan.citations &&
                      Array.isArray(evidenceData.tenseigan.citations) ? (
                        <div className="space-y-2">
                          <p className="text-sm text-semantic-muted mb-2">
                            Found {evidenceData.tenseigan.citations.length}{" "}
                            citation(s)
                          </p>
                          {evidenceData.tenseigan.citations.map(
                            (citation, idx: number) => (
                              <div
                                key={idx}
                                className={`text-xs text-semantic-muted border-l-2 ${STATUS_BORDER_COLORS.info} pl-3`}
                              >
                                {typeof citation === "object" &&
                                citation !== null
                                  ? JSON.stringify(citation)
                                  : String(citation)}
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <pre className="text-xs text-semantic-muted overflow-x-auto">
                          {JSON.stringify(evidenceData.tenseigan, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                      <p className="text-sm text-semantic-muted">
                        No evidence validation data yet
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h3
                    className={`text-sm font-semibold ${STATUS_TEXT_COLORS.success} mb-3`}
                  >
                    Final Approval (Byakugan)
                  </h3>
                  {evidenceData.byakugan ? (
                    <div
                      className={`rounded-xl border p-4 ${
                        evidenceData.byakugan.approved
                          ? `${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success}`
                          : `${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error}`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge
                          status={
                            evidenceData.byakugan.approved
                              ? ApprovalStatus.APPROVED
                              : ApprovalStatus.REJECTED
                          }
                          size="sm"
                        />
                        <span
                          className={`text-sm font-semibold ${evidenceData.byakugan.approved ? STATUS_TEXT_COLORS.success : STATUS_TEXT_COLORS.error}`}
                        >
                          {evidenceData.byakugan.approved
                            ? "APPROVED FOR DELIVERY"
                            : "REJECTED - NEEDS REVISION"}
                        </span>
                      </div>
                      {evidenceData.byakugan.summary &&
                        typeof evidenceData.byakugan.summary === "string" && (
                          <p
                            className={`text-xs ${evidenceData.byakugan.approved ? STATUS_TEXT_COLORS.success : STATUS_TEXT_COLORS.error}`}
                          >
                            {evidenceData.byakugan.summary}
                          </p>
                        )}
                      {!evidenceData.byakugan.summary && (
                        <pre className="text-xs text-semantic-muted overflow-x-auto mt-2">
                          {JSON.stringify(evidenceData.byakugan, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-4">
                      <p className="text-sm text-semantic-muted">
                        No final approval data yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === MonitorTabId.RAW_JSON && (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-brand-foreground">
                    Raw JSON
                  </h2>
                  <p className="text-sm text-semantic-muted mt-1">
                    Complete pipeline event data
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(entries, null, 2),
                    )
                  }
                  className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-accent/90 transition-colors"
                >
                  Copy All
                </button>
              </div>
              <div className="max-h-[600px] overflow-y-auto">
                {entries.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-sm text-semantic-muted">No events yet</p>
                  </div>
                ) : (
                  <pre className="rounded-xl border border-brand-outline/30 bg-brand-paperElev p-4 text-xs text-semantic-muted overflow-x-auto">
                    {JSON.stringify(entries, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export default function MonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-paper flex items-center justify-center">
          <div className="text-brand-foreground">Loading monitor...</div>
        </div>
      }
    >
      <MonitorContent />
    </Suspense>
  );
}
