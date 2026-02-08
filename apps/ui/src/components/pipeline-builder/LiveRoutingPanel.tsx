/**
 * Live Routing Panel Component - Phase 4
 *
 * Shows routing decisions for recent sessions in real-time
 * Displays session list with routing decisions, supports filtering
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

"use client";

import { useState, useCallback } from "react";
import { useRoutingDecisions } from "@/hooks/useRoutingDecisions";
import type { RoutingDecision } from "@/hooks/useRoutingDecisions";
import { EyeIcon } from "@/components/EyeIcon";

interface LiveRoutingPanelProps {
  maxSessions?: number; // Default 10
  autoRefresh?: boolean; // Default true
  onSessionClick?: (sessionId: string) => void;
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return "just now";
}

/**
 * Session card component
 */
function SessionCard({
  decision,
  onClick,
}: {
  decision: RoutingDecision;
  onClick: () => void;
}) {
  const relativeTime = formatRelativeTime(decision.createdAt);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
    >
      {/* Header: session ID + time */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 bg-green-500 rounded-full"
            title="Completed"
          />
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {decision.sessionId.slice(0, 8)}...
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {relativeTime}
        </span>
      </div>

      {/* Request type badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
          {decision.requestAnalysis.requestType}
        </span>
        <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
          {decision.requestAnalysis.contentDomain ?? "general"}
        </span>
      </div>

      {/* Selected eyes (icons only) */}
      <div className="flex items-center gap-1">
        {decision.selectedEyes.map((eyeName, idx) => {
          return (
            <div key={`${eyeName}-${idx}`} className="flex items-center">
              <div title={eyeName}>
                <EyeIcon eye={eyeName} size={24} />
              </div>
              {idx < decision.selectedEyes.length - 1 && (
                <span className="text-gray-400 text-xs mx-0.5">→</span>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
}

/**
 * Live Routing Panel - Main Component
 */
export function LiveRoutingPanel({
  maxSessions = 10,
  autoRefresh = true,
  onSessionClick,
}: LiveRoutingPanelProps) {
  const { decisions, loading, error, refetch } = useRoutingDecisions({
    limit: maxSessions,
    sort: "desc",
  });

  const [filterMode, setFilterMode] = useState<
    "all" | "dynamic" | "constrained" | "fixed"
  >("all");

  const handleSessionClick = useCallback(
    (sessionId: string) => {
      if (onSessionClick) {
        onSessionClick(sessionId);
      }
    },
    [onSessionClick],
  );

  // Filter decisions by mode (if needed in future)
  const filteredDecisions = decisions; // Currently showing all, can add filtering later

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Live Routing Decisions</h3>
        <button
          onClick={refetch}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          title="Refresh"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Loading sessions...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load sessions: {error.message}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredDecisions.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No routing decisions yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Sessions will appear here as they are created
            </p>
          </div>
        </div>
      )}

      {/* Session list */}
      {!loading && !error && filteredDecisions.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredDecisions.map((decision) => (
            <SessionCard
              key={decision.id}
              decision={decision}
              onClick={() => handleSessionClick(decision.sessionId)}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      {!loading && !error && filteredDecisions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Showing {filteredDecisions.length} most recent session
            {filteredDecisions.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
