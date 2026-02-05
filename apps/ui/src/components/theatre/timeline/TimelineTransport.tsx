"use client";

/**
 * TimelineTransport - Scrubber bar with playback controls
 *
 * The "orchestra pit" of the theatre - controls for:
 * - Timeline scrubber with act sections
 * - Playback controls (play/pause, speed, prev/next)
 * - Live mode button
 * - Expand/collapse toggle
 */

import { memo, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Radio,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StoryActId,
  PlaybackSpeed,
  NarrativeEvent,
} from "@third-eye/types";
import { STORY_ACTS } from "@third-eye/constants";

export interface TimelineTransportProps {
  /** All events in the timeline */
  events: NarrativeEvent[];
  /** Current event index */
  currentIndex: number;
  /** Whether in live mode */
  isLive: boolean;
  /** Whether timeline is playing (review mode only) */
  isPlaying: boolean;
  /** Current playback speed */
  playbackSpeed: PlaybackSpeed;
  /** Whether expanded view is shown */
  isExpanded: boolean;
  /** Current act being displayed */
  currentAct: StoryActId;
  /** Go to specific event */
  onGoToEvent: (index: number) => void;
  /** Return to live mode */
  onGoLive: () => void;
  /** Toggle play/pause */
  onPlayPause: () => void;
  /** Set playback speed */
  onSetSpeed: (speed: PlaybackSpeed) => void;
  /** Toggle expanded view */
  onToggleExpanded: () => void;
  /** Go to previous event */
  onPrevEvent: () => void;
  /** Go to next event */
  onNextEvent: () => void;
  /** Additional CSS classes */
  className?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 1, 2];

/**
 * Act progress segment
 */
interface ActSegment {
  id: StoryActId;
  label: string;
  color: string;
  startPercent: number;
  widthPercent: number;
  eventCount: number;
}

function TimelineTransportComponent({
  events,
  currentIndex,
  isLive,
  isPlaying,
  playbackSpeed,
  isExpanded,
  currentAct,
  onGoToEvent,
  onGoLive,
  onPlayPause,
  onSetSpeed,
  onToggleExpanded,
  onPrevEvent,
  onNextEvent,
  className,
}: TimelineTransportProps) {
  // Calculate act segments for the progress bar
  const actSegments = useMemo<ActSegment[]>(() => {
    if (events.length === 0) {
      return Object.values(STORY_ACTS).map((act, index) => ({
        id: act.id,
        label: act.title,
        color: act.color.primary,
        startPercent: index * 33.33,
        widthPercent: 33.33,
        eventCount: 0,
      }));
    }

    const segments: ActSegment[] = [];
    const totalEvents = events.length;

    // Count events per act
    const actCounts: Record<StoryActId, number> = {
      "act-1": 0,
      "act-2": 0,
      "act-3": 0,
    };

    for (const event of events) {
      actCounts[event.actId]++;
    }

    let startPercent = 0;
    for (const act of Object.values(STORY_ACTS)) {
      const eventCount = actCounts[act.id];
      const widthPercent =
        totalEvents > 0 ? (eventCount / totalEvents) * 100 : 33.33;

      segments.push({
        id: act.id,
        label: act.title,
        color: act.color.primary,
        startPercent,
        widthPercent: Math.max(widthPercent, 5), // Minimum width for visibility
        eventCount,
      });

      startPercent += widthPercent;
    }

    return segments;
  }, [events]);

  // Current position percentage
  const currentPercent = useMemo(() => {
    if (events.length === 0) return 0;
    return (currentIndex / (events.length - 1)) * 100;
  }, [currentIndex, events.length]);

  // Handle scrubber click
  const handleScrubberClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (events.length === 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const index = Math.round(percent * (events.length - 1));
      onGoToEvent(Math.max(0, Math.min(index, events.length - 1)));
    },
    [events.length, onGoToEvent],
  );

  // Cycle playback speed
  const handleSpeedClick = useCallback(() => {
    const currentSpeedIndex = SPEED_OPTIONS.indexOf(playbackSpeed);
    const nextIndex = (currentSpeedIndex + 1) % SPEED_OPTIONS.length;
    onSetSpeed(SPEED_OPTIONS[nextIndex]);
  }, [playbackSpeed, onSetSpeed]);

  return (
    <div
      className={cn(
        "border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm",
        className,
      )}
    >
      {/* Progress bar / Scrubber */}
      <div className="px-4 pt-3">
        <div
          className="relative h-2 cursor-pointer rounded-full bg-neutral-800 overflow-hidden"
          onClick={handleScrubberClick}
          role="slider"
          aria-label="Timeline position"
          aria-valuenow={currentIndex}
          aria-valuemin={0}
          aria-valuemax={events.length - 1}
        >
          {/* Act segments */}
          {actSegments.map((segment) => (
            <div
              key={segment.id}
              className="absolute inset-y-0"
              style={{
                left: `${segment.startPercent}%`,
                width: `${segment.widthPercent}%`,
                backgroundColor: `${segment.color}30`,
                borderRight: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ))}

          {/* Progress fill */}
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: `linear-gradient(to right, ${STORY_ACTS[currentAct].color.primary}, ${STORY_ACTS[currentAct].color.primary}80)`,
            }}
            animate={{ width: `${currentPercent}%` }}
            transition={{ duration: 0.2 }}
          />

          {/* Playhead */}
          <motion.div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-900 shadow-lg"
            animate={{ left: `${currentPercent}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Act labels */}
        <div className="mt-1 flex justify-between px-1">
          {actSegments.map((segment) => (
            <span
              key={segment.id}
              className={cn(
                "text-[10px] transition-colors",
                segment.id === currentAct ? "font-medium" : "text-neutral-500",
              )}
              style={{
                color: segment.id === currentAct ? segment.color : undefined,
              }}
            >
              {segment.label}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-2">
          {/* Previous */}
          <button
            onClick={onPrevEvent}
            disabled={currentIndex === 0 || isLive}
            className={cn(
              "rounded p-1.5 transition-colors",
              currentIndex === 0 || isLive
                ? "text-neutral-600 cursor-not-allowed"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
            aria-label="Previous event"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            disabled={isLive}
            className={cn(
              "rounded p-1.5 transition-colors",
              isLive
                ? "text-neutral-600 cursor-not-allowed"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={onNextEvent}
            disabled={currentIndex >= events.length - 1 || isLive}
            className={cn(
              "rounded p-1.5 transition-colors",
              currentIndex >= events.length - 1 || isLive
                ? "text-neutral-600 cursor-not-allowed"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
            aria-label="Next event"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Speed */}
          <button
            onClick={handleSpeedClick}
            disabled={isLive}
            className={cn(
              "rounded px-2 py-1 text-xs font-mono transition-colors",
              isLive
                ? "text-neutral-600 cursor-not-allowed"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
            aria-label={`Playback speed: ${playbackSpeed}x`}
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Center: Event counter */}
        <div className="text-xs text-neutral-500">
          {events.length > 0 ? (
            <>
              Event {currentIndex + 1} of {events.length}
            </>
          ) : (
            "No events"
          )}
        </div>

        {/* Right: Live button + Expand */}
        <div className="flex items-center gap-2">
          {/* Live button */}
          <button
            onClick={onGoLive}
            className={cn(
              "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
              isLive
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-white",
            )}
          >
            <Radio className={cn("h-3 w-3", isLive && "animate-pulse")} />
            LIVE
          </button>

          {/* Expand/Collapse */}
          <button
            onClick={onToggleExpanded}
            className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            aria-label={isExpanded ? "Collapse timeline" : "Expand timeline"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const TimelineTransport = memo(TimelineTransportComponent);
TimelineTransport.displayName = "TimelineTransport";
