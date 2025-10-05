import { useMemo } from 'react';
import type { PipelineEvent } from '../types/pipeline';
import { renderMarkdown } from '../lib/markdown';

export interface RawEventPanelProps {
  event: PipelineEvent | null;
}

export function RawEventPanel({ event }: RawEventPanelProps) {
  const formatted = useMemo(() => {
    if (!event) return '';
    return JSON.stringify(event, null, 2);
  }, [event]);

  if (!event) {
    return (
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/60 p-4 text-xs text-slate-400">
        Select a timeline item to view the raw envelope.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-brand-outline/40 bg-brand-paperElev/60 p-4 text-xs text-slate-200">
      {event.md && (
        <div className="rounded-lg border border-brand-outline/30 bg-brand-paper p-3" dangerouslySetInnerHTML={{ __html: renderMarkdown(event.md) }} />
      )}
      <pre className="overflow-auto rounded-lg border border-brand-outline/20 bg-brand-paper px-3 py-2 text-[11px] text-brand-accent/90">
        {formatted}
      </pre>
    </div>
  );
}

export default RawEventPanel;
