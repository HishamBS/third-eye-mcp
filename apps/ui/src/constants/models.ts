/**
 * Models & Providers Constants - SSOT for model/provider configuration
 * Per R13: No magic strings
 * Per R01: Derives from @third-eye/types PROVIDERS (single source of truth)
 */

import { PROVIDERS as PROVIDER_IDS } from "@third-eye/types";

export interface ProviderDefinition {
  readonly id: string;
  readonly name: string;
  readonly requiresKey: boolean;
}

/** Display names for each provider ID */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  lmstudio: "LM Studio",
};

/** Local providers that do not require an API key */
const LOCAL_PROVIDERS = new Set(["ollama", "lmstudio"]);

export const PROVIDERS: readonly ProviderDefinition[] = PROVIDER_IDS.map(
  (id) => ({
    id,
    name: PROVIDER_DISPLAY_NAMES[id] ?? id,
    requiresKey: !LOCAL_PROVIDERS.has(id),
  }),
);

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
