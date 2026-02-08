"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import type { EyeId } from "@third-eye/constants";

interface IntelFeedEntryEvent {
  id: string;
  type: string;
  eye: string | null;
  timestamp: Date;
  ui: { summary: string };
}

interface IntelFeedEntryProps {
  event: IntelFeedEntryEvent;
  className?: string;
}

function formatTimestamp(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function IntelFeedEntryComponent({ event, className }: IntelFeedEntryProps) {
  const timeString = useMemo(
    () => formatTimestamp(event.timestamp),
    [event.timestamp],
  );

  const dotColor = useMemo(() => {
    if (!event.eye) return undefined;
    return SHARED_EYE_COLORS[event.eye as EyeId] ?? undefined;
  }, [event.eye]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 hover:bg-brand-paper-elev transition-colors animate-feed-in",
        className,
      )}
    >
      <span className="text-[10px] text-semantic-muted font-mono w-16 flex-shrink-0">
        {timeString}
      </span>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={dotColor ? { backgroundColor: dotColor } : undefined}
      />
      <span className="text-xs text-brand-foreground truncate flex-1">
        {event.ui.summary}
      </span>
    </div>
  );
}

export const IntelFeedEntry = memo(IntelFeedEntryComponent);
IntelFeedEntry.displayName = "IntelFeedEntry";
