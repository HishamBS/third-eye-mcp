/**
 * @third-eye/types/events - Fine-Grained WebSocket Event Definitions
 *
 * Phase 4: WebSocket Fine-Grained Events
 * Per FINAL_OVERSEER_VISION.md Section 6
 */

/**
 * Base UI metadata for all events
 */
export interface EventUI {
  icon: string;
  color:
    | "success"
    | "warning"
    | "error"
    | "info"
    | "slate"
    | "red"
    | "orange"
    | "cyan"
    | "purple"
    | "indigo"
    | "pink"
    | "blue"
    | "green"
    | "emerald";
  title?: string;
  summary?: string;
  details?: string;
  status?: string;
  speakerName?: string;
}

/**
 * Base event structure
 */
export interface BaseEvent {
  type: string;
  sessionId: string;
  timestamp: string;
}

/**
 * Eye Started Event - Emitted when an Eye begins execution
 * Phase 18: Added optional stage field for two-phase operation
 */
export interface EyeStartedEvent extends BaseEvent {
  type: "eye_started";
  eye: string;
  stage?: "guidance" | "validation";
  ui: EventUI;
}

/**
 * Eye Analyzing Event - Optional progress update during Eye execution
 */
export interface EyeAnalyzingEvent extends BaseEvent {
  type: "eye_analyzing";
  eye: string;
  progress?: number;
  message?: string;
}

/**
 * Eye Complete Event - Emitted when an Eye completes execution
 * Phase 18: Added optional stage field for two-phase operation
 */
export interface EyeCompleteEvent extends BaseEvent {
  type: "eye_complete";
  eye: string;
  stage?: "guidance" | "validation";
  result: {
    tag: string;
    ok: boolean;
    code: string;
    md?: string;
    data?: unknown;
    ui?: {
      title: string;
      summary: string;
      details: string;
      icon: string;
      color: string;
    };
    next?: string;
    next_action?: string;
  };
  metrics?: {
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    provider: string;
    model: string;
  };
}

/**
 * Eye Error Event - Emitted when an Eye encounters an error
 * Phase 18: Added optional stage field for two-phase operation
 */
export interface EyeErrorEvent extends BaseEvent {
  type: "eye_error";
  eye: string;
  stage?: "guidance" | "validation";
  error: string;
  ui?: EventUI;
}

/**
 * Agent Message Event - Communication between agent and human/system
 */
export interface AgentMessageEvent extends BaseEvent {
  type: "agent_message";
  direction: "to_human" | "from_human" | "to_thirdeye" | "from_thirdeye";
  speaker: "agent" | "human" | string; // Can be eye names too
  message: string;
  ui: EventUI;
}

/**
 * Session Status Event - Overall session progress updates
 */
export interface SessionStatusEvent extends BaseEvent {
  type: "session_status";
  status:
    | "active"
    | "awaiting_input"
    | "awaiting_revision"
    | "complete"
    | "error";
  currentEye: string | null;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

/**
 * Session Created Event - New session initialized
 */
export interface SessionCreatedEvent extends BaseEvent {
  type: "session_created";
  portalUrl: string;
  config?: Record<string, unknown>;
}

/**
 * Overseer Route Event - Overseer decided pipeline route
 */
export interface OverseerRouteEvent extends BaseEvent {
  type: "overseer_route";
  requestType: "new_task" | "review_content";
  contentDomain: "code" | "text" | "plan" | "mixed";
  complexity: "simple" | "moderate" | "comprehensive";
  pipelineRoute: string[];
  routingReasoning: string;
  skipReasons?: Record<string, string>;
  ui: EventUI;
}

/**
 * Pipeline Event (Generic) - For backward compatibility
 * Used when specific event type not applicable
 */
export interface PipelineEvent extends BaseEvent {
  type: "pipeline_event";
  eye?: string;
  status?: string;
  code?: string;
  md?: string;
  data?: unknown;
  error?: string;
}

/**
 * Union of all event types
 */
export type WebSocketEvent =
  | EyeStartedEvent
  | EyeAnalyzingEvent
  | EyeCompleteEvent
  | EyeErrorEvent
  | AgentMessageEvent
  | SessionStatusEvent
  | SessionCreatedEvent
  | OverseerRouteEvent
  | PipelineEvent;

// NOTE: UI display constants co-located with event types for tight coupling.
// These map event eye identifiers to display metadata used by WebSocket event
// consumers. SSOT for theme-level hex colors: @third-eye/theme (SHARED_EYE_COLORS).
// SSOT for Eye persona display: @third-eye/constants/eye-personas.
// These semantic color tokens (e.g., "red", "purple") are event-specific and
// distinct from hex color values used in theming.

/**
 * Eye Icons Mapping - Event-specific display icons for WebSocket events
 */
export const EYE_ICONS: Record<string, string> = {
  overseer: "🧿",
  sharingan: "🔍",
  kyuubi: "✨",
  jogan: "👁️",
  rinnegan: "🔮",
  rinnegan_plan: "🔮",
  rinnegan_review: "🔮",
  rinnegan_final: "🔮",
  mangekyo: "💎",
  mangekyo_scaffold: "💎",
  mangekyo_impl: "💎",
  mangekyo_tests: "💎",
  mangekyo_docs: "💎",
  tenseigan: "🔬",
  byakugan: "👁️‍🗨️",
};

/**
 * Eye Colors Mapping - Semantic color tokens for WebSocket event display.
 * NOTE: These are NOT hex colors. For hex eye colors, see:
 * - @third-eye/config/constants EYE_COLORS (pipeline DAG visualization)
 * - @third-eye/theme SHARED_EYE_COLORS (themed components)
 */
export const EYE_COLORS: Record<string, EventUI["color"]> = {
  overseer: "purple",
  sharingan: "red",
  kyuubi: "orange",
  jogan: "cyan",
  rinnegan: "indigo",
  rinnegan_plan: "indigo",
  rinnegan_review: "indigo",
  rinnegan_final: "indigo",
  mangekyo: "pink",
  mangekyo_scaffold: "pink",
  mangekyo_impl: "pink",
  mangekyo_tests: "pink",
  mangekyo_docs: "pink",
  tenseigan: "blue",
  byakugan: "green",
};

/**
 * Speaker Icons Mapping
 */
export const SPEAKER_ICONS: Record<string, string> = {
  agent: "🤖",
  human: "👤",
  system: "⚙️",
  ...EYE_ICONS,
};

/**
 * Speaker Colors Mapping
 */
export const SPEAKER_COLORS: Record<string, EventUI["color"]> = {
  agent: "slate",
  human: "emerald",
  system: "info",
  ...EYE_COLORS,
};

/**
 * Helper to create Eye UI metadata
 */
export function createEyeUI(
  eye: string,
  status: "started" | "analyzing" | "complete" | "error",
): EventUI {
  const baseUI: EventUI = {
    icon: EYE_ICONS[eye] || "👁️",
    color: EYE_COLORS[eye] || "info",
    status,
  };

  switch (status) {
    case "started":
      return {
        ...baseUI,
        title: `${eye} Started`,
        summary: `${eye} is analyzing...`,
      };
    case "analyzing":
      return {
        ...baseUI,
        color: "info",
        title: `${eye} Analyzing`,
        summary: `Processing...`,
      };
    case "complete":
      return {
        ...baseUI,
        color: "success",
        title: `${eye} Complete`,
      };
    case "error":
      return {
        ...baseUI,
        color: "error",
        title: `${eye} Error`,
      };
    default:
      return baseUI;
  }
}

/**
 * Helper to create speaker UI metadata
 */
export function createSpeakerUI(speaker: string): EventUI {
  return {
    icon: SPEAKER_ICONS[speaker] || "💬",
    color: SPEAKER_COLORS[speaker] || "slate",
    speakerName: speaker.charAt(0).toUpperCase() + speaker.slice(1),
  };
}
