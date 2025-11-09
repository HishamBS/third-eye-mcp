'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { UserCircle, MessageSquare, Clock } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE } from '@/constants/color-mappings';
import { ANIMATION_DURATION } from '@/constants/timing';

/**
 * User Input Node Data Structure
 * Pauses pipeline execution to collect user input
 */
export interface UserInputNodeData {
  label?: string;
  promptKey?: string;
  customConfig?: Record<string, unknown>;
}

/**
 * Custom User Input Node Component for React Flow
 *
 * Features:
 * - Pause indicator with clock icon
 * - Prompt key display (when selected)
 * - Input and output handles
 * - Theme-aware styling
 * - Waiting state visual
 *
 * Per R01: Uses centralized color/timing constants
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 */
function UserInputNodeComponent({ data, selected, dragging }: NodeProps<UserInputNodeData>) {
  const { label = 'User Input', promptKey = 'user_feedback' } = data;

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
        <UserCircle className={`w-5 h-5 ${STATUS_TEXT_COLORS.info}`} />
        <div className="font-semibold text-base text-brand-foreground">
          {label}
        </div>
      </div>

      {/* Waiting Status */}
      <div className="flex items-center justify-center gap-2 mt-2 p-2 rounded bg-brand-surface border border-brand-outline">
        <Clock className={`w-4 h-4 ${STATUS_TEXT_COLORS.info} animate-pulse`} />
        <div className={`text-xs font-medium ${STATUS_TEXT_COLORS.info}`}>
          Awaits Input
        </div>
      </div>

      {/* Prompt Key (shown when selected) */}
      {selected && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40">
          <div className="text-xs font-medium text-semantic-muted mb-1">Prompt Key:</div>
          <div className="flex items-center gap-1 text-xs text-brand-foreground font-mono bg-brand-surface rounded px-2 py-1">
            <MessageSquare className="w-3 h-3" />
            <span>{promptKey}</span>
          </div>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className={`!w-3 !h-3 !border-2 !border-brand-paper ${STATUS_BG_COLORS_SUBTLE.info}`}
      />

      {/* Pause Indicator Badge */}
      <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full ${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} flex items-center justify-center text-xs font-bold shadow-md`}>
        <Clock className="w-4 h-4 animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Memoized User Input Node (Performance optimization per R04)
 */
export const UserInputNode = memo(UserInputNodeComponent);
UserInputNode.displayName = 'UserInputNode';
