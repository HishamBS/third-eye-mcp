'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { EyeStageToken } from '@third-eye/constants';

interface CustomNodeData {
  label: string;
  eye?: string;
  stage?: string;
  capabilities?: string[];
  type?: string;
}

const NODE_TYPE_CONDITION = 'condition';
const NODE_TYPE_USER_INPUT = 'user_input';

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const getNodeStyle = () => {
    if (data.stage === EyeStageToken.GUIDANCE) {
      return 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-400/50 shadow-blue-500/20';
    }
    if (data.stage === EyeStageToken.VALIDATION) {
      return 'bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-400/50 shadow-green-500/20';
    }
    if (data.type === NODE_TYPE_CONDITION) {
      return 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-400/50 shadow-yellow-500/20';
    }
    if (data.type === NODE_TYPE_USER_INPUT) {
      return 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-400/50 shadow-purple-500/20';
    }
    return 'bg-gradient-to-br from-slate-500/20 to-slate-600/10 border-slate-400/50 shadow-slate-500/20';
  };

  const toHumanReadable = (text: string) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className={`
        rounded-xl border-2 px-4 py-3 
        shadow-xl backdrop-blur-sm
        transition-all duration-200
        hover:shadow-2xl hover:scale-105
        ${getNodeStyle()} 
        ${selected ? 'ring-2 ring-brand-accent ring-offset-2 ring-offset-brand-ink' : ''}
      `}
      style={{
        minWidth: '200px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-brand-accent !border-2 !border-brand-accent !w-3 !h-3"
      />

      <div className="flex items-center gap-3">
        {data.eye && (
          <div className="flex-shrink-0">
            <img
              src={`/eyes/${data.eye}.svg`}
              alt={data.eye}
              className="h-10 w-10 drop-shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-80 text-white">
            {data.eye || data.type || 'Step'}
          </div>
          <div className="text-sm font-medium text-white truncate">{data.label}</div>
          {data.capabilities && data.capabilities.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {data.capabilities.map((cap, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent font-medium"
                >
                  {toHumanReadable(cap)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-brand-accent !border-2 !border-brand-accent !w-3 !h-3"
      />
    </div>
  );
}

export default memo(CustomNode);
