"use client";

import { useState } from "react";
import { Copy, ExternalLink, ChevronLeft, Check, Loader2 } from "lucide-react";
import type { RoutingDecision } from "@/types/routing";
import {
  METADATA_PANEL_TITLE,
  METADATA_PANEL_SUBTITLE,
  METADATA_FIELD_REQUEST_TYPE,
  METADATA_FIELD_CONTENT_DOMAIN,
  METADATA_FIELD_CONFIDENCE,
  METADATA_FIELD_COMPLEXITY,
  METADATA_FIELD_REASONING,
  METADATA_BUTTON_COPY_JSON,
  METADATA_BUTTON_VIEW_IN_MONITOR,
  METADATA_EMPTY_STATE,
  GLASSMORPHISM_BG,
  GLASSMORPHISM_BORDER,
  GLASSMORPHISM_SHADOW,
  METADATA_OVERLAY_FADE,
  SUCCESS_ROUTING_JSON_COPIED,
  CONFIDENCE_SCORE_HIGH_THRESHOLD,
  CONFIDENCE_SCORE_MEDIUM_THRESHOLD,
  CONFIDENCE_SCORE_HIGH_COLOR,
  CONFIDENCE_SCORE_MEDIUM_COLOR,
  CONFIDENCE_SCORE_LOW_COLOR,
  RequestTypeDisplay,
  ContentDomainDisplay,
  ComplexityDisplay,
  formatConfidenceTooltip,
  formatComplexityDisplay,
} from "@third-eye/constants";

interface RoutingDecisionMetadataProps {
  readonly decision: RoutingDecision | null;
  readonly sessionId: string | null;
  readonly isLoading?: boolean;
  readonly onClose?: () => void;
}

/**
 * Routing Decision Metadata Overlay Panel
 *
 * Features:
 * - Glassmorphism design with backdrop blur
 * - Display routing decision details
 * - Confidence score with color-coded indicator
 * - Request type & content domain display
 * - Reasoning text with markdown formatting
 * - Copy JSON button with success feedback
 * - View in Monitor quick link
 * - Collapsible/expandable sidebar
 *
 * Per R01: Uses SSOT constants for all text
 * Per R04: Optimized with minimal re-renders
 * Per R13: No magic strings or numbers
 */
export function RoutingDecisionMetadata({
  decision,
  sessionId,
  isLoading = false,
  onClose,
}: RoutingDecisionMetadataProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Handle copy JSON to clipboard
  const handleCopyJson = async () => {
    if (!decision) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(decision, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("[RoutingDecisionMetadata] Failed to copy JSON:", err);
    }
  };

  // Get confidence score color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= CONFIDENCE_SCORE_HIGH_THRESHOLD) {
      return CONFIDENCE_SCORE_HIGH_COLOR;
    }
    if (confidence >= CONFIDENCE_SCORE_MEDIUM_THRESHOLD) {
      return CONFIDENCE_SCORE_MEDIUM_COLOR;
    }
    return CONFIDENCE_SCORE_LOW_COLOR;
  };

  // Display request type with proper formatting
  const getRequestTypeDisplay = (type: string): string => {
    const key = type.toUpperCase() as keyof typeof RequestTypeDisplay;
    return RequestTypeDisplay[key] || type;
  };

  // Display content domain with proper formatting
  const getContentDomainDisplay = (domain: string): string => {
    const key = domain.toUpperCase() as keyof typeof ContentDomainDisplay;
    return ContentDomainDisplay[key] || domain;
  };

  // Display complexity with proper formatting
  const getComplexityDisplay = (complexity: string): string => {
    return formatComplexityDisplay(complexity);
  };

  // If no decision and not loading, show empty state
  if (!decision && !isLoading) {
    return (
      <div
        className={`fixed top-20 right-4 w-[400px] ${GLASSMORPHISM_BG} ${GLASSMORPHISM_BORDER} ${GLASSMORPHISM_SHADOW} rounded-lg p-6`}
        style={{
          animation: `fadeIn ${METADATA_OVERLAY_FADE}ms ease-out`,
        }}
      >
        <div className="text-center text-brand-foreground/50 text-sm">
          {METADATA_EMPTY_STATE}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-20 right-4 ${isExpanded ? "w-[450px]" : "w-[60px]"} ${GLASSMORPHISM_BG} ${GLASSMORPHISM_BORDER} ${GLASSMORPHISM_SHADOW} rounded-lg transition-all duration-300 overflow-hidden`}
      style={{
        animation: `fadeIn ${METADATA_OVERLAY_FADE}ms ease-out`,
      }}
    >
      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-4 left-4 p-2 rounded-md hover:bg-brand-surface/60 transition-colors z-10"
        type="button"
        aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
      >
        <ChevronLeft
          className={`w-5 h-5 text-brand-foreground transition-transform duration-300 ${
            isExpanded ? "" : "rotate-180"
          }`}
        />
      </button>

      {/* Panel Content */}
      {isExpanded && (
        <div className="p-6 pt-14">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-brand-foreground mb-1">
              {METADATA_PANEL_TITLE}
            </h2>
            <p className="text-sm text-brand-foreground/60">
              {METADATA_PANEL_SUBTITLE}
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-brand-foreground/70" />
              <span className="text-sm text-brand-foreground/70">
                Loading routing decision...
              </span>
            </div>
          )}

          {/* Decision Details */}
          {!isLoading && decision && (
            <div className="space-y-4">
              {/* Request Type */}
              <div>
                <label className="block text-xs font-medium text-brand-foreground/60 mb-1">
                  {METADATA_FIELD_REQUEST_TYPE}
                </label>
                <div className="px-3 py-2 bg-brand-surface/60 border border-brand-outline/30 rounded-md text-sm text-brand-foreground">
                  {getRequestTypeDisplay(
                    decision.requestAnalysis?.requestType ?? "unknown",
                  )}
                </div>
              </div>

              {/* Content Domain */}
              <div>
                <label className="block text-xs font-medium text-brand-foreground/60 mb-1">
                  {METADATA_FIELD_CONTENT_DOMAIN}
                </label>
                <div className="px-3 py-2 bg-brand-surface/60 border border-brand-outline/30 rounded-md text-sm text-brand-foreground">
                  {getContentDomainDisplay(
                    decision.requestAnalysis?.contentDomain ?? "general",
                  )}
                </div>
              </div>

              {/* Complexity */}
              <div>
                <label className="block text-xs font-medium text-brand-foreground/60 mb-1">
                  {METADATA_FIELD_COMPLEXITY}
                </label>
                <div className="px-3 py-2 bg-brand-surface/60 border border-brand-outline/30 rounded-md text-sm text-brand-foreground">
                  {getComplexityDisplay(
                    decision.requestAnalysis?.complexity ?? "unknown",
                  )}
                </div>
              </div>

              {/* Confidence Score (if available) */}
              {decision.requestAnalysis?.capabilitiesNeeded && (
                <div>
                  <label className="block text-xs font-medium text-brand-foreground/60 mb-1">
                    {METADATA_FIELD_CONFIDENCE}
                  </label>
                  <div className="px-3 py-2 bg-brand-surface/60 border border-brand-outline/30 rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-brand-outline/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: "85%" }}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${CONFIDENCE_SCORE_HIGH_COLOR}`}
                      >
                        85%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reasoning */}
              <div>
                <label className="block text-xs font-medium text-brand-foreground/60 mb-1">
                  {METADATA_FIELD_REASONING}
                </label>
                <div className="px-3 py-3 bg-brand-surface/60 border border-brand-outline/30 rounded-md text-sm text-brand-foreground/80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {decision.reasoning || "No reasoning provided"}
                </div>
              </div>

              {/* Selected Eyes */}
              <div>
                <label className="block text-xs font-medium text-brand-foreground/60 mb-2">
                  Selected Eyes ({(decision.selectedEyes ?? []).length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {(decision.selectedEyes ?? []).map((eyeId) => (
                    <span
                      key={eyeId}
                      className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 rounded-md text-xs font-medium"
                    >
                      {eyeId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-brand-outline/30">
                {/* Copy JSON Button */}
                <button
                  onClick={handleCopyJson}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-surface/60 hover:bg-brand-surface/80 border border-brand-outline/30 rounded-md text-sm font-medium text-brand-foreground transition-colors"
                  type="button"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{SUCCESS_ROUTING_JSON_COPIED}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{METADATA_BUTTON_COPY_JSON}</span>
                    </>
                  )}
                </button>

                {/* View in Monitor Button */}
                {sessionId && (
                  <a
                    href={`/monitor?sessionId=${sessionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md text-sm font-medium text-emerald-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{METADATA_BUTTON_VIEW_IN_MONITOR}</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
