'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { Play, Pause, RefreshCw, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import {
  EXECUTION_STATUS,
  EXECUTION_STATUS_LABELS,
  NODE_STATUS,
  STATUS_COLORS,
  EXECUTION_API_ENDPOINTS,
  EXECUTION_POLLING_CONFIG,
  HTTP_METHODS,
  CONTENT_TYPES,
  type ExecutionStatus,
  type NodeStatus,
} from '../../constants/execution';
import { UI_HELP_TEXT } from '@third-eye/constants';

interface ExecutionStep {
  id: string;
  runId: string;
  nodeId: string;
  nodeType: string;
  status: NodeStatus;
  verdict?: string;
  outputJson?: unknown;
  errorMessage?: string;
  tokensUsed?: number;
  latencyMs?: number;
  metadataJson?: unknown;
  createdAt: Date;
  completedAt?: Date;
}

interface ExecutionState {
  runId: string;
  status: ExecutionStatus;
  finalVerdict?: string;
  errorMessage?: string;
  createdAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  steps: ExecutionStep[];
  currentState?: {
    currentNodeId?: string;
    status?: string;
  };
}

interface ExecutionPanelProps {
  pipelineId: string;
  runId?: string;
  onClose?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

const STATUS_ICONS = {
  [EXECUTION_STATUS.PENDING]: Clock,
  [EXECUTION_STATUS.RUNNING]: RefreshCw,
  [EXECUTION_STATUS.SUCCESS]: CheckCircle,
  [EXECUTION_STATUS.ERROR]: XCircle,
  [EXECUTION_STATUS.AWAITING_INPUT]: Pause,
  [EXECUTION_STATUS.PAUSED]: Pause,
  [EXECUTION_STATUS.COMPLETED]: CheckCircle,
  [EXECUTION_STATUS.FAILED]: XCircle,
} as const;

export function ExecutionPanel({ pipelineId, runId, onClose }: ExecutionPanelProps) {
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch execution status
  const fetchExecutionStatus = async (currentRunId: string) => {
    try {
      const response = await fetch(`${API_URL}${EXECUTION_API_ENDPOINTS.STATUS(currentRunId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch execution status: ${response.status}`);
      }
      const data = await response.json();

      if (data.ok && data.data) {
        setExecutionState(data.data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch execution status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Start pipeline execution
  const startExecution = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}${EXECUTION_API_ENDPOINTS.EXECUTE}`, {
        method: HTTP_METHODS.POST,
        headers: { 'Content-Type': CONTENT_TYPES.JSON },
        body: JSON.stringify({
          pipelineId,
          input: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start execution: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok && data.data) {
        setExecutionState({
          runId: data.data.runId,
          status: EXECUTION_STATUS.RUNNING,
          steps: [],
        });
        setAutoRefresh(true);
      }
    } catch (err) {
      console.error('Failed to start execution:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Pause execution
  const pauseExecution = async () => {
    if (!executionState?.runId) return;

    try {
      const response = await fetch(`${API_URL}${EXECUTION_API_ENDPOINTS.PAUSE(executionState.runId)}`, {
        method: HTTP_METHODS.POST,
      });

      if (!response.ok) {
        throw new Error(`Failed to pause execution: ${response.status}`);
      }

      await fetchExecutionStatus(executionState.runId);
    } catch (err) {
      console.error('Failed to pause execution:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Resume execution
  const resumeExecution = async () => {
    if (!executionState?.runId) return;

    try {
      const response = await fetch(`${API_URL}${EXECUTION_API_ENDPOINTS.RESUME(executionState.runId)}`, {
        method: HTTP_METHODS.POST,
        headers: { 'Content-Type': CONTENT_TYPES.JSON },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to resume execution: ${response.status}`);
      }

      await fetchExecutionStatus(executionState.runId);
    } catch (err) {
      console.error('Failed to resume execution:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Auto-refresh execution status
  useEffect(() => {
    if (!runId && !executionState?.runId) return;

    const currentRunId = runId || executionState?.runId;
    if (!currentRunId) return;

    fetchExecutionStatus(currentRunId);

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchExecutionStatus(currentRunId);
    }, EXECUTION_POLLING_CONFIG.INTERVAL_MS);

    return () => clearInterval(interval);
  }, [runId, executionState?.runId, autoRefresh]);

  // Stop auto-refresh when execution completes or fails
  useEffect(() => {
    if (executionState?.status === EXECUTION_STATUS.COMPLETED || executionState?.status === EXECUTION_STATUS.FAILED) {
      setAutoRefresh(false);
    }
  }, [executionState?.status]);

  const formatDuration = (startTime?: Date, endTime?: Date) => {
    if (!startTime) return '-';
    const end = endTime || new Date();
    const duration = new Date(end).getTime() - new Date(startTime).getTime();
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const StatusIcon = executionState?.status ? STATUS_ICONS[executionState.status] : Clock;
  const statusColor = executionState?.status ? STATUS_COLORS[executionState.status] : STATUS_COLORS.pending;

  return (
    <div className="w-96 border-l border-brand-outline/50 bg-brand-paper p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{UI_HELP_TEXT.EXECUTION_PANEL_TITLE}</h3>
          {executionState?.runId && (
            <p className="text-xs text-slate-400 font-mono mt-1">{executionState.runId}</p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-brand-outline/20 transition-colors"
            aria-label={UI_HELP_TEXT.EXECUTION_PANEL_CLOSE}
          >
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/50 p-3">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Status Badge */}
      {executionState && (
        <div className="mb-6">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${statusColor}`}>
            <StatusIcon className={`h-4 w-4 ${executionState.status === EXECUTION_STATUS.RUNNING ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">{EXECUTION_STATUS_LABELS[executionState.status]}</span>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="mb-6 flex gap-2">
        {!executionState || executionState.status === EXECUTION_STATUS.COMPLETED || executionState.status === EXECUTION_STATUS.FAILED ? (
          <button
            onClick={startExecution}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white hover:bg-brand-primary transition-colors disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            {loading ? UI_HELP_TEXT.EXECUTION_STARTING : UI_HELP_TEXT.EXECUTION_START}
          </button>
        ) : (
          <>
            {executionState.status === EXECUTION_STATUS.RUNNING && (
              <button
                onClick={pauseExecution}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                <Pause className="h-4 w-4" />
                {UI_HELP_TEXT.EXECUTION_PAUSE}
              </button>
            )}
            {executionState.status === EXECUTION_STATUS.PAUSED && (
              <button
                onClick={resumeExecution}
                className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
              >
                <Play className="h-4 w-4" />
                {UI_HELP_TEXT.EXECUTION_RESUME}
              </button>
            )}
          </>
        )}

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            autoRefresh
              ? 'bg-brand-accent text-white hover:bg-brand-primary'
              : 'bg-brand-outline/20 text-slate-400 hover:bg-brand-outline/30'
          }`}
        >
          <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          {UI_HELP_TEXT.EXECUTION_AUTO_REFRESH}
        </button>
      </div>

      {/* Execution Metrics */}
      {executionState && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-brand-ink p-3">
            <div className="text-xs text-slate-400 mb-1">{UI_HELP_TEXT.EXECUTION_DURATION}</div>
            <div className="text-lg font-semibold text-white">
              {formatDuration(executionState.startedAt, executionState.completedAt)}
            </div>
          </div>
          <div className="rounded-lg bg-brand-ink p-3">
            <div className="text-xs text-slate-400 mb-1">{UI_HELP_TEXT.EXECUTION_STEPS_COMPLETED}</div>
            <div className="text-lg font-semibold text-white">
              {executionState.steps.filter(s => s.status === NODE_STATUS.SUCCESS).length} / {executionState.steps.length}
            </div>
          </div>
        </div>
      )}

      {/* Final Verdict */}
      {executionState?.finalVerdict && (
        <div className="mb-6 rounded-lg bg-brand-ink p-4">
          <div className="text-sm text-slate-400 mb-2">{UI_HELP_TEXT.EXECUTION_FINAL_VERDICT}</div>
          <div className="text-lg font-semibold text-brand-accent">{executionState.finalVerdict}</div>
        </div>
      )}

      {/* Execution Steps */}
      {executionState && executionState.steps.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">{UI_HELP_TEXT.EXECUTION_STEPS_TITLE}</h4>
          <div className="space-y-3">
            {executionState.steps.map((step) => {
              const StepIcon = STATUS_ICONS[step.status];
              const stepColor = STATUS_COLORS[step.status];

              return (
                <div
                  key={step.id}
                  className="rounded-lg bg-brand-ink p-4 border border-brand-outline/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StepIcon className={`h-4 w-4 ${step.status === NODE_STATUS.RUNNING ? 'animate-spin' : ''} ${stepColor.split(' ')[0]}`} />
                      <span className="text-sm font-medium text-white">{step.nodeType}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${stepColor}`}>
                      {EXECUTION_STATUS_LABELS[step.status]}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono mb-2">{step.nodeId}</div>

                  {step.verdict && (
                    <div className="text-sm text-brand-accent mb-2">
                      {UI_HELP_TEXT.EXECUTION_VERDICT_PREFIX} {step.verdict}
                    </div>
                  )}

                  {step.errorMessage && (
                    <div className="text-sm text-red-400 mb-2">
                      {UI_HELP_TEXT.EXECUTION_ERROR_PREFIX} {step.errorMessage}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    {step.tokensUsed !== undefined && step.tokensUsed > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Zap className="h-3 w-3" />
                        <span>{step.tokensUsed} {UI_HELP_TEXT.EXECUTION_TOKENS_SUFFIX}</span>
                      </div>
                    )}
                    {step.latencyMs !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{step.latencyMs}{UI_HELP_TEXT.EXECUTION_MS_SUFFIX}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!executionState && !error && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            <Play className="h-12 w-12 mx-auto mb-3" />
            <p className="text-sm">{UI_HELP_TEXT.EXECUTION_EMPTY_TITLE}</p>
            <p className="text-xs mt-2">{UI_HELP_TEXT.EXECUTION_EMPTY_DESCRIPTION}</p>
          </div>
        </div>
      )}
    </div>
  );
}
