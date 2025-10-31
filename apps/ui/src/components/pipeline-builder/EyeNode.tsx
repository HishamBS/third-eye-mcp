'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { EyeIcon, getEyeColor } from '@/components/EyeIcon';
import {
  EYE_DISPLAY_NAMES,
  EYE_BADGES,
  EYE_STAGES,
  type EyeStage,
} from './constants';
import type { EyeName } from '@third-eye/types';

/**
 * Eye Node Data Structure
 */
export interface EyeNodeData {
  eyeId: EyeName;
  capabilities?: string[];
  customConfig?: Record<string, unknown>;
}

/**
 * Custom Eye Node Component for React Flow
 *
 * Features:
 * - Theme-aware styling
 * - Visual states (selected, dragging, hover)
 * - Input/Output handles
 * - Icon, name, badge, stage display
 * - Expandable capabilities (on selected)
 */
function EyeNodeComponent({ data, selected, dragging }: NodeProps<EyeNodeData>) {
  const { eyeId, capabilities = [] } = data;

  const displayName = EYE_DISPLAY_NAMES[eyeId];
  const badge = EYE_BADGES[eyeId];
  const stage = EYE_STAGES[eyeId];

  // Get Eye-specific color from theme SSOT
  const eyeColor = getEyeColor(eyeId);

  // Stage color classes (Tailwind)
  const getStageColorClass = (s: EyeStage): string => {
    switch (s) {
      case 'GUIDANCE':
        return 'text-blue-400';
      case 'VALIDATION':
        return 'text-green-400';
      case 'ROUTER':
        return 'text-brand-primary';
      case 'BOTH':
        return 'text-brand-accent';
      default:
        return 'text-brand-outline';
    }
  };

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 bg-brand-paper p-4
        transition-all duration-200 ease-in-out
        ${selected ? 'border-dashed shadow-2xl' : 'border-solid shadow-lg'}
        ${dragging ? 'cursor-grabbing opacity-80' : 'cursor-grab opacity-100'}
      `}
      style={{ borderColor: eyeColor }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2 !border-brand-paper"
        style={{ background: eyeColor }}
      />

      {/* Badge */}
      <div className="absolute top-2 right-2 text-xs font-semibold text-brand-outline uppercase tracking-wider">
        {badge}
      </div>

      {/* Icon - SVG from SSOT */}
      <div className="flex justify-center items-center mb-2">
        <EyeIcon eye={eyeId} size={48} />
      </div>

      {/* Name */}
      <div className="text-center font-semibold text-base text-brand-ink mb-1">
        {displayName}
      </div>

      {/* Stage Badge */}
      <div className={`text-center text-xs uppercase tracking-wider font-medium mb-1 ${getStageColorClass(stage)}`}>
        {stage}
      </div>

      {/* Capabilities (shown when selected) */}
      {selected && capabilities.length > 0 && (
        <div className="mt-2 pt-2 border-t border-brand-outline/40 flex flex-wrap gap-1 justify-center">
          {capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-block px-2 py-0.5 bg-brand-accent/20 text-brand-accent rounded-full text-xs font-medium"
            >
              {cap}
            </span>
          ))}
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2 !border-brand-paper"
        style={{ background: eyeColor }}
      />
    </div>
  );
}

/**
 * Memoized Eye Node (Performance optimization per R04)
 */
export const EyeNode = memo(EyeNodeComponent);
EyeNode.displayName = 'EyeNode';
