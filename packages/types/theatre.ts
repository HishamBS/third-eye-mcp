/**
 * Theatre Types - TypeScript interfaces for Eye persona configuration
 *
 * Defines type interfaces for:
 * - Eye personas and dynamic resolution
 * - Visual styling and color palettes
 * - Animation timing
 * - Dialogue phrases
 *
 * Interactive component types (clarification, plan approval, review)
 * are retained as they describe data contracts with the backend.
 */

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
