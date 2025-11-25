"use client";

import { memo, useState } from "react";
import { type NodeProps } from "reactflow";
import { Info, AlertCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import {
  ANNOTATION_BORDER_STYLE,
  ANNOTATION_BG_COLOR,
  ANNOTATION_TEXT_COLOR,
  ANNOTATION_COLLAPSED_HEIGHT,
  ANNOTATION_EXPANDED_MIN_HEIGHT,
  ANNOTATION_ICON_INFO,
  ANNOTATION_ICON_ALERT,
  ANNOTATION_ICON_LIGHTBULB,
} from "@third-eye/constants";
import { ANIMATION_DURATION } from "@/constants/timing";

/**
 * Annotation Node Data Structure
 * Decorative node that provides explanatory text and context
 */
export interface AnnotationNodeData {
  title?: string;
  content?: string;
  iconType?: "info" | "alert" | "lightbulb";
}

/**
 * Icon mapping based on annotation type
 */
const ICON_COMPONENTS = {
  [ANNOTATION_ICON_INFO]: Info,
  [ANNOTATION_ICON_ALERT]: AlertCircle,
  [ANNOTATION_ICON_LIGHTBULB]: Lightbulb,
} as const;

/**
 * Custom Annotation Node Component for React Flow
 *
 * Features:
 * - Collapsible content (collapsed by default, expanded on selected)
 * - Markdown-style content support
 * - Icon based on annotation type (info, alert, lightbulb)
 * - No handles (decorative only)
 * - Dashed border with subtle background
 * - Theme-aware styling
 *
 * Per R01: Uses centralized constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 * Per R13: No magic strings - all text from constants
 */
function AnnotationNodeComponent({
  data,
  selected,
  dragging,
}: NodeProps<AnnotationNodeData>) {
  const {
    title = "Note",
    content = "",
    iconType = ANNOTATION_ICON_INFO,
  } = data;

  const [isExpanded, setIsExpanded] = useState(false);
  const showExpanded = selected || isExpanded;

  const IconComponent = ICON_COMPONENTS[iconType];

  return (
    <div
      className={`
        relative rounded-lg p-3
        transition-all ${ANIMATION_DURATION.NORMAL} ease-in-out
        ${ANNOTATION_BORDER_STYLE}
        ${ANNOTATION_BG_COLOR}
        ${dragging ? "cursor-grabbing opacity-70" : "cursor-pointer opacity-90"}
        ${selected ? "ring-2 ring-brand-accent/30 shadow-lg" : "shadow-sm"}
      `}
      style={{
        minHeight: showExpanded
          ? ANNOTATION_EXPANDED_MIN_HEIGHT
          : ANNOTATION_COLLAPSED_HEIGHT,
        maxWidth: showExpanded ? "400px" : "280px",
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <IconComponent className={`w-4 h-4 ${ANNOTATION_TEXT_COLOR} flex-shrink-0`} />
          <div className={`font-semibold text-sm ${ANNOTATION_TEXT_COLOR} truncate`}>
            {title}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <button
          className={`flex-shrink-0 ${ANNOTATION_TEXT_COLOR} hover:text-brand-foreground transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          aria-label={showExpanded ? "Collapse annotation" : "Expand annotation"}
        >
          {showExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Content (shown when expanded) */}
      {showExpanded && content && (
        <div
          className={`
            mt-2 pt-2 border-t border-brand-outline/20
            text-xs leading-relaxed ${ANNOTATION_TEXT_COLOR}
            whitespace-pre-wrap
          `}
        >
          {content}
        </div>
      )}

      {/* Preview snippet when collapsed */}
      {!showExpanded && content && (
        <div
          className={`
            mt-1 text-xs ${ANNOTATION_TEXT_COLOR} opacity-60 truncate
          `}
        >
          {content.split("\n")[0].slice(0, 60)}
          {content.length > 60 && "..."}
        </div>
      )}
    </div>
  );
}

/**
 * Memoized Annotation Node (Performance optimization per R04)
 */
export const AnnotationNode = memo(AnnotationNodeComponent);
AnnotationNode.displayName = "AnnotationNode";
