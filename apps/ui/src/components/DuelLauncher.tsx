import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';

async function launchDuel(
  eye: string,
  prompt: string,
  configs: Array<{ provider: string; model: string; label?: string }>
): Promise<Response> {
  const base = (process.env.NEXT_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:7070';
  return fetch(`${base}/api/duel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify({ eye, prompt, configs }),
  });
}

interface ModelConfig {
  provider: string;
  model: string;
  label?: string;
}

export interface DuelLauncherProps {
  eye?: string;
  prompt?: string;
  availableConfigs?: ModelConfig[];
}

export function DuelLauncher({
  eye = 'sharingan',
  prompt: initialPrompt = '',
  availableConfigs = [
    { provider: 'groq', model: 'llama-3.1-70b-versatile', label: 'Groq Llama 70B' },
    { provider: 'groq', model: 'llama-3.1-8b-instant', label: 'Groq Llama 8B' },
  ]
}: DuelLauncherProps) {
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [customProvider, setCustomProvider] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedConfigs((prev) => {
      if (prev.length >= 2) {
        return prev;
      }
      const next = [...prev];
      for (const config of availableConfigs) {
        if (next.length >= 2) break;
        const exists = next.some(c => c.provider === config.provider && c.model === config.model);
        if (!exists) {
          next.push(config);
        }
      }
      return next;
    });
  }, [availableConfigs]);

  const roster = useMemo(() => {
    const pool: ModelConfig[] = [...availableConfigs];
    selectedConfigs.forEach((config) => {
      const exists = pool.some(c => c.provider === config.provider && c.model === config.model);
      if (!exists) {
        pool.push(config);
      }
    });
    return pool;
  }, [availableConfigs, selectedConfigs]);

  const toggleConfig = (config: ModelConfig) => {
    setSelectionError(null);
    setMessage(null);
    setStatus('idle');
    setSelectedConfigs((prev) => {
      const exists = prev.some(c => c.provider === config.provider && c.model === config.model);
      if (exists) {
        return prev.filter(c => !(c.provider === config.provider && c.model === config.model));
      }
      if (prev.length >= 4) {
        setSelectionError('Select up to 4 model configurations for a duel.');
        return prev;
      }
      return [...prev, config];
    });
  };

  const addCustomConfig = () => {
    const provider = customProvider.trim();
    const model = customModel.trim();
    if (!provider || !model) return;
    setSelectionError(null);
    setMessage(null);
    setStatus('idle');
    setSelectedConfigs((prev) => {
      const exists = prev.some(c => c.provider === provider && c.model === model);
      if (exists) {
        setSelectionError('Configuration already selected.');
        return prev;
      }
      if (prev.length >= 4) {
        setSelectionError('Select up to 4 model configurations for a duel.');
        return prev;
      }
      return [...prev, { provider, model, label: `${provider}/${model}` }];
    });
    setCustomProvider('');
    setCustomModel('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setMessage('Provide a prompt to launch a duel.');
      return;
    }
    if (selectedConfigs.length < 2) {
      setSelectionError('Select at least two model configurations to launch a duel.');
      return;
    }
    try {
      setStatus('running');
      setMessage('Launching duel…');
      const response = await launchDuel(eye, prompt, selectedConfigs);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `HTTP ${response.status}`);
      }
      const payload = await response.json();
      setStatus('success');
      setMessage(`Duel completed! Session ID: ${payload.sessionId}`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to launch duel.');
    }
  };

  const submitting = status === 'running';
  const launchDisabled = submitting || !prompt.trim() || selectedConfigs.length < 2;

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 text-sm text-slate-200">
      <h3 className="text-lg font-semibold text-white">Duel Mode</h3>
      <p className="mt-2 text-sm text-slate-300">Compare multiple LLM providers/models side-by-side with identical prompts.</p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-[0.2em] text-slate-400 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here..."
            rows={4}
            className="w-full rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
          />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-3">
          <legend className="px-2 text-xs uppercase tracking-[0.2em] text-brand-accent">Model Configurations</legend>
          {roster.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {roster.map((config) => {
                const key = `${config.provider}-${config.model}`;
                const checked = selectedConfigs.some(c => c.provider === config.provider && c.model === config.model);
                const label = config.label || `${config.provider}/${config.model}`;
                return (
                  <label key={key} className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition', checked ? 'border-brand-accent/60 bg-brand-accent/10' : 'border-brand-outline/50 bg-brand-paper/60 hover:border-brand-accent/40')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleConfig(config)}
                      className="h-4 w-4 rounded border border-brand-outline/60 bg-brand-paper accent-brand-accent"
                    />
                    <span className="font-mono text-xs text-slate-200">{label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No configurations available. Add custom configurations below.</p>
          )}
          <p className="text-xs text-slate-400">Select between 2 and 4 model configurations.</p>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Provider
            <input
              value={customProvider}
              onChange={(event) => setCustomProvider(event.target.value)}
              placeholder="e.g., groq"
              className="mt-1 w-full rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Model
            <input
              value={customModel}
              onChange={(event) => setCustomModel(event.target.value)}
              placeholder="e.g., llama-3.1-8b-instant"
              className="mt-1 w-full rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addCustomConfig}
          className="inline-flex items-center rounded-full border border-brand-outline/40 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
        >
          Add Configuration
        </button>

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
