"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import {
  ConversationEntry,
  type ConversationEntryData,
} from "./ConversationEntry";
import { ActiveActionPanel } from "./ActiveActionPanel";

const SCROLL_THRESHOLD = 100;

interface ConversationFeedProps {
  entries: ConversationEntryData[];
  viewMode: "strategic" | "tactical";
  onClarificationSubmit?: (id: string, answer: string) => void;
  onPlanApprove?: () => void;
  onPlanReject?: (feedback?: string) => void;
  isSubmitting?: boolean;
  className?: string;
}

function getEyeColor(eyeId: string | null): string {
  if (!eyeId) return "#9CA3AF";
  return (
    SHARED_EYE_COLORS[eyeId as keyof typeof SHARED_EYE_COLORS] ?? "#9CA3AF"
  );
}

function ConversationFeedInner({
  entries,
  viewMode,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  isSubmitting = false,
  className,
}: ConversationFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const checkShouldAutoScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const { scrollTop, clientHeight, scrollHeight } = container;
    shouldAutoScrollRef.current =
      scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !shouldAutoScrollRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [entries]);

  const handleScroll = useCallback(() => {
    checkShouldAutoScroll();
  }, [checkShouldAutoScroll]);

  const handleClarificationSubmit = useCallback(
    (id: string, answer: string) => {
      onClarificationSubmit?.(id, answer);
    },
    [onClarificationSubmit],
  );

  const handlePlanApprove = useCallback(() => {
    onPlanApprove?.();
  }, [onPlanApprove]);

  const handlePlanReject = useCallback(
    (feedback?: string) => {
      onPlanReject?.(feedback);
    },
    [onPlanReject],
  );

  if (entries.length === 0) {
    return (
      <div
        ref={scrollRef}
        className={cn(
          "flex-1 overflow-y-auto px-6 py-4 bg-brand-paper flex items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <div className="text-sm text-semantic-muted animate-pulse">
            Waiting for session to begin...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto px-6 py-4 bg-brand-paper",
        className,
      )}
    >
      {entries.map((entry) => (
        <div key={entry.id}>
          <ConversationEntry entry={entry} viewMode={viewMode} />
          {entry.action && entry.status === "active" && (
            <ActiveActionPanel
              action={entry.action}
              eyeColor={getEyeColor(entry.eye)}
              onClarificationSubmit={handleClarificationSubmit}
              onPlanApprove={handlePlanApprove}
              onPlanReject={handlePlanReject}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export const ConversationFeed = memo(ConversationFeedInner);
export type { ConversationFeedProps };
