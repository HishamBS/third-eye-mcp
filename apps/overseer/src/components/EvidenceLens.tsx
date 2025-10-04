import type { EvidenceClaim } from '../types/pipeline';

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
    return <p className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-sm text-slate-300">No draft available.</p>;
  }

  if (!expertMode) {
    return (
      <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm leading-relaxed text-slate-200">
        <p>{draft}</p>
        <p className="mt-4 rounded-lg border border-brand-outline/30 bg-brand-paper/60 p-3 text-xs text-slate-400">
          Enable Expert Mode to see citation confidence highlights and raw claim metadata.
        </p>
      </article>
    );
  }

  const segments = buildEvidenceSegments(draft, claims);
  if (!segments.length) {
    return (
      <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm leading-relaxed text-slate-200">
        <p>{draft}</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/60 p-4 text-sm leading-relaxed text-slate-100">
      {segments.map((segment, index) => {
        const key = `${index}-${segment.text.slice(0, 8)}`;
        const tone = segment.cited ? 'bg-emerald-500/20 text-slate-100 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30';
        const confidence = Math.round((segment.confidence ?? 0) * 100);
        const tooltip = segment.cited
          ? `Confidence ${confidence}%\n${segment.citation ?? 'Citation missing'}`
          : 'Missing citation';
        return (
          <span
            key={key}
            className={`${tone} rounded px-1 transition`}
            title={tooltip}
          >
            {segment.text}
          </span>
        );
      })}
    </article>
  );
}

export default EvidenceLens;
