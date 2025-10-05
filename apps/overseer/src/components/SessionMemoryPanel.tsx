import type { PipelineEvent } from '../types/pipeline';

export interface SessionMemoryPanelProps {
  byakuganEvents: PipelineEvent[];
}

type MemoryReference = {
  session_id?: string;
  excerpt?: string;
  ts?: string;
  similarity?: number;
};

function toMemoryList(event: PipelineEvent): MemoryReference[] {
  const data = event.data ?? {};
  const record = data as Record<string, unknown>;
  const candidates =
    Array.isArray(record.memory_references)
      ? (record.memory_references as MemoryReference[])
      : Array.isArray(record.references)
        ? (record.references as MemoryReference[])
        : Array.isArray(record.memory)
          ? (record.memory as MemoryReference[])
          : [];
  return candidates.map((ref) => ({
      session_id: ref.session_id,
      excerpt: ref.excerpt,
      ts: ref.ts,
      similarity: ref.similarity,
    }));
}

function formatSimilarity(value?: number) {
  if (value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export function SessionMemoryPanel({ byakuganEvents }: SessionMemoryPanelProps) {
  if (!byakuganEvents.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        No historical references yet. Once Byakugan flags contradictions, they will appear here.
      </section>
    );
  }

  const latest = byakuganEvents[byakuganEvents.length - 1];
  const references = toMemoryList(latest);

  if (!references.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        Latest Byakugan review did not surface prior-session contradictions.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-100">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Session Memory</p>
          <h3 className="text-lg font-semibold text-white">Byakugan historical references</h3>
        </div>
        {latest.ts && <span className="text-xs text-slate-400">{new Date(latest.ts).toLocaleString()}</span>}
      </header>
      <ul className="mt-4 space-y-3">
        {references.map((ref, index) => (
          <li key={`${ref.session_id ?? 'ref'}-${index}`} className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
            <p className="text-sm text-slate-200">{ref.excerpt ?? 'No excerpt provided.'}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>Session: {ref.session_id ?? 'unknown'}</span>
              <span>Similarity: {formatSimilarity(ref.similarity)}</span>
              {ref.ts && <span>{new Date(ref.ts).toLocaleDateString()}</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SessionMemoryPanel;
