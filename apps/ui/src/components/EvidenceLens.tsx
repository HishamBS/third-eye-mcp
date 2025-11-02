import { useState } from 'react';
import type { EvidenceClaim } from '../types/pipeline';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

export interface EvidenceLensProps {
  draft: string;
  claims: EvidenceClaim[];
  expertMode?: boolean;
}

interface Segment {
  text: string;
  cited: boolean;
  citation?: string | null;
  confidence?: number;
}

export function buildEvidenceSegments(draft: string, claims: EvidenceClaim[]): Segment[] {
  if (!draft) return [];
  if (!claims.length) return [{ text: draft, cited: false }];

  const ordered = [...claims].sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const claim of ordered) {
    const start = Math.max(0, Math.min(claim.start, draft.length));
    const end = Math.max(start, Math.min(claim.end, draft.length));
    if (start > cursor) {
      segments.push({ text: draft.slice(cursor, start), cited: false });
    }
    const snippet = draft.slice(start, end || start + 1);
    segments.push({ text: snippet, cited: Boolean(claim.citation), citation: claim.citation, confidence: claim.confidence });
    cursor = end;
  }

  if (cursor < draft.length) {
    segments.push({ text: draft.slice(cursor), cited: false });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

export function EvidenceLens({ draft, claims, expertMode = true }: EvidenceLensProps) {
  if (!draft) {
    return <p className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-sm text-semantic-muted">No draft available.</p>;
  }

  if (!expertMode) {
    return (
      <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm leading-relaxed text-semantic-muted">
        <p>{draft}</p>
        <p className="mt-4 rounded-lg border border-brand-outline/30 bg-brand-paper/60 p-3 text-xs text-semantic-muted">
          Enable Expert Mode to see citation confidence highlights and raw claim metadata.
        </p>
      </article>
    );
  }

  const segments = buildEvidenceSegments(draft, claims);
  if (!segments.length) {
    return (
      <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm leading-relaxed text-semantic-muted">
        <p>{draft}</p>
      </article>
    );
  }

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/60 p-4 text-sm leading-relaxed text-brand-foreground relative">
      {segments.map((segment, index) => {
        const key = `${index}-${segment.text.slice(0, 8)}`;
        const tone = segment.cited
          ? '${STATUS_BG_COLORS_SUBTLE.success} text-brand-foreground hover:bg-semantic-success/30 ${STATUS_BORDER_COLORS_SUBTLE.success}'
          : '${STATUS_BG_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error} hover:bg-semantic-error/30 ${STATUS_BORDER_COLORS_SUBTLE.error}';
        const confidence = Math.round((segment.confidence ?? 0) * 100);
        const isHovered = hoveredIndex === index;

        return (
          <span key={key} className="relative inline-block">
            <span
              className={`${tone} rounded px-1 py-0.5 transition cursor-help border`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {segment.text}
            </span>
            {isHovered && (segment.cited || !segment.cited) && (
              <span className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-brand-ink border border-brand-outline/60 rounded-lg text-xs whitespace-nowrap shadow-lg">
                {segment.cited ? (
                  <>
                    <div className="${STATUS_TEXT_COLORS.success} font-semibold">✓ Cited ({confidence}% confidence)</div>
                    <div className="text-semantic-muted mt-1 max-w-xs whitespace-normal">{segment.citation || 'Citation available'}</div>
                  </>
                ) : (
                  <>
                    <div className="${STATUS_TEXT_COLORS.error} font-semibold">⚠ Missing Citation</div>
                    <div className="text-semantic-muted mt-1">This claim needs evidence</div>
                  </>
                )}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </span>
            )}
          </span>
        );
      })}
    </article>
  );
}

export default EvidenceLens;
