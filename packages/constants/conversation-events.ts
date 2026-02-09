/**
 * Conversation Events Constants - SSOT
 *
 * Per R01: Single source of truth for conversation event types
 * Per R13: No hardcoded strings in components
 */

/**
 * Conversation event types
 */
export const CONVERSATION_EVENT_TYPES = Object.freeze({
  AGENT_MESSAGE: "agent_message",
  HUMAN_MESSAGE: "human_message",
  ROUTING_DECISION: "routing_decision",
  PAUSE: "pause",
  RESUME: "resume",
  ERROR: "error",
  CLARIFICATION_ASKED: "clarification_asked",
  CLARIFICATION_ANSWERED: "clarification_answered",
} as const);

export type ConversationEventType =
  (typeof CONVERSATION_EVENT_TYPES)[keyof typeof CONVERSATION_EVENT_TYPES];

/**
 * Event type icons (emoji)
 */
export const CONVERSATION_EVENT_ICONS = Object.freeze({
  [CONVERSATION_EVENT_TYPES.AGENT_MESSAGE]: "🤖",
  [CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE]: "👤",
  [CONVERSATION_EVENT_TYPES.ROUTING_DECISION]: "🧠",
  [CONVERSATION_EVENT_TYPES.PAUSE]: "⏸️",
  [CONVERSATION_EVENT_TYPES.RESUME]: "▶️",
  [CONVERSATION_EVENT_TYPES.ERROR]: "❌",
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ASKED]: "❓",
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ANSWERED]: "✅",
} as const);

/**
 * Event type display labels
 */
export const CONVERSATION_EVENT_LABELS = Object.freeze({
  [CONVERSATION_EVENT_TYPES.AGENT_MESSAGE]: "Agent Message",
  [CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE]: "Human Message",
  [CONVERSATION_EVENT_TYPES.ROUTING_DECISION]: "Routing Decision",
  [CONVERSATION_EVENT_TYPES.PAUSE]: "Pipeline Paused",
  [CONVERSATION_EVENT_TYPES.RESUME]: "Pipeline Resumed",
  [CONVERSATION_EVENT_TYPES.ERROR]: "Error",
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ASKED]: "Clarification Asked",
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ANSWERED]: "Clarification Answered",
} as const);

/**
 * Event type colors - Tailwind classes
 * Format: { bgColor, borderColor, textColor }
 */
export const CONVERSATION_EVENT_COLORS = Object.freeze({
  [CONVERSATION_EVENT_TYPES.AGENT_MESSAGE]: {
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-900 dark:text-blue-100",
  },
  [CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE]: {
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-900 dark:text-green-100",
  },
  [CONVERSATION_EVENT_TYPES.ROUTING_DECISION]: {
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
    textColor: "text-purple-900 dark:text-purple-100",
  },
  [CONVERSATION_EVENT_TYPES.PAUSE]: {
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    textColor: "text-yellow-900 dark:text-yellow-100",
  },
  [CONVERSATION_EVENT_TYPES.RESUME]: {
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-900 dark:text-green-100",
  },
  [CONVERSATION_EVENT_TYPES.ERROR]: {
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    textColor: "text-red-900 dark:text-red-100",
  },
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ASKED]: {
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-800",
    textColor: "text-amber-900 dark:text-amber-100",
  },
  [CONVERSATION_EVENT_TYPES.CLARIFICATION_ANSWERED]: {
    bgColor: "bg-teal-50 dark:bg-teal-900/20",
    borderColor: "border-teal-200 dark:border-teal-800",
    textColor: "text-teal-900 dark:text-teal-100",
  },
} as const);

/**
 * Get event configuration by type
 */
export function getEventConfig(eventType: string) {
  const type = eventType as ConversationEventType;
  return {
    icon:
      CONVERSATION_EVENT_ICONS[type] ??
      CONVERSATION_EVENT_ICONS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE],
    label:
      CONVERSATION_EVENT_LABELS[type] ??
      CONVERSATION_EVENT_LABELS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE],
    colors:
      CONVERSATION_EVENT_COLORS[type] ??
      CONVERSATION_EVENT_COLORS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE],
  };
}

/**
 * Check if event type is valid
 */
export function isConversationEventType(
  type: string,
): type is ConversationEventType {
  return Object.values(CONVERSATION_EVENT_TYPES).includes(
    type as ConversationEventType,
  );
}

/**
 * Event types that represent clarification/input-needed events.
 * Covers both WebSocket event types and lowercased envelope codes from DB.
 *
 * WebSocket uses "clarification_asked" but DB events store envelope codes
 * like NEED_CLARIFICATION which resolveEventType lowercases to "need_clarification".
 * This set ensures both paths are recognized.
 */
export const CLARIFICATION_EVENT_TYPES: ReadonlySet<string> = new Set([
  "clarification_asked", // WebSocket event type
  "need_clarification", // NEED_CLARIFICATION envelope code (lowercased)
  "need_more_context", // NEED_MORE_CONTEXT envelope code (lowercased)
  "suggest_alternative", // SUGGEST_ALTERNATIVE envelope code (lowercased)
]);

/**
 * Check if an event type represents a clarification/input-needed event.
 * Handles the mismatch between WebSocket event names and lowercased DB envelope codes.
 */
export function isClarificationEventType(type: string): boolean {
  return CLARIFICATION_EVENT_TYPES.has(type);
}
