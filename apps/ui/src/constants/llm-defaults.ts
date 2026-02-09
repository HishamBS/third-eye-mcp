/**
 * LLM Configuration Defaults
 * SSOT for all LLM-related default values
 */
export const LLM_DEFAULTS = {
  /** Default max tokens for standard responses */
  MAX_TOKENS: 2000,
  /** Reduced max tokens for compact/summary responses */
  MAX_TOKENS_COMPACT: 1500,
} as const;
