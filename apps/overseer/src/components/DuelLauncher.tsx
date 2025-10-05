import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';

async function launchDuel(sessionId: string, apiKey: string, agents: string[]): Promise<Response> {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000';
  return fetch(`${base}/session/${encodeURIComponent(sessionId)}/duel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({ agents }),
  });
}

export interface DuelLauncherProps {
  sessionId: string;
  apiKey: string;
  availableAgents: string[];
}

export function DuelLauncher({ sessionId, apiKey, availableAgents }: DuelLauncherProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [customAgent, setCustomAgent] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedAgents((prev) => {
      if (prev.length >= 2) {
        return prev;
      }
      const next = [...prev];
      for (const agent of availableAgents) {
        if (next.length >= 2) break;
        if (!next.includes(agent)) {
          next.push(agent);
        }
      }
      return next;
    });
  }, [availableAgents]);

  const roster = useMemo(() => {
    const pool = new Set<string>(availableAgents);
    selectedAgents.forEach((agent) => {
      if (agent.trim()) {
        pool.add(agent);
      }
    });
    return Array.from(pool).sort((a, b) => a.localeCompare(b));
  }, [availableAgents, selectedAgents]);

  const toggleAgent = (agent: string) => {
    setSelectionError(null);
    setMessage(null);
    setStatus('idle');
    setSelectedAgents((prev) => {
      if (prev.includes(agent)) {
        return prev.filter((item) => item !== agent);
      }
      if (prev.length >= 4) {
        setSelectionError('Select up to 4 agents for a duel.');
        return prev;
      }
      return [...prev, agent];
    });
  };

  const addCustomAgent = () => {
    const trimmed = customAgent.trim();
    if (!trimmed) return;
    setSelectionError(null);
    setMessage(null);
    setStatus('idle');
    setSelectedAgents((prev) => {
      if (prev.includes(trimmed)) {
        setSelectionError('Agent already selected.');
        return prev;
      }
      if (prev.length >= 4) {
        setSelectionError('Select up to 4 agents for a duel.');
        return prev;
      }
      return [...prev, trimmed];
    });
    setCustomAgent('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId || !apiKey) {
      setMessage('Provide a session ID and API key to launch a duel.');
      return;
    }
    if (selectedAgents.length < 2) {
      setSelectionError('Select at least two agents to launch a duel.');
      return;
    }
    try {
      setStatus('running');
      setMessage('Launching duel…');
      const response = await launchDuel(sessionId, apiKey, selectedAgents);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `HTTP ${response.status}`);
      }
      const payload = await response.json();
      setStatus('success');
      setMessage(`Duel scheduled. Run IDs: ${payload.runs?.map((run: { run_id: string }) => run.run_id).join(', ')}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to launch duel.');
    }
  };

  const submitting = status === 'running';
  const launchDisabled = submitting || !sessionId || !apiKey || selectedAgents.length < 2;

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 text-sm text-slate-200">
      <h3 className="text-lg font-semibold text-white">Duel of Agents</h3>
      <p className="mt-2 text-sm text-slate-300">Spin up two host agents under the Overseer pipeline and compare their approval trajectories.</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-4">
        <fieldset className="space-y-3 rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-3">
          <legend className="px-2 text-xs uppercase tracking-[0.2em] text-brand-accent">Available agents</legend>
          {roster.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {roster.map((agent) => {
                const checked = selectedAgents.includes(agent);
                return (
                  <label key={agent} className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition', checked ? 'border-brand-accent/60 bg-brand-accent/10' : 'border-brand-outline/50 bg-brand-paper/60 hover:border-brand-accent/40')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAgent(agent)}
                      className="h-4 w-4 rounded border border-brand-outline/60 bg-brand-paper accent-brand-accent"
                    />
                    <span className="font-mono text-xs text-slate-200">{agent}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No agents observed yet. Add host identifiers below to run a duel.</p>
          )}
          <p className="text-xs text-slate-400">Select between 2 and 4 agents. Selected agents will be re-run with identical prompts.</p>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            Add agent
            <input
              value={customAgent}
              onChange={(event) => setCustomAgent(event.target.value)}
              placeholder="Enter host agent identifier"
              className="mt-1 w-full rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
          </label>
          <button
            type="button"
            onClick={addCustomAgent}
            className="inline-flex items-center rounded-full border border-brand-outline/40 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
          >
            Add
          </button>
        </div>

        {selectionError && <p className="text-xs text-rose-300">{selectionError}</p>}

        <button
          type="submit"
          className={clsx(
            'inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50',
            submitting ? 'bg-brand-accent/40 text-brand-ink' : launchDisabled ? 'bg-brand-accent/40 text-brand-ink opacity-70' : 'bg-brand-accent text-brand-ink hover:bg-brand-primary',
          )}
          disabled={launchDisabled}
        >
          {submitting ? 'Launching…' : 'Launch duel'}
        </button>
      </form>
      {message && (
        <p className={clsx('mt-3 text-xs', status === 'error' ? 'text-rose-300' : 'text-slate-300')}>{message}</p>
      )}
    </section>
  );
}

export default DuelLauncher;
