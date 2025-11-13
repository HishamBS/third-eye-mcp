/**
 * Persona Blueprint Interface
 *
 * Defines the structure for persona blueprints stored in the database and used by the runtime renderer.
 * Each blueprint contains metadata, mission statements, phase specifications, envelope contracts,
 * reminders, and canonical examples.
 */

import type { EyeId, EyeStageToken, EyeCapability } from "@third-eye/constants";

export interface PersonaMetadata {
  /** Unique eye identifier */
  readonly eyeId: EyeId;
  /** Display name */
  readonly name: string;
  /** Brief description */
  readonly description: string;
  /** Semantic version */
  readonly version: string;
  /** Capabilities this eye provides */
  readonly capabilities: readonly EyeCapability[];
}

export interface PhaseSpec {
  /** Stage token (GUIDANCE or VALIDATION) */
  readonly stage: EyeStageToken;
  /** Mission for this phase */
  readonly mission: string;
  /** What to check or evaluate */
  readonly check: string;
  /** Reminders about expected behavior */
  readonly reminders: readonly string[];
  /** Example output envelope (canonical JSON) */
  readonly example: string;
}

export interface PersonaBlueprint {
  /** Metadata about this persona */
  readonly metadata: PersonaMetadata;
  /** Mission statement for this eye */
  readonly mission: string;
  /** Phase specifications (guidance and/or validation) */
  readonly phases: {
    readonly guidance?: PhaseSpec;
    readonly validation?: PhaseSpec;
  };
  /** Envelope contract - expected JSON structure */
  readonly envelopeContract: {
    /** Required top-level keys */
    readonly requiredKeys: readonly string[];
    /** Required data keys */
    readonly requiredDataKeys: readonly string[];
    /** Required UI keys */
    readonly requiredUiKeys: readonly string[];
  };
  /** Behavior reminders */
  readonly reminders: readonly string[];
  /** Additional notes */
  readonly notes?: string;
}
