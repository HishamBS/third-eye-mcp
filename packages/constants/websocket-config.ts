/**
 * WebSocket Configuration Constants - SSOT for all WebSocket timing
 *
 * R01 (SSOT/DRY): All WebSocket configuration centralized here
 * R13 (No Magic Numbers): Zero hardcoded WebSocket values in implementation
 */

/**
 * WebSocket Reconnection Backoff Configuration
 * Used by both server and client for consistent reconnection behavior
 */
export const WEBSOCKET_BACKOFF_MS = Object.freeze([
  1000, // 1 second
  2000, // 2 seconds
  4000, // 4 seconds
  8000, // 8 seconds
  12000, // 12 seconds
  16000, // 16 seconds
  20000, // 20 seconds
  24000, // 24 seconds (max)
] as const);

/**
 * WebSocket Heartbeat Configuration
 */
export const WEBSOCKET_HEARTBEAT = Object.freeze({
  /** Interval between ping messages (ms) */
  PING_INTERVAL_MS: 30000, // 30 seconds

  /** Timeout waiting for pong response (ms) */
  PONG_TIMEOUT_MS: 45000, // 45 seconds

  /** Random jitter to add to backoff (max ms) */
  BACKOFF_JITTER_MAX_MS: 500,

  /** Maximum reconnection attempts before giving up */
  MAX_RECONNECT_ATTEMPTS: 8,
});

/**
 * WebSocket Connection Cleanup Configuration
 */
export const WEBSOCKET_CLEANUP = Object.freeze({
  /** Threshold for considering a connection stale (ms) */
  STALE_THRESHOLD_MS: 30 * 60 * 1000, // 30 minutes

  /** Threshold for "recent activity" indicator (ms) */
  RECENT_ACTIVITY_THRESHOLD_MS: 60000, // 1 minute
});

/**
 * Get the backoff delay for a given retry attempt
 * @param attempt - Zero-indexed retry attempt number
 * @returns Delay in milliseconds
 */
export function getWebSocketBackoffDelay(attempt: number): number {
  const index = Math.min(attempt, WEBSOCKET_BACKOFF_MS.length - 1);
  const baseDelay = WEBSOCKET_BACKOFF_MS[index];
  const jitter = Math.floor(Math.random() * WEBSOCKET_HEARTBEAT.BACKOFF_JITTER_MAX_MS);
  return baseDelay + jitter;
}

/**
 * WebSocket backoff array with initial zero delay (for hooks that need immediate first attempt)
 */
export const WEBSOCKET_BACKOFF_WITH_IMMEDIATE = Object.freeze([
  0,
  ...WEBSOCKET_BACKOFF_MS,
] as const);
