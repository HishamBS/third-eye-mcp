/**
 * Story Structure - Three-Act Theatre Model
 *
 * Defines the theatrical narrative structure for the Monitor page.
 * The pipeline execution is presented as a three-act story with
 * distinct phases, each with its own cast of Eye characters.
 *
 * Per R13: NO magic string literals - all text from constants
 */

import { freezeTokens, TokenLiteral, EyeId } from "./taxonomy";

/**
 * Story Act Identifiers
 */
export const StoryActId = freezeTokens({
  UNDERSTANDING: "act-1",
  PLANNING: "act-2",
  EXECUTION: "act-3",
} as const);

export type StoryActId = TokenLiteral<typeof StoryActId>;

/**
 * Story Act Titles - SSOT for display text
 */
export const STORY_ACT_TITLES = Object.freeze({
  [StoryActId.UNDERSTANDING]: "The Request",
  [StoryActId.PLANNING]: "The Strategy",
  [StoryActId.EXECUTION]: "The Delivery",
} as const);

/**
 * Story Act Subtitles - SSOT for display text
 */
export const STORY_ACT_SUBTITLES = Object.freeze({
  [StoryActId.UNDERSTANDING]: "Understanding what you need",
  [StoryActId.PLANNING]: "Designing the approach",
  [StoryActId.EXECUTION]: "Building and validating",
} as const);

/**
 * Story Act Descriptions - SSOT for explanatory text
 */
export const STORY_ACT_DESCRIPTIONS = Object.freeze({
  [StoryActId.UNDERSTANDING]:
    "Your request has been received. The team is analyzing it to understand exactly what you need.",
  [StoryActId.PLANNING]:
    "The team is crafting a strategic plan tailored to your needs, ready for your approval.",
  [StoryActId.EXECUTION]:
    "Implementation is underway with quality gates at every step to ensure excellence.",
} as const);

/**
 * Story Act Colors - Visual theming for each act
 */
export const STORY_ACT_COLORS = Object.freeze({
  [StoryActId.UNDERSTANDING]: {
    primary: "#3b82f6", // blue-500
    glow: "rgba(59, 130, 246, 0.4)",
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    border: "border-blue-500/40",
  },
  [StoryActId.PLANNING]: {
    primary: "#a855f7", // purple-500
    glow: "rgba(168, 85, 247, 0.4)",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/40",
  },
  [StoryActId.EXECUTION]: {
    primary: "#22c55e", // green-500
    glow: "rgba(34, 197, 94, 0.4)",
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/40",
  },
} as const);

/**
 * Progress ranges for each act (0-100)
 */
export const STORY_ACT_PROGRESS_RANGES = Object.freeze({
  [StoryActId.UNDERSTANDING]: { start: 0, end: 33 },
  [StoryActId.PLANNING]: { start: 34, end: 66 },
  [StoryActId.EXECUTION]: { start: 67, end: 100 },
} as const);

/**
 * Eyes assigned to each act - defines who performs in each act
 */
export const STORY_ACT_EYES = Object.freeze({
  [StoryActId.UNDERSTANDING]: [
    EyeId.OVERSEER,
    EyeId.SHARINGAN,
    EyeId.KYUUBI,
    EyeId.JOGAN,
  ] as readonly EyeId[],
  [StoryActId.PLANNING]: [EyeId.RINNEGAN] as readonly EyeId[],
  [StoryActId.EXECUTION]: [
    EyeId.MANGEKYO,
    EyeId.TENSEIGAN,
    EyeId.BYAKUGAN,
  ] as readonly EyeId[],
} as const);

/**
 * Event types that belong to each act
 */
export const STORY_ACT_EVENTS = Object.freeze({
  [StoryActId.UNDERSTANDING]: [
    "session_created",
    "overseer_route",
    "sharingan_started",
    "sharingan_analyzing",
    "sharingan_ambiguity_found",
    "sharingan_complete",
    "clarification_asked",
    "clarification_answered",
    "kyuubi_started",
    "kyuubi_structuring",
    "kyuubi_complete",
    "jogan_started",
    "jogan_verifying",
    "jogan_complete",
    "intent_confirmation_requested",
    "intent_confirmed",
  ] as readonly string[],
  [StoryActId.PLANNING]: [
    "rinnegan_started",
    "rinnegan_planning",
    "rinnegan_plan_ready",
    "plan_presented",
    "plan_approved",
    "plan_rejected",
  ] as readonly string[],
  [StoryActId.EXECUTION]: [
    "mangekyo_started",
    "mangekyo_reviewing",
    "mangekyo_complete",
    "tenseigan_started",
    "tenseigan_validating",
    "tenseigan_complete",
    "byakugan_started",
    "byakugan_inspecting",
    "byakugan_approved",
    "byakugan_rejected",
    "session_complete",
  ] as readonly string[],
} as const);

/**
 * Full Story Act configuration interface
 */
export interface StoryActConfig {
  readonly id: StoryActId;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly color: (typeof STORY_ACT_COLORS)[StoryActId];
  readonly progressRange: { start: number; end: number };
  readonly eyes: readonly EyeId[];
  readonly events: readonly string[];
}

/**
 * Complete Story Acts configuration - SSOT for theatre acts
 */
export const STORY_ACTS: Readonly<Record<StoryActId, StoryActConfig>> =
  Object.freeze({
    [StoryActId.UNDERSTANDING]: {
      id: StoryActId.UNDERSTANDING,
      title: STORY_ACT_TITLES[StoryActId.UNDERSTANDING],
      subtitle: STORY_ACT_SUBTITLES[StoryActId.UNDERSTANDING],
      description: STORY_ACT_DESCRIPTIONS[StoryActId.UNDERSTANDING],
      color: STORY_ACT_COLORS[StoryActId.UNDERSTANDING],
      progressRange: STORY_ACT_PROGRESS_RANGES[StoryActId.UNDERSTANDING],
      eyes: STORY_ACT_EYES[StoryActId.UNDERSTANDING],
      events: STORY_ACT_EVENTS[StoryActId.UNDERSTANDING],
    },
    [StoryActId.PLANNING]: {
      id: StoryActId.PLANNING,
      title: STORY_ACT_TITLES[StoryActId.PLANNING],
      subtitle: STORY_ACT_SUBTITLES[StoryActId.PLANNING],
      description: STORY_ACT_DESCRIPTIONS[StoryActId.PLANNING],
      color: STORY_ACT_COLORS[StoryActId.PLANNING],
      progressRange: STORY_ACT_PROGRESS_RANGES[StoryActId.PLANNING],
      eyes: STORY_ACT_EYES[StoryActId.PLANNING],
      events: STORY_ACT_EVENTS[StoryActId.PLANNING],
    },
    [StoryActId.EXECUTION]: {
      id: StoryActId.EXECUTION,
      title: STORY_ACT_TITLES[StoryActId.EXECUTION],
      subtitle: STORY_ACT_SUBTITLES[StoryActId.EXECUTION],
      description: STORY_ACT_DESCRIPTIONS[StoryActId.EXECUTION],
      color: STORY_ACT_COLORS[StoryActId.EXECUTION],
      progressRange: STORY_ACT_PROGRESS_RANGES[StoryActId.EXECUTION],
      eyes: STORY_ACT_EYES[StoryActId.EXECUTION],
      events: STORY_ACT_EVENTS[StoryActId.EXECUTION],
    },
  });

/**
 * Ordered list of all acts for sequential rendering
 */
export const STORY_ACTS_ORDERED: readonly StoryActConfig[] = Object.freeze([
  STORY_ACTS[StoryActId.UNDERSTANDING],
  STORY_ACTS[StoryActId.PLANNING],
  STORY_ACTS[StoryActId.EXECUTION],
]);

/**
 * Get the act that an event belongs to
 */
export function getActForEvent(eventType: string): StoryActId | null {
  for (const act of STORY_ACTS_ORDERED) {
    if (act.events.includes(eventType)) {
      return act.id;
    }
  }
  return null;
}

/**
 * Get the act that an Eye belongs to (primary act)
 */
export function getActForEye(eyeId: string): StoryActId | null {
  for (const act of STORY_ACTS_ORDERED) {
    if (act.eyes.includes(eyeId as EyeId)) {
      return act.id;
    }
  }
  return null;
}

/**
 * Calculate progress percentage within an act
 */
export function calculateActProgress(
  actId: StoryActId,
  completedEvents: number,
  totalEvents: number,
): number {
  const range = STORY_ACT_PROGRESS_RANGES[actId];
  if (totalEvents === 0) return range.start;

  const actProgress = (completedEvents / totalEvents) * 100;
  const rangeSize = range.end - range.start;
  return Math.min(range.start + (actProgress * rangeSize) / 100, range.end);
}
