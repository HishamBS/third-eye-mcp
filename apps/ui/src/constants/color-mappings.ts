/**
 * Color Mapping Constants
 *
 * SSOT for semantic color token mappings.
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for UI state → theme token mappings.
 * - All components MUST use these constants instead of literal Tailwind colors
 * - NEVER use literal colors like 'text-red-400', 'bg-blue-500/10', etc.
 * - This eliminates 200+ hardcoded color violations across the codebase
 *
 * Architecture:
 * - Maps UI states/statuses to semantic theme tokens (defined in @third-eye/theme)
 * - Theme tokens resolve to CSS variables at build time via tailwind-generator.ts
 * - Ensures consistent theming and prevents color drift
 */

/**
 * Status color mappings for text elements
 * Use these for status indicators, badges, messages, etc.
 */
export const STATUS_TEXT_COLORS = {
  error: 'text-semantic-error',
  success: 'text-semantic-success',
  warning: 'text-semantic-warning',
  info: 'text-semantic-info',
  muted: 'text-semantic-muted',
  pending: 'text-semantic-muted',
  running: 'text-semantic-info',
  completed: 'text-semantic-success',
  failed: 'text-semantic-error',
  idle: 'text-semantic-muted',
  active: 'text-brand-primary',
} as const;

/**
 * Status color mappings for background elements
 * Use these for status backgrounds, cards, notifications, etc.
 */
export const STATUS_BG_COLORS = {
  error: 'bg-semantic-error',
  success: 'bg-semantic-success',
  warning: 'bg-semantic-warning',
  info: 'bg-semantic-info',
  muted: 'bg-semantic-muted',
  pending: 'bg-brand-paper-elev',
  running: 'bg-semantic-info',
  completed: 'bg-semantic-success',
  failed: 'bg-semantic-error',
  idle: 'bg-brand-paper',
  active: 'bg-brand-primary',
} as const;

/**
 * Status color mappings for backgrounds with opacity
 * Use these for subtle status indicators, hover states, etc.
 */
export const STATUS_BG_COLORS_SUBTLE = {
  error: 'bg-semantic-error/10',
  success: 'bg-semantic-success/10',
  warning: 'bg-semantic-warning/10',
  info: 'bg-semantic-info/10',
  muted: 'bg-semantic-muted/10',
  pending: 'bg-brand-outline/10',
  running: 'bg-semantic-info/10',
  completed: 'bg-semantic-success/10',
  failed: 'bg-semantic-error/10',
  idle: 'bg-brand-paper-elev/10',
  active: 'bg-brand-primary/10',
} as const;

/**
 * Status color mappings for border elements
 * Use these for status borders, outlines, dividers, etc.
 */
export const STATUS_BORDER_COLORS = {
  error: 'border-semantic-error',
  success: 'border-semantic-success',
  warning: 'border-semantic-warning',
  info: 'border-semantic-info',
  muted: 'border-semantic-muted',
  pending: 'border-brand-outline',
  running: 'border-semantic-info',
  completed: 'border-semantic-success',
  failed: 'border-semantic-error',
  idle: 'border-brand-outline',
  active: 'border-brand-primary',
} as const;

/**
 * Status color mappings for borders with opacity
 * Use these for subtle borders, hover states, etc.
 */
export const STATUS_BORDER_COLORS_SUBTLE = {
  error: 'border-semantic-error/50',
  success: 'border-semantic-success/50',
  warning: 'border-semantic-warning/50',
  info: 'border-semantic-info/50',
  muted: 'border-semantic-muted/50',
  pending: 'border-brand-outline/30',
  running: 'border-semantic-info/50',
  completed: 'border-semantic-success/50',
  failed: 'border-semantic-error/50',
  idle: 'border-brand-outline/30',
  active: 'border-brand-primary/50',
} as const;

/**
 * Type definitions for type-safe status access
 */
export type StatusType = keyof typeof STATUS_TEXT_COLORS;

/**
 * Helper function to get all color classes for a status
 * Returns: { text, bg, bgSubtle, border, borderSubtle }
 */
export function getStatusColors(status: StatusType) {
  return {
    text: STATUS_TEXT_COLORS[status],
    bg: STATUS_BG_COLORS[status],
    bgSubtle: STATUS_BG_COLORS_SUBTLE[status],
    border: STATUS_BORDER_COLORS[status],
    borderSubtle: STATUS_BORDER_COLORS_SUBTLE[status],
  };
}

/**
 * Legacy color class mappings for migration
 * These map old literal Tailwind classes to new semantic tokens
 * Use this for batch replacement scripts
 */
export const LEGACY_COLOR_MIGRATION_MAP = {
  // Text colors
  'text-red-400': STATUS_TEXT_COLORS.error,
  'text-red-500': STATUS_TEXT_COLORS.error,
  'text-rose-400': STATUS_TEXT_COLORS.error,
  'text-rose-500': STATUS_TEXT_COLORS.error,
  'text-green-400': STATUS_TEXT_COLORS.success,
  'text-green-500': STATUS_TEXT_COLORS.success,
  'text-emerald-400': STATUS_TEXT_COLORS.success,
  'text-emerald-500': STATUS_TEXT_COLORS.success,
  'text-yellow-400': STATUS_TEXT_COLORS.warning,
  'text-yellow-500': STATUS_TEXT_COLORS.warning,
  'text-amber-400': STATUS_TEXT_COLORS.warning,
  'text-amber-500': STATUS_TEXT_COLORS.warning,
  'text-blue-400': STATUS_TEXT_COLORS.info,
  'text-blue-500': STATUS_TEXT_COLORS.info,
  'text-purple-400': STATUS_TEXT_COLORS.info,
  'text-purple-500': STATUS_TEXT_COLORS.info,
  'text-gray-400': STATUS_TEXT_COLORS.muted,
  'text-gray-500': STATUS_TEXT_COLORS.muted,
  'text-slate-400': STATUS_TEXT_COLORS.muted,
  'text-slate-500': STATUS_TEXT_COLORS.muted,

  // Background colors
  'bg-red-500': STATUS_BG_COLORS.error,
  'bg-red-600': STATUS_BG_COLORS.error,
  'bg-green-500': STATUS_BG_COLORS.success,
  'bg-green-600': STATUS_BG_COLORS.success,
  'bg-yellow-500': STATUS_BG_COLORS.warning,
  'bg-yellow-600': STATUS_BG_COLORS.warning,
  'bg-blue-500': STATUS_BG_COLORS.info,
  'bg-blue-600': STATUS_BG_COLORS.info,
  'bg-purple-500': STATUS_BG_COLORS.info,
  'bg-purple-600': STATUS_BG_COLORS.info,
  'bg-slate-700': 'bg-brand-paper',
  'bg-slate-800': 'bg-brand-paper',
  'bg-slate-900': 'bg-brand-paper',

  // Background colors with opacity
  'bg-red-500/10': STATUS_BG_COLORS_SUBTLE.error,
  'bg-green-500/10': STATUS_BG_COLORS_SUBTLE.success,
  'bg-yellow-500/10': STATUS_BG_COLORS_SUBTLE.warning,
  'bg-blue-500/10': STATUS_BG_COLORS_SUBTLE.info,
  'bg-purple-500/10': STATUS_BG_COLORS_SUBTLE.info,

  // Border colors
  'border-red-500': STATUS_BORDER_COLORS.error,
  'border-green-500': STATUS_BORDER_COLORS.success,
  'border-yellow-500': STATUS_BORDER_COLORS.warning,
  'border-blue-500': STATUS_BORDER_COLORS.info,
  'border-purple-500': STATUS_BORDER_COLORS.info,

  // Border colors with opacity
  'border-red-500/50': STATUS_BORDER_COLORS_SUBTLE.error,
  'border-green-500/50': STATUS_BORDER_COLORS_SUBTLE.success,
  'border-yellow-500/50': STATUS_BORDER_COLORS_SUBTLE.warning,
  'border-blue-500/50': STATUS_BORDER_COLORS_SUBTLE.info,
  'border-purple-500/50': STATUS_BORDER_COLORS_SUBTLE.info,
  'border-red-500/30': STATUS_BORDER_COLORS_SUBTLE.error,
  'border-green-500/30': STATUS_BORDER_COLORS_SUBTLE.success,
  'border-blue-500/30': STATUS_BORDER_COLORS_SUBTLE.info,
} as const;
