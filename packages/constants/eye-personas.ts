/**
 * Eye Personas - Theatrical Character Definitions
 *
 * Defines the 8 built-in Eye characters with distinct personalities,
 * visual styles, and narrative voices for the theatrical Monitor experience.
 *
 * Each Eye is a CHARACTER with:
 * - Unique visual presence (colors, symbols, aura)
 * - Distinct voice and personality
 * - Signature entrance/exit animations
 * - Contextual phrases for different situations
 *
 * Per R13: NO magic string literals - all text from constants
 *
 * Related: @third-eye/config/eye-capabilities.ts defines functional capabilities
 * (capability tags, scenarios, routing logic) for each eye.
 * This file defines presentation/persona metadata; eye-capabilities defines function.
 */

import { EyeId } from "./taxonomy";

/**
 * Eye Role Titles - Human-readable role descriptions
 */
export const EYE_ROLE_TITLES = Object.freeze({
  [EyeId.OVERSEER]: "The Director",
  [EyeId.SHARINGAN]: "The Detective",
  [EyeId.KYUUBI]: "The Pattern Hunter",
  [EyeId.JOGAN]: "The Verifier",
  [EyeId.RINNEGAN]: "The Strategist",
  [EyeId.MANGEKYO]: "The Perfectionist",
  [EyeId.TENSEIGAN]: "The Scholar",
  [EyeId.BYAKUGAN]: "The Final Judge",
} as const);

/**
 * Eye Display Names - Formatted for UI display
 */
export const EYE_DISPLAY_NAMES = Object.freeze({
  [EyeId.OVERSEER]: "Overseer",
  [EyeId.SHARINGAN]: "Sharingan",
  [EyeId.KYUUBI]: "Kyuubi",
  [EyeId.JOGAN]: "Jogan",
  [EyeId.RINNEGAN]: "Rinnegan",
  [EyeId.MANGEKYO]: "Mangekyo",
  [EyeId.TENSEIGAN]: "Tenseigan",
  [EyeId.BYAKUGAN]: "Byakugan",
} as const);

/**
 * Eye Symbols - Single character or short symbol for avatar display
 */
export const EYE_SYMBOLS = Object.freeze({
  [EyeId.OVERSEER]: "\u25B3", // Triangle (△)
  [EyeId.SHARINGAN]: "\u25CE", // Bullseye (◎)
  [EyeId.KYUUBI]: "\u2726", // Star (✦)
  [EyeId.JOGAN]: "\u25CB", // Circle (○)
  [EyeId.RINNEGAN]: "\u25C9", // Fisheye (◉)
  [EyeId.MANGEKYO]: "\u2727", // Star (✧)
  [EyeId.TENSEIGAN]: "\u2740", // Flower (❀)
  [EyeId.BYAKUGAN]: "\u25D0", // Half circle (◐)
} as const);

/**
 * Eye Color Palettes - Primary and glow colors for each Eye
 */
export const EYE_COLOR_PALETTES = Object.freeze({
  [EyeId.OVERSEER]: {
    primary: "#d4af37", // Gold
    glow: "rgba(212, 175, 55, 0.4)",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/40",
    hex: "#d4af37",
  },
  [EyeId.SHARINGAN]: {
    primary: "#dc143c", // Crimson
    glow: "rgba(220, 20, 60, 0.4)",
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/40",
    hex: "#dc143c",
  },
  [EyeId.KYUUBI]: {
    primary: "#ff6b00", // Orange
    glow: "rgba(255, 107, 0, 0.4)",
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    border: "border-orange-500/40",
    hex: "#ff6b00",
  },
  [EyeId.JOGAN]: {
    primary: "#00ffff", // Cyan
    glow: "rgba(0, 255, 255, 0.4)",
    bg: "bg-cyan-500/20",
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    hex: "#00ffff",
  },
  [EyeId.RINNEGAN]: {
    primary: "#9b59b6", // Purple
    glow: "rgba(155, 89, 182, 0.4)",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/40",
    hex: "#9b59b6",
  },
  [EyeId.MANGEKYO]: {
    primary: "#ff1493", // Pink (DeepPink)
    glow: "rgba(255, 20, 147, 0.4)",
    bg: "bg-pink-500/20",
    text: "text-pink-400",
    border: "border-pink-500/40",
    hex: "#ff1493",
  },
  [EyeId.TENSEIGAN]: {
    primary: "#4b0082", // Indigo
    glow: "rgba(75, 0, 130, 0.4)",
    bg: "bg-indigo-500/20",
    text: "text-indigo-400",
    border: "border-indigo-500/40",
    hex: "#4b0082",
  },
  [EyeId.BYAKUGAN]: {
    primary: "#50c878", // Emerald
    glow: "rgba(80, 200, 120, 0.4)",
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    hex: "#50c878",
  },
} as const);

/**
 * Eye Voice Configurations - Personality traits for narrative generation
 */
export type VoiceTone =
  | "authoritative"
  | "curious"
  | "insightful"
  | "careful"
  | "strategic"
  | "technical"
  | "meticulous"
  | "definitive"
  | "neutral";
export type VoiceStyle =
  | "orchestrative"
  | "questioning"
  | "discovering"
  | "confirming"
  | "planning"
  | "precise"
  | "evidence-focused"
  | "conclusive"
  | "professional";

export const EYE_VOICES = Object.freeze({
  [EyeId.OVERSEER]: {
    tone: "authoritative" as VoiceTone,
    style: "orchestrative" as VoiceStyle,
  },
  [EyeId.SHARINGAN]: {
    tone: "curious" as VoiceTone,
    style: "questioning" as VoiceStyle,
  },
  [EyeId.KYUUBI]: {
    tone: "insightful" as VoiceTone,
    style: "discovering" as VoiceStyle,
  },
  [EyeId.JOGAN]: {
    tone: "careful" as VoiceTone,
    style: "confirming" as VoiceStyle,
  },
  [EyeId.RINNEGAN]: {
    tone: "strategic" as VoiceTone,
    style: "planning" as VoiceStyle,
  },
  [EyeId.MANGEKYO]: {
    tone: "technical" as VoiceTone,
    style: "precise" as VoiceStyle,
  },
  [EyeId.TENSEIGAN]: {
    tone: "meticulous" as VoiceTone,
    style: "evidence-focused" as VoiceStyle,
  },
  [EyeId.BYAKUGAN]: {
    tone: "definitive" as VoiceTone,
    style: "conclusive" as VoiceStyle,
  },
} as const);

/**
 * Eye Entrance Directions - Stage entrance animations
 */
export type EntranceDirection = "left" | "right" | "above" | "below";

export const EYE_ENTRANCE_DIRECTIONS = Object.freeze({
  [EyeId.OVERSEER]: "above" as EntranceDirection, // Descends from top - commanding
  [EyeId.SHARINGAN]: "left" as EntranceDirection,
  [EyeId.KYUUBI]: "left" as EntranceDirection,
  [EyeId.JOGAN]: "left" as EntranceDirection,
  [EyeId.RINNEGAN]: "left" as EntranceDirection,
  [EyeId.MANGEKYO]: "left" as EntranceDirection,
  [EyeId.TENSEIGAN]: "left" as EntranceDirection,
  [EyeId.BYAKUGAN]: "right" as EntranceDirection, // Enters from opposite for drama
} as const);

/**
 * Eye Narrative Phrases - Contextual dialogue templates
 * Use {variable} placeholders for dynamic content
 */
export const EYE_PHRASES = Object.freeze({
  [EyeId.OVERSEER]: {
    greeting: "I am orchestrating this performance...",
    delegating: "I'm calling {eye} to the stage.",
    waiting: "The stage awaits your direction.",
    analyzing: "Assessing the situation...",
    complete: "The performance concludes. Curtain falls.",
    error: "We've encountered an unexpected situation.",
  },
  [EyeId.SHARINGAN]: {
    greeting: "Let me examine what lies beneath...",
    analyzing: "Scanning for ambiguities and hidden complexities...",
    foundIssues: "I've uncovered {count} mysteries requiring your insight.",
    askingQuestion: "A question demands an answer: {question}",
    satisfied: "The truth is now clear to me.",
    complete: "Analysis complete. No ambiguities remain.",
    error: "Something obscures my vision...",
  },
  [EyeId.KYUUBI]: {
    greeting: "I sense connections forming in the chaos...",
    analyzing: "Weaving patterns from the threads of your request...",
    found: "The patterns reveal themselves: {count} threads, {deps} bonds.",
    insight: "Behold what connects: {insight}",
    structuring: "Shaping your requirements into a structured form...",
    complete: "The prompt has taken form. Ready for the next stage.",
    error: "The patterns refuse to align...",
  },
  [EyeId.JOGAN]: {
    greeting: "Let me peer into your true intent...",
    verifying: "Confirming alignment between your words and desires...",
    question: "Before we proceed further: {question}",
    confirmed: "Your intent is crystal clear. We are aligned.",
    awaiting: "Awaiting your confirmation to proceed...",
    complete: "Intent verified. The path forward is certain.",
    error: "Your intent remains unclear to me...",
  },
  [EyeId.RINNEGAN]: {
    greeting: "I am devising the perfect strategy...",
    planning: "Mapping out the optimal path to your goal...",
    presenting: "My {stepCount}-step masterplan awaits your approval:",
    awaitingApproval: "Does this path satisfy your vision?",
    approved: "The strategy is set. Execution begins.",
    rejected: "I shall refine the approach. Tell me more.",
    complete: "The plan has been approved. Moving to execution.",
    error: "The strategic path is unclear...",
  },
  [EyeId.MANGEKYO]: {
    greeting: "Every line, every detail, under my scrutiny...",
    reviewing: "Examining the implementation with precision...",
    score: "Quality assessment: {score}/100",
    issues: "Imperfections detected: {count} require refinement.",
    passed: "The craft meets my standards. Flawless.",
    complete: "Code review complete. Quality verified.",
    error: "The code presents unexpected challenges...",
  },
  [EyeId.TENSEIGAN]: {
    greeting: "I am consulting the records of truth...",
    validating: "Cross-referencing claims against evidence...",
    found: "Evidence examined: {cited} of {total} claims verified.",
    issue: "These claims lack foundation: {claims}",
    passed: "The evidence is irrefutable. Truth stands.",
    complete: "Fact validation complete. Evidence verified.",
    error: "The evidence trail grows cold...",
  },
  [EyeId.BYAKUGAN]: {
    greeting: "My all-seeing gaze examines the final work...",
    inspecting: "Checking consistency, edge cases, every corner illuminated.",
    checking: "Final validation in progress...",
    approved: "I RENDER MY VERDICT: APPROVED FOR DELIVERY.",
    rejected: "Issues remain in the shadows: {issues}",
    complete: "Final approval granted. Mission complete.",
    error: "The final inspection reveals complications...",
  },
} as const);

/**
 * Eye Animation Speeds (ms) - Timing for stage presence
 */
export const EYE_ANIMATION_SPEEDS = Object.freeze({
  [EyeId.OVERSEER]: { entrance: 800, speaking: 2000, exit: 600 },
  [EyeId.SHARINGAN]: { entrance: 600, speaking: 1500, exit: 500 },
  [EyeId.KYUUBI]: { entrance: 500, speaking: 1200, exit: 400 },
  [EyeId.JOGAN]: { entrance: 700, speaking: 1800, exit: 550 },
  [EyeId.RINNEGAN]: { entrance: 700, speaking: 2000, exit: 600 },
  [EyeId.MANGEKYO]: { entrance: 600, speaking: 1600, exit: 500 },
  [EyeId.TENSEIGAN]: { entrance: 750, speaking: 1900, exit: 550 },
  [EyeId.BYAKUGAN]: { entrance: 800, speaking: 2200, exit: 700 },
} as const);

/**
 * Complete Eye Persona interface
 */
export interface EyePersona {
  readonly id: EyeId;
  readonly name: string;
  readonly role: string;
  readonly symbol: string;
  readonly color: (typeof EYE_COLOR_PALETTES)[EyeId];
  readonly voice: { tone: VoiceTone; style: VoiceStyle };
  readonly entranceDirection: EntranceDirection;
  readonly phrases: (typeof EYE_PHRASES)[EyeId];
  readonly animationSpeeds: (typeof EYE_ANIMATION_SPEEDS)[EyeId];
}

/**
 * Complete Eye Personas - SSOT for all Eye character data
 */
export const EYE_PERSONAS: Readonly<Record<EyeId, EyePersona>> = Object.freeze({
  [EyeId.OVERSEER]: {
    id: EyeId.OVERSEER,
    name: EYE_DISPLAY_NAMES[EyeId.OVERSEER],
    role: EYE_ROLE_TITLES[EyeId.OVERSEER],
    symbol: EYE_SYMBOLS[EyeId.OVERSEER],
    color: EYE_COLOR_PALETTES[EyeId.OVERSEER],
    voice: EYE_VOICES[EyeId.OVERSEER],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.OVERSEER],
    phrases: EYE_PHRASES[EyeId.OVERSEER],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.OVERSEER],
  },
  [EyeId.SHARINGAN]: {
    id: EyeId.SHARINGAN,
    name: EYE_DISPLAY_NAMES[EyeId.SHARINGAN],
    role: EYE_ROLE_TITLES[EyeId.SHARINGAN],
    symbol: EYE_SYMBOLS[EyeId.SHARINGAN],
    color: EYE_COLOR_PALETTES[EyeId.SHARINGAN],
    voice: EYE_VOICES[EyeId.SHARINGAN],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.SHARINGAN],
    phrases: EYE_PHRASES[EyeId.SHARINGAN],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.SHARINGAN],
  },
  [EyeId.KYUUBI]: {
    id: EyeId.KYUUBI,
    name: EYE_DISPLAY_NAMES[EyeId.KYUUBI],
    role: EYE_ROLE_TITLES[EyeId.KYUUBI],
    symbol: EYE_SYMBOLS[EyeId.KYUUBI],
    color: EYE_COLOR_PALETTES[EyeId.KYUUBI],
    voice: EYE_VOICES[EyeId.KYUUBI],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.KYUUBI],
    phrases: EYE_PHRASES[EyeId.KYUUBI],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.KYUUBI],
  },
  [EyeId.JOGAN]: {
    id: EyeId.JOGAN,
    name: EYE_DISPLAY_NAMES[EyeId.JOGAN],
    role: EYE_ROLE_TITLES[EyeId.JOGAN],
    symbol: EYE_SYMBOLS[EyeId.JOGAN],
    color: EYE_COLOR_PALETTES[EyeId.JOGAN],
    voice: EYE_VOICES[EyeId.JOGAN],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.JOGAN],
    phrases: EYE_PHRASES[EyeId.JOGAN],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.JOGAN],
  },
  [EyeId.RINNEGAN]: {
    id: EyeId.RINNEGAN,
    name: EYE_DISPLAY_NAMES[EyeId.RINNEGAN],
    role: EYE_ROLE_TITLES[EyeId.RINNEGAN],
    symbol: EYE_SYMBOLS[EyeId.RINNEGAN],
    color: EYE_COLOR_PALETTES[EyeId.RINNEGAN],
    voice: EYE_VOICES[EyeId.RINNEGAN],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.RINNEGAN],
    phrases: EYE_PHRASES[EyeId.RINNEGAN],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.RINNEGAN],
  },
  [EyeId.MANGEKYO]: {
    id: EyeId.MANGEKYO,
    name: EYE_DISPLAY_NAMES[EyeId.MANGEKYO],
    role: EYE_ROLE_TITLES[EyeId.MANGEKYO],
    symbol: EYE_SYMBOLS[EyeId.MANGEKYO],
    color: EYE_COLOR_PALETTES[EyeId.MANGEKYO],
    voice: EYE_VOICES[EyeId.MANGEKYO],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.MANGEKYO],
    phrases: EYE_PHRASES[EyeId.MANGEKYO],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.MANGEKYO],
  },
  [EyeId.TENSEIGAN]: {
    id: EyeId.TENSEIGAN,
    name: EYE_DISPLAY_NAMES[EyeId.TENSEIGAN],
    role: EYE_ROLE_TITLES[EyeId.TENSEIGAN],
    symbol: EYE_SYMBOLS[EyeId.TENSEIGAN],
    color: EYE_COLOR_PALETTES[EyeId.TENSEIGAN],
    voice: EYE_VOICES[EyeId.TENSEIGAN],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.TENSEIGAN],
    phrases: EYE_PHRASES[EyeId.TENSEIGAN],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.TENSEIGAN],
  },
  [EyeId.BYAKUGAN]: {
    id: EyeId.BYAKUGAN,
    name: EYE_DISPLAY_NAMES[EyeId.BYAKUGAN],
    role: EYE_ROLE_TITLES[EyeId.BYAKUGAN],
    symbol: EYE_SYMBOLS[EyeId.BYAKUGAN],
    color: EYE_COLOR_PALETTES[EyeId.BYAKUGAN],
    voice: EYE_VOICES[EyeId.BYAKUGAN],
    entranceDirection: EYE_ENTRANCE_DIRECTIONS[EyeId.BYAKUGAN],
    phrases: EYE_PHRASES[EyeId.BYAKUGAN],
    animationSpeeds: EYE_ANIMATION_SPEEDS[EyeId.BYAKUGAN],
  },
});

/**
 * Get Eye persona by ID
 */
export function getEyePersona(eyeId: EyeId): EyePersona {
  return EYE_PERSONAS[eyeId];
}

/**
 * Check if an Eye ID is a built-in Eye
 */
export function isBuiltInEye(eyeId: string): eyeId is EyeId {
  return Object.values(EyeId).includes(eyeId as EyeId);
}

/**
 * Format a phrase template with variables
 * @example formatPhrase("Found {count} issues", { count: "3" }) => "Found 3 issues"
 */
export function formatPhrase(
  template: string,
  variables: Record<string, string | number>,
): string {
  return template.replace(
    /\{(\w+)\}/g,
    (_, key) => String(variables[key]) ?? `{${key}}`,
  );
}
