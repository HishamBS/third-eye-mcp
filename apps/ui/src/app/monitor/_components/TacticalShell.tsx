"use client";

/**
 * TacticalShell - Main container for the Tactical Operations Monitor view
 *
 * Replaces TheatreShell with a data-driven conversation layout.
 * Wires together event transformation, tactical state, and conversation feed.
 */

import { memo, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useEventTransformer,
  useConversationFeed,
  useTacticalState,
} from "../_hooks";
import type { PendingAction } from "../_hooks/useConversationFeed";

/**
 * Raw event from API or WebSocket
 */
export interface RawHistoricalEvent {
  type: string;
  sessionId?: string;
  timestamp?: string | number;
  eye?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TacticalShellProps {
  sessionId: string | null;
  initialEvents?: RawHistoricalEvent[];
  onWebSocketMessage?: (handler: (message: unknown) => void) => () => void;
  onClarificationSubmit?: (id: string, answer: string) => void;
  onPlanApprove?: () => void;
  onPlanReject?: (feedback?: string) => void;
  onExport?: () => void;
  initialConnectionStatus?: "connected" | "disconnected" | "reconnecting";
  className?: string;
}

function TacticalShellComponent({
  sessionId,
  initialEvents,
  onWebSocketMessage,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  onExport,
  initialConnectionStatus = "disconnected",
  className,
}: TacticalShellProps) {
  const { transformEvent, transformBatch } = useEventTransformer();

  const {
    state: tacticalState,
    processEvent: processTacticalEvent,
    setConnectionStatus,
  } = useTacticalState({
    sessionId,
    initialConnectionStatus,
  });

  const {
    entries,
    addEvent: addConversationEvent,
    addEvents: addConversationEvents,
    reset: resetConversation,
    activeEye,
    pipelineProgress,
  } = useConversationFeed();

  // Process a raw event through the full pipeline
  const processRawEvent = useCallback(
    (raw: Record<string, unknown>) => {
      const tactical = transformEvent(raw);
      processTacticalEvent(tactical);
      addConversationEvent(tactical);
    },
    [transformEvent, processTacticalEvent, addConversationEvent],
  );

  // Process initial historical events on mount
  useEffect(() => {
    if (!initialEvents || initialEvents.length === 0) return;

    const sortedEvents = [...initialEvents].sort((a, b) => {
      const timeA =
        typeof a.timestamp === "string"
          ? new Date(a.timestamp).getTime()
          : (a.timestamp ?? 0);
      const timeB =
        typeof b.timestamp === "string"
          ? new Date(b.timestamp).getTime()
          : (b.timestamp ?? 0);
      return timeA - timeB;
    });

    const tacticalEvents = transformBatch(
      sortedEvents as Record<string, unknown>[],
    );
    for (const event of tacticalEvents) {
      processTacticalEvent(event);
    }
    addConversationEvents(tacticalEvents);
  }, [
    initialEvents,
    transformBatch,
    processTacticalEvent,
    addConversationEvents,
  ]);

  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!onWebSocketMessage) return;

    const unsubscribe = onWebSocketMessage((message) => {
      processRawEvent(message as Record<string, unknown>);
    });

    return unsubscribe;
  }, [onWebSocketMessage, processRawEvent]);

  // Update connection status when prop changes
  useEffect(() => {
    setConnectionStatus(initialConnectionStatus);
  }, [initialConnectionStatus, setConnectionStatus]);

  // Reset conversation when session changes
  useEffect(() => {
    resetConversation();
  }, [sessionId, resetConversation]);

  // Connection status indicator
  const connectionIndicator = useMemo(() => {
    switch (tacticalState.connectionStatus) {
      case "connected":
        return { label: "LIVE", colorClass: "bg-emerald-500" };
      case "reconnecting":
        return { label: "RECONNECTING", colorClass: "bg-amber-500" };
      default:
        return { label: "OFFLINE", colorClass: "bg-red-500" };
    }
  }, [tacticalState.connectionStatus]);

  return (
    <div className={cn("flex h-full flex-col bg-brand-paper", className)}>
      {/* Header Bar - placeholder until HeaderBar component is built */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-brand-outline/30 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-brand-foreground">
            {sessionId ? `Session ${sessionId.slice(0, 8)}` : "No Session"}
          </h1>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connectionIndicator.colorClass,
              )}
            />
            <span className="text-xs font-medium tracking-wider text-semantic-muted uppercase">
              {connectionIndicator.label}
            </span>
          </div>
        </div>
        {tacticalState.missionSummary && (
          <p className="max-w-md truncate text-xs text-semantic-muted">
            {tacticalState.missionSummary}
          </p>
        )}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="rounded-md border border-brand-outline/30 px-3 py-1 text-xs text-semantic-muted transition-colors hover:bg-brand-paperElev hover:text-brand-foreground"
          >
            Export
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - EyeRoster placeholder (240px) */}
        <aside className="hidden w-60 shrink-0 border-r border-brand-outline/30 lg:block">
          <div className="flex h-full flex-col gap-1 overflow-y-auto p-3">
            <p className="pb-2 text-xs font-semibold uppercase tracking-wider text-semantic-muted">
              Eye Roster
            </p>
            {tacticalState.pipelineRoute.length > 0
              ? tacticalState.pipelineRoute.map((eyeId) => (
                  <div
                    key={eyeId}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      tacticalState.eyeStates[eyeId] === "active" &&
                        "bg-brand-accent/10 font-medium text-brand-accent",
                      tacticalState.eyeStates[eyeId] === "complete" &&
                        "text-emerald-600",
                      tacticalState.eyeStates[eyeId] === "error" &&
                        "text-red-500",
                      tacticalState.eyeStates[eyeId] === "standby" &&
                        "text-semantic-muted",
                    )}
                  >
                    {eyeId}
                    <span className="ml-2 text-xs opacity-60">
                      {tacticalState.eyeStates[eyeId]}
                    </span>
                  </div>
                ))
              : Object.entries(tacticalState.eyeStates).map(
                  ([eyeId, status]) => (
                    <div
                      key={eyeId}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm transition-colors",
                        status === "active" &&
                          "bg-brand-accent/10 font-medium text-brand-accent",
                        status === "complete" && "text-emerald-600",
                        status === "error" && "text-red-500",
                        status === "standby" && "text-semantic-muted",
                      )}
                    >
                      {eyeId}
                      <span className="ml-2 text-xs opacity-60">{status}</span>
                    </div>
                  ),
                )}
          </div>
        </aside>

        {/* Center - ConversationFeed + PipelineProgress */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Conversation Feed - scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {entries.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-semantic-muted">
                  {sessionId
                    ? "Waiting for events..."
                    : "Select a session to begin monitoring"}
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex",
                      entry.alignment === "right" && "justify-end",
                      entry.alignment === "center" && "justify-center",
                    )}
                  >
                    {entry.type === "eye_section_header" ? (
                      <div className="flex w-full items-center gap-3 py-3">
                        <div className="h-px flex-1 bg-brand-outline/30" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-semantic-muted">
                          {entry.speaker.name} - {entry.speaker.role}
                        </span>
                        <div className="h-px flex-1 bg-brand-outline/30" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2",
                          entry.alignment === "right"
                            ? "bg-brand-accent/10 text-brand-foreground"
                            : entry.alignment === "center"
                              ? "bg-brand-outline/10 text-semantic-muted"
                              : "bg-brand-paperElev text-brand-foreground",
                        )}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-semantic-muted">
                            {entry.speaker.name}
                          </span>
                          <span className="text-[10px] text-semantic-muted/60">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-sm">{entry.content.text}</p>
                        {entry.action &&
                          entry.action.type === "clarification" &&
                          onClarificationSubmit && (
                            <div className="mt-2 border-t border-brand-outline/20 pt-2">
                              <p className="text-xs text-semantic-muted">
                                {entry.action.question}
                              </p>
                            </div>
                          )}
                        {entry.action &&
                          entry.action.type === "plan_approval" && (
                            <div className="mt-2 flex gap-2 border-t border-brand-outline/20 pt-2">
                              {onPlanApprove && (
                                <button
                                  type="button"
                                  onClick={onPlanApprove}
                                  className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                              )}
                              {onPlanReject && (
                                <button
                                  type="button"
                                  onClick={() => onPlanReject()}
                                  className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline Progress Bar */}
          <div className="flex h-14 shrink-0 items-center gap-4 border-t border-brand-outline/30 px-4">
            <span className="text-xs font-medium text-semantic-muted">
              Pipeline
            </span>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-brand-outline/20">
                <div
                  className="h-full rounded-full bg-brand-accent transition-all duration-500"
                  style={{ width: `${pipelineProgress}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-semantic-muted tabular-nums">
              {pipelineProgress}%
            </span>
            {activeEye && (
              <span className="text-xs text-brand-accent">{activeEye}</span>
            )}
          </div>
        </div>

        {/* Right Panel - IntelPanel placeholder (300px) */}
        <aside className="hidden w-[300px] shrink-0 border-l border-brand-outline/30 xl:block">
          <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-semantic-muted">
              Intelligence
            </p>
            {tacticalState.qualityScore && (
              <div className="rounded-lg bg-brand-paperElev p-3">
                <p className="text-xs text-semantic-muted">Quality Score</p>
                <p className="mt-1 text-2xl font-bold text-brand-foreground">
                  {tacticalState.qualityScore.overall}
                </p>
                {Object.entries(tacticalState.qualityScore.breakdown).length >
                  0 && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(tacticalState.qualityScore.breakdown).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-semantic-muted">{key}</span>
                          <span className="font-medium text-brand-foreground">
                            {value}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}
            {tacticalState.pendingAction && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-50/10 p-3">
                <p className="text-xs font-medium text-amber-600">
                  Action Required
                </p>
                <p className="mt-1 text-xs text-semantic-muted">
                  {tacticalState.pendingAction.type}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export const TacticalShell = memo(TacticalShellComponent);
TacticalShell.displayName = "TacticalShell";
