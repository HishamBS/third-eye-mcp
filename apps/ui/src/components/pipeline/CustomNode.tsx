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
        group relative
        rounded-2xl border-2
        shadow-xl backdrop-blur-sm
        transition-all duration-300
        hover:shadow-2xl hover:scale-110
        ${getNodeStyle()}
        ${selected ? 'ring-4 ring-brand-accent ring-offset-2 ring-offset-brand-ink scale-105' : ''}
      `}
      style={{
        minWidth: '180px',
        maxWidth: '220px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-brand-accent !border-2 !border-brand-accent !w-4 !h-4 hover:!w-5 hover:!h-5 transition-all"
      />

      {/* Eye Icon - Large and Centered */}
      <div className="flex flex-col items-center px-3 py-4">
        {data.eye && (
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/30 to-brand-primary/20 rounded-full blur-xl"></div>
            <img
              src={`/eyes/${data.eye}.svg`}
              alt={data.eye}
              className="relative h-20 w-20 drop-shadow-2xl transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/eyes/overseer.svg';
              }}
            />
            {getStatusIcon() && (
              <div className="absolute -top-1 -right-1 rounded-full bg-brand-ink p-1 shadow-lg">
                {getStatusIcon()}
              </div>
            )}
          </div>
        )}

        {/* Eye Name - Prominent */}
        <div className="text-center w-full">
          <div className="text-base font-bold text-white mb-1 truncate">
            {toHumanReadable(data.eye || data.type || 'Step')}
          </div>

          {/* Stage Badge */}
          {data.stage && (
            <div className="text-xs font-semibold text-white/80 mb-2">
              {data.stage === EyeStageToken.GUIDANCE && 'Guidance'}
              {data.stage === EyeStageToken.VALIDATION && 'Validation'}
            </div>
          )}

          {/* Simplified Label */}
          {data.label && data.label !== data.eye && (
            <div className="text-xs text-white/70 truncate px-2">
              {data.label}
            </div>
          )}
        </div>

        {/* Capabilities - Compact Pills */}
        {data.capabilities && data.capabilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 justify-center max-w-full">
            {data.capabilities.slice(0, 2).map((cap, idx) => (
              <span
                key={idx}
                className="rounded-full bg-white/10 backdrop-blur px-2 py-0.5 text-[10px] text-white font-medium border border-white/20"
                title={toHumanReadable(cap)}
              >
                {toHumanReadable(cap).substring(0, 8)}
                {toHumanReadable(cap).length > 8 ? '...' : ''}
              </span>
            ))}
            {data.capabilities.length > 2 && (
              <span className="rounded-full bg-white/10 backdrop-blur px-2 py-0.5 text-[10px] text-white font-medium border border-white/20">
                +{data.capabilities.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Metrics - Show only on hover or when executing */}
        {(data.tokensUsed || data.latencyMs || data.executionStatus) && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2 text-[10px] text-white/60">
            {data.tokensUsed !== undefined && data.tokensUsed > 0 && (
              <div className="flex items-center gap-0.5" title={`${data.tokensUsed} tokens used`}>
                <Zap className="h-3 w-3" />
                <span>{data.tokensUsed}</span>
              </div>
            )}
            {data.latencyMs !== undefined && (
              <div className="flex items-center gap-0.5" title={`${data.latencyMs}ms latency`}>
                <Clock className="h-3 w-3" />
                <span>{data.latencyMs}ms</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-brand-accent !border-2 !border-brand-accent !w-4 !h-4 hover:!w-5 hover:!h-5 transition-all"
      />
    </div>
  );
}

export default memo(CustomNode);
