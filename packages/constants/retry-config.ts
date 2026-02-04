/**
 * Provider Retry Configuration - SSOT for all retry logic parameters
 *
 * R01 (SSOT/DRY): All retry configuration centralized here
 * R13 (No Magic Numbers): Zero hardcoded retry values in implementation code
 */

/**
 * Retry Strategy Configuration
 */
export const RETRY_CONFIG = Object.freeze({
  // Maximum number of retry attempts for provider calls
  MAX_ATTEMPTS: 5,

  // Base delay in milliseconds for exponential backoff
  BASE_DELAY_MS: 1000,

  // Maximum delay cap in milliseconds (prevent excessive waits)
  MAX_DELAY_MS: 32000,

  // Backoff multiplier for exponential growth
  BACKOFF_MULTIPLIER: 2,

  // Jitter factor (0-1) to randomize delays and prevent thundering herd
  JITTER_FACTOR: 0.1,

  // Timeout for individual provider calls in milliseconds
  PROVIDER_TIMEOUT_MS: 120000, // 2 minutes

  // Persona validation retry attempts (existing logic)
  MAX_PERSONA_RETRIES: 3,
});

/**
 * HTTP Status Codes that should trigger retry
 */
export const RETRYABLE_STATUS_CODES = Object.freeze(
  new Set([
    408, // Request Timeout
    429, // Too Many Requests (Rate Limit)
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]),
);

/**
 * HTTP Status Codes that should NOT trigger retry (client errors)
 */
export const NON_RETRYABLE_STATUS_CODES = Object.freeze(
  new Set([
    400, // Bad Request
    401, // Unauthorized
    403, // Forbidden
    404, // Not Found
    405, // Method Not Allowed
    413, // Payload Too Large
    422, // Unprocessable Entity
  ]),
);

/**
 * Error Types that should trigger retry
 */
export const RETRYABLE_ERROR_TYPES = Object.freeze(
  new Set([
    "ECONNREFUSED", // Connection refused
    "ECONNRESET", // Connection reset
    "ETIMEDOUT", // Timeout
    "ENOTFOUND", // DNS lookup failed
    "ENETUNREACH", // Network unreachable
    "EHOSTUNREACH", // Host unreachable
    "EPIPE", // Broken pipe
  ]),
);

/**
 * Retry Event Types for logging and metrics
 */
export const RETRY_EVENT_TYPE = Object.freeze({
  ATTEMPT_STARTED: "retry_attempt_started",
  ATTEMPT_FAILED: "retry_attempt_failed",
  ATTEMPT_SUCCEEDED: "retry_attempt_succeeded",
  ALL_ATTEMPTS_EXHAUSTED: "retry_all_exhausted",
  NON_RETRYABLE_ERROR: "retry_non_retryable",
});

/**
 * Retry Reason Categories for analytics
 */
export const RETRY_REASON = Object.freeze({
  TIMEOUT: "timeout",
  RATE_LIMIT: "rate_limit",
  SERVER_ERROR: "server_error",
  NETWORK_ERROR: "network_error",
  UNKNOWN_ERROR: "unknown_error",
});

/**
 * Calculate exponential backoff delay with jitter
 *
 * Formula: min(BASE_DELAY * (MULTIPLIER ^ attempt) + jitter, MAX_DELAY)
 *
 * @param attempt - Current retry attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number): number {
  const exponentialDelay =
    RETRY_CONFIG.BASE_DELAY_MS *
    Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, attempt);
  const jitter = exponentialDelay * RETRY_CONFIG.JITTER_FACTOR * Math.random();
  const totalDelay = exponentialDelay + jitter;
  return Math.min(totalDelay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Determine if an error should trigger retry
 *
 * @param error - Error object from provider call
 * @returns True if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  // Check HTTP status codes
  if (typeof error === "object" && error !== null) {
    const err = error as {
      status?: number;
      statusCode?: number;
      code?: string;
    };

    // Check status code
    if (err.status || err.statusCode) {
      const status = err.status || err.statusCode;
      if (status && NON_RETRYABLE_STATUS_CODES.has(status)) {
        return false;
      }
      if (status && RETRYABLE_STATUS_CODES.has(status)) {
        return true;
      }
    }

    // Check error code (network errors)
    if (err.code && RETRYABLE_ERROR_TYPES.has(err.code)) {
      return true;
    }
  }

  // Default to retryable for unknown errors (conservative approach)
  return true;
}

/**
 * Categorize retry reason from error
 *
 * @param error - Error object from provider call
 * @returns Retry reason category
 */
export function categorizeRetryReason(error: unknown): string {
  if (!error) {
    return RETRY_REASON.UNKNOWN_ERROR;
  }

  if (typeof error === "object" && error !== null) {
    const err = error as {
      status?: number;
      statusCode?: number;
      code?: string;
      message?: string;
    };

    // Rate limiting
    if (err.status === 429 || err.statusCode === 429) {
      return RETRY_REASON.RATE_LIMIT;
    }

    // Timeout
    if (
      err.status === 408 ||
      err.statusCode === 408 ||
      err.code === "ETIMEDOUT"
    ) {
      return RETRY_REASON.TIMEOUT;
    }

    // Network errors
    if (err.code && RETRYABLE_ERROR_TYPES.has(err.code)) {
      return RETRY_REASON.NETWORK_ERROR;
    }

    // Server errors
    if (err.status && err.status >= 500 && err.status <= 599) {
      return RETRY_REASON.SERVER_ERROR;
    }
    if (err.statusCode && err.statusCode >= 500 && err.statusCode <= 599) {
      return RETRY_REASON.SERVER_ERROR;
    }
  }

  return RETRY_REASON.UNKNOWN_ERROR;
}
