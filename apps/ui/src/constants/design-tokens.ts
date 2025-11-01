/**
 * SSOT for ALL design system tokens
 *
 * PURPOSE: Centralized design system constants beyond theme colors.
 * These supplement theme colors from @third-eye/theme package.
 *
 * ARCHITECTURE:
 * - Theme colors: packages/theme/src/themes.ts (SSOT)
 * - Design tokens: This file (SSOT)
 * - NO hardcoded values in components - always import from here
 *
 * USAGE:
 * import { OVERLAY, SHADOW, GRADIENT, ANIMATION, Z_INDEX } from '@/constants/design-tokens';
 */

/**
 * Modal & Overlay backgrounds (theme-aware using CSS variables)
 * All overlays use theme colors with appropriate opacity
 */
export const OVERLAY = {
  modal: 'rgb(var(--color-ink) / 0.6)',
  dropdown: 'rgb(var(--color-ink) / 0.4)',
  tooltip: 'rgb(var(--color-ink) / 0.9)',
  sidebar: 'rgb(var(--color-ink) / 0.5)',
} as const;

/**
 * Shadow presets (theme-aware using CSS variables)
 * Uses --color-ink for theme-consistent shadows
 */
export const SHADOW = {
  sm: '0 1px 2px rgb(var(--color-ink) / 0.05)',
  md: '0 4px 6px rgb(var(--color-ink) / 0.1)',
  lg: '0 10px 15px rgb(var(--color-ink) / 0.15)',
  xl: '0 20px 25px rgb(var(--color-ink) / 0.2)',
  glass: '0 10px 30px rgb(var(--color-ink) / 0.35)',
  'glass-light': '0 10px 30px rgb(var(--color-ink) / 0.15)',
} as const;

/**
 * Gradient utility classes for Tailwind
 * Uses theme color classes (brand-*, semantic-*)
 */
export const GRADIENT = {
  brandPrimary: 'from-brand-primary via-brand-accent to-brand-primary',
  brandSubtle: 'from-brand-primary/20 via-brand-accent/10 to-transparent',
  success: 'from-semantic-success/10 to-semantic-success/5',
  error: 'from-semantic-error/10 to-semantic-error/5',
  info: 'from-semantic-info/10 to-semantic-info/5',
  warning: 'from-semantic-warning/10 to-semantic-warning/5',
  paperToInk: 'from-brand-paper via-brand-paper to-brand-ink',
} as const;

/**
 * Animation durations (milliseconds) and spring configs
 * For framer-motion and CSS transitions
 */
export const ANIMATION = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 1000,
  },
  spring: {
    default: { type: 'spring' as const, stiffness: 200, damping: 25 },
    soft: { type: 'spring' as const, stiffness: 100, damping: 20 },
    bouncy: { type: 'spring' as const, stiffness: 300, damping: 15 },
  },
} as const;

/**
 * Z-Index hierarchy
 * Prevents z-index conflicts across components
 */
export const Z_INDEX = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

/**
 * Backdrop blur values
 * For glassmorphism effects
 */
export const BACKDROP_BLUR = {
  none: 'blur(0px)',
  sm: 'blur(4px)',
  md: 'blur(12px)',
  lg: 'blur(16px)',
  xl: 'blur(24px)',
} as const;

/**
 * Toast notification styles (for react-hot-toast)
 * Uses theme CSS variables for consistent theming
 */
export const TOAST_STYLE = {
  background: 'rgb(var(--color-paper-elev) / 0.95)',
  border: '1px solid rgb(var(--color-outline) / 0.2)',
  backdropFilter: BACKDROP_BLUR.md,
  color: 'rgb(var(--color-ink))',
} as const;

/**
 * Modal overlay class
 * Theme-aware overlay for modals, drawers, and dialogs
 */
export const MODAL_OVERLAY_CLASS = 'bg-brand-ink/70' as const;

/**
 * Toggle switch knob class
 * Theme-aware knob color for toggle switches
 */
export const TOGGLE_KNOB_CLASS = 'bg-brand-foreground' as const;

/**
 * Evidence type colors (for EvidenceTrail component)
 * Maps evidence types to semantic theme colors
 */
export const EVIDENCE_COLORS = {
  citation: {
    verified: 'rgb(var(--color-info))',
    unverified: 'rgb(var(--color-muted))',
  },
  analysis: {
    verified: 'rgb(var(--color-primary))',
    unverified: 'rgb(var(--color-muted))',
  },
  validation: {
    verified: 'rgb(var(--color-success))',
    unverified: 'rgb(var(--color-error))',
  },
  contradiction: 'rgb(var(--color-warning))',
  fact: {
    verified: 'rgb(var(--color-success))',
    unverified: 'rgb(var(--color-error))',
  },
  default: 'rgb(var(--color-muted))',
} as const;

/**
 * Metric threshold colors
 * For performance metrics with success/warning/error states
 */
export const METRIC_COLORS = {
  success: 'rgb(var(--color-success))',
  warning: 'rgb(var(--color-warning))',
  error: 'rgb(var(--color-error))',
  info: 'rgb(var(--color-info))',
  primary: 'rgb(var(--color-primary))',
  accent: 'rgb(var(--color-accent))',
  muted: 'rgb(var(--color-muted))',
} as const;
