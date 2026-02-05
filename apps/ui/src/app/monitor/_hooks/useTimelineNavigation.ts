"use client";

/**
 * useTimelineNavigation - Navigation and history state management
 *
 * Manages:
 * - Live vs review mode
 * - Event selection and navigation
 * - Filtering and search
 * - Playback controls
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  NarrativeEvent,
  TimelineState,
  TimelineFilters,
  PlaybackSpeed,
  TimelineNavigationReturn,
} from "@third-eye/types";

/**
 * Default filter state
 */
const DEFAULT_FILTERS: TimelineFilters = {
  eye: null,
  act: null,
  eventType: null,
  searchQuery: "",
};

/**
 * Filter events based on current filters
 */
function filterEvents(
  events: NarrativeEvent[],
  filters: TimelineFilters,
): NarrativeEvent[] {
  return events.filter((event) => {
    // Filter by Eye
    if (filters.eye && event.narrator !== filters.eye) {
      return false;
    }

    // Filter by Act
    if (filters.act && event.actId !== filters.act) {
      return false;
    }

    // Filter by event type
    if (filters.eventType && event.eventType !== filters.eventType) {
      return false;
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = event.title.toLowerCase().includes(query);
      const matchesNarrative = event.narrative.toLowerCase().includes(query);
      const matchesNarrator = event.narrator.toLowerCase().includes(query);
      if (!matchesTitle && !matchesNarrative && !matchesNarrator) {
        return false;
      }
    }

    return true;
  });
}

export interface UseTimelineNavigationOptions {
  /** Initial events */
  events: NarrativeEvent[];
  /** Whether new events are arriving (live mode active) */
  isLiveSessionActive?: boolean;
  /** Playback interval in ms (for review mode playback) */
  playbackIntervalMs?: number;
}

export function useTimelineNavigation({
  events,
  isLiveSessionActive = false,
  playbackIntervalMs = 1000,
}: UseTimelineNavigationOptions): TimelineNavigationReturn {
  // Mode state
  const [mode, setMode] = useState<"live" | "review">(
    isLiveSessionActive ? "live" : "review",
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Filter state
  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_FILTERS);
  const [isExpanded, setIsExpanded] = useState(false);

  // Playback interval ref
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter events
  const filteredEvents = useMemo(
    () => filterEvents(events, filters),
    [events, filters],
  );

  // Current event
  const selectedEvent = useMemo(() => {
    if (events.length === 0) return null;
    if (selectedIndex < 0 || selectedIndex >= events.length) return null;
    return events[selectedIndex];
  }, [events, selectedIndex]);

  // Auto-follow in live mode
  useEffect(() => {
    if (mode === "live" && events.length > 0) {
      setSelectedIndex(events.length - 1);
    }
  }, [mode, events.length]);

  // Handle live session becoming active/inactive
  useEffect(() => {
    if (isLiveSessionActive && mode === "review") {
      // Offer to go back to live mode (or auto-switch)
    }
  }, [isLiveSessionActive, mode]);

  // Playback logic
  useEffect(() => {
    if (isPlaying && mode === "review") {
      const intervalMs = playbackIntervalMs / playbackSpeed;

      playbackIntervalRef.current = setInterval(() => {
        setSelectedIndex((prev) => {
          if (prev >= events.length - 1) {
            // Reached end, stop playback
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);

      return () => {
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };
    }
  }, [isPlaying, mode, playbackSpeed, playbackIntervalMs, events.length]);

  // Stop playback when mode changes to live
  useEffect(() => {
    if (mode === "live" && isPlaying) {
      setIsPlaying(false);
    }
  }, [mode, isPlaying]);

  // Navigation actions
  const goToEvent = useCallback(
    (index: number) => {
      if (index < 0 || index >= events.length) return;
      setSelectedIndex(index);
      setMode("review");
      setIsPlaying(false);
    },
    [events.length],
  );

  const goLive = useCallback(() => {
    setMode("live");
    setIsPlaying(false);
    if (events.length > 0) {
      setSelectedIndex(events.length - 1);
    }
  }, [events.length]);

  const playPause = useCallback(() => {
    if (mode === "live") return; // Can't play in live mode
    setIsPlaying((prev) => !prev);
  }, [mode]);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeed(speed);
  }, []);

  const updateFilters = useCallback((update: Partial<TimelineFilters>) => {
    setFilters((prev) => ({ ...prev, ...update }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const nextEvent = useCallback(() => {
    if (mode === "live") return;
    if (selectedIndex < events.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    }
  }, [mode, selectedIndex, events.length]);

  const prevEvent = useCallback(() => {
    if (mode === "live") return;
    if (selectedIndex > 0) {
      setSelectedIndex((prev) => prev - 1);
    }
  }, [mode, selectedIndex]);

  // Build state object
  const state: TimelineState = useMemo(
    () => ({
      events,
      filteredEvents,
      mode,
      selectedIndex,
      selectedEvent,
      isPlaying,
      playbackSpeed,
      filters,
      isExpanded,
      showFilters: isExpanded,
    }),
    [
      events,
      filteredEvents,
      mode,
      selectedIndex,
      selectedEvent,
      isPlaying,
      playbackSpeed,
      filters,
      isExpanded,
    ],
  );

  return {
    state,
    goToEvent,
    goLive,
    playPause,
    setPlaybackSpeed: setSpeed,
    setFilters: updateFilters,
    clearFilters,
    toggleExpanded,
    nextEvent,
    prevEvent,
  };
}
