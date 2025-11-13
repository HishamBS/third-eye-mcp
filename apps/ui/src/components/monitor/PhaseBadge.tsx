/**
 * PhaseBadge Component - Phase 18
 *
 * Displays phase (GUIDANCE or VALIDATION) with color-coded styling
 * Per R04: Memoized for performance
 * Per R07: Strict typing
 * Per R13: All styling and text from SSOT
 */

import { memo } from "react";
import {
  EyeStageToken,
  EYE_STAGE_LABELS,
  PHASE_BADGE_COLORS,
  PHASE_BADGE_TEXT,
} from "@third-eye/constants";

export interface PhaseBadgeProps {
  readonly stage: "guidance" | "validation";
  readonly size?: "sm" | "md";
}

/**
 * Get EyeStageToken from string literal
 * Per R07: Type-safe mapping
 */
function getStageToken(stage: "guidance" | "validation"): EyeStageToken {
  return stage === "guidance"
    ? EyeStageToken.GUIDANCE
    : EyeStageToken.VALIDATION;
}

/**
 * Get aria-label for accessibility
 * Per R13: Text from SSOT
 */
function getAriaLabel(stage: "guidance" | "validation"): string {
  return stage === "guidance"
    ? PHASE_BADGE_TEXT.GUIDANCE_ARIA_LABEL
    : PHASE_BADGE_TEXT.VALIDATION_ARIA_LABEL;
}

/**
 * Phase badge component with color coding
 */
export const PhaseBadge = memo(function PhaseBadge({
  stage,
  size = "sm",
}: PhaseBadgeProps) {
  const stageToken = getStageToken(stage);
  const label = EYE_STAGE_LABELS[stageToken];
  const colorClasses = PHASE_BADGE_COLORS[stageToken];
  const ariaLabel = getAriaLabel(stage);

  const sizeClasses =
    size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wide ${colorClasses} ${sizeClasses}`}
      aria-label={ariaLabel}
      role="status"
    >
      {label}
    </span>
  );
});
