import { useEffect, useMemo, useState } from 'react';
import {
  fetchProviders,
  fetchProviderModels,
} from '../lib/api';
import type {
  AdminEnvironmentSettings,
  AdminEnvironmentSettingsPayload,
  EnvironmentModelConfig,
} from '../types/admin';
import { useAdminStore } from '../store/adminStore';

export interface SettingsPageProps {
  apiKey: string;
  disabled?: boolean;
}

type ProviderModelMap = Record<string, string[]>;

type DraftGuardrails = AdminEnvironmentSettings['guardrails'];

type DraftDefaults = EnvironmentModelConfig[];

export function SettingsPage({ apiKey, disabled = false }: SettingsPageProps) {
  const {
    environmentSettings,
    loadingEnvironmentSettings,
    fetchEnvironmentSettings,
    updateEnvironmentSettings,
    options,
    fetchOptions,
    error,
  } = useAdminStore();

  const [draftDefaults, setDraftDefaults] = useState<DraftDefaults>([]);
  const [draftGuardrails, setDraftGuardrails] = useState<DraftGuardrails>({});
  const [draftPrometheusUrl, setDraftPrometheusUrl] = useState('');
  const [providers, setProviders] = useState<string[]>([]);
  const [modelsByProvider, setModelsByProvider] = useState<ProviderModelMap>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || disabled) return;
    fetchOptions(apiKey).catch(() => {});
    fetchEnvironmentSettings(apiKey).catch(() => {});
  }, [apiKey, disabled, fetchOptions, fetchEnvironmentSettings]);

  useEffect(() => {
    if (!apiKey || disabled) return;
    fetchProviders(apiKey)
      .then((providerList) => {
        setProviders(providerList);
        return Promise.all(
          providerList.map(async (provider) => {
            try {
              const models = await fetchProviderModels(apiKey, provider);
              return [provider, models] as const;
            } catch (error) {
              console.error('Failed to load provider models', provider, error);
              return [provider, []] as const;
            }
          }),
        );
      })
      .then((entries) => {
        setModelsByProvider(Object.fromEntries(entries));
      })
      .catch((err) => {
        console.error('Failed to fetch providers', err);
      });
  }, [apiKey, disabled]);

  useEffect(() => {
    if (!environmentSettings) return;
    setDraftDefaults(environmentSettings.defaults ?? []);
    setDraftGuardrails(environmentSettings.guardrails ?? {});
    setDraftPrometheusUrl(environmentSettings.observability?.prometheus_base_url ?? '');
  }, [environmentSettings]);

  const availableTools = useMemo(() => options?.tools ?? [], [options]);

  const getModelsForProvider = (provider: string): string[] => {
    return modelsByProvider[provider] ?? [];
  };

  const ensureRow = (tool: string) => {
    setDraftDefaults((prev) => {
      if (prev.some((item) => item.tool === tool)) {
        return prev;
      }
      return [
        ...prev,
        {
          tool,
          default_provider: providers[0] ?? '',
          default_model: '',
          fallback_provider: null,
          fallback_model: null,
        },
      ];
    });
  };

  const updateRow = (tool: string, updates: Partial<EnvironmentModelConfig>) => {
    setDraftDefaults((prev) =>
      prev.map((item) =>
        item.tool === tool
          ? {
              ...item,
              ...updates,
            }
          : item,
      ),
    );
  };

  const removeRow = (tool: string) => {
    setDraftDefaults((prev) => prev.filter((item) => item.tool !== tool));
  };

  const handleAddTool = (tool: string) => {
    if (!tool) return;
    ensureRow(tool);
  };

  const handleSave = async () => {
    if (!apiKey || disabled) return;
    setSaving(true);
    setFeedback(null);
    const trimmedUrl = draftPrometheusUrl.trim();
    const payload: AdminEnvironmentSettingsPayload = {
      defaults: draftDefaults,
      guardrails: draftGuardrails,
      observability: {
        prometheus_base_url: trimmedUrl ? trimmedUrl : null,
      },
    };
    try {
      await updateEnvironmentSettings(apiKey, payload);
      setFeedback('Environment settings updated successfully.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to update environment settings.');
    } finally {
      setSaving(false);
    }
  };

  const renderDefaultsTable = () => {
    if (!draftDefaults.length) {
      return <p className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-300">Select a tool to configure default providers.</p>;
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-surface-outline/50 bg-surface-raised/70 shadow-lg">
        <table className="min-w-full divide-y divide-surface-outline/50 text-sm">
          <thead className="bg-surface-raised/90 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Tool</th>
              <th className="px-4 py-3 text-left">Default provider</th>
              <th className="px-4 py-3 text-left">Default model</th>
              <th className="px-4 py-3 text-left">Fallback provider</th>
              <th className="px-4 py-3 text-left">Fallback model</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-outline/40">
            {draftDefaults.map((row) => {
              const defaultModels = row.default_provider ? getModelsForProvider(row.default_provider) : [];
              const fallbackModels = row.fallback_provider ? getModelsForProvider(row.fallback_provider) : [];
              return (
                <tr key={row.tool} className="odd:bg-surface-base/40">
                  <td className="px-4 py-3 font-mono text-xs text-accent-primary">{row.tool}</td>
                  <td className="px-4 py-3">
                    <select
                      value={row.default_provider}
                      onChange={(event) =>
                        updateRow(row.tool, {
                          default_provider: event.target.value,
                          default_model: '',
                        })
                      }
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                      disabled={disabled}
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
                      value={row.default_model}
                      onChange={(event) => updateRow(row.tool, { default_model: event.target.value })}
                      disabled={disabled || !row.default_provider}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value="" disabled>
                        Select model…
                      </option>
                      {defaultModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.fallback_provider ?? ''}
                      onChange={(event) =>
                        updateRow(row.tool, {
                          fallback_provider: event.target.value || null,
                          fallback_model: '',
                        })
                      }
                      disabled={disabled}
                      className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    >
                      <option value="">No fallback</option>
                      {providers.map((provider) => (
                        <option key={provider} value={provider}>
                          {provider}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.fallback_model ?? ''}
                      onChange={(event) => updateRow(row.tool, { fallback_model: event.target.value || null })}
                      disabled={disabled || !row.fallback_provider}
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
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => removeRow(row.tool)}
                      disabled={disabled}
                      className="rounded-full border border-surface-outline/50 px-3 py-1 text-xs text-rose-300 transition hover:border-rose-400 hover:text-rose-200 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const lastUpdated = useMemo(() => {
    if (!environmentSettings?.updated_at) return null;
    const date = new Date(environmentSettings.updated_at * 1000);
    return date.toLocaleString();
  }, [environmentSettings]);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Environment defaults</p>
        <h1 className="text-3xl font-semibold text-white">Global Model & Guardrail Settings</h1>
        <p className="text-sm text-slate-300">Define platform-wide defaults for Overseer deployments. Changes apply to new sessions immediately.</p>
        {lastUpdated && (
          <p className="text-xs text-slate-500">Last updated {lastUpdated}{environmentSettings?.updated_by ? ` by ${environmentSettings.updated_by}` : ''}</p>
        )}
      </header>

      {error && <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm text-accent-danger">{error}</p>}

      <div className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-4 text-sm text-slate-200">
        <h2 className="text-lg font-semibold text-white">Guardrails</h2>
        <p className="mt-1 text-xs text-slate-400">Set global rate and budget constraints applied to every new API key.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Requests per minute</span>
            <input
              type="number"
              min={0}
              value={draftGuardrails.requests_per_minute ?? ''}
              onChange={(event) =>
                setDraftGuardrails((prev) => ({
                  ...prev,
                  requests_per_minute: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              disabled={disabled}
              placeholder="Unlimited"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Max tokens / request</span>
            <input
              type="number"
              min={0}
              value={draftGuardrails.max_tokens_per_request ?? ''}
              onChange={(event) =>
                setDraftGuardrails((prev) => ({
                  ...prev,
                  max_tokens_per_request: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              disabled={disabled}
              placeholder="Unlimited"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Default model routing</h2>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-slate-300">Add tool</span>
              <select
                onChange={(event) => {
                  handleAddTool(event.target.value);
                  event.target.value = '';
                }}
                disabled={disabled}
                defaultValue=""
                className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              >
                <option value="" disabled>
                  Choose tool…
                </option>
                {availableTools
                  .filter((tool) => !draftDefaults.some((item) => item.tool === tool.value))
                  .map((tool) => (
                    <option key={tool.value} value={tool.value}>
                      {tool.label || tool.value}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        {loadingEnvironmentSettings ? (
          <div className="h-48 animate-pulse rounded-2xl border border-surface-outline/60 bg-surface-raised/70" />
        ) : (
          renderDefaultsTable()
        )}
      </div>

      <div className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-4 text-sm text-slate-200">
        <h2 className="text-lg font-semibold text-white">Observability</h2>
        <p className="mt-1 text-xs text-slate-400">Configure the Prometheus endpoint used for control plane metrics.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Prometheus base URL</span>
            <input
              type="url"
              inputMode="url"
              value={draftPrometheusUrl}
              onChange={(event) => setDraftPrometheusUrl(event.target.value)}
              placeholder="https://prometheus.ops.internal"
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              disabled={disabled}
            />
          </label>
          <p className="rounded-xl border border-surface-outline/40 bg-surface-base/40 px-4 py-3 text-xs text-slate-400">
            Provide the managed Prometheus workspace URL scraped by Overseer. Leave blank to fall back to local counters.
          </p>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-3">
        {feedback && <p className="text-xs text-slate-400">{feedback}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || saving}
          className="inline-flex items-center rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </footer>
    </section>
  );
}

export default SettingsPage;
