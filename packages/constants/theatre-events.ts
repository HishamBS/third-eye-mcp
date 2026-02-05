/**
 * Theatre Events - Event to Narrative Mapping
 *
 * Transforms WebSocket pipeline events into theatrical performances.
 * Each event type maps to a narrative template with:
 * - Assigned narrator (Eye character)
 * - Display text and templates
 * - Suspense states for in-progress actions
 * - Associated interactive actions
 *
 * Per R13: NO magic string literals - all text from constants
 */

import { EyeId } from "./taxonomy";
import { StoryActId } from "./story-structure";

/**
 * Celebration types for milestone events
 */
export type CelebrationType = "minor" | "major" | "finale" | null;

/**
 * Action types that can be triggered by events
 */
export type TheatreActionType =
  | "clarification_form"
  | "clarification_input"
  | "intent_confirmation"
  | "plan_approval"
  | "review_issues"
  | null;

/**
 * Content display types for rich event data
 */
export type ContentDisplayType =
  | "plan_markdown"
  | "code_diff"
  | "review_details"
  | "evidence_list"
  | "session_summary"
  | null;

/**
 * Narrative template interface
 */
export interface NarrativeTemplate {
  readonly title: string;
  readonly narrative: string;
  readonly suspense: string | null;
  readonly action?: TheatreActionType;
  readonly content?: ContentDisplayType;
  readonly celebration?: CelebrationType;
}

/**
 * Theatre event configuration
 */
export interface TheatreEventConfig {
  readonly act: StoryActId;
  readonly narrator: EyeId;
  readonly template: NarrativeTemplate;
}

/**
 * Theatre Event Templates - SSOT for event-to-narrative mapping
 */
export const THEATRE_EVENT_TEMPLATES: Readonly<
  Record<string, TheatreEventConfig>
> = Object.freeze({
  // ===========================================
  // SESSION EVENTS
  // ===========================================
  session_created: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "New Session Started",
      narrative: "Your request has arrived. I'm assembling the team.",
      suspense: null,
    },
  },

  // ===========================================
  // OVERSEER EVENTS
  // ===========================================
  overseer_route: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Routing Determined",
      narrative: "I've analyzed your request and selected the optimal team.",
      suspense: null,
    },
  },
  overseer_delegating: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Delegating Task",
      narrative: "I'm calling {eye} to the stage.",
      suspense: null,
    },
  },

  // ===========================================
  // SHARINGAN EVENTS
  // ===========================================
  sharingan_started: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Analyzing Your Request",
      narrative: "I'm examining your request for any ambiguities...",
      suspense: "Looking for hidden complexity...",
    },
  },
  sharingan_analyzing: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Deep Analysis",
      narrative: "Scanning every detail for potential issues...",
      suspense: "Processing {progress}%...",
    },
  },
  sharingan_ambiguity_found: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Clarification Needed",
      narrative: "I found {count} thing{s} that need clarification.",
      suspense: null,
      action: "clarification_form",
    },
  },
  sharingan_complete: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Analysis Complete",
      narrative: "I understand your requirements. No ambiguities remain.",
      suspense: null,
      celebration: "minor",
    },
  },

  // ===========================================
  // CLARIFICATION EVENTS
  // ===========================================
  clarification_asked: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Question for You",
      narrative: "{question}",
      suspense: null,
      action: "clarification_input",
    },
  },
  clarification_answered: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Clarification Received",
      narrative: 'Got it! "{answer}" - processing this now.',
      suspense: null,
    },
  },
  clarification_pending: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.SHARINGAN,
    template: {
      title: "Awaiting Your Input",
      narrative: "I need your response to continue.",
      suspense: "Waiting for clarification...",
      action: "clarification_input",
    },
  },

  // ===========================================
  // KYUUBI EVENTS
  // ===========================================
  kyuubi_started: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.KYUUBI,
    template: {
      title: "Structuring Requirements",
      narrative: "I sense connections forming in the chaos...",
      suspense: "Weaving the patterns...",
    },
  },
  kyuubi_structuring: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.KYUUBI,
    template: {
      title: "Building Structure",
      narrative: "Transforming your request into a structured prompt...",
      suspense: "Synthesizing requirements...",
    },
  },
  kyuubi_complete: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.KYUUBI,
    template: {
      title: "Structure Complete",
      narrative:
        "The patterns reveal themselves: {count} requirements, {deps} dependencies.",
      suspense: null,
      celebration: "minor",
    },
  },

  // ===========================================
  // JOGAN EVENTS
  // ===========================================
  jogan_started: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.JOGAN,
    template: {
      title: "Verifying Intent",
      narrative: "Let me peer into your true intent...",
      suspense: "Examining intent alignment...",
    },
  },
  jogan_verifying: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.JOGAN,
    template: {
      title: "Intent Analysis",
      narrative: "Confirming alignment between your words and desires...",
      suspense: "Validating intent...",
    },
  },
  intent_confirmation_requested: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.JOGAN,
    template: {
      title: "Confirmation Required",
      narrative: "Before we proceed, please confirm your intent:",
      suspense: null,
      action: "intent_confirmation",
    },
  },
  intent_confirmed: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.JOGAN,
    template: {
      title: "Intent Confirmed",
      narrative: "Your intent is crystal clear. We are aligned.",
      suspense: null,
      celebration: "minor",
    },
  },
  jogan_complete: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.JOGAN,
    template: {
      title: "Verification Complete",
      narrative: "Intent verified. The path forward is certain.",
      suspense: null,
      celebration: "minor",
    },
  },

  // ===========================================
  // RINNEGAN EVENTS
  // ===========================================
  rinnegan_started: {
    act: StoryActId.PLANNING,
    narrator: EyeId.RINNEGAN,
    template: {
      title: "Planning Begins",
      narrative: "I am devising the perfect strategy...",
      suspense: "Crafting the plan...",
    },
  },
  rinnegan_planning: {
    act: StoryActId.PLANNING,
    narrator: EyeId.RINNEGAN,
    template: {
      title: "Strategy Development",
      narrative: "Mapping out the optimal path to your goal...",
      suspense: "Evaluating approaches...",
    },
  },
  rinnegan_plan_ready: {
    act: StoryActId.PLANNING,
    narrator: EyeId.RINNEGAN,
    template: {
      title: "Plan Ready for Review",
      narrative: "My {stepCount}-step masterplan awaits your approval:",
      suspense: null,
      action: "plan_approval",
      content: "plan_markdown",
    },
  },
  plan_presented: {
    act: StoryActId.PLANNING,
    narrator: EyeId.RINNEGAN,
    template: {
      title: "Plan Presented",
      narrative: "Does this path satisfy your vision?",
      suspense: null,
      action: "plan_approval",
      content: "plan_markdown",
    },
  },
  plan_approved: {
    act: StoryActId.PLANNING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Plan Approved",
      narrative: "You've approved the plan. The team is moving to execution.",
      suspense: null,
      celebration: "major",
    },
  },
  plan_rejected: {
    act: StoryActId.PLANNING,
    narrator: EyeId.RINNEGAN,
    template: {
      title: "Plan Revision Needed",
      narrative:
        "I shall refine the approach. Tell me more about your concerns.",
      suspense: null,
      action: "clarification_input",
    },
  },

  // ===========================================
  // MANGEKYO EVENTS
  // ===========================================
  mangekyo_started: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.MANGEKYO,
    template: {
      title: "Code Review Started",
      narrative: "Every line, every detail, under my scrutiny...",
      suspense: "Examining the code...",
    },
  },
  mangekyo_reviewing: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.MANGEKYO,
    template: {
      title: "Review In Progress",
      narrative: "Analyzing the implementation with precision...",
      suspense: "Checking {current} of {total} components...",
    },
  },
  mangekyo_issues_found: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.MANGEKYO,
    template: {
      title: "Issues Detected",
      narrative: "Imperfections detected: {count} require refinement.",
      suspense: null,
      action: "review_issues",
      content: "review_details",
    },
  },
  mangekyo_complete: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.MANGEKYO,
    template: {
      title: "Code Review Complete",
      narrative: "Quality score: {score}/100. {summary}",
      suspense: null,
      content: "review_details",
      celebration: "minor",
    },
  },

  // ===========================================
  // TENSEIGAN EVENTS
  // ===========================================
  tenseigan_started: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.TENSEIGAN,
    template: {
      title: "Evidence Validation Started",
      narrative: "I am consulting the records of truth...",
      suspense: "Gathering evidence...",
    },
  },
  tenseigan_validating: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.TENSEIGAN,
    template: {
      title: "Validating Claims",
      narrative: "Cross-referencing claims against evidence...",
      suspense: "Verifying sources...",
    },
  },
  tenseigan_issues_found: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.TENSEIGAN,
    template: {
      title: "Evidence Gaps Found",
      narrative: "These claims lack foundation: {claims}",
      suspense: null,
      action: "review_issues",
      content: "evidence_list",
    },
  },
  tenseigan_complete: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.TENSEIGAN,
    template: {
      title: "Evidence Validated",
      narrative: "{cited}/{total} claims properly sourced. {summary}",
      suspense: null,
      celebration: "minor",
    },
  },

  // ===========================================
  // BYAKUGAN EVENTS
  // ===========================================
  byakugan_started: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.BYAKUGAN,
    template: {
      title: "Final Inspection",
      narrative: "My all-seeing gaze examines the final work...",
      suspense: "Running final checks...",
    },
  },
  byakugan_inspecting: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.BYAKUGAN,
    template: {
      title: "Final Validation",
      narrative:
        "Checking consistency, edge cases, every corner illuminated...",
      suspense: "Validating {current} of {total}...",
    },
  },
  byakugan_approved: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.BYAKUGAN,
    template: {
      title: "APPROVED FOR DELIVERY",
      narrative: "All gates cleared. Your work is ready.",
      suspense: null,
      celebration: "major",
    },
  },
  byakugan_rejected: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.BYAKUGAN,
    template: {
      title: "Issues Found",
      narrative: "Issues remain in the shadows: {issues}",
      suspense: null,
      action: "review_issues",
    },
  },

  // ===========================================
  // SESSION COMPLETION EVENTS
  // ===========================================
  session_complete: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Mission Complete",
      narrative: "The team is signing off. Your task is complete.",
      suspense: null,
      celebration: "finale",
      content: "session_summary",
    },
  },
  session_error: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Session Error",
      narrative: "An unexpected situation has occurred: {error}",
      suspense: null,
    },
  },
  session_cancelled: {
    act: StoryActId.EXECUTION,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Session Cancelled",
      narrative: "The session has been cancelled.",
      suspense: null,
    },
  },

  // ===========================================
  // GENERIC EYE EVENTS (fallbacks)
  // ===========================================
  eye_started: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Eye Started",
      narrative: "{eye} is beginning their work...",
      suspense: "Processing...",
    },
  },
  eye_analyzing: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Analysis In Progress",
      narrative: "{eye} is analyzing...",
      suspense: "Processing {progress}%...",
    },
  },
  eye_complete: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Eye Complete",
      narrative: "{eye} has finished their analysis.",
      suspense: null,
    },
  },
  eye_error: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Eye Error",
      narrative: "{eye} encountered an issue: {error}",
      suspense: null,
    },
  },

  // ===========================================
  // PIPELINE EVENTS (generic fallbacks)
  // ===========================================
  pipeline_event: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Pipeline Update",
      narrative: "The pipeline is progressing...",
      suspense: null,
    },
  },
  pipeline_paused: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Pipeline Paused",
      narrative: "Awaiting your input to continue.",
      suspense: "Paused - waiting for input...",
    },
  },
  pipeline_resumed: {
    act: StoryActId.UNDERSTANDING,
    narrator: EyeId.OVERSEER,
    template: {
      title: "Pipeline Resumed",
      narrative: "Continuing with the next step.",
      suspense: null,
    },
  },
});

/**
 * Get theatre event config for an event type
 */
export function getTheatreEventConfig(
  eventType: string,
): TheatreEventConfig | null {
  return THEATRE_EVENT_TEMPLATES[eventType] ?? null;
}

/**
 * Get the appropriate narrator for an event
 */
export function getNarratorForEvent(eventType: string): EyeId {
  const config = THEATRE_EVENT_TEMPLATES[eventType];
  return config?.narrator ?? EyeId.OVERSEER;
}

/**
 * Format narrative template with event data
 */
export function formatNarrative(
  template: string,
  data: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = data[key];
    if (value === undefined) return `{${key}}`;
    return String(value);
  });
}

/**
 * Check if an event requires user action
 */
export function eventRequiresAction(eventType: string): boolean {
  const config = THEATRE_EVENT_TEMPLATES[eventType];
  return config?.template.action != null;
}

/**
 * Check if an event triggers a celebration
 */
export function eventTriggersCelebration(
  eventType: string,
): CelebrationType | null {
  const config = THEATRE_EVENT_TEMPLATES[eventType];
  return config?.template.celebration ?? null;
}

/**
 * Get all event types for a specific act
 */
export function getEventsForAct(actId: StoryActId): string[] {
  return Object.entries(THEATRE_EVENT_TEMPLATES)
    .filter(([_, config]) => config.act === actId)
    .map(([eventType]) => eventType);
}
