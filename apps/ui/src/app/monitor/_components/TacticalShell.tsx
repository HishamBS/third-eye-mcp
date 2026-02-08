"use client";

/**
 * TacticalShell - Main container for the Tactical Operations Monitor view
 *
 * Composes HeaderBar, EyeRoster, ConversationFeed, PipelineProgress,
 * and IntelPanel into the Proposal C layout.
 */

import { memo, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useEventTransformer,
  useConversationFeed,
  useTacticalState,
} from "../_hooks";
import type { TacticalEvent } from "../_hooks/useEventTransformer";
import { HeaderBar } from "./HeaderBar";
import { EyeRoster } from "./EyeRoster";
import { ConversationFeed } from "./ConversationFeed";
import { PipelineProgress } from "./PipelineProgress";
import { IntelPanel } from "./IntelPanel";

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
  isSubmitting?: boolean;
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
  isSubmitting,
  initialConnectionStatus = "disconnected",
  className,
}: TacticalShellProps) {
  const { transformEvent, transformBatch } = useEventTransformer();

  const {
    state: tacticalState,
    processEvent: processTacticalEvent,
    setConnectionStatus,
    setViewMode,
  } = useTacticalState({
    sessionId,
    initialConnectionStatus,
  });

  const {
    entries,
    addEvent: addConversationEvent,
    addEvents: addConversationEvents,
    reset: resetConversation,
  } = useConversationFeed();

  // Accumulated events for IntelPanel
  const [tacticalEvents, setTacticalEvents] = useState<TacticalEvent[]>([]);

  // Process a raw event through the full pipeline
  const processRawEvent = useCallback(
    (raw: Record<string, unknown>) => {
      const tactical = transformEvent(raw);
      processTacticalEvent(tactical);
      addConversationEvent(tactical);
      setTacticalEvents((prev) => [...prev, tactical]);
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

    const events = transformBatch(sortedEvents as Record<string, unknown>[]);
    for (const event of events) {
      processTacticalEvent(event);
    }
    addConversationEvents(events);
    setTacticalEvents(events);
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

  // Reset conversation and events when session changes
  useEffect(() => {
    resetConversation();
    setTacticalEvents([]);
  }, [sessionId, resetConversation]);

  const handleViewModeChange = useCallback(
    (mode: "strategic" | "tactical") => setViewMode(mode),
    [setViewMode],
  );

  const handleEyeClick = useCallback((_eyeId: string) => {
    // Future: scroll to eye section in conversation
  }, []);

  return (
    <div
      className={cn("flex h-full flex-col bg-brand-paper relative", className)}
    >
      {/* Radial gradient background overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.04), transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(0,255,255,0.03), transparent 50%)",
        }}
      />

      <HeaderBar
        sessionId={sessionId}
        viewMode={tacticalState.viewMode}
        onViewModeChange={handleViewModeChange}
        connectionStatus={tacticalState.connectionStatus}
        missionSummary={tacticalState.missionSummary}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Eye Roster */}
        <div className="hidden lg:flex">
          <EyeRoster
            eyeStates={tacticalState.eyeStates}
            activeEye={tacticalState.activeEye}
            pipelineRoute={tacticalState.pipelineRoute}
            onEyeClick={handleEyeClick}
          />
        </div>

        {/* Center: Briefing + Conversation + Pipeline */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mission Briefing Strip */}
          {tacticalState.missionSummary && (
            <div className="shrink-0 border-b border-brand-outline/30 bg-brand-paper px-5 py-2.5">
              <span className="text-[8px] uppercase tracking-widest text-semantic-muted mr-2">
                Objective
              </span>
              <span className="text-xs text-brand-foreground">
                {tacticalState.missionSummary}
              </span>
            </div>
          )}

          <ConversationFeed
            entries={entries}
            viewMode={tacticalState.viewMode}
            onClarificationSubmit={onClarificationSubmit}
            onPlanApprove={onPlanApprove}
            onPlanReject={onPlanReject}
            isSubmitting={isSubmitting}
            sessionId={sessionId}
            className="flex-1"
          />

          <PipelineProgress
            eyeStates={tacticalState.eyeStates}
            pipelineRoute={tacticalState.pipelineRoute}
            activeEye={tacticalState.activeEye}
            onEyeClick={handleEyeClick}
          />
        </div>

        {/* Right: Intel Panel */}
        <div className="hidden xl:flex">
          <IntelPanel
            events={tacticalEvents}
            qualityScore={tacticalState.qualityScore}
            viewMode={tacticalState.viewMode}
          />
        </div>
      </div>
    </div>
  );
}

export const TacticalShell = memo(TacticalShellComponent);
TacticalShell.displayName = "TacticalShell";
