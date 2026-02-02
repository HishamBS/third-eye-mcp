/**
 * Polling Configuration Constants - SSOT for all polling intervals
 *
 * R01 (SSOT/DRY): All polling intervals centralized here
 * R13 (No Magic Numbers): Zero hardcoded polling values in implementation
 */

/**
 * Standard Polling Intervals
 */
export const POLLING_INTERVALS = Object.freeze({
  /** Default session list polling interval (ms) */
  SESSION_LIST_MS: 5000, // 5 seconds

  /** Real-time stats polling on home page (ms) */
  REALTIME_STATS_MS: 3000, // 3 seconds

  /** Eye dashboard status polling (ms) */
  EYE_STATUS_MS: 5000, // 5 seconds

  /** Pipeline execution status polling (ms) */
  PIPELINE_EXECUTION_MS: 2000, // 2 seconds

  /** Health check polling interval (ms) */
  HEALTH_CHECK_MS: 60000, // 1 minute

  /** User contribution mode polling (ms) */
  USER_CONTRIBUTION_MS: 3000, // 3 seconds
});

/**
 * Debounce Delays
 */
export const DEBOUNCE_DELAYS = Object.freeze({
  /** General debounce delay (ms) */
  DEFAULT_MS: 300,

  /** Poll retry after operations (ms) */
  POLL_RETRY_MS: 500,

  /** Auto-save delay for routing changes (ms) */
  AUTO_SAVE_MS: 1500,

  /** Search input debounce (ms) */
  SEARCH_MS: 300,
});

/**
 * Cache Time-To-Live Values
 */
export const CACHE_TTL = Object.freeze({
  /** Model list cache TTL (ms) */
  MODEL_CACHE_MS: 3600000, // 1 hour

  /** Session cache TTL (ms) */
  SESSION_CACHE_MS: 300000, // 5 minutes

  /** Database lookup cache TTL (ms) */
  DB_LOOKUP_CACHE_MS: 60000, // 1 minute

  /** Rate limit cleanup threshold (ms) */
  RATE_LIMIT_CLEANUP_MS: 3600000, // 1 hour
});
