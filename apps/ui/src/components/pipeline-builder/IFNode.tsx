"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitMerge, Check, X } from "lucide-react";
import type { IfNodeConfig } from "@third-eye/types";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { ANIMATION_DURATION } from "@/constants/timing";

/**
 * IF Node Data Structure
 * Binary branching (true/false paths)
 */
export interface IFNodeData {
  label?: string;
  ifConfig?: IfNodeConfig;
  customConfig?: Record<string, unknown>;
}

/**
 * Custom IF Node Component for React Flow
 *
 * Features:
 * - Binary branching (true/false)
 * - Visual true/false labels on handles
 * - Condition preview (on selected)
 * - Theme-aware styling
 *
 * Per R01: Uses centralized color/timing constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 */
function IFNodeComponent({ data, selected, dragging }: NodeProps<IFNodeData>) {
  const { label = "IF", ifConfig } = data;

  const trueLabel = ifConfig?.trueLabel ?? "True";
  const falseLabel = ifConfig?.falseLabel ?? "False";
  const hasCondition = !!ifConfig?.condition;

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 bg-brand-paper p-4
        transition-all ${ANIMATION_DURATION.FAST} ease-in-out
        ${selected ? `border-dashed shadow-2xl ${STATUS_TEXT_COLORS.warning}` : "border-solid shadow-lg border-brand-outline"}
        ${dragging ? "cursor-grabbing opacity-80" : "cursor-grab opacity-100"}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.warning}`}
      />

      {/* Icon & Title */}
      <div className="flex items-center gap-2 mb-2">
        <GitMerge className={`w-5 h-5 ${STATUS_TEXT_COLORS.warning}`} />
        <div className="font-semibold text-base text-brand-foreground">
          {label}
        </div>
      </div>

      {/* Binary Branching Indicator */}
      <div
        className={`text-center text-xs uppercase tracking-wider font-medium mb-1 ${STATUS_TEXT_COLORS.warning}`}
      >
        Conditional
      </div>

      {/* Condition Preview (shown when selected) */}
      {selected && hasCondition && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40">
          <div className="text-xs font-medium text-semantic-muted mb-1">
            Condition:
          </div>
          <div className="text-xs text-brand-foreground font-mono bg-brand-surface rounded px-2 py-1 truncate">
            {typeof ifConfig.condition === "string"
              ? ifConfig.condition.slice(0, 40)
              : JSON.stringify(ifConfig.condition).slice(0, 40)}
            {ifConfig.condition.length > 40 && "..."}
          </div>
        </div>
      )}

      {/* True Output Handle (top) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-true"
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.success}`}
        style={{ top: "35%", transform: "translateY(-50%)" }}
      >
        <div
          className={`
            absolute right-full mr-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
            bg-brand-surface border border-brand-outline shadow-sm
            flex items-center gap-1 text-semantic-success
          `}
          style={{ top: "50%", transform: "translateY(-50%)" }}
        >
          <Check className="w-3 h-3" />
          <span>{trueLabel}</span>
        </div>
      </Handle>

      {/* False Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-false"
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.error}`}
        style={{ top: "65%", transform: "translateY(-50%)" }}
      >
        <div
          className={`
            absolute right-full mr-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
            bg-brand-surface border border-brand-outline shadow-sm
            flex items-center gap-1 text-semantic-error
          `}
          style={{ top: "50%", transform: "translateY(-50%)" }}
        >
          <X className="w-3 h-3" />
          <span>{falseLabel}</span>
        </div>
      </Handle>
    </div>
  );
}

/**
 * Memoized IF Node (Performance optimization per R04)
 */
export const IFNode = memo(IFNodeComponent);
IFNode.displayName = "IFNode";
