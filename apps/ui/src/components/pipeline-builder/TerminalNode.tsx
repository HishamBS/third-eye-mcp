'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Flag, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE } from '@/constants/color-mappings';
import { ANIMATION_DURATION } from '@/constants/timing';

/**
 * Terminal Node Data Structure
 * Marks the end of pipeline execution with a final verdict
 */
export interface TerminalNodeData {
  label?: string;
  verdict?: string;
  customConfig?: Record<string, unknown>;
}

/**
 * Verdict color mappings
 * Maps verdicts to semantic colors
 */
const VERDICT_COLORS: Record<string, { text: string; bg: string; icon: typeof CheckCircle2 }> = {
  OK: { text: STATUS_TEXT_COLORS.success, bg: STATUS_BG_COLORS_SUBTLE.success, icon: CheckCircle2 },
  APPROVED: { text: STATUS_TEXT_COLORS.success, bg: STATUS_BG_COLORS_SUBTLE.success, icon: CheckCircle2 },
  NEEDS_CLARIFICATION: { text: STATUS_TEXT_COLORS.warning, bg: STATUS_BG_COLORS_SUBTLE.warning, icon: AlertCircle },
  NEEDS_REVISION: { text: STATUS_TEXT_COLORS.warning, bg: STATUS_BG_COLORS_SUBTLE.warning, icon: AlertCircle },
  AWAIT_CONFIRMATION: { text: STATUS_TEXT_COLORS.info, bg: STATUS_BG_COLORS_SUBTLE.info, icon: Clock },
  AWAIT_INPUT: { text: STATUS_TEXT_COLORS.info, bg: STATUS_BG_COLORS_SUBTLE.info, icon: Clock },
  AWAIT_AGENT_PLAN: { text: STATUS_TEXT_COLORS.info, bg: STATUS_BG_COLORS_SUBTLE.info, icon: Clock },
  FINAL_REVIEW_FAILED: { text: STATUS_TEXT_COLORS.error, bg: STATUS_BG_COLORS_SUBTLE.error, icon: XCircle },
  END: { text: 'text-brand-foreground', bg: 'bg-brand-outline/20', icon: Flag },
};

/**
 * Get verdict display info
 */
function getVerdictInfo(verdict: string | undefined) {
  const key = verdict || 'END';
  return VERDICT_COLORS[key] || VERDICT_COLORS.END;
}

/**
 * Custom Terminal Node Component for React Flow
 *
 * Features:
 * - Final verdict display with color coding
 * - Icon based on verdict type
 * - No output handle (terminal node)
 * - Input handle only
 * - Theme-aware styling
 *
 * Per R01: Uses centralized color/timing constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 */
function TerminalNodeComponent({ data, selected, dragging }: NodeProps<TerminalNodeData>) {
  const { label = 'Terminal', verdict = 'END' } = data;
  const verdictInfo = getVerdictInfo(verdict);
  const VerdictIcon = verdictInfo.icon;

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 bg-brand-paper p-4
        transition-all ${ANIMATION_DURATION.FAST} ease-in-out
        ${selected ? 'border-dashed shadow-2xl border-brand-primary' : 'border-solid shadow-lg border-brand-outline'}
        ${dragging ? 'cursor-grabbing opacity-80' : 'cursor-grab opacity-100'}
      `}
    >
      {/* Input Handle (no output handle for terminal nodes) */}
      <Handle
        type="target"
        position={Position.Left}
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${verdictInfo.bg}`}
      />

      {/* Icon & Title */}
      <div className="flex items-center gap-2 mb-2">
        <Flag className="w-5 h-5 text-brand-primary" />
        <div className="font-semibold text-base text-brand-foreground">
          {label}
        </div>
      </div>

      {/* Verdict Display */}
      <div className="flex items-center justify-center gap-2 mt-2 p-2 rounded bg-brand-surface border border-brand-outline">
        <VerdictIcon className={`w-4 h-4 ${verdictInfo.text}`} />
        <div className={`text-sm font-medium ${verdictInfo.text}`}>
          {verdict}
        </div>
      </div>

      {/* Terminal Indicator */}
      <div className="text-center text-xs uppercase tracking-wider font-medium mt-2 text-semantic-muted">
        End of Pipeline
      </div>

      {/* Verdict Badge */}
      <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full ${verdictInfo.bg} ${verdictInfo.text} flex items-center justify-center text-xs font-bold shadow-md`}>
        <VerdictIcon className="w-4 h-4" />
      </div>
    </div>
  );
}

/**
 * Memoized Terminal Node (Performance optimization per R04)
 */
export const TerminalNode = memo(TerminalNodeComponent);
TerminalNode.displayName = 'TerminalNode';
