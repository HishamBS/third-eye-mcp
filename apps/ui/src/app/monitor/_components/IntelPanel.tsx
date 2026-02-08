"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { IntelFeedEntry } from "./IntelFeedEntry";
import { QualityScoreRing } from "./QualityScoreRing";

interface TacticalEvent {
  id: string;
  type: string;
  eye: string | null;
  timestamp: Date;
  ui: { title: string; summary: string };
}

interface QualityScore {
  overall: number;
  breakdown: Record<string, number>;
}

interface IntelPanelProps {
  events: TacticalEvent[];
  qualityScore: QualityScore | null;
  viewMode: "strategic" | "tactical";
  className?: string;
}

function IntelPanelComponent({
  events,
  qualityScore,
  viewMode: _viewMode,
  className,
}: IntelPanelProps) {
  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [events],
  );

  return (
    <aside
      className={cn(
        "w-[300px] border-l border-brand-outline bg-brand-paper flex flex-col",
        className,
      )}
    >
      {/* Intel Feed */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-[10px] uppercase tracking-widest text-semantic-muted px-3 pt-3 pb-2 flex-shrink-0">
          INTEL FEED
        </div>
        <div className="flex-1 overflow-y-auto">
          {sortedEvents.map((event) => (
            <IntelFeedEntry key={event.id} event={event} />
          ))}
          {sortedEvents.length === 0 && (
            <div className="px-3 py-4 text-xs text-semantic-muted">
              No events yet...
            </div>
          )}
        </div>
      </div>

      {/* Quality Score */}
      <div className="flex-shrink-0 border-t border-brand-outline">
        <div className="text-[10px] uppercase tracking-widest text-semantic-muted px-3 pt-3 pb-2">
          QUALITY SCORE
        </div>
        <div className="px-3 pb-3">
          {qualityScore ? (
            <QualityScoreRing
              score={qualityScore.overall}
              breakdown={qualityScore.breakdown}
            />
          ) : (
            <div className="text-xs text-semantic-muted py-4 text-center">
              Awaiting results...
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export const IntelPanel = memo(IntelPanelComponent);
IntelPanel.displayName = "IntelPanel";
