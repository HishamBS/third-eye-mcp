/**
 * Timing Configuration Constants - SSOT for all timing-related values
 *
 * R01 (SSOT/DRY): All timing configuration centralized here
 * R13 (No Magic Numbers): Zero hardcoded timing values in implementation
 */

/**
 * Request Timeouts
 */
export const REQUEST_TIMEOUTS = Object.freeze({
  /** Default HTTP request timeout (ms) */
  DEFAULT_MS: 30000, // 30 seconds

  /** Provider API call timeout (ms) */
  PROVIDER_MS: 120000, // 2 minutes

  /** Pipeline execution timeout (ms) */
  PIPELINE_EXECUTION_MS: 30000, // 30 seconds
});

/**
 * UI Message Display Durations
 */
export const MESSAGE_DURATIONS = Object.freeze({
  /** Auto-dismiss duration for success/error messages (ms) */
  AUTO_DISMISS_MS: 5000,

  /** Duration to show "Copied!" feedback (ms) */
  COPY_FEEDBACK_MS: 2000,

  /** Duration to show delete success message (ms) */
  DELETE_SUCCESS_MS: 3000,

  /** Toast notification duration (ms) */
  TOAST_MS: 5000,

  /** Session notifier message duration (ms) */
  SESSION_NOTIFY_MS: 8000,

  /** Short feedback duration (ms) */
  SHORT_FEEDBACK_MS: 4000,
});

/**
 * Animation and Transition Durations (milliseconds)
 */
export const ANIMATION_DURATIONS = Object.freeze({
  /** Fast animations - hover, focus, button presses (ms) */
  FAST_MS: 200,

  /** Normal animations - modal entrances, tab switches (ms) */
  NORMAL_MS: 300,

  /** Slow animations - page transitions, complex transforms (ms) */
  SLOW_MS: 500,

  /** Modal entrance animation delay (ms) */
  MODAL_ENTRANCE_MS: 500,

  /** Reload delay after settings change (ms) */
  RELOAD_DELAY_MS: 2000,
});

/**
 * Animation Duration CSS Classes (Tailwind)
 * For use in className props
 */
export const ANIMATION_CLASSES = Object.freeze({
  /** Fast (200ms) - duration-200 */
  FAST: "duration-200",

  /** Normal (300ms) - duration-300 */
  NORMAL: "duration-300",

  /** Slow (500ms) - duration-500 */
  SLOW: "duration-500",
});

/**
 * Latency Performance Thresholds
 * Used for scoring and display
 */
export const LATENCY_THRESHOLDS = Object.freeze({
  /** Fast response threshold (ms) - Under 1s = excellent */
  FAST_MS: 1000,

  /** Moderate response threshold (ms) - 1-3s = good */
  MODERATE_MS: 3000,

  /** Slow response threshold (ms) - 3-5s = acceptable */
  SLOW_MS: 5000,

  // Above 5s = poor
});

/**
 * Cache Time-To-Live Durations (Server-Side)
 */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes - default response cache TTL
export const HEALTH_CHECK_CACHE_TTL_MS = 5_000; // 5 seconds - health check result cache

/**
 * Time Window Durations
 */
export const TIME_WINDOWS = Object.freeze({
  /** 24 hours in milliseconds */
  DAY_MS: 24 * 60 * 60 * 1000,

  /** 1 hour in milliseconds */
  HOUR_MS: 60 * 60 * 1000,

  /** 1 minute in milliseconds */
  MINUTE_MS: 60 * 1000,

  /** Intent confirmation expiry (ms) */
  INTENT_EXPIRY_MS: 3600000, // 1 hour

  /** Pause/resume expiry default (ms) */
  PAUSE_EXPIRY_MS: 3600000, // 1 hour
});
