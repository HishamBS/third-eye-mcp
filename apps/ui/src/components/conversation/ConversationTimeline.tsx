/**
 * Conversation Timeline Component - Phase 5
 *
 * Displays the narrative flow of agent and human interactions in a session.
 * Shows the "story" of how the pipeline executed with messages, routing decisions, and pauses.
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text and icons from SSOT
 */

"use client";

import { useMemo } from "react";
import { EyeIcon } from "@/components/EyeIcon";
import { TimelineMarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  CONVERSATION_EVENT_TYPES,
  CONVERSATION_EVENT_ICONS,
  CONVERSATION_EVENT_LABELS,
  CONVERSATION_EVENT_COLORS,
  type ConversationEventType as ConversationEventTypeConstant,
} from "@third-eye/constants";

/**
 * Conversation event type - re-export from SSOT constants
 */
export type ConversationEventType = ConversationEventTypeConstant;

/**
 * Conversation event record from API
 */
export interface ConversationEventRecord {
  id: string;
  sessionId: string;
  eventType: ConversationEventType;
  speaker: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

interface ConversationTimelineProps {
  events: readonly ConversationEventRecord[];
  loading?: boolean;
  error?: Error | null;
}

/**
 * Get event config from SSOT constants
 */
function getEventConfig(eventType: ConversationEventType) {
  const icon =
    CONVERSATION_EVENT_ICONS[eventType] ??
    CONVERSATION_EVENT_ICONS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE];
  const label =
    CONVERSATION_EVENT_LABELS[eventType] ??
    CONVERSATION_EVENT_LABELS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE];
  const colors =
    CONVERSATION_EVENT_COLORS[eventType] ??
    CONVERSATION_EVENT_COLORS[CONVERSATION_EVENT_TYPES.AGENT_MESSAGE];

  return {
    icon,
    label,
    bgColor: colors.bgColor,
    borderColor: colors.borderColor,
    textColor: colors.textColor,
  };
}

/**
 * Format timestamp
 */
function formatTimestamp(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Timeline event card component
 */
function TimelineEventCard({ event }: { event: ConversationEventRecord }) {
  const config = getEventConfig(event.eventType);
  const isAgent = event.eventType === CONVERSATION_EVENT_TYPES.AGENT_MESSAGE;
  const isHuman = event.eventType === CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE;
  const isRoutingDecision =
    event.eventType === CONVERSATION_EVENT_TYPES.ROUTING_DECISION;

  return (
    <div
      className={`relative p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Event type icon */}
          <span className="text-xl">{config.icon}</span>

          {/* Eye icon for agent messages */}
          {isAgent && (
            <div title={event.speaker}>
              <EyeIcon eye={event.speaker} size={32} />
            </div>
          )}

          {/* Speaker label */}
          <div>
            <span className={`font-semibold ${config.textColor} capitalize`}>
              {isHuman ? "Human" : isAgent ? event.speaker : config.label}
            </span>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(event.createdAt)}
            </div>
          </div>
        </div>

        {/* Event type badge */}
        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {config.label}
        </span>
      </div>

      {/* Message content - rendered as markdown */}
      <div className="mt-2">
        <TimelineMarkdownRenderer content={event.message} />
      </div>

      {/* Metadata (for routing decisions) */}
      {isRoutingDecision && event.metadata?.reasoning && (
        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase mb-1">
            Reasoning
          </div>
          <TimelineMarkdownRenderer
            content={String(event.metadata.reasoning)}
          />
        </div>
      )}

      {/* Metadata (for pauses) */}
      {event.eventType === CONVERSATION_EVENT_TYPES.PAUSE &&
        event.metadata?.reason && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Reason: {String(event.metadata.reason)}
          </div>
        )}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="text-4xl mb-2">💬</div>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
        No Conversation Yet
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Conversation events will appear here as the pipeline executes.
      </p>
    </div>
  );
}

/**
 * Conversation Timeline - Main Component
 */
export function ConversationTimeline({
  events,
  loading,
  error,
}: ConversationTimelineProps) {
  // Sort events by timestamp (most recent last for chronological order)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">❌</span>
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            Failed to Load Conversation
          </h3>
        </div>
        <p className="text-sm text-red-800 dark:text-red-200">
          {error.message}
        </p>
      </div>
    );
  }

  if (sortedEvents.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
          Conversation Timeline
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {sortedEvents.length} {sortedEvents.length === 1 ? "event" : "events"}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Timeline events */}
        <div className="space-y-4">
          {sortedEvents.map((event) => (
            <div key={event.id} className="relative pl-12">
              {/* Timeline dot */}
              <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900" />

              {/* Event card */}
              <TimelineEventCard event={event} />
            </div>
          ))}
        </div>
      </div>

      {/* Summary footer */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>
            <strong>Agent Messages:</strong>{" "}
            {
              sortedEvents.filter(
                (e) => e.eventType === CONVERSATION_EVENT_TYPES.AGENT_MESSAGE,
              ).length
            }
          </div>
          <div>
            <strong>Human Messages:</strong>{" "}
            {
              sortedEvents.filter(
                (e) => e.eventType === CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE,
              ).length
            }
          </div>
          <div>
            <strong>Routing Decisions:</strong>{" "}
            {
              sortedEvents.filter(
                (e) =>
                  e.eventType === CONVERSATION_EVENT_TYPES.ROUTING_DECISION,
              ).length
            }
          </div>
          <div>
            <strong>Pauses:</strong>{" "}
            {
              sortedEvents.filter(
                (e) => e.eventType === CONVERSATION_EVENT_TYPES.PAUSE,
              ).length
            }
          </div>
        </div>
      </div>
    </div>
  );
}
