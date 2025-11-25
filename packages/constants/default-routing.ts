/**
 * Default Routing Configuration - SSOT
 *
 * CRITICAL FIX: Extracted from packages/db/defaults/index.ts (lines 503-506)
 * - Prevents hardcoded model names from becoming outdated
 * - Centralizes provider/model configuration
 * - Makes updates easier when providers change model names
 *
 * Per R01 (SSOT): All routing defaults must be defined here
 * Per R13 (No Magic Strings): No string literals for providers/models
 */

/**
 * Default Primary Provider
 * Used for all eye routing unless overridden by app settings
 */
export const DEFAULT_PRIMARY_PROVIDER = "groq" as const;

/**
 * Default Primary Model
 * Fast, cost-effective model for general-purpose routing
 */
export const DEFAULT_PRIMARY_MODEL = "llama-3.3-70b-versatile" as const;

/**
 * Default Fallback Provider
 * Used when primary provider fails or rate limits
 */
export const DEFAULT_FALLBACK_PROVIDER = "openrouter" as const;

/**
 * Default Fallback Model
 * High-quality fallback for when Groq is unavailable
 */
export const DEFAULT_FALLBACK_MODEL = "anthropic/claude-3.5-sonnet" as const;

/**
 * Type-safe routing defaults
 */
export interface DefaultRoutingConfig {
  primaryProvider: typeof DEFAULT_PRIMARY_PROVIDER;
  primaryModel: typeof DEFAULT_PRIMARY_MODEL;
  fallbackProvider: typeof DEFAULT_FALLBACK_PROVIDER;
  fallbackModel: typeof DEFAULT_FALLBACK_MODEL;
}

/**
 * Get default routing configuration
 */
export function getDefaultRoutingConfig(): DefaultRoutingConfig {
  return {
    primaryProvider: DEFAULT_PRIMARY_PROVIDER,
    primaryModel: DEFAULT_PRIMARY_MODEL,
    fallbackProvider: DEFAULT_FALLBACK_PROVIDER,
    fallbackModel: DEFAULT_FALLBACK_MODEL,
  };
}
