"use client";

/**
 * useEventTransformer - Normalizes raw pipeline/WebSocket events into TacticalEvents
 *
 * Handles:
 * - Eye identity resolution from raw.eye field (authoritative source)
 * - Phase detection from WebSocket status or envelope code classification
 * - Content field mapping (md -> data.markdown)
 * - UI metadata generation (title, summary, detail, speaker, direction)
 * - Special event type classification (agent messages, clarifications, etc.)
 */

import { useCallback } from "react";
import {
  type EyeId,
  ALL_EYE_IDS,
  EYE_DISPLAY_NAMES,
} from "@third-eye/constants";
import {
  isSuccessCode,
  isNeedsInputCode,
  isRejectionCode,
  isErrorCode,
} from "@third-eye/types/envelope-codes";

const EYE_NAMES: readonly string[] = ALL_EYE_IDS;
const SUMMARY_TRUNCATE_LENGTH = 100;

type EyePhase = "started" | "analyzing" | "complete" | "error";

export interface TacticalEvent {
  id: string;
  type: string;
  eye: EyeId | null;
  eyePhase: EyePhase | null;
  timestamp: Date;
  data: Record<string, unknown>;
  rawEvent: Record<string, unknown>;
  ui: {
    title: string;
    summary: string;
    detail: string | null;
    speaker: string | null;
    direction: "incoming" | "outgoing" | "system" | null;
  };
}

interface ParsedCode {
  eye: EyeId | null;
  phase: EyePhase | null;
  eventType: string;
}

function generateEventId(): string {
  return `tev_${crypto.randomUUID()}`;
}

function isValidEyeId(value: string): value is EyeId {
  return (EYE_NAMES as readonly string[]).includes(value);
}

/**
 * Eye identity comes ONLY from the pre-resolved `eye` field.
 * For DB events: page.tsx sets raw.eye from the LEFT JOIN eyeSlug.
 * For WebSocket events: orchestrator sets data.eye directly.
 * We NEVER derive eye identity from the event code.
 */
function resolveEye(raw: Record<string, unknown>): EyeId | null {
  const rawEye = typeof raw.eye === "string" ? raw.eye.toLowerCase() : null;
  if (rawEye && isValidEyeId(rawEye)) {
    return rawEye as EyeId;
  }
  return null;
}

/**
 * Phase comes from two sources depending on event origin:
 * 1. WebSocket events carry `status` in data ("started"/"completed"/"error")
 * 2. DB events have generic envelope codes - map via SSOT helpers
 */
function resolvePhase(raw: Record<string, unknown>): EyePhase | null {
  const data = (raw.dataJson ?? raw.data ?? {}) as Record<string, unknown>;
  const status = (data.status ?? raw.status) as string | undefined;
  if (typeof status === "string") {
    const normalized = status.toLowerCase();
    if (normalized === "started") return "started";
    if (normalized === "completed" || normalized === "complete")
      return "complete";
    if (normalized === "error") return "error";
    if (normalized === "analyzing") return "analyzing";
  }

  const code = typeof raw.code === "string" ? raw.code.toUpperCase() : "";
  if (code) {
    if (isSuccessCode(code)) return "complete";
    if (isNeedsInputCode(code)) return "analyzing";
    if (isRejectionCode(code) || isErrorCode(code)) return "error";
  }

  return null;
}

function resolveEventType(raw: Record<string, unknown>): string {
  const code = typeof raw.code === "string" ? raw.code.toLowerCase() : "";
  return code || (raw.type as string) || "pipeline_event";
}

function parseEventCode(raw: Record<string, unknown>): ParsedCode {
  return {
    eye: resolveEye(raw),
    phase: resolvePhase(raw),
    eventType: resolveEventType(raw),
  };
}

function humanizeEventType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractSummary(data: Record<string, unknown>): string {
  if (typeof data.summary === "string" && data.summary.length > 0) {
    return data.summary;
  }
  if (typeof data.markdown === "string" && data.markdown.length > 0) {
    return data.markdown.slice(0, SUMMARY_TRUNCATE_LENGTH);
  }
  if (typeof data.content === "string" && data.content.length > 0) {
    return data.content.slice(0, SUMMARY_TRUNCATE_LENGTH);
  }
  if (typeof data.message === "string" && data.message.length > 0) {
    return data.message.slice(0, SUMMARY_TRUNCATE_LENGTH);
  }
  return "";
}

function extractDetail(data: Record<string, unknown>): string | null {
  if (typeof data.markdown === "string" && data.markdown.length > 0) {
    return data.markdown;
  }
  if (typeof data.content === "string" && data.content.length > 0) {
    return data.content;
  }
  return null;
}

function resolveSpeaker(
  eye: EyeId | null,
  eventType: string,
  data: Record<string, unknown>,
): string | null {
  if (eventType === "agent_message") {
    const direction = data.direction as string | undefined;
    if (direction === "from_human") return "You";
    if (direction === "to_human") return "AI Agent";
    return "AI Agent";
  }

  // Human-originated events
  if (
    eventType === "clarification_answered" ||
    eventType === "human_message" ||
    eventType === "human_request" ||
    eventType === "human_clarification_answer" ||
    eventType === "intent_confirmed" ||
    eventType === "intent_rejected"
  ) {
    return "You";
  }

  if (eye) {
    return EYE_DISPLAY_NAMES[eye] ?? null;
  }

  if (eventType.startsWith("session_") || eventType.startsWith("pipeline_")) {
    return "System";
  }

  return null;
}

function resolveDirection(
  eventType: string,
  data: Record<string, unknown>,
  eye: EyeId | null,
): "incoming" | "outgoing" | "system" | null {
  if (eventType === "agent_message") {
    const direction = data.direction as string | undefined;
    if (direction === "from_human") return "outgoing";
    if (direction === "to_human") return "incoming";
    if (direction === "to_thirdeye") return "outgoing";
    return "incoming";
  }

  if (
    eventType === "clarification_answered" ||
    eventType === "human_message" ||
    eventType === "human_request" ||
    eventType === "human_clarification_answer" ||
    eventType === "intent_confirmed" ||
    eventType === "intent_rejected" ||
    eventType === "plan_approved" ||
    eventType === "plan_rejected"
  ) {
    return "outgoing";
  }

  if (eventType.startsWith("session_") || eventType.startsWith("pipeline_")) {
    return "system";
  }

  // Eye events are incoming
  if (
    eye ||
    EYE_NAMES.some((name) => eventType.startsWith(name)) ||
    eventType === "clarification_asked" ||
    eventType === "intent_confirmation_requested" ||
    eventType === "overseer_route"
  ) {
    return "incoming";
  }

  return null;
}

function parseTimestamp(raw: unknown): Date {
  if (raw instanceof Date) return raw;
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (typeof raw === "number") {
    return new Date(raw);
  }
  return new Date();
}

function transformSingleEvent(raw: Record<string, unknown>): TacticalEvent {
  const { eye, phase: eyePhase, eventType } = parseEventCode(raw);

  const data: Record<string, unknown> = {
    ...((raw.dataJson as Record<string, unknown>) ??
      (raw.data as Record<string, unknown>) ??
      {}),
  };

  // The API's primary content field is `md` - map it into data for downstream extraction
  if (typeof raw.md === "string" && raw.md.length > 0) {
    data.markdown = raw.md;
  }

  const timestamp = parseTimestamp(raw.createdAt ?? raw.timestamp);

  const title = humanizeEventType(eventType);
  const summary = extractSummary(data);
  const detail = extractDetail(data);
  const speaker = resolveSpeaker(eye, eventType, data);
  const direction = resolveDirection(eventType, data, eye);

  return {
    id: (raw.id as string) ?? generateEventId(),
    type: eventType,
    eye,
    eyePhase,
    timestamp,
    data,
    rawEvent: raw,
    ui: {
      title,
      summary,
      detail,
      speaker,
      direction,
    },
  };
}

export interface UseEventTransformerReturn {
  transformEvent: (raw: Record<string, unknown>) => TacticalEvent;
  transformBatch: (raws: Record<string, unknown>[]) => TacticalEvent[];
}

export function useEventTransformer(): UseEventTransformerReturn {
  const transformEvent = useCallback(
    (raw: Record<string, unknown>): TacticalEvent => {
      return transformSingleEvent(raw);
    },
    [],
  );

  const transformBatch = useCallback(
    (raws: Record<string, unknown>[]): TacticalEvent[] => {
      return raws.map(transformSingleEvent);
    },
    [],
  );

  return { transformEvent, transformBatch };
}
