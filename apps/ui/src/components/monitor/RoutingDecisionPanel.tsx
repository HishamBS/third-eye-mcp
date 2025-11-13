"use client";

/**
 * Routing Decision Panel - Phase 17
 *
 * Displays Overseer's dynamic routing decisions with:
 * - Suggested Eye sequence
 * - Rationale per Eye
 * - Confidence score
 * - Stage indicators (GUIDANCE/VALIDATION)
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing
 * Per R13: All text from SSOT constants
 */

import { memo } from "react";
import { GlassCard } from "../ui/GlassCard";
import { EyeIcon } from "../EyeIcon";
import { Route, ArrowRight, Info, Zap } from "lucide-react";
import type { EyeSequence, EyeRouteStep } from "@third-eye/eyes";
import type { EyeName } from "@third-eye/types";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * Props for RoutingDecisionPanel
 */
interface RoutingDecisionPanelProps {
  readonly routing: EyeSequence | null;
  readonly sessionId?: string;
}

/**
 * Get stage badge color
 */
function getStageBadgeClass(stage: EyeRouteStep["stage"]): string {
  switch (stage) {
    case "guidance":
      return "${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} ${STATUS_BORDER_COLORS_SUBTLE.info}";
    case "validation":
      return "${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success} ${STATUS_BORDER_COLORS_SUBTLE.success}";
    case "both":
      return "${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} ${STATUS_BORDER_COLORS_SUBTLE.info}";
    default:
      return "${STATUS_BG_COLORS_SUBTLE.idle} text-semantic-muted ${STATUS_BORDER_COLORS_SUBTLE.idle}";
  }
}

/**
 * Get confidence color based on score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "${STATUS_TEXT_COLORS.success}";
  if (confidence >= 0.6) return "${STATUS_TEXT_COLORS.warning}";
  return "${STATUS_TEXT_COLORS.error}";
}

/**
 * Routing Decision Panel Component
 */
export const RoutingDecisionPanel = memo(function RoutingDecisionPanel({
  routing,
  sessionId,
}: RoutingDecisionPanelProps) {
  if (!routing) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 text-semantic-muted">
          <Route className="w-5 h-5" />
          <span className="text-sm">No routing decision available</span>
        </div>
      </GlassCard>
    );
  }

  const confidencePercent = Math.round(routing.confidence * 100);

  return (
    <div className="space-y-4">
      {/* Header with Confidence */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Route className="w-6 h-6 text-brand-accent" />
            <div>
              <h3 className="text-lg font-semibold text-brand-foreground">
                Suggested Route
              </h3>
              <p className="text-sm text-semantic-muted">
                Overseer-determined optimal Eye sequence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-accent" />
            <span className="text-sm text-semantic-muted">Confidence:</span>
            <span
              className={`text-base font-semibold ${getConfidenceColor(routing.confidence)}`}
            >
              {confidencePercent}%
            </span>
          </div>
        </div>

        {/* Rationale */}
        {routing.rationale && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-primary/5 border border-brand-primary/20">
            <Info className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-brand-foreground/80 leading-relaxed">
              {routing.rationale}
            </p>
          </div>
        )}

        {/* Estimated Duration */}
        {routing.estimatedDuration && (
          <div className="mt-3 text-sm text-semantic-muted">
            Estimated duration: ~{Math.round(routing.estimatedDuration / 1000)}s
          </div>
        )}
      </GlassCard>

      {/* Eye Sequence */}
      <GlassCard className="p-6">
        <h4 className="text-sm font-semibold text-brand-foreground/80 uppercase tracking-wider mb-4">
          Eye Sequence ({routing.eyes.length} steps)
        </h4>

        <div className="space-y-3">
          {routing.eyes.map((step, index) => {
            const eyeName = step.eyeId as EyeName;
            // Use displayName from step if provided (from DB), otherwise use eyeId
            const displayName = step.displayName || step.eyeId;
            const isLast = index === routing.eyes.length - 1;

            return (
              <div key={`${step.eyeId}-${step.order}`} className="space-y-2">
                {/* Eye Step Card */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-brand-paperElev border border-brand-outline hover:border-brand-accent/40 transition-colors">
                  {/* Step Number */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center">
                    <span className="text-sm font-semibold text-brand-accent">
                      {step.order + 1}
                    </span>
                  </div>

                  {/* Eye Icon */}
                  <div className="flex-shrink-0">
                    <EyeIcon eye={eyeName} size={32} />
                  </div>

                  {/* Eye Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-brand-foreground">
                        {displayName}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getStageBadgeClass(step.stage)}`}
                      >
                        {step.stage.toUpperCase()}
                      </span>
                    </div>
                    {step.reason && (
                      <p className="text-sm text-semantic-muted line-clamp-2">
                        {step.reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Arrow to next step */}
                {!isLast && (
                  <div className="flex justify-center">
                    <ArrowRight className="w-5 h-5 text-brand-foreground/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
});
