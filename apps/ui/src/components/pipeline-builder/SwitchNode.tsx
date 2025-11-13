"use client";

import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { GitBranch, AlertCircle } from "lucide-react";
import type { SwitchNodeConfig } from "@third-eye/types";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { ANIMATION_DURATION } from "@/constants/timing";

/**
 * Switch Node Data Structure
 * N8N-style multi-way routing with dynamic output handles
 */
export interface SwitchNodeData {
  label?: string;
  switchConfig?: SwitchNodeConfig;
  customConfig?: Record<string, unknown>;
}

/**
 * Calculate output handle positions based on count
 * Distributes handles evenly along the right side
 */
function calculateHandlePositions(outputCount: number): number[] {
  if (outputCount === 0) return [];
  if (outputCount === 1) return [50]; // Center

  // Distribute evenly with padding
  const padding = 15; // percentage from top/bottom
  const usableRange = 100 - padding * 2;
  const step = usableRange / (outputCount - 1);

  return Array.from({ length: outputCount }, (_, i) => padding + i * step);
}

/**
 * Custom Switch Node Component for React Flow
 *
 * Features:
 * - Dynamic output handles based on rules/configuration
 * - Visual rule labels on handles
 * - Mode indicator (rules vs expression)
 * - Expandable rule list (on selected)
 * - Theme-aware styling
 *
 * Per R01: Uses centralized color/timing constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 */
function SwitchNodeComponent({
  data,
  selected,
  dragging,
}: NodeProps<SwitchNodeData>) {
  const { label = "Switch", switchConfig } = data;

  // Calculate output count and positions
  const outputCount = useMemo(() => {
    if (!switchConfig) return 3; // Default 3 outputs

    if (switchConfig.mode === "rules") {
      const rulesCount = switchConfig.rules?.length ?? 0;
      const hasFallback = switchConfig.fallbackOutput !== undefined;
      return Math.max(rulesCount + (hasFallback ? 1 : 0), 1);
    }

    // Expression mode - get max output index from expression hint or default
    return 3; // Default for expression mode
  }, [switchConfig]);

  const handlePositions = useMemo(
    () => calculateHandlePositions(outputCount),
    [outputCount],
  );

  // Get rule labels for handles
  const ruleLabels = useMemo(() => {
    if (!switchConfig || switchConfig.mode !== "rules") return [];

    const labels = (switchConfig.rules ?? []).map((r) => r.label);
    if (switchConfig.fallbackOutput !== undefined) {
      labels.push("Fallback");
    }
    return labels;
  }, [switchConfig]);

  const hasValidConfig = !!switchConfig;
  const mode = switchConfig?.mode ?? "rules";

  return (
    <div
      className={`
        relative min-w-[200px] rounded-lg border-2 bg-brand-paper p-4
        transition-all ${ANIMATION_DURATION.FAST} ease-in-out
        ${selected ? `border-dashed shadow-2xl ${STATUS_TEXT_COLORS.info}` : "border-solid shadow-lg border-brand-outline"}
        ${dragging ? "cursor-grabbing opacity-80" : "cursor-grab opacity-100"}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.info}`}
      />

      {/* Icon & Title */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className={`w-5 h-5 ${STATUS_TEXT_COLORS.info}`} />
        <div className="font-semibold text-base text-brand-foreground">
          {label}
        </div>
      </div>

      {/* Mode Badge */}
      <div
        className={`text-center text-xs uppercase tracking-wider font-medium mb-1 ${STATUS_TEXT_COLORS.info}`}
      >
        {mode} mode
      </div>

      {/* Config Warning */}
      {!hasValidConfig && (
        <div className="flex items-center gap-1 mt-2 text-xs text-semantic-warning">
          <AlertCircle className="w-3 h-3" />
          <span>No config</span>
        </div>
      )}

      {/* Rules List (shown when selected in rules mode) */}
      {selected && mode === "rules" && ruleLabels.length > 0 && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40 space-y-1">
          <div className="text-xs font-medium text-semantic-muted mb-1">
            Rules:
          </div>
          {ruleLabels.map((ruleLabel, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${STATUS_BG_COLORS_SUBTLE.info}`}
              />
              <span className="text-brand-foreground truncate">
                {ruleLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Expression Info (shown when selected in expression mode) */}
      {selected && mode === "expression" && switchConfig?.expression && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40">
          <div className="text-xs font-medium text-semantic-muted mb-1">
            Expression:
          </div>
          <div className="text-xs text-brand-foreground font-mono bg-brand-surface rounded px-2 py-1 truncate">
            {typeof switchConfig.expression === "string"
              ? switchConfig.expression.slice(0, 50)
              : JSON.stringify(switchConfig.expression).slice(0, 50)}
            {switchConfig.expression.length > 50 && "..."}
          </div>
        </div>
      )}

      {/* Output Handles (dynamic count) */}
      {handlePositions.map((topPercent, idx) => (
        <Handle
          key={`output-${idx}`}
          type="source"
          position={Position.Right}
          id={`output-${idx}`}
          className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.info}`}
          style={{ top: `${topPercent}%`, transform: "translateY(-50%)" }}
        >
          {/* Handle Label (visible on hover/selected) */}
          {(selected || true) && ruleLabels[idx] && (
            <div
              className={`
                absolute right-full mr-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
                bg-brand-surface border border-brand-outline shadow-sm
                text-brand-foreground
              `}
              style={{ top: "50%", transform: "translateY(-50%)" }}
            >
              {ruleLabels[idx]}
            </div>
          )}
        </Handle>
      ))}

      {/* Output Count Indicator */}
      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-xs font-bold shadow-md">
        {outputCount}
      </div>
    </div>
  );
}

/**
 * Memoized Switch Node (Performance optimization per R04)
 */
export const SwitchNode = memo(SwitchNodeComponent);
SwitchNode.displayName = "SwitchNode";
