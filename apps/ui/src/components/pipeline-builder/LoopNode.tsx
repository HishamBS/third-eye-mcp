'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { RotateCw, ArrowRight } from 'lucide-react';
import type { LoopNodeConfig } from '@third-eye/types';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE } from '@/constants/color-mappings';
import { ANIMATION_DURATION } from '@/constants/timing';

/**
 * Loop Node Data Structure
 * Iterate over items with batch support
 */
export interface LoopNodeData {
  label?: string;
  loopConfig?: LoopNodeConfig;
  customConfig?: Record<string, unknown>;
}

/**
 * Custom Loop Node Component for React Flow
 *
 * Features:
 * - Iteration count badge
 * - Loop-back and exit handles
 * - Batch size indicator
 * - Max iterations display (on selected)
 * - Theme-aware styling
 *
 * Per R01: Uses centralized color/timing constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 */
function LoopNodeComponent({ data, selected, dragging }: NodeProps<LoopNodeData>) {
  const { label = 'Loop', loopConfig } = data;

  const maxIterations = loopConfig?.maxIterations ?? 10;
  const batchSize = loopConfig?.batchSize;
  const hasBatching = batchSize !== undefined && batchSize > 1;

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 bg-brand-paper p-4
        transition-all ${ANIMATION_DURATION.FAST} ease-in-out
        ${selected ? `border-dashed shadow-2xl ${STATUS_TEXT_COLORS.info}` : 'border-solid shadow-lg border-brand-outline'}
        ${dragging ? 'cursor-grabbing opacity-80' : 'cursor-grab opacity-100'}
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
        <RotateCw className={`w-5 h-5 ${STATUS_TEXT_COLORS.info}`} />
        <div className="font-semibold text-base text-brand-foreground">
          {label}
        </div>
      </div>

      {/* Iteration Info */}
      <div className={`text-center text-xs uppercase tracking-wider font-medium mb-1 ${STATUS_TEXT_COLORS.info}`}>
        Max {maxIterations} iterations
      </div>

      {/* Batch Info (shown when selected) */}
      {selected && hasBatching && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40">
          <div className="text-xs font-medium text-semantic-muted mb-1">Batch Size:</div>
          <div className="text-xs text-brand-foreground text-center font-bold">
            {batchSize} items/iteration
          </div>
        </div>
      )}

      {/* Loop-back Output Handle (top - back to loop body) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-continue"
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.info}`}
        style={{ top: '35%', transform: 'translateY(-50%)' }}
      >
        <div
          className={`
            absolute right-full mr-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
            bg-brand-surface border border-brand-outline shadow-sm
            flex items-center gap-1 ${STATUS_TEXT_COLORS.info}
          `}
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        >
          <RotateCw className="w-3 h-3" />
          <span>Continue</span>
        </div>
      </Handle>

      {/* Exit Output Handle (bottom - loop complete) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output-exit"
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.success}`}
        style={{ top: '65%', transform: 'translateY(-50%)' }}
      >
        <div
          className={`
            absolute right-full mr-2 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
            bg-brand-surface border border-brand-outline shadow-sm
            flex items-center gap-1 text-semantic-success
          `}
          style={{ top: '50%', transform: 'translateY(-50%)' }}
        >
          <ArrowRight className="w-3 h-3" />
          <span>Done</span>
        </div>
      </Handle>

      {/* Max Iterations Indicator */}
      <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center text-xs font-bold shadow-md">
        {maxIterations}
      </div>
    </div>
  );
}

/**
 * Memoized Loop Node (Performance optimization per R04)
 */
export const LoopNode = memo(LoopNodeComponent);
LoopNode.displayName = 'LoopNode';
