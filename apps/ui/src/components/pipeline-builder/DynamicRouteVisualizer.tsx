/**
 * Dynamic Route Visualizer Component - Phase 4
 *
 * Shows Overseer's routing decision for a specific request
 * Displays: Request Analysis → Reasoning → Selected Eyes
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

'use client';

import { useRoutingDecisionBySession } from '@/hooks/useRoutingDecisions';
import { EYE_CAPABILITIES } from '@third-eye/config/eye-capabilities';

interface DynamicRouteVisualizerProps {
  sessionId: string;
  onClose?: () => void;
}

/**
 * Dynamic Route Visualizer - Main Component
 */
export function DynamicRouteVisualizer({ sessionId, onClose }: DynamicRouteVisualizerProps) {
  const { decision, loading, error } = useRoutingDecisionBySession(sessionId);

  if (loading) {
    return (
      <div className="mt-6 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Loading routing decision...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Failed to load routing decision: {error.message}
        </p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          No routing decision found for this session.
        </p>
      </div>
    );
  }

  const { requestAnalysis, selectedEyes, reasoning, executionMode } = decision;

  return (
    <div className="mt-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Routing Decision</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* Session info */}
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Session: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{sessionId}</code>
        {' • '}
        {new Date(decision.createdAt).toLocaleString()}
      </div>

      {/* Request Analysis */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
          📊 Request Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">Type</span>
            <div className="mt-1">
              <span className="inline-block px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded">
                {requestAnalysis.requestType}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">Domain</span>
            <div className="mt-1">
              <span className="inline-block px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded">
                {requestAnalysis.contentDomain}
              </span>
            </div>
          </div>
          <div>
            <span className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">Complexity</span>
            <div className="mt-1">
              <span className="inline-block px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded">
                {requestAnalysis.complexity}
              </span>
            </div>
          </div>
        </div>
        {requestAnalysis.capabilitiesNeeded.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">Required Capabilities</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {requestAnalysis.capabilitiesNeeded.map((cap) => (
                <span
                  key={cap}
                  className="px-2 py-0.5 text-xs bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded-full"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overseer Reasoning */}
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
          🧠 Overseer Reasoning
        </h4>
        <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
          {reasoning}
        </p>
      </div>

      {/* Selected Eyes Flow */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center gap-2">
          🔀 Selected Route
          <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded-full">
            {executionMode}
          </span>
          <span className="text-xs text-green-700 dark:text-green-300">
            ({selectedEyes.length} steps)
          </span>
        </h4>

        {/* Eye sequence visualization */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {selectedEyes.map((eyeName, idx) => {
            const normalizedName = eyeName.toLowerCase();
            const eyeInfo = EYE_CAPABILITIES[normalizedName as keyof typeof EYE_CAPABILITIES];
            const icon = eyeInfo?.icon || '👁️';

            return (
              <div key={`${eyeName}-${idx}`} className="flex items-center gap-2">
                {/* Eye chip */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg shadow-sm">
                  <span className="text-xl">{icon}</span>
                  <span className="font-medium text-sm whitespace-nowrap">{eyeName}</span>
                </div>

                {/* Arrow (not after last eye) */}
                {idx < selectedEyes.length - 1 && (
                  <span className="text-green-500 dark:text-green-400 text-xl">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Execution mode note */}
        {executionMode === 'parallel' && (
          <div className="mt-3 text-xs text-green-700 dark:text-green-300">
            ⚡ Parallel execution: Some eyes may run concurrently for faster results
          </div>
        )}
        {executionMode === 'sequential' && (
          <div className="mt-3 text-xs text-green-700 dark:text-green-300">
            🔗 Sequential execution: Eyes run one after another in order
          </div>
        )}
      </div>
    </div>
  );
}
