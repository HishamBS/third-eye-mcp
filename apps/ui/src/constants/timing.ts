/**
 * Timing Constants
 *
 * SSOT for all timing-related values (delays, durations, intervals).
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for timing values.
 * - All setTimeout/setInterval MUST use these constants
 * - All animation durations MUST use these tokens
 * - NEVER use magic numbers like setTimeout(fn, 5000) or duration-200
 * - This eliminates 28 magic number violations across the codebase
 *
 * Architecture:
 * - Centralized timing values ensure consistency
 * - Named constants improve code readability
 * - Easy to adjust UX timing globally
 */

/**
 * Timeout durations in milliseconds
 * Use these for setTimeout/setInterval calls
 */
export const TIMING = {
  /**
   * Auto-dismiss duration for error/success messages
   * Used in: models, connections, eyes, settings, prompts pages
   */
  MESSAGE_AUTO_DISMISS_MS: 5000,

  /**
   * Delay before page reload (allows user to see success message)
   * Used in: settings page
   */
  RELOAD_DELAY_MS: 2000,

  /**
   * Duration to show "Copied!" feedback
   * Used in: connections page
   */
  COPY_FEEDBACK_MS: 2000,

  /**
   * Duration to show delete success message
   * Used in: SessionSelector component
   */
  DELETE_SUCCESS_MS: 3000,

  /**
   * Delay for modal entrance animations
   * Used in: WelcomeModal component
   */
  MODAL_ANIMATION_MS: 500,

  /**
   * Debounce delay for polling/refresh operations
   * Used in: SessionSelector component
   */
  POLL_DEBOUNCE_MS: 300,

  /**
   * Retry delay for polling after operations
   * Used in: SessionSelector component
   */
  POLL_RETRY_MS: 500,

  /**
   * Auto-save delay for routing changes
   * Used in: models page
   */
  AUTO_SAVE_DELAY_MS: 1500,
} as const;

/**
 * Animation duration class names
 * Use these for Tailwind duration-* classes
 *
 * Usage:
 * - className={ANIMATION_DURATION.FAST} instead of className="duration-200"
 * - className={`transition ${ANIMATION_DURATION.NORMAL}`}
 */
export const ANIMATION_DURATION = {
  /**
   * Fast animations (200ms)
   * Use for: quick interactions like hover, focus, button presses
   */
  FAST: "duration-200",

  /**
   * Normal animations (300ms)
   * Use for: standard transitions, modal entrances, tab switches
   */
  NORMAL: "duration-300",

  /**
   * Slow animations (500ms)
   * Use for: smooth, noticeable changes like page transitions, complex transforms
   */
  SLOW: "duration-500",
} as const;

/**
 * Type definitions for type-safe timing access
 */
export type TimingKey = keyof typeof TIMING;
export type AnimationDurationKey = keyof typeof ANIMATION_DURATION;
