'use client';

import { SKIP_LINK, ARIA_LABELS } from '@/constants/accessibility';

/**
 * SkipLink Component - Phase 20.1
 *
 * Provides keyboard users a way to skip navigation and jump to main content
 * Per WCAG 2.1 AA: Bypass Blocks (2.4.1)
 * Per R13: All text from SSOT
 */
export function SkipLink() {
  return (
    <a
      href={`#${SKIP_LINK.TARGET_ID}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-accent focus:text-white focus:rounded-lg focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      aria-label={ARIA_LABELS.SKIP_TO_CONTENT}
    >
      {SKIP_LINK.TEXT}
    </a>
  );
}
