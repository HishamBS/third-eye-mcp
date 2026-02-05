"use client";

/**
 * TimelineEventRow - Single event in the expanded timeline
 *
 * Displays:
 * - Timestamp
 * - Eye/speaker icon and name
 * - Event title and narrative
 * - Click to jump to event
 */

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NarrativeEvent, EyePersonaConfig } from "@third-eye/types";
import { timelineEventVariants } from "../effects/animations";

export interface TimelineEventRowProps {
  /** The event to display */
  event: NarrativeEvent;
  /** Eye persona for the narrator */
  narratorPersona: EyePersonaConfig;
  /** Whether this event is currently selected */
  isSelected: boolean;
  /** Whether this event is the current live position */
  isCurrent: boolean;
  /** Callback when event is clicked */
  onClick: () => void;
  /** Additional CSS classes */
  className?: string;
}

function TimelineEventRowComponent({
  event,
  narratorPersona,
  isSelected,
  isCurrent,
  onClick,
  className,
}: TimelineEventRowProps) {
  // Format timestamp
  const timeDisplay = useMemo(() => {
    return event.timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [event.timestamp]);

  return (
    <motion.button
      className={cn(
        "group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        isSelected ? "bg-neutral-800" : "hover:bg-neutral-800/50",
        isCurrent && "ring-1 ring-emerald-500/50",
        className,
      )}
      onClick={onClick}
      variants={timelineEventVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Timestamp */}
      <span className="shrink-0 text-[11px] font-mono text-neutral-500 w-16">
        {timeDisplay}
      </span>

      {/* Narrator indicator */}
      <div
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
        style={{
          backgroundColor: `${narratorPersona.color.primary}20`,
          color: narratorPersona.color.primary,
        }}
      >
        {narratorPersona.symbol}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Narrator name */}
        <span
          className="text-xs font-medium"
          style={{ color: narratorPersona.color.primary }}
        >
          {narratorPersona.name}
        </span>

        {/* Title */}
        <p className="text-sm text-neutral-200 truncate">{event.title}</p>

        {/* Narrative preview (truncated) */}
        <p className="text-xs text-neutral-500 truncate">{event.narrative}</p>
      </div>

      {/* Jump indicator */}
      <div
        className={cn(
          "shrink-0 flex items-center gap-1 text-xs transition-opacity",
          isSelected || isCurrent
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100",
        )}
      >
        {isCurrent ? (
          <span className="text-emerald-400">Current</span>
        ) : (
          <>
            <span className="text-neutral-500">Jump</span>
            <ArrowRight className="h-3 w-3 text-neutral-500" />
          </>
        )}
      </div>

      {/* Action/celebration indicator */}
      {event.action && (
        <div className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
          Action
        </div>
      )}
      {event.celebration && (
        <div className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-400">
          {event.celebration === "finale" ? "Complete" : "Milestone"}
        </div>
      )}
    </motion.button>
  );
}

export const TimelineEventRow = memo(TimelineEventRowComponent);
TimelineEventRow.displayName = "TimelineEventRow";
