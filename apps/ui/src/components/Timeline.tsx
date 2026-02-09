import { useMemo } from "react";
import clsx from "clsx";
import type { WSPipelineEvent } from "../types/pipeline";

export interface TimelineProps {
  events: WSPipelineEvent[];
  selectedIndex?: number;
  onSelect?: (index: number, event: WSPipelineEvent) => void;
  onFocusEye?: (event: WSPipelineEvent) => void;
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function Timeline({
  events,
  selectedIndex,
  onSelect,
  onFocusEye,
}: TimelineProps) {
  const ordered = useMemo(() => [...events].reverse(), [events]);

  if (!ordered.length) {
    return (
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 text-sm text-semantic-muted">
        Awaiting pipeline activity.
      </div>
    );
  }

  return (
    <ol className="max-h-[24rem] space-y-2 overflow-y-auto rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-semantic-muted">
      {ordered.map((event, index) => {
        const isSelected = selectedIndex === index;
        const idx = events.length - 1 - index;
        return (
          <li
            key={`${event.type}-${event.ts}-${index}`}
            className="flex items-start gap-3"
          >
            <button
              type="button"
              onClick={() => onSelect?.(idx, event)}
              onFocus={() => onFocusEye?.(event)}
              onMouseEnter={() => onFocusEye?.(event)}
              className={clsx(
                "flex-1 rounded-xl border border-brand-outline/40 px-3 py-2 text-left transition",
                isSelected
                  ? "border-brand-accent/70 bg-brand-accent/10 text-brand-foreground"
                  : "hover:border-brand-accent/60 hover:bg-brand-accent/5",
              )}
            >
              <div className="flex items-center justify-between text-xs text-semantic-muted">
                <span>{formatTimestamp(event.ts)}</span>
                <span>{event.eye ?? event.type}</span>
              </div>
              <p className="mt-1 text-sm text-semantic-muted">
                {event.code ?? event.type}
              </p>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default Timeline;
