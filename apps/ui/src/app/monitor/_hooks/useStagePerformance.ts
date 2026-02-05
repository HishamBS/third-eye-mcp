"use client";

/**
 * useStagePerformance - Event to theatrical performance transformation
 *
 * Transforms raw WebSocket events into theatrical performances:
 * - Maps events to Eye actions
 * - Generates narrative dialogue
 * - Determines celebration moments
 * - Queues Eye transitions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  NarrativeEvent,
  PerformanceEvent,
  PerformanceAction,
  StoryActId,
  StagePerformanceReturn,
} from "@third-eye/types";
import {
  getTheatreEventConfig,
  formatNarrative,
  eventTriggersCelebration,
  STORY_ACTS,
  getActForEvent,
} from "@third-eye/constants";

/**
 * Generate unique ID for events
 */
function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Map event type to performance action
 */
function getPerformanceAction(eventType: string): PerformanceAction {
  if (eventType.includes("started")) return "enter";
  if (
    eventType.includes("analyzing") ||
    eventType.includes("planning") ||
    eventType.includes("validating")
  )
    return "think";
  if (eventType.includes("asked") || eventType.includes("confirmation"))
    return "ask";
  if (eventType.includes("approved")) return "approve";
  if (eventType.includes("rejected")) return "reject";
  if (eventType.includes("complete") || eventType.includes("session_complete"))
    return "celebrate";
  return "speak";
}

export interface UseStagePerformanceOptions {
  /** Callback when a narrative event is created */
  onNarrativeEvent?: (event: NarrativeEvent) => void;
  /** Whether to auto-queue performances */
  autoQueue?: boolean;
}

export interface RawPipelineEvent {
  type: string;
  sessionId?: string;
  timestamp?: string;
  eye?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export function useStagePerformance({
  onNarrativeEvent,
  autoQueue = true,
}: UseStagePerformanceOptions = {}): StagePerformanceReturn & {
  processEvent: (event: RawPipelineEvent) => NarrativeEvent | null;
} {
  const [events, setEvents] = useState<PerformanceEvent[]>([]);
  const [currentPerformance, setCurrentPerformance] =
    useState<PerformanceEvent | null>(null);
  const [isPerforming, setIsPerforming] = useState(false);

  const performanceQueueRef = useRef<PerformanceEvent[]>([]);
  const isProcessingRef = useRef(false);

  /**
   * Transform raw pipeline event into narrative event
   */
  const processEvent = useCallback(
    (rawEvent: RawPipelineEvent): NarrativeEvent | null => {
      const eventType = rawEvent.type;
      const config = getTheatreEventConfig(eventType);

      if (!config) {
        // Unknown event type, create generic narrative
        const narrator = rawEvent.eye ?? "overseer";
        const actId = getActForEvent(eventType) ?? "act-1";

        return {
          id: generateEventId(),
          timestamp: new Date(rawEvent.timestamp ?? Date.now()),
          eventType,
          actId,
          narrator,
          title: eventType
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          narrative: (rawEvent.data?.message as string) ?? "Processing...",
          suspense: null,
          action: null,
          content: null,
          celebration: null,
          metadata: rawEvent.data ?? {},
          rawEvent,
        };
      }

      // Build narrative from template
      const templateData: Record<string, string | number | undefined> = {
        eye: rawEvent.eye,
        count: rawEvent.data?.count as number,
        s: (rawEvent.data?.count as number) !== 1 ? "s" : "",
        question: rawEvent.data?.question as string,
        answer: rawEvent.data?.answer as string,
        progress: rawEvent.data?.progress as number,
        stepCount: rawEvent.data?.stepCount as number,
        score: rawEvent.data?.score as number,
        summary: rawEvent.data?.summary as string,
        cited: rawEvent.data?.cited as number,
        total: rawEvent.data?.total as number,
        claims: rawEvent.data?.claims as string,
        issues: rawEvent.data?.issues as string,
        current: rawEvent.data?.current as number,
        error: rawEvent.data?.error as string,
      };

      const narrativeEvent: NarrativeEvent = {
        id: generateEventId(),
        timestamp: new Date(rawEvent.timestamp ?? Date.now()),
        eventType,
        actId: config.act,
        narrator: config.narrator,
        title: formatNarrative(config.template.title, templateData),
        narrative: formatNarrative(config.template.narrative, templateData),
        suspense: config.template.suspense
          ? formatNarrative(config.template.suspense, templateData)
          : null,
        action: config.template.action ?? null,
        content: config.template.content ?? null,
        celebration: config.template.celebration ?? null,
        metadata: rawEvent.data ?? {},
        rawEvent,
      };

      // Notify callback
      onNarrativeEvent?.(narrativeEvent);

      // Auto-queue performance
      if (autoQueue) {
        const performance: PerformanceEvent = {
          id: narrativeEvent.id,
          timestamp: narrativeEvent.timestamp,
          act: narrativeEvent.actId,
          performer: narrativeEvent.narrator,
          action: getPerformanceAction(eventType),
          dialogue: narrativeEvent.narrative,
          metadata: narrativeEvent.metadata,
        };
        queuePerformance(performance);
      }

      return narrativeEvent;
    },
    [onNarrativeEvent, autoQueue],
  );

  /**
   * Queue a performance for execution
   */
  const queuePerformance = useCallback((performance: PerformanceEvent) => {
    performanceQueueRef.current.push(performance);
    setEvents((prev) => [...prev, performance]);

    // Start processing if not already
    if (!isProcessingRef.current) {
      processNextPerformance();
    }
  }, []);

  /**
   * Process the next performance in queue
   */
  const processNextPerformance = useCallback(() => {
    if (performanceQueueRef.current.length === 0) {
      isProcessingRef.current = false;
      setCurrentPerformance(null);
      setIsPerforming(false);
      return;
    }

    isProcessingRef.current = true;
    setIsPerforming(true);

    const nextPerformance = performanceQueueRef.current.shift()!;
    setCurrentPerformance(nextPerformance);

    // Auto-advance after a delay based on action type
    const delay = getActionDuration(nextPerformance.action);
    setTimeout(() => {
      processNextPerformance();
    }, delay);
  }, []);

  /**
   * Get duration for different action types
   */
  const getActionDuration = (action: PerformanceAction): number => {
    switch (action) {
      case "enter":
        return 800;
      case "speak":
        return 2000;
      case "think":
        return 1500;
      case "ask":
        return 500; // Interactive, don't auto-advance
      case "approve":
      case "reject":
        return 1000;
      case "celebrate":
        return 2500;
      case "exit":
        return 600;
      default:
        return 1000;
    }
  };

  /**
   * Clear the performance queue
   */
  const clearPerformanceQueue = useCallback(() => {
    performanceQueueRef.current = [];
    isProcessingRef.current = false;
    setCurrentPerformance(null);
    setIsPerforming(false);
  }, []);

  return {
    events,
    currentPerformance,
    isPerforming,
    queuePerformance,
    clearPerformanceQueue,
    processEvent,
  };
}
