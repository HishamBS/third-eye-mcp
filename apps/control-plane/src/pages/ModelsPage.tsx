import { useEffect, useMemo, useState } from 'react';
import {
  fetchToolModelMappings,
  updateToolModelMapping,
  fetchProviders,
  fetchProviderModels,
} from '../lib/api';
import type { ToolModelMapping, ToolModelUpdatePayload } from '../types/admin';

export interface ModelsPageProps {
  apiKey: string;
  disabled?: boolean;
}

type DraftMap = Record<string, ToolModelUpdatePayload>;

type ProviderModelMap = Record<string, string[]>;

type SavingMap = Record<string, boolean>;

type MessageMap = Record<string, string | null>;

const FALLBACK_NONE = 'none';

function buildPayload(mapping: ToolModelMapping): ToolModelUpdatePayload {
  return {
    primary_provider: mapping.primary_provider,
    primary_model: mapping.primary_model,
    fallback_provider: mapping.fallback_provider ?? undefined,
    fallback_model: mapping.fallback_model ?? undefined,
  };
}

export function ModelsPage({ apiKey, disabled = false }: ModelsPageProps) {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<string[]>([]);
  const [modelsByProvider, setModelsByProvider] = useState<ProviderModelMap>({});
  const [mappings, setMappings] = useState<ToolModelMapping[]>([]);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [saving, setSaving] = useState<SavingMap>({});
  const [messages, setMessages] = useState<MessageMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || disabled) {
      setMappings([]);
      return;
    }
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const [catalog, providerList] = await Promise.all([
          fetchToolModelMappings(apiKey),
          fetchProviders(apiKey),
        ]);
        const initialDrafts: DraftMap = {};
        catalog.forEach((item) => {
          initialDrafts[item.tool] = buildPayload(item);
        });
        setMappings(catalog);
        setDrafts(initialDrafts);
        setProviders(providerList);
        const entries = await Promise.all(
          providerList.map(async (provider) => {
            try {
              const models = await fetchProviderModels(apiKey, provider);
              return [provider, models] as const;
            } catch (fetchErr) {
              console.error('Failed to load models for provider', provider, fetchErr);
              return [provider, []] as const;
            }
          }),
        );
        setModelsByProvider(Object.fromEntries(entries));
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load model mappings');
      } finally {
        setLoading(false);
      }
    };
    load().catch((err) => {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load model mappings');
      setLoading(false);
    });
  }, [apiKey, disabled]);

  const sortedMappings = useMemo(() => {
    return [...mappings].sort((a, b) => a.tool.localeCompare(b.tool));
  }, [mappings]);

  const getModelsForProvider = (provider: string): string[] => {
    return modelsByProvider[provider] ?? [];
  };

  const ensureProviderModels = async (provider: string) => {
    if (modelsByProvider[provider]) return;
    try {
      const models = await fetchProviderModels(apiKey, provider);
      setModelsByProvider((prev) => ({ ...prev, [provider]: models }));
    } catch (err) {
      console.error('Failed to fetch models for provider', provider, err);
      setModelsByProvider((prev) => ({ ...prev, [provider]: [] }));
    }
  };

  const handlePrimaryProviderChange = async (tool: string, provider: string) => {
    setDrafts((prev) => {
      const existing = prev[tool] ?? { primary_provider: provider, primary_model: '', fallback_provider: undefined, fallback_model: undefined };
      return {
        ...prev,
        [tool]: {
          ...existing,
          primary_provider: provider,
          primary_model: '',
        },
      };
    });
    await ensureProviderModels(provider);
    setMessages((prev) => ({ ...prev, [tool]: null }));
  };

  const handleFallbackProviderChange = async (tool: string, provider: string | null) => {
    setDrafts((prev) => {
      const existing = prev[tool] ?? buildPayload(sortedMappings.find((item) => item.tool === tool)!);
      return {
        ...prev,
        [tool]: {
          ...existing,
          fallback_provider: provider ?? undefined,
          fallback_model: provider ? '' : undefined,
        },
      };
    });
    if (provider) {
      await ensureProviderModels(provider);
    }
    setMessages((prev) => ({ ...prev, [tool]: null }));
  };

  const handleModelChange = (tool: string, field: keyof ToolModelUpdatePayload, value: string | undefined) => {
    setDrafts((prev) => {
      const existing = prev[tool] ?? buildPayload(sortedMappings.find((item) => item.tool === tool)!);
      return {
        ...prev,
        [tool]: {
          ...existing,
          [field]: value,
        },
      };
    });
    setMessages((prev) => ({ ...prev, [tool]: null }));
  };

  const handleSave = async (tool: string) => {
    const draft = drafts[tool];
    if (!draft) return;
    if (!draft.primary_provider || !draft.primary_model) {
      setMessages((prev) => ({ ...prev, [tool]: 'Select primary provider and model before saving.' }));
      return;
    }
    setSaving((prev) => ({ ...prev, [tool]: true }));
    setMessages((prev) => ({ ...prev, [tool]: null }));
    try {
      const updated = await updateToolModelMapping(apiKey, tool, {
        primary_provider: draft.primary_provider,
        primary_model: draft.primary_model,
        fallback_provider: draft.fallback_provider ?? undefined,
        fallback_model: draft.fallback_model ?? undefined,
      });
      setMappings((prev) => prev.map((item) => (item.tool === tool ? updated : item)));
      setMessages((prev) => ({ ...prev, [tool]: 'Mapping saved.' }));
    } catch (err) {
      console.error(err);
      setMessages((prev) => ({ ...prev, [tool]: err instanceof Error ? err.message : 'Failed to save mapping.' }));
    } finally {
      setSaving((prev) => ({ ...prev, [tool]: false }));
    }
  };

  if (!apiKey) {
    return <p className="text-sm text-slate-300">Sign in to manage model mappings.</p>;
  }

  if (loading) {
    return <p className="text-sm text-slate-300">Loading model catalog…</p>;
  }

  if (error) {
    return <p className="text-sm text-accent-danger">{error}</p>;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">Model Routing</h2>
        <p className="text-sm text-slate-300">
          Configure which provider and model each Eye uses. Changes apply immediately for new pipeline executions.
        </p>
      </header>
      <div className="overflow-hidden rounded-2xl border border-surface-outline/50 bg-surface-raised/70 shadow-lg">
        <table className="min-w-full divide-y divide-surface-outline/50 text-sm">
          <thead className="bg-surface-raised/90 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Eye Tool</th>
              <th className="px-4 py-3 text-left">Primary Provider</th>
              <th className="px-4 py-3 text-left">Primary Model</th>
              <th className="px-4 py-3 text-left">Fallback Provider</th>
              <th className="px-4 py-3 text-left">Fallback Model</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-outline/40">
            {sortedMappings.map((item) => {
              const draft = drafts[item.tool] ?? buildPayload(item);
              const primaryModels = getModelsForProvider(draft.primary_provider);
              const fallbackProvider = draft.fallback_provider ?? undefined;
              const fallbackModels = fallbackProvider ? getModelsForProvider(fallbackProvider) : [];
              const savingRow = saving[item.tool];
              const message = messages[item.tool];
              return (
                <tr key={item.tool} className="odd:bg-surface-base/40">
                  <td className="px-4 py-3 font-mono text-xs text-accent-primary">{item.tool}</td>
                  <td className="px-4 py-3">
                    <select
                      disabled={disabled}
                      value={draft.primary_provider}
                      onChange={(event) => handlePrimaryProviderChange(item.tool, event.target.value)}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value="" disabled>
                        Select provider…
                      </option>
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={disabled || !draft.primary_provider}
                      value={draft.primary_model}
                      onChange={(event) => handleModelChange(item.tool, 'primary_model', event.target.value)}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value="" disabled>
                        Select model…
                      </option>
                      {primaryModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={disabled}
                      value={fallbackProvider ?? FALLBACK_NONE}
                      onChange={(event) => handleFallbackProviderChange(item.tool, event.target.value === FALLBACK_NONE ? null : event.target.value)}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value={FALLBACK_NONE}>No fallback</option>
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={disabled || !fallbackProvider}
                      value={draft.fallback_model ?? ''}
                      onChange={(event) => handleModelChange(item.tool, 'fallback_model', event.target.value || undefined)}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value="">Select model…</option>
                      {fallbackModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleSave(item.tool)}
                        disabled={disabled || savingRow || !draft.primary_provider || !draft.primary_model}
                        className="inline-flex w-full items-center justify-center rounded-full bg-accent-primary px-3 py-2 font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingRow ? 'Saving…' : 'Save mapping'}
                      </button>
                      {message && <span className="text-slate-300">{message}</span>}
                      {!message && item.updated_at && (
                        <span className="text-slate-500">
                          Updated {new Date(item.updated_at * 1000).toLocaleString()} {item.updated_by ? `by ${item.updated_by}` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default ModelsPage;
