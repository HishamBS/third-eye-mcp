"use client";

/**
 * TheatreShell - Main container for the theatrical Monitor experience
 *
 * Orchestrates the complete theatre:
 * - Marquee header
 * - Curtain animations
 * - Stage area with wings
 * - Timeline transport
 * - Celebration overlays
 */

import { memo, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Marquee,
  CurtainOverlay,
  CelebrationOverlay,
  TimelineTransport,
  TimelineExpanded,
  type ConnectionStatus,
} from "@/components/theatre";
import { StageArea } from "./StageArea";
import {
  useTheatreOrchestrator,
  useStagePerformance,
  useTimelineNavigation,
} from "../_hooks";
import type { TheatreState } from "@third-eye/types";

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

export interface TheatreShellProps {
  /** Session ID to monitor */
  sessionId: string | null;
  /** Initial historical events to load (fetched before WebSocket connects) */
  initialEvents?: RawHistoricalEvent[];
  /** WebSocket message handler - call this when messages arrive */
  onWebSocketMessage?: (handler: (message: unknown) => void) => () => void;
  /** Submit clarification answer */
  onClarificationSubmit?: (id: string, answer: string) => void;
  /** Approve plan */
  onPlanApprove?: () => void;
  /** Reject plan */
  onPlanReject?: (feedback?: string) => void;
  /** Export transcript */
  onExport?: () => void;
  /** Initial connection status */
  initialConnectionStatus?: ConnectionStatus;
  /** Additional CSS classes */
  className?: string;
}

function TheatreShellComponent({
  sessionId,
  initialEvents,
  onWebSocketMessage,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  onExport,
  initialConnectionStatus = "disconnected",
  className,
}: TheatreShellProps) {
  // Theatre orchestrator
  const {
    state: theatreState,
    openCurtain,
    closeCurtain,
    processNarrativeEvent,
    setConnectionStatus,
  } = useTheatreOrchestrator({
    sessionId,
    connectionStatus: initialConnectionStatus,
  });

  // Stage performance processor
  const { processEvent } = useStagePerformance({
    onNarrativeEvent: processNarrativeEvent,
    autoQueue: true,
  });

  // Timeline navigation
  const {
    state: timelineState,
    goToEvent,
    goLive,
    playPause,
    setPlaybackSpeed,
    setFilters,
    clearFilters,
    toggleExpanded,
    nextEvent,
    prevEvent,
  } = useTimelineNavigation({
    events: theatreState.events,
    isLiveSessionActive: theatreState.connectionStatus === "connected",
  });

  // Process initial historical events on mount (before WebSocket connects)
  // This ensures events that happened before page load are displayed
  useEffect(() => {
    if (!initialEvents || initialEvents.length === 0) return;

    // Process each historical event through the theatre pipeline
    // Sort by timestamp to ensure chronological order
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

    sortedEvents.forEach((event) => {
      processEvent(event as Record<string, unknown>);
    });
  }, [initialEvents, processEvent]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!onWebSocketMessage) return;

    const unsubscribe = onWebSocketMessage((message) => {
      // Process the raw event into narrative
      processEvent(message as Record<string, unknown>);
    });

    return unsubscribe;
  }, [onWebSocketMessage, processEvent]);

  // Map connection status
  const connectionStatus = useMemo<ConnectionStatus>(() => {
    switch (theatreState.connectionStatus) {
      case "connected":
        return "connected";
      case "connecting":
        return "connecting";
      case "reconnecting":
        return "reconnecting";
      default:
        return "disconnected";
    }
  }, [theatreState.connectionStatus]);

  // Handle curtain state on session change
  useEffect(() => {
    if (sessionId && theatreState.curtainState === "closed") {
      // Open curtain when session is available
      setTimeout(openCurtain, 500);
    } else if (!sessionId && theatreState.curtainState === "open") {
      // Close curtain when no session
      closeCurtain();
    }
  }, [sessionId, theatreState.curtainState, openCurtain, closeCurtain]);

  // Handle celebration dismiss
  const handleCelebrationDismiss = useCallback(() => {
    // Celebration state is managed by orchestrator, no action needed
  }, []);

  // Handle Eye clicks in wings
  const handleWaitingEyeClick = useCallback(
    (eyeId: string) => {
      // Find event for this Eye and jump to it
      const eventIndex = theatreState.events.findIndex(
        (e) => e.narrator === eyeId,
      );
      if (eventIndex >= 0) {
        goToEvent(eventIndex);
      }
    },
    [theatreState.events, goToEvent],
  );

  const handleCompletedEyeClick = useCallback(
    (eyeId: string) => {
      // Find last event for this Eye and jump to it
      const eventIndex = theatreState.events.findLastIndex(
        (e) => e.narrator === eyeId,
      );
      if (eventIndex >= 0) {
        goToEvent(eventIndex);
      }
    },
    [theatreState.events, goToEvent],
  );

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden",
        "bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950",
        className,
      )}
    >
      {/* Marquee Header */}
      <Marquee
        sessionId={sessionId}
        currentAct={theatreState.currentAct}
        activeEye={theatreState.activeEye}
        isLive={timelineState.mode === "live"}
        reviewTimestamp={
          timelineState.mode === "review" && timelineState.selectedEvent
            ? timelineState.selectedEvent.timestamp
            : undefined
        }
        connectionStatus={connectionStatus}
      />

      {/* Main Stage Area */}
      <div className="relative flex-1 overflow-hidden">
        <StageArea
          state={theatreState}
          onClarificationSubmit={onClarificationSubmit}
          onPlanApprove={onPlanApprove}
          onPlanReject={onPlanReject}
          onWaitingEyeClick={handleWaitingEyeClick}
          onCompletedEyeClick={handleCompletedEyeClick}
        />
      </div>

      {/* Timeline Transport (Orchestra Pit) */}
      <TimelineTransport
        events={theatreState.events}
        currentIndex={timelineState.selectedIndex}
        isLive={timelineState.mode === "live"}
        isPlaying={timelineState.isPlaying}
        playbackSpeed={timelineState.playbackSpeed}
        isExpanded={timelineState.isExpanded}
        currentAct={theatreState.currentAct}
        onGoToEvent={goToEvent}
        onGoLive={goLive}
        onPlayPause={playPause}
        onSetSpeed={setPlaybackSpeed}
        onToggleExpanded={toggleExpanded}
        onPrevEvent={prevEvent}
        onNextEvent={nextEvent}
      />

      {/* Expanded Timeline */}
      <TimelineExpanded
        events={theatreState.events}
        filteredEvents={timelineState.filteredEvents}
        selectedIndex={timelineState.selectedIndex}
        currentIndex={theatreState.events.length - 1}
        filters={timelineState.filters}
        isExpanded={timelineState.isExpanded}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        onGoToEvent={goToEvent}
        onExport={onExport}
      />

      {/* Curtain Overlay */}
      <CurtainOverlay
        state={theatreState.curtainState}
        sessionTitle={
          sessionId ? `Session ${sessionId.slice(0, 8)}` : undefined
        }
      />

      {/* Celebration Overlay */}
      {theatreState.celebrationState && (
        <CelebrationOverlay
          type={theatreState.celebrationState.type}
          message={theatreState.celebrationState.message}
          onDismiss={handleCelebrationDismiss}
        />
      )}
    </div>
  );
}

export const TheatreShell = memo(TheatreShellComponent);
TheatreShell.displayName = "TheatreShell";
