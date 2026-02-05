"use client";

/**
 * TimelineFilters - Search and filter controls
 *
 * Provides filtering by:
 * - Eye/narrator
 * - Act
 * - Event type
 * - Free text search
 */

import { memo, useCallback } from "react";
import { Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  StoryActId,
  TimelineFilters as TimelineFiltersType,
} from "@third-eye/types";
import { STORY_ACTS, EYE_PERSONAS } from "@third-eye/constants";

export interface TimelineFiltersProps {
  /** Current filter values */
  filters: TimelineFiltersType;
  /** Update filters */
  onFiltersChange: (filters: Partial<TimelineFiltersType>) => void;
  /** Clear all filters */
  onClearFilters: () => void;
  /** Available Eye IDs in the current session */
  availableEyes: string[];
  /** Additional CSS classes */
  className?: string;
}

function TimelineFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  availableEyes,
  className,
}: TimelineFiltersProps) {
  // Check if any filters are active
  const hasActiveFilters =
    filters.eye !== null ||
    filters.act !== null ||
    filters.eventType !== null ||
    filters.searchQuery !== "";

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({ searchQuery: e.target.value });
    },
    [onFiltersChange],
  );

  // Handle Eye filter
  const handleEyeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFiltersChange({ eye: value === "" ? null : value });
    },
    [onFiltersChange],
  );

  // Handle Act filter
  const handleActChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFiltersChange({ act: value === "" ? null : (value as StoryActId) });
    },
    [onFiltersChange],
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          placeholder="Search events..."
          value={filters.searchQuery}
          onChange={handleSearchChange}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800/50 py-2 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onFiltersChange({ searchQuery: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Eye filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-neutral-500" />
        <select
          value={filters.eye ?? ""}
          onChange={handleEyeChange}
          className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
        >
          <option value="">All Eyes</option>
          {availableEyes.map((eyeId) => {
            const persona = EYE_PERSONAS[eyeId as keyof typeof EYE_PERSONAS];
            return (
              <option key={eyeId} value={eyeId}>
                {persona?.name ?? eyeId}
              </option>
            );
          })}
        </select>
      </div>

      {/* Act filter */}
      <select
        value={filters.act ?? ""}
        onChange={handleActChange}
        className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
      >
        <option value="">All Acts</option>
        {Object.values(STORY_ACTS).map((act) => (
          <option key={act.id} value={act.id}>
            {act.title}
          </option>
        ))}
      </select>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}

export const TimelineFilters = memo(TimelineFiltersComponent);
TimelineFilters.displayName = "TimelineFilters";
