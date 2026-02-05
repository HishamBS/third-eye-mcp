"use client";

/**
 * TimelineExpanded - Full transcript view
 *
 * Expandable panel showing:
 * - Searchable/filterable event list
 * - Grouped by act
 * - Click to jump to any event
 * - Export options
 */

import { memo, useMemo, useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NarrativeEvent,
  StoryActId,
  TimelineFilters as TimelineFiltersType,
  EyePersonaConfig,
} from "@third-eye/types";
import { STORY_ACTS } from "@third-eye/constants";
import { resolveEyePersona } from "@/lib/eye-persona-resolver";
import { TimelineEventRow } from "./TimelineEventRow";
import { TimelineFilters } from "./TimelineFilters";
import { timelineExpandVariants } from "../effects/animations";

export interface TimelineExpandedProps {
  /** All events */
  events: NarrativeEvent[];
  /** Filtered events (after search/filter) */
  filteredEvents: NarrativeEvent[];
  /** Currently selected event index */
  selectedIndex: number;
  /** Current live position index */
  currentIndex: number;
  /** Filter state */
  filters: TimelineFiltersType;
  /** Whether expanded view is visible */
  isExpanded: boolean;
  /** Update filters */
  onFiltersChange: (filters: Partial<TimelineFiltersType>) => void;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Jump to event */
  onGoToEvent: (index: number) => void;
  /** Export transcript */
  onExport?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Group events by act for display
 */
function groupEventsByAct(
  events: NarrativeEvent[],
): Record<StoryActId, NarrativeEvent[]> {
  const groups: Record<StoryActId, NarrativeEvent[]> = {
    "act-1": [],
    "act-2": [],
    "act-3": [],
  };

  for (const event of events) {
    groups[event.actId].push(event);
  }

  return groups;
}

/**
 * Act section component
 */
interface ActSectionProps {
  actId: StoryActId;
  events: NarrativeEvent[];
  allEvents: NarrativeEvent[];
  selectedIndex: number;
  currentIndex: number;
  onGoToEvent: (index: number) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

function ActSection({
  actId,
  events,
  allEvents,
  selectedIndex,
  currentIndex,
  onGoToEvent,
  isCollapsed,
  onToggleCollapsed,
}: ActSectionProps) {
  const act = STORY_ACTS[actId];

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Act header */}
      <button
        onClick={onToggleCollapsed}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-neutral-800/50"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-neutral-500" />
        )}
        <span
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: act.color.primary }}
        >
          {act.title}
        </span>
        <span className="text-xs text-neutral-500">
          ({events.length} event{events.length !== 1 ? "s" : ""})
        </span>
      </button>

      {/* Events */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="ml-3 border-l-2 pl-3"
              style={{ borderColor: `${act.color.primary}40` }}
            >
              {events.map((event) => {
                const globalIndex = allEvents.findIndex(
                  (e) => e.id === event.id,
                );
                const persona = resolveEyePersona(event.narrator);

                return (
                  <TimelineEventRow
                    key={event.id}
                    event={event}
                    narratorPersona={persona}
                    isSelected={globalIndex === selectedIndex}
                    isCurrent={globalIndex === currentIndex}
                    onClick={() => onGoToEvent(globalIndex)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimelineExpandedComponent({
  events,
  filteredEvents,
  selectedIndex,
  currentIndex,
  filters,
  isExpanded,
  onFiltersChange,
  onClearFilters,
  onGoToEvent,
  onExport,
  className,
}: TimelineExpandedProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track collapsed state per act
  const [collapsedActs, setCollapsedActs] = useState<
    Record<StoryActId, boolean>
  >({
    "act-1": false,
    "act-2": false,
    "act-3": false,
  });

  // Group filtered events by act
  const groupedEvents = useMemo(
    () => groupEventsByAct(filteredEvents),
    [filteredEvents],
  );

  // Get unique Eye IDs from events
  const availableEyes = useMemo(() => {
    const eyes = new Set<string>();
    for (const event of events) {
      eyes.add(event.narrator);
    }
    return Array.from(eyes);
  }, [events]);

  // Toggle act collapse
  const toggleActCollapsed = useCallback((actId: StoryActId) => {
    setCollapsedActs((prev) => ({
      ...prev,
      [actId]: !prev[actId],
    }));
  }, []);

  // Auto-scroll to selected event
  useEffect(() => {
    if (!isExpanded || !scrollContainerRef.current) return;

    // Find the selected event element and scroll to it
    const selectedElement = scrollContainerRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedIndex, isExpanded]);

  return (
    <motion.div
      className={cn(
        "overflow-hidden border-t border-neutral-800 bg-neutral-900/90",
        className,
      )}
      variants={timelineExpandVariants}
      initial="collapsed"
      animate={isExpanded ? "expanded" : "collapsed"}
    >
      {isExpanded && (
        <div className="p-4">
          {/* Header with filters and export */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200">
              Full Timeline
            </h3>
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
            )}
          </div>

          {/* Filters */}
          <TimelineFilters
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={onClearFilters}
            availableEyes={availableEyes}
            className="mb-4"
          />

          {/* Event list */}
          <div
            ref={scrollContainerRef}
            className="max-h-[400px] overflow-y-auto rounded-lg"
          >
            {filteredEvents.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">
                {events.length === 0
                  ? "No events yet"
                  : "No events match your filters"}
              </div>
            ) : (
              <div>
                {(Object.keys(STORY_ACTS) as StoryActId[]).map((actId) => (
                  <ActSection
                    key={actId}
                    actId={actId}
                    events={groupedEvents[actId]}
                    allEvents={events}
                    selectedIndex={selectedIndex}
                    currentIndex={currentIndex}
                    onGoToEvent={onGoToEvent}
                    isCollapsed={collapsedActs[actId]}
                    onToggleCollapsed={() => toggleActCollapsed(actId)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-3 flex items-center justify-between border-t border-neutral-800 pt-3 text-xs text-neutral-500">
            <span>
              Showing {filteredEvents.length} of {events.length} events
            </span>
            {filters.searchQuery && (
              <span>Search: "{filters.searchQuery}"</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export const TimelineExpanded = memo(TimelineExpandedComponent);
TimelineExpanded.displayName = "TimelineExpanded";
