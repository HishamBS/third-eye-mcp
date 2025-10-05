import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import type { ApiKeyCreatePayload, OptionItem } from '../types/admin';
import MultiSelect from './MultiSelect';

export interface ApiKeyCreateFormProps {
  onSubmit: (payload: ApiKeyCreatePayload) => Promise<void>;
  disabled?: boolean;
  apiKey?: string;
}

const DEFAULT_PAYLOAD: ApiKeyCreatePayload = {
  role: 'consumer',
  tenant: '',
  display_name: '',
  limits: {
    rate: { per_minute: 60 },
    budget: { max_per_request: 2000 },
    branches: [],
    tools: [],
    tenants: [],
  },
  ttl_seconds: null,
};

export function ApiKeyCreateForm({ onSubmit, disabled = false, apiKey }: ApiKeyCreateFormProps) {
  const [formState, setFormState] = useState<ApiKeyCreatePayload>(DEFAULT_PAYLOAD);
  const [ttlUnit, setTtlUnit] = useState<'hours' | 'days' | 'none'>(DEFAULT_PAYLOAD.ttl_seconds ? 'hours' : 'none');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { options, loadingOptions, fetchOptions } = useAdminStore((state) => ({
    options: state.options,
    loadingOptions: state.loadingOptions,
    fetchOptions: state.fetchOptions,
  }));

  useEffect(() => {
    if (!apiKey) return;
    fetchOptions(apiKey).catch(() => {});
  }, [apiKey, fetchOptions]);

  const branchOptions = useMemo<OptionItem[]>(() => options?.branches ?? [], [options]);
  const toolOptions = useMemo<OptionItem[]>(() => options?.tools ?? [], [options]);
  const tenantOptions = useMemo<OptionItem[]>(() => options?.tenants ?? [], [options]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled || loading) return;
    try {
      setLoading(true);
      setError(null);
      const normalizedTenant = formState.tenant?.trim() || undefined;
      const normalizedDisplayName = formState.display_name?.trim() || undefined;
      const payload: ApiKeyCreatePayload = {
        role: formState.role,
        limits: formState.limits,
        tenant: normalizedTenant,
        display_name: normalizedDisplayName,
        ttl_seconds:
          ttlUnit === 'none'
            ? null
            : ttlUnit === 'hours'
              ? Number(formState.ttl_seconds ?? 0) * 3600
              : Number(formState.ttl_seconds ?? 0) * 86400,
      };
      if (!payload.tenant) delete payload.tenant;
      if (!payload.display_name) delete payload.display_name;
      await onSubmit(payload);
      setFormState(DEFAULT_PAYLOAD);
      setTtlUnit('none');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-outline/60 bg-surface-raised/80 p-6 shadow-lg">
      <header>
        <h2 className="text-lg font-semibold text-white">Create API Key</h2>
        <p className="mt-1 text-sm text-slate-300">Provision tenant-scoped keys with rate and budget guardrails.</p>
      </header>

      <section className="space-y-4 rounded-xl border border-surface-outline/50 bg-surface-base/60 p-5 text-sm text-slate-200">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-white">Basics</h3>
          <p className="text-xs text-slate-400">Define the key identity, default tenant, and lifetime.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span>
              Role
              <span className="ml-2 text-xs text-slate-400">Controls console access for this credential.</span>
            </span>
            <select
              value={formState.role}
              onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value }))}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            >
              <option value="consumer">Consumer · Read-only playback & portal</option>
              <option value="operator">Operator · Manage sessions & budgets</option>
              <option value="admin">Admin · Full control plane</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span>
              Display name
              <span className="ml-2 text-xs text-slate-400">Shown in the key directory and audit trail.</span>
            </span>
            <input
              minLength={1}
              value={formState.display_name ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, display_name: event.target.value }))}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              placeholder="Ops Production Key"
              disabled={disabled}
            />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span>
              Tenant
              <span className="ml-2 text-xs text-slate-400">Choose where the key belongs by default.</span>
            </span>
            <input
              list="tenant-directory"
              value={formState.tenant ?? ''}
              onChange={(event) => setFormState((prev) => ({ ...prev, tenant: event.target.value }))}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              placeholder={tenantOptions.length ? 'Select tenant' : 'Enter tenant ID'}
            />
            <datalist id="tenant-directory">
              {tenantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-2">
            <span>
              Expiration (TTL)
              <span className="ml-2 text-xs text-slate-400">Zero keeps the key active until you revoke it.</span>
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                value={formState.ttl_seconds ?? ''}
                onChange={(event) => setFormState((prev) => ({ ...prev, ttl_seconds: Number(event.target.value) }))}
                placeholder="0"
              />
              <select
                value={ttlUnit}
                onChange={(event) => setTtlUnit(event.target.value as typeof ttlUnit)}
                className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              >
                <option value="none">No expiry</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>
          </label>
        </div>
      </section>

      <details open className="rounded-xl border border-surface-outline/40 bg-surface-base/40 p-4 text-sm text-slate-200">
        <summary className="cursor-pointer text-sm font-semibold text-white">Advanced Guardrails</summary>
        <p className="mt-2 text-xs text-slate-400">Overwrite defaults for rate limits, budgets, and tenant scoping. Leave unchanged to inherit the environment profile.</p>
        <div className="mt-4 grid gap-4">
          <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col">
              <span>Requests per minute</span>
              <span className="text-xs text-slate-400">Hard throttle before hitting shared rate limits.</span>
            </span>
            <input
              type="number"
              min="0"
              value={Number(formState.limits?.rate?.per_minute ?? 60)}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    rate: { ...(prev.limits?.rate ?? {}), per_minute: Number(event.target.value) },
                  },
                }))
              }
              className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col">
              <span>Budget / request</span>
              <span className="text-xs text-slate-400">Cap token spend per invocation.</span>
            </span>
            <input
              type="number"
              min="0"
              value={Number(formState.limits?.budget?.max_per_request ?? 2000)}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    budget: { ...(prev.limits?.budget ?? {}), max_per_request: Number(event.target.value) },
                  },
                }))
              }
              className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              disabled={disabled}
            />
          </label>
          <label className="flex items-center justify-between gap-4">
            <span className="flex flex-col">
              <span>Max budget tokens</span>
              <span className="text-xs text-slate-400">Optional hard ceiling for cumulative spend.</span>
            </span>
            <input
              type="number"
              min="0"
              value={Number(formState.limits?.max_budget_tokens ?? 0)}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    max_budget_tokens: Number(event.target.value),
                  },
                }))
              }
              className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              disabled={disabled}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>Allowed branches</span>
            <MultiSelect
              value={Array.isArray(formState.limits?.branches) ? formState.limits?.branches : []}
              options={branchOptions}
              onChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    branches: next,
                  },
                }))
              }
              placeholder={branchOptions.length ? 'Choose branches' : 'No branches configured'}
              busy={loadingOptions}
              emptyLabel="No branch options available"
              disabled={disabled}
            />
            <p className="text-xs text-slate-400">Limit tools to a subset of control-plane branches.</p>
          </label>
          <label className="flex flex-col gap-2">
            <span>Allowed tools</span>
            <MultiSelect
              value={Array.isArray(formState.limits?.tools) ? formState.limits?.tools : []}
              options={toolOptions}
              onChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    tools: next,
                  },
                }))
              }
              placeholder={toolOptions.length ? 'Choose tools' : 'No tools discovered'}
              busy={loadingOptions}
              emptyLabel="No tool options available"
              disabled={disabled}
            />
            <p className="text-xs text-slate-400">Restrict the key to specific tool integrations.</p>
          </label>
          <div className="flex flex-col gap-2">
            <span>Allowed tenants</span>
            <div className="flex flex-col gap-2 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
                  disabled={disabled}
                  checked={Array.isArray(formState.limits?.tenants) && formState.limits?.tenants.includes('__all__')}
                  onChange={(event) =>
                    setFormState((prev) => {
                      const checked = event.target.checked;
                      const nextLimits = { ...(prev.limits ?? {}) };
                      if (checked) {
                        nextLimits.tenants = ['__all__'];
                      } else if (Array.isArray(nextLimits.tenants)) {
                        nextLimits.tenants = nextLimits.tenants.filter((value) => value !== '__all__');
                      }
                      return { ...prev, limits: nextLimits };
                    })
                  }
                />
                <span>Allow all tenants (overrides tenant restrictions)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
                  disabled={disabled}
                  checked={Array.isArray(formState.limits?.tenants) && formState.limits?.tenants.includes('__primary__')}
                  onChange={(event) =>
                    setFormState((prev) => {
                      const checked = event.target.checked;
                      const nextLimits = { ...(prev.limits ?? {}) };
                      if (checked) {
                        nextLimits.tenants = ['__primary__'];
                      } else if (Array.isArray(nextLimits.tenants)) {
                        nextLimits.tenants = nextLimits.tenants.filter((value) => value !== '__primary__');
                      }
                      return { ...prev, limits: nextLimits };
                    })
                  }
                />
                <span>Match primary tenant (single-tenant enforcement)</span>
              </label>
            </div>
            <MultiSelect
              value={Array.isArray(formState.limits?.tenants) ? formState.limits?.tenants : []}
              options={tenantOptions}
              onChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  limits: {
                    ...(prev.limits ?? {}),
                    tenants: next,
                  },
                }))
              }
              placeholder={tenantOptions.length ? 'Choose tenants' : 'Add tenant IDs'}
              busy={loadingOptions}
              emptyLabel="No tenant catalog yet"
              allowCustom
              disabled={
                disabled || (Array.isArray(formState.limits?.tenants) && (formState.limits?.tenants.includes('__all__') || formState.limits?.tenants.includes('__primary__')))
              }
            />
            <p className="text-xs text-slate-400">Use the toggles above to open access to every tenant or inherit the key’s primary tenant.</p>
          </div>
        </div>
      </details>

      {error && <p className="text-sm text-accent-danger">{error}</p>}

      <button
        type="submit"
        disabled={disabled || loading}
        className="inline-flex items-center justify-center rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Provisioning…' : 'Create key'}
      </button>
    </form>
  );
}

export default ApiKeyCreateForm;
