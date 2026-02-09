"use client";

import { memo, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { type EyeId, EYE_DISPLAY_NAMES } from "@third-eye/constants";
import { HEX_COLORS } from "@/constants/color-mappings";
import {
  ConversationEntry,
  type ConversationEntryData,
} from "./ConversationEntry";
import { ActiveActionPanel } from "./ActiveActionPanel";

const SCROLL_THRESHOLD = 100;

interface ConversationFeedProps {
  entries: ConversationEntryData[];
  viewMode: "strategic" | "tactical";
  selectedEye?: EyeId | null;
  onClearFilter?: () => void;
  onClarificationSubmit?: (id: string, answer: string) => void;
  onPlanApprove?: () => void;
  onPlanReject?: (feedback?: string) => void;
  isSubmitting?: boolean;
  sessionId?: string | null;
  className?: string;
}

function getEyeColor(eyeId: string | null): string {
  if (!eyeId) return HEX_COLORS.muted;
  return (
    SHARED_EYE_COLORS[eyeId as keyof typeof SHARED_EYE_COLORS] ??
    HEX_COLORS.muted
  );
}

function ConversationFeedInner({
  entries,
  viewMode,
  selectedEye = null,
  onClearFilter,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  isSubmitting = false,
  sessionId,
  className,
}: ConversationFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const filteredEntries = useMemo(() => {
    if (!selectedEye) return entries;
    return entries.filter(
      (entry) =>
        entry.eye === selectedEye ||
        entry.type === "routing_announced" ||
        (entry.type === "eye_section_header" && entry.eye === selectedEye),
    );
  }, [entries, selectedEye]);

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
          <div className="text-sm text-semantic-muted animate-pip">
            {sessionId
              ? "Awaiting transmission..."
              : "Select a session to begin monitoring"}
          </div>
        </div>
      </div>
    );
  }

  const filterEyeColor = selectedEye
    ? SHARED_EYE_COLORS[selectedEye as keyof typeof SHARED_EYE_COLORS]
    : null;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto bg-brand-paper flex flex-col",
        className,
      )}
    >
      {selectedEye && (
        <div
          className="shrink-0 flex items-center gap-2 px-6 py-1.5 border-b"
          style={{
            borderColor: `${filterEyeColor}30`,
            backgroundColor: `${filterEyeColor}08`,
          }}
        >
          <Image
            src={`/eyes/${selectedEye}.svg`}
            width={16}
            height={16}
            alt=""
            className="rounded-full"
          />
          <span
            className="text-xs font-medium"
            style={{ color: filterEyeColor ?? undefined }}
          >
            {EYE_DISPLAY_NAMES[selectedEye] ?? selectedEye}
          </span>
          <span className="text-[10px] text-semantic-muted">filtered</span>
          <button
            onClick={onClearFilter}
            className="ml-auto text-[10px] text-semantic-muted hover:text-brand-foreground transition-colors"
          >
            Clear
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredEntries.length === 0 && selectedEye ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-semantic-muted">
              No events for {EYE_DISPLAY_NAMES[selectedEye] ?? selectedEye}
            </div>
          </div>
        ) : (
          filteredEntries.map((entry) => (
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
          ))
        )}
      </div>
    </div>
  );
}

export const ConversationFeed = memo(ConversationFeedInner);
export type { ConversationFeedProps };
