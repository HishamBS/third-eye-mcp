/**
 * Models & Providers Constants - SSOT for model/provider configuration
 * Per R13: No magic strings
 * Per R01: Single source of truth
 */

export interface ProviderDefinition {
  readonly id: string;
  readonly name: string;
  readonly requiresKey: boolean;
}

export const PROVIDERS: readonly ProviderDefinition[] = [
  { id: "groq", name: "Groq", requiresKey: true },
  { id: "openrouter", name: "OpenRouter", requiresKey: true },
  { id: "ollama", name: "Ollama", requiresKey: false },
  { id: "lmstudio", name: "LM Studio", requiresKey: false },
] as const;

export interface CapabilityFilter {
  readonly vision: boolean;
  readonly json: boolean;
  readonly minCtx: number;
}

export const DEFAULT_CAPABILITY_FILTER: CapabilityFilter = {
  vision: false,
  json: false,
  minCtx: 0,
} as const;

export const CONTEXT_SIZE_PRESETS = [0, 4, 8, 16, 32, 64, 128, 200] as const;
