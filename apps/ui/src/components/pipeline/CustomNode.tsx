'use client';

import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { EyeStageToken } from '@third-eye/constants';
import { CheckCircle, XCircle, Clock, Zap, Loader2 } from 'lucide-react';
import { NODE_STATUS, NODE_STATUS_GRADIENTS, type NodeStatus } from '../../constants/execution';

interface CustomNodeData {
  label: string;
  eye?: string;
  stage?: string;
  capabilities?: string[];
  type?: string;
  executionStatus?: NodeStatus;
  tokensUsed?: number;
  latencyMs?: number;
}

const NODE_TYPE_CONDITION = 'condition';
const NODE_TYPE_USER_INPUT = 'user_input';

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const getNodeStyle = () => {
    // Execution status takes priority - use SSOT constants
    if (data.executionStatus && data.executionStatus in NODE_STATUS_GRADIENTS) {
      return NODE_STATUS_GRADIENTS[data.executionStatus as keyof typeof NODE_STATUS_GRADIENTS];
    }

    // Default node type styling
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

  const getStatusIcon = () => {
    switch (data.executionStatus) {
      case NODE_STATUS.RUNNING:
        return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case NODE_STATUS.SUCCESS:
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case NODE_STATUS.ERROR:
        return <XCircle className="h-4 w-4 text-red-400" />;
      case NODE_STATUS.AWAITING_INPUT:
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return null;
    }
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
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80 text-white">
              {data.eye || data.type || 'Step'}
            </div>
            {getStatusIcon()}
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
          {(data.tokensUsed || data.latencyMs) && (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              {data.tokensUsed !== undefined && data.tokensUsed > 0 && (
                <div className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  <span>{data.tokensUsed} tokens</span>
                </div>
              )}
              {data.latencyMs !== undefined && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{data.latencyMs}ms</span>
                </div>
              )}
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
