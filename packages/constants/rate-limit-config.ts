/**
 * Rate Limiting Configuration - SSOT for all rate limiting parameters
 *
 * R01 (SSOT/DRY): All rate limit configuration centralized here
 * R13 (No Magic Numbers): Zero hardcoded rate limits in implementation code
 */

/**
 * Rate Limit Strategy Configuration
 */
export const RATE_LIMIT_CONFIG = Object.freeze({
  // Default limits (requests per minute)
  DEFAULT_RPM: 60,
  DEFAULT_BURST: 10,

  // Token bucket refill rate (milliseconds between token additions)
  REFILL_RATE_MS: 1000, // 1 second

  // Sliding window size for tracking (milliseconds)
  WINDOW_SIZE_MS: 60000, // 1 minute

  // Database cleanup - remove tracking older than this (milliseconds)
  CLEANUP_THRESHOLD_MS: 3600000, // 1 hour
});

/**
 * Provider-Specific Rate Limits
 *
 * These limits are conservative defaults based on typical free-tier limits.
 * Production deployments should configure based on actual API plan.
 */
export const PROVIDER_RATE_LIMITS = Object.freeze({
  // Groq - Free tier has lower limits
  groq: {
    rpm: 30, // Requests per minute
    burst: 5, // Burst capacity
    tpm: 14400, // Tokens per minute
  },

  // OpenRouter - Generous free tier
  openrouter: {
    rpm: 60,
    burst: 10,
    tpm: 100000,
  },

  // Anthropic Claude - Pay-as-you-go
  anthropic: {
    rpm: 50,
    burst: 10,
    tpm: 100000,
  },

  // OpenAI - Tiered limits
  openai: {
    rpm: 60,
    burst: 10,
    tpm: 90000,
  },

  // Local providers - No rate limits
  ollama: {
    rpm: 1000, // Effectively unlimited
    burst: 100,
    tpm: 1000000,
  },

  lmstudio: {
    rpm: 1000, // Effectively unlimited
    burst: 100,
    tpm: 1000000,
  },
});

/**
 * Rate Limit Event Types for logging and metrics
 */
export const RATE_LIMIT_EVENT_TYPE = Object.freeze({
  REQUEST_ALLOWED: "rate_limit_request_allowed",
  REQUEST_THROTTLED: "rate_limit_request_throttled",
  LIMIT_EXCEEDED: "rate_limit_exceeded",
  TOKENS_REFILLED: "rate_limit_tokens_refilled",
  QUOTA_WARNING: "rate_limit_quota_warning",
  QUOTA_EXCEEDED: "rate_limit_quota_exceeded",
});

/**
 * Rate Limit Action Types
 */
export const RATE_LIMIT_ACTION = Object.freeze({
  ALLOW: "allow", // Request allowed
  THROTTLE: "throttle", // Request delayed
  REJECT: "reject", // Request rejected
  QUEUE: "queue", // Request queued for later
});

/**
 * Get rate limit configuration for a specific provider
 *
 * @param provider - Provider type
 * @returns Rate limit configuration or default
 */
export function getProviderRateLimit(provider: string): {
  rpm: number;
  burst: number;
  tpm: number;
} {
  const limits =
    PROVIDER_RATE_LIMITS[provider as keyof typeof PROVIDER_RATE_LIMITS];

  if (limits) {
    return limits;
  }

  // Return default limits for unknown providers
  return {
    rpm: RATE_LIMIT_CONFIG.DEFAULT_RPM,
    burst: RATE_LIMIT_CONFIG.DEFAULT_BURST,
    tpm: 100000,
  };
}

/**
 * Calculate tokens to add per refill interval
 *
 * @param rpm - Requests per minute
 * @returns Tokens to add per refill interval
 */
export function calculateRefillTokens(rpm: number): number {
  // How many tokens to add each refill interval
  // refill_rate_ms / 60000 * rpm
  const tokensPerSecond = rpm / 60;
  const refillIntervalSeconds = RATE_LIMIT_CONFIG.REFILL_RATE_MS / 1000;
  return tokensPerSecond * refillIntervalSeconds;
}
