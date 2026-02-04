/**
 * Persona Types - SSOT for Persona/Blueprint data structures
 *
 * These types are the single source of truth for persona data structures
 * shared between frontend and backend.
 *
 * Per R01: SSOT & DRY - All persona types centralized here
 * Per R07: Strict typing with no 'any'
 */

/**
 * LLM Configuration for persona
 */
export interface PersonaLLMConfig {
  readonly temperature: number;
  readonly top_p: number;
  readonly response_format: "text" | "json_object";
  readonly max_tokens: number;
}

/**
 * Phase configuration (guidance or validation)
 */
export interface PersonaPhase {
  readonly mission: string;
  readonly check: string;
  readonly reminders: readonly string[];
  readonly example: string;
}

/**
 * Envelope contract requirements
 */
export interface PersonaEnvelopeContract {
  readonly requiredKeys: readonly string[];
  readonly requiredDataKeys: readonly string[];
  readonly requiredUiKeys: readonly string[];
}

/**
 * Persona metadata (stored in metadata field)
 * Note: Backend API returns 'metadata' not 'metadataJson'
 */
export interface PersonaMetadata {
  readonly eyeId: string;
  readonly name: string;
  readonly description: string;
  readonly version: number;
  readonly capabilities: readonly string[];
}

/**
 * Blueprint API Response - what the backend returns
 * Note: Backend transforms snake_case DB columns to camelCase
 */
export interface BlueprintApiResponse {
  readonly id: string;
  readonly eyeId: string;
  readonly name: string;
  readonly version: number;
  readonly active: boolean;
  /** Metadata object (NOT metadataJson - backend transforms) */
  readonly metadata: PersonaMetadata;
  readonly mission: string;
  /** Phase configurations (NOT guidanceJson/validationJson) */
  readonly phases?: {
    readonly guidance?: PersonaPhase | null;
    readonly validation?: PersonaPhase | null;
  };
  /** Alternative: Direct fields if backend returns flat structure */
  readonly guidanceJson?: PersonaPhase | null;
  readonly validationJson?: PersonaPhase | null;
  readonly envelopeContract?: PersonaEnvelopeContract;
  readonly envelopeJson?: PersonaEnvelopeContract;
  readonly reminders?: readonly string[];
  readonly remindersJson?: readonly string[];
  readonly llmConfig?: PersonaLLMConfig;
  readonly llmConfigJson?: PersonaLLMConfig;
  readonly notes?: string | null;
  readonly createdAt?: string | Date;
  /** Capabilities may be at root level or in metadata */
  readonly capabilities?: readonly string[];
}

/**
 * Helper to extract metadata safely from API response
 * Handles both metadata object and metadataJson fallback
 */
export function extractMetadata(
  response: Partial<BlueprintApiResponse>,
  defaults: { eyeId: string; name: string },
): PersonaMetadata {
  // Try metadata object first (backend transformed response)
  const metadata = response.metadata;
  if (metadata && typeof metadata === "object") {
    return {
      eyeId: metadata.eyeId ?? defaults.eyeId,
      name: metadata.name ?? defaults.name,
      description: metadata.description ?? "",
      version: metadata.version ?? 1,
      capabilities: [...(metadata.capabilities ?? [])],
    };
  }

  // Fallback to root-level fields
  return {
    eyeId: response.eyeId ?? defaults.eyeId,
    name: response.name ?? defaults.name,
    description: "",
    version: response.version ?? 1,
    capabilities: [...(response.capabilities ?? [])],
  };
}

/**
 * Helper to extract phases safely from API response
 * Handles both phases object and direct *Json fields
 */
export function extractPhases(response: Partial<BlueprintApiResponse>): {
  guidance: PersonaPhase | null;
  validation: PersonaPhase | null;
} {
  // Try phases object first
  if (response.phases) {
    return {
      guidance: response.phases.guidance ?? null,
      validation: response.phases.validation ?? null,
    };
  }

  // Fallback to direct fields
  return {
    guidance: response.guidanceJson ?? null,
    validation: response.validationJson ?? null,
  };
}

/**
 * Helper to extract envelope contract safely
 */
export function extractEnvelopeContract(
  response: Partial<BlueprintApiResponse>,
): PersonaEnvelopeContract {
  const contract = response.envelopeContract ?? response.envelopeJson;
  if (contract && typeof contract === "object") {
    return {
      requiredKeys: [...(contract.requiredKeys ?? [])],
      requiredDataKeys: [...(contract.requiredDataKeys ?? [])],
      requiredUiKeys: [...(contract.requiredUiKeys ?? [])],
    };
  }

  return {
    requiredKeys: [],
    requiredDataKeys: [],
    requiredUiKeys: [],
  };
}

/**
 * Helper to extract reminders safely
 */
export function extractReminders(
  response: Partial<BlueprintApiResponse>,
): readonly string[] {
  return response.reminders ?? response.remindersJson ?? [];
}

/**
 * Helper to extract LLM config safely
 */
export function extractLLMConfig(
  response: Partial<BlueprintApiResponse>,
): PersonaLLMConfig {
  const config = response.llmConfig ?? response.llmConfigJson;
  if (config && typeof config === "object") {
    return {
      temperature: config.temperature ?? 0.7,
      top_p: config.top_p ?? 1.0,
      response_format: config.response_format ?? "text",
      max_tokens: config.max_tokens ?? 4096,
    };
  }

  return {
    temperature: 0.7,
    top_p: 1.0,
    response_format: "text",
    max_tokens: 4096,
  };
}
