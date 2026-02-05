/**
 * Theatre Types - TypeScript interfaces for the theatrical Monitor system
 *
 * Defines all type interfaces for:
 * - Eye personas and dynamic resolution
 * - Story structure and act navigation
 * - Narrative events and performance state
 * - Timeline navigation and history
 * - Interactive actions and celebrations
 */

import type { EyeId } from "@third-eye/constants";

// ===========================================
// EYE PERSONA TYPES
// ===========================================

/**
 * Voice configuration for Eye narration
 */
export interface EyeVoice {
  readonly tone:
    | "authoritative"
    | "curious"
    | "insightful"
    | "careful"
    | "strategic"
    | "technical"
    | "meticulous"
    | "definitive"
    | "neutral";
  readonly style:
    | "orchestrative"
    | "questioning"
    | "discovering"
    | "confirming"
    | "planning"
    | "precise"
    | "evidence-focused"
    | "conclusive"
    | "professional";
}

/**
 * Color palette for Eye visual styling
 */
export interface EyeColorPalette {
  readonly primary: string; // Hex color
  readonly glow: string; // RGBA for glow effects
  readonly bg: string; // Tailwind bg class
  readonly text: string; // Tailwind text class
  readonly border: string; // Tailwind border class
  readonly hex: string; // Raw hex for canvas/SVG
}

/**
 * Animation timing configuration
 */
export interface EyeAnimationSpeeds {
  readonly entrance: number;
  readonly speaking: number;
  readonly exit: number;
}

/**
 * Phrase templates for Eye dialogue
 */
export interface EyePhrases {
  readonly greeting: string;
  readonly analyzing?: string;
  readonly complete: string;
  readonly error: string;
  readonly [key: string]: string | undefined;
}

/**
 * Complete Eye persona configuration
 * Used for both built-in and custom Eyes
 */
export interface EyePersonaConfig {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly symbol: string;
  readonly color: EyeColorPalette;
  readonly voice: EyeVoice;
  readonly entranceDirection: "left" | "right" | "above" | "below";
  readonly phrases: EyePhrases;
  readonly animationSpeeds: EyeAnimationSpeeds;
  readonly isBuiltIn: boolean;
}

/**
 * Custom Eye configuration from pipeline
 */
export interface CustomEyeConfig {
  readonly name?: string;
  readonly role?: string;
  readonly color?: Partial<EyeColorPalette>;
  readonly voice?: Partial<EyeVoice>;
  readonly phrases?: Partial<EyePhrases>;
}

/**
 * Pipeline context for Eye resolution
 */
export interface PipelineContext {
  readonly pipelineId: string;
  readonly customEyes?: Record<string, CustomEyeConfig>;
}

// ===========================================
// STORY STRUCTURE TYPES
// ===========================================

/**
 * Story act identifiers
 */
export type StoryActId = "act-1" | "act-2" | "act-3";

/**
 * Story act configuration
 */
export interface StoryAct {
  readonly id: StoryActId;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly color: {
    readonly primary: string;
    readonly glow: string;
    readonly bg: string;
    readonly text: string;
    readonly border: string;
  };
  readonly progressRange: { start: number; end: number };
  readonly eyes: readonly string[];
  readonly events: readonly string[];
}

/**
 * Act progress tracking
 */
export interface ActProgress {
  readonly actId: StoryActId;
  readonly completedEvents: number;
  readonly totalEvents: number;
  readonly percentage: number;
  readonly isActive: boolean;
  readonly isComplete: boolean;
}

// ===========================================
// NARRATIVE EVENT TYPES
// ===========================================

/**
 * Celebration types for milestone events
 */
export type CelebrationType = "minor" | "major" | "finale";

/**
 * Interactive action types
 */
export type TheatreActionType =
  | "clarification_form"
  | "clarification_input"
  | "intent_confirmation"
  | "plan_approval"
  | "review_issues";

/**
 * Content display types
 */
export type ContentDisplayType =
  | "plan_markdown"
  | "code_diff"
  | "review_details"
  | "evidence_list"
  | "session_summary";

/**
 * Narrative event for display
 */
export interface NarrativeEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly eventType: string;
  readonly actId: StoryActId;
  readonly narrator: string; // Eye ID
  readonly title: string;
  readonly narrative: string;
  readonly suspense: string | null;
  readonly action: TheatreActionType | null;
  readonly content: ContentDisplayType | null;
  readonly celebration: CelebrationType | null;
  readonly metadata: Record<string, unknown>;
  readonly rawEvent: unknown;
}

/**
 * Suspense state for in-progress actions
 */
export interface SuspenseState {
  readonly isActive: boolean;
  readonly message: string;
  readonly progress?: number;
  readonly startTime: Date;
}

// ===========================================
// THEATRE STATE TYPES
// ===========================================

/**
 * Eye character state on stage
 */
export type EyeCharacterState =
  | "offstage"
  | "entering"
  | "active"
  | "speaking"
  | "thinking"
  | "exiting"
  | "celebrating";

/**
 * Curtain animation state
 */
export type CurtainState = "closed" | "opening" | "open" | "closing";

/**
 * Spotlight intensity levels
 */
export type SpotlightIntensity = "dim" | "normal" | "bright" | "dramatic";

/**
 * Complete theatre orchestration state
 */
export interface TheatreState {
  // Session
  readonly sessionId: string | null;
  readonly connectionStatus:
    | "disconnected"
    | "connecting"
    | "connected"
    | "reconnecting";

  // Curtain
  readonly curtainState: CurtainState;

  // Act progress
  readonly currentAct: StoryActId;
  readonly actProgress: Record<StoryActId, ActProgress>;
  readonly overallProgress: number;

  // Character state
  readonly activeEye: string | null;
  readonly eyeState: EyeCharacterState;
  readonly waitingEyes: string[];
  readonly completedEyes: Array<{
    eye: string;
    status: "success" | "warning" | "error";
  }>;

  // Spotlight
  readonly spotlightPosition: { x: number; y: number };
  readonly spotlightColor: string;
  readonly spotlightIntensity: SpotlightIntensity;

  // Dialogue
  readonly currentDialogue: string | null;
  readonly isTyping: boolean;
  readonly dialogueQueue: string[];

  // Interactive state
  readonly pendingAction: {
    type: TheatreActionType;
    data: Record<string, unknown>;
  } | null;

  // Celebration
  readonly celebrationState: {
    type: CelebrationType;
    message: string;
  } | null;

  // Performance history
  readonly events: NarrativeEvent[];
}

// ===========================================
// TIMELINE NAVIGATION TYPES
// ===========================================

/**
 * Timeline navigation mode
 */
export type TimelineMode = "live" | "review";

/**
 * Playback speed options
 */
export type PlaybackSpeed = 0.5 | 1 | 2;

/**
 * Timeline filter options
 */
export interface TimelineFilters {
  readonly eye: string | null;
  readonly act: StoryActId | null;
  readonly eventType: string | null;
  readonly searchQuery: string;
}

/**
 * Timeline navigation state
 */
export interface TimelineState {
  // Events
  readonly events: NarrativeEvent[];
  readonly filteredEvents: NarrativeEvent[];

  // Navigation
  readonly mode: TimelineMode;
  readonly selectedIndex: number;
  readonly selectedEvent: NarrativeEvent | null;

  // Playback
  readonly isPlaying: boolean;
  readonly playbackSpeed: PlaybackSpeed;

  // Filtering
  readonly filters: TimelineFilters;

  // UI state
  readonly isExpanded: boolean;
  readonly showFilters: boolean;
}

// ===========================================
// PERFORMANCE EVENT TYPES
// ===========================================

/**
 * Performance action for stage orchestration
 */
export type PerformanceAction =
  | "enter"
  | "speak"
  | "think"
  | "ask"
  | "approve"
  | "reject"
  | "celebrate"
  | "exit";

/**
 * Logged performance event
 */
export interface PerformanceEvent {
  readonly id: string;
  readonly timestamp: Date;
  readonly act: StoryActId;
  readonly performer: string;
  readonly action: PerformanceAction;
  readonly dialogue: string;
  readonly metadata?: Record<string, unknown>;
}

// ===========================================
// INTERACTIVE COMPONENT TYPES
// ===========================================

/**
 * Clarification prompt data
 */
export interface ClarificationPromptData {
  readonly id: string;
  readonly question: string;
  readonly context?: string;
  readonly options?: string[];
  readonly isRequired: boolean;
}

/**
 * Plan approval data
 */
export interface PlanApprovalData {
  readonly planId: string;
  readonly planMarkdown: string;
  readonly stepCount: number;
  readonly estimatedTime?: string;
}

/**
 * Review issue data
 */
export interface ReviewIssueData {
  readonly issueId: string;
  readonly severity: "error" | "warning" | "info";
  readonly title: string;
  readonly description: string;
  readonly location?: string;
  readonly suggestion?: string;
}

// ===========================================
// HOOK RETURN TYPES
// ===========================================

/**
 * useTheatreOrchestrator return type
 */
export interface TheatreOrchestratorReturn {
  readonly state: TheatreState;
  readonly openCurtain: () => void;
  readonly closeCurtain: () => void;
  readonly enterEye: (eyeId: string) => void;
  readonly exitEye: (eyeId: string) => void;
  readonly speak: (dialogue: string) => void;
  readonly triggerCelebration: (type: CelebrationType, message: string) => void;
  readonly setSpotlight: (color: string, intensity: SpotlightIntensity) => void;
  readonly transitionToAct: (actId: StoryActId) => void;
}

/**
 * useTimelineNavigation return type
 */
export interface TimelineNavigationReturn {
  readonly state: TimelineState;
  readonly goToEvent: (index: number) => void;
  readonly goLive: () => void;
  readonly playPause: () => void;
  readonly setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  readonly setFilters: (filters: Partial<TimelineFilters>) => void;
  readonly clearFilters: () => void;
  readonly toggleExpanded: () => void;
  readonly nextEvent: () => void;
  readonly prevEvent: () => void;
}

/**
 * useEyeCharacter return type
 */
export interface EyeCharacterReturn {
  readonly persona: EyePersonaConfig;
  readonly formatDialogue: (
    template: string,
    variables: Record<string, string | number>,
  ) => string;
  readonly getEntranceAnimation: () => {
    initial: Record<string, number>;
    animate: Record<string, number>;
    transition: Record<string, unknown>;
  };
  readonly getExitAnimation: () => {
    exit: Record<string, number>;
    transition: Record<string, unknown>;
  };
}

/**
 * useStagePerformance return type
 */
export interface StagePerformanceReturn {
  readonly events: PerformanceEvent[];
  readonly currentPerformance: PerformanceEvent | null;
  readonly isPerforming: boolean;
  readonly queuePerformance: (event: PerformanceEvent) => void;
  readonly clearPerformanceQueue: () => void;
}
