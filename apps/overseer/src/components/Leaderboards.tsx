import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/api';
import type { LeaderboardSummary } from '../lib/api';

export interface LeaderboardsProps {
  sessionId: string;
  apiKey: string;
}

export function Leaderboards({ sessionId, apiKey }: LeaderboardsProps) {
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !apiKey) {
      setSummary(null);
      return;
    }
    fetchLeaderboard({ sessionId, apiKey })
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load leaderboard'));
  }, [sessionId, apiKey]);

  if (error) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-rose-200">
        {error}
      </section>
    );
  }

  if (!summary || (!summary.agents.length && !summary.eyes.length)) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        Leaderboards populate after duels and approvals are logged.
      </section>
    );
  }

  const topAgents = summary.agents.slice(0, 5);
  const topEyes = summary.eyes.slice(0, 6);

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Leaderboards</h3>
      </header>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
          <h4 className="text-sm font-semibold text-white">Top agents</h4>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {topAgents.map((row) => (
              <li key={row.agent} className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-brand-accent">{row.agent}</span>
                <span>{row.win_rate}% approvals</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
          <h4 className="text-sm font-semibold text-white">Eye verdicts</h4>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {topEyes.map((row) => (
              <li key={row.eye} className="flex items-center justify-between">
                <span>{row.eye}</span>
                <span>{row.win_rate}%</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

export default Leaderboards;
