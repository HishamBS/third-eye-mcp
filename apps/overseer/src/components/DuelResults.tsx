import type { PipelineEvent } from '../types/pipeline';

export interface DuelResultsProps {
  events: PipelineEvent[];
}

function inferAgent(event: PipelineEvent): string | null {
  if (typeof event.data?.agent === 'string') return event.data.agent;
  if (typeof event.data?.agent_name === 'string') return event.data.agent_name;
  return null;
}

export function DuelResults({ events }: DuelResultsProps) {
  const duelEvents = events.filter((event) => inferAgent(event));
  if (!duelEvents.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        Launch a duel to see per-agent verdicts.
      </section>
    );
  }

  const grouped = duelEvents.reduce<Record<string, PipelineEvent[]>>((acc, event) => {
    const agent = inferAgent(event) ?? 'unknown';
    acc[agent] = acc[agent] || [];
    acc[agent].push(event);
    return acc;
  }, {});

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Duel verdicts</h3>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(grouped).map(([agent, agentEvents]) => (
          <article key={agent} className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
            <header className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-sm text-brand-accent">{agent}</span>
              <span>{agentEvents.length} events</span>
            </header>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {agentEvents.slice(-6).map((event, index) => (
                <li key={`${event.eye}-${event.ts}-${index}`} className="flex items-center justify-between">
                  <span>{event.eye}</span>
                  <span className={event.ok ? 'text-emerald-400' : event.ok === false ? 'text-rose-400' : 'text-amber-300'}>
                    {event.code ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DuelResults;
