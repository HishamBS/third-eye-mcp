"use client";

/**
 * useConversationFeed - Builds conversation entries from TacticalEvents
 *
 * Transforms raw tactical events into a structured conversation feed
 * with proper speaker identification, content extraction, alignment,
 * and section headers when the active eye changes.
 */

import { useState, useCallback, useMemo, useRef } from "react";
import {
  type EyeId,
  EYE_DISPLAY_NAMES,
  EYE_ROLE_TITLES,
  isClarificationEventType,
} from "@third-eye/constants";
import type { TacticalEvent } from "./useEventTransformer";

export type ConversationEntryType =
  | "eye_section_header"
  | "eye_dialogue"
  | "eye_question"
  | "eye_result"
  | "eye_error"
  | "human_answer"
  | "human_message"
  | "agent_message"
  | "agent_to_eye"
  | "plan_presented"
  | "plan_decision"
  | "routing_announced"
  | "system";

export interface ConversationEntry {
  id: string;
  type: ConversationEntryType;
  eye: EyeId | null;
  timestamp: Date;
  speaker: {
    name: string;
    role: string;
    specialty: string | null;
    isHuman: boolean;
    isAgent: boolean;
    isSystem: boolean;
  };
  content: {
    text: string;
    markdown: string | null;
    metrics: Record<string, unknown> | null;
  };
  action: PendingAction | null;
  status: "pending" | "active" | "complete";
  alignment: "left" | "right" | "center";
}

export interface PendingAction {
  type: "clarification" | "plan_approval" | "intent_confirmation";
  id: string;
  question?: string;
  options?: string[];
  planContent?: string;
  planSteps?: number;
}

const EYE_SPECIALTIES: Readonly<Record<string, string>> = Object.freeze({
  overseer:
    "Orchestrates the pipeline and determines the optimal route for your request",
  sharingan:
    "Analyzes your request for ambiguities, gaps, and hidden complexities",
  kyuubi:
    "Identifies patterns, structures requirements, and builds the structured prompt",
  jogan: "Verifies that the interpreted intent matches your actual goals",
  rinnegan: "Creates a strategic execution plan and seeks your approval",
  mangekyo: "Reviews code quality with precision - every line, every detail",
  tenseigan: "Validates facts and claims against evidence and documentation",
  byakugan: "Final comprehensive inspection before delivery",
});

function generateEntryId(): string {
  return `ce_${crypto.randomUUID()}`;
}

function classifyEvent(event: TacticalEvent): ConversationEntryType {
  const { type, eyePhase, ui } = event;

  // Human interactions
  if (type === "clarification_answered" || type === "human_message") {
    return "human_answer";
  }

  if (type === "agent_message") {
    const direction = event.data.direction as string | undefined;
    if (direction === "from_human") return "human_message";
    if (direction === "to_thirdeye") return "agent_to_eye";
    return "agent_message";
  }

  // Plan events
  if (type === "plan_presented" || type === "rinnegan_complete") {
    return "plan_presented";
  }
  if (type === "plan_approved" || type === "plan_rejected") {
    return "plan_decision";
  }

  // Eye events
  if (eyePhase === "error") return "eye_error";

  if (isClarificationEventType(type)) return "eye_question";

  if (eyePhase === "complete") return "eye_result";

  if (eyePhase === "started" || eyePhase === "analyzing") return "eye_dialogue";

  // Routing announcement
  if (type === "overseer_route") {
    return "routing_announced";
  }

  // System events
  if (type.startsWith("session_") || type.startsWith("pipeline_")) {
    return "system";
  }

  // Default: if it has an eye, treat as dialogue
  if (event.eye) return "eye_dialogue";

  return "system";
}

function resolveAlignment(
  entryType: ConversationEntryType,
): "left" | "right" | "center" {
  switch (entryType) {
    case "human_answer":
    case "human_message":
    case "plan_decision":
      return "right";
    case "system":
    case "eye_section_header":
    case "routing_announced":
      return "center";
    default:
      return "left";
  }
}

function resolveSpeaker(
  event: TacticalEvent,
  entryType: ConversationEntryType,
): ConversationEntry["speaker"] {
  if (
    entryType === "human_answer" ||
    entryType === "human_message" ||
    entryType === "plan_decision"
  ) {
    return {
      name: "You",
      role: "Human Operator",
      specialty: null,
      isHuman: true,
      isAgent: false,
      isSystem: false,
    };
  }

  if (entryType === "agent_message" || entryType === "agent_to_eye") {
    return {
      name: "AI Agent",
      role: "Assistant",
      specialty: null,
      isHuman: false,
      isAgent: true,
      isSystem: false,
    };
  }

  if (entryType === "system" || entryType === "eye_section_header") {
    return {
      name: "System",
      role: "Pipeline Control",
      specialty: null,
      isHuman: false,
      isAgent: false,
      isSystem: true,
    };
  }

  // Eye speaker
  const eye = event.eye;
  if (eye) {
    return {
      name: EYE_DISPLAY_NAMES[eye] ?? eye,
      role: EYE_ROLE_TITLES[eye] ?? "Specialist",
      specialty: EYE_SPECIALTIES[eye] ?? null,
      isHuman: false,
      isAgent: false,
      isSystem: false,
    };
  }

  return {
    name: event.ui.speaker ?? "Unknown",
    role: "Unknown",
    specialty: null,
    isHuman: false,
    isAgent: false,
    isSystem: false,
  };
}

function extractContent(event: TacticalEvent): ConversationEntry["content"] {
  const text = event.ui.summary || event.ui.title;
  const markdown = event.ui.detail;

  let metrics: Record<string, unknown> | null = null;

  if (event.type === "overseer_route" && Array.isArray(event.data.route)) {
    metrics = {
      route: event.data.route,
      summary:
        typeof event.data.summary === "string" ? event.data.summary : null,
    };
  } else if (
    typeof event.data.metrics === "object" &&
    event.data.metrics !== null
  ) {
    metrics = event.data.metrics as Record<string, unknown>;
  } else if (typeof event.data.score === "number") {
    metrics = { score: event.data.score };
  }

  return { text, markdown, metrics };
}

function extractAction(event: TacticalEvent): PendingAction | null {
  const { type, data } = event;

  if (isClarificationEventType(type)) {
    return {
      type: "clarification",
      id: (data.clarificationId as string) ?? (data.id as string) ?? event.id,
      question: (data.question as string) ?? event.ui.summary,
      options: Array.isArray(data.options)
        ? (data.options as string[])
        : undefined,
    };
  }

  if (type === "plan_presented" || type === "rinnegan_complete") {
    return {
      type: "plan_approval",
      id: (data.planId as string) ?? (data.id as string) ?? event.id,
      planContent: event.ui.detail ?? event.ui.summary,
      planSteps:
        typeof data.stepCount === "number" ? data.stepCount : undefined,
    };
  }

  if (type === "intent_confirmation_required") {
    return {
      type: "intent_confirmation",
      id: (data.confirmationId as string) ?? (data.id as string) ?? event.id,
      question: (data.question as string) ?? event.ui.summary,
    };
  }

  return null;
}

function resolveStatus(event: TacticalEvent): ConversationEntry["status"] {
  if (event.eyePhase === "complete" || event.eyePhase === "error") {
    return "complete";
  }
  if (event.eyePhase === "started" || event.eyePhase === "analyzing") {
    return "active";
  }
  return "pending";
}

function buildEntry(
  event: TacticalEvent,
  entryType: ConversationEntryType,
): ConversationEntry {
  return {
    id: generateEntryId(),
    type: entryType,
    eye: event.eye,
    timestamp: event.timestamp,
    speaker: resolveSpeaker(event, entryType),
    content: extractContent(event),
    action: extractAction(event),
    status: resolveStatus(event),
    alignment: resolveAlignment(entryType),
  };
}

function buildSectionHeader(
  eye: EyeId,
  timestamp: Date,
  previousEye: EyeId | null,
): ConversationEntry {
  return {
    id: generateEntryId(),
    type: "eye_section_header",
    eye,
    timestamp,
    speaker: {
      name: EYE_DISPLAY_NAMES[eye] ?? eye,
      role: EYE_ROLE_TITLES[eye] ?? "Specialist",
      specialty: EYE_SPECIALTIES[eye] ?? null,
      isHuman: false,
      isAgent: false,
      isSystem: false,
    },
    content: {
      text: `${EYE_DISPLAY_NAMES[eye]} - ${EYE_ROLE_TITLES[eye]}`,
      markdown: null,
      metrics: previousEye ? { previousEye } : null,
    },
    action: null,
    status: "active",
    alignment: "center",
  };
}

export interface UseConversationFeedReturn {
  entries: readonly ConversationEntry[];
  addEvent: (event: TacticalEvent) => void;
  addEvents: (events: TacticalEvent[]) => void;
  reset: () => void;
  activeEye: EyeId | null;
  pipelineProgress: number;
}

export function useConversationFeed(): UseConversationFeedReturn {
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const lastEyeRef = useRef<EyeId | null>(null);
  const completedEyesRef = useRef<Set<string>>(new Set());
  const routeLengthRef = useRef<number>(0);

  const addEvent = useCallback((event: TacticalEvent) => {
    const entryType = classifyEvent(event);
    const newEntries: ConversationEntry[] = [];

    // Insert section header when eye changes (skip for system/human events)
    if (
      event.eye &&
      event.eye !== lastEyeRef.current &&
      entryType !== "system" &&
      entryType !== "routing_announced" &&
      entryType !== "human_answer" &&
      entryType !== "human_message" &&
      entryType !== "plan_decision"
    ) {
      newEntries.push(
        buildSectionHeader(event.eye, event.timestamp, lastEyeRef.current),
      );
      lastEyeRef.current = event.eye;
    }

    // Track completed eyes for progress
    if (event.eyePhase === "complete" && event.eye) {
      completedEyesRef.current.add(event.eye);
    }

    // Track route length from overseer
    if (event.type === "overseer_route" && Array.isArray(event.data.route)) {
      routeLengthRef.current = event.data.route.length;
    }

    newEntries.push(buildEntry(event, entryType));

    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const addEvents = useCallback(
    (events: TacticalEvent[]) => {
      events.forEach(addEvent);
    },
    [addEvent],
  );

  const reset = useCallback(() => {
    setEntries([]);
    lastEyeRef.current = null;
    completedEyesRef.current = new Set();
    routeLengthRef.current = 0;
  }, []);

  const activeEye = useMemo((): EyeId | null => {
    return lastEyeRef.current;
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps -- entries change triggers recompute

  const pipelineProgress = useMemo((): number => {
    const total = routeLengthRef.current;
    if (total === 0) return 0;
    const completed = completedEyesRef.current.size;
    return Math.round((completed / total) * 100);
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps -- entries change triggers recompute

  return { entries, addEvent, addEvents, reset, activeEye, pipelineProgress };
}
