import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ApiKeyEntry, ApiKeyUpdatePayload, OptionItem } from '../types/admin';
import MultiSelect from './MultiSelect';
import { useAdminStore } from '../store/adminStore';

export interface ApiKeyEditDrawerProps {
  keyEntry: ApiKeyEntry | null;
  open: boolean;
  onClose: () => void;
  onSave: (payload: ApiKeyUpdatePayload) => Promise<void>;
  loading?: boolean;
  apiKey: string;
}

export function ApiKeyEditDrawer({ keyEntry, open, onClose, onSave, loading = false, apiKey }: ApiKeyEditDrawerProps) {
  const [limits, setLimits] = useState(keyEntry?.limits ?? {});
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { options, loadingOptions, fetchOptions } = useAdminStore((state) => ({
    options: state.options,
    loadingOptions: state.loadingOptions,
    fetchOptions: state.fetchOptions,
  }));
  const controlsDisabled = loading || !apiKey;

  const branchOptions = useMemo<OptionItem[]>(() => options?.branches ?? [], [options]);
  const toolOptions = useMemo<OptionItem[]>(() => options?.tools ?? [], [options]);
  const tenantOptions = useMemo<OptionItem[]>(() => options?.tenants ?? [], [options]);

  const branchValues = Array.isArray(limits?.branches) ? (limits?.branches as string[]) : [];
  const toolValues = Array.isArray(limits?.tools) ? (limits?.tools as string[]) : [];
  const tenantValues = Array.isArray(limits?.tenants) ? (limits?.tenants as string[]) : [];

  useEffect(() => {
    if (keyEntry) {
      setLimits(keyEntry.limits ?? {});
      setDisplayName(keyEntry.display_name ?? '');
      if (keyEntry.expires_at) {
        const iso = new Date(keyEntry.expires_at * 1000).toISOString().slice(0, 16);
        setExpiresAt(iso);
      } else {
        setExpiresAt('');
      }
    }
  }, [keyEntry]);

  useEffect(() => {
    if (!open) return;
    if (!apiKey) return;
    if (options) return;
    fetchOptions(apiKey).catch(() => {});
  }, [open, apiKey, options, fetchOptions]);

  const handleSave = async () => {
    if (!keyEntry) return;
    try {
      setError(null);
      const payload: ApiKeyUpdatePayload = {
        limits,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const normalizedDisplay = displayName.trim();
      if (normalizedDisplay || keyEntry.display_name) {
        payload.display_name = normalizedDisplay || null;
      }
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update key');
    }
  };

  return (
    <AnimatePresence>
      {open && keyEntry ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl border border-surface-outline/60 bg-surface-raised/90 p-6 text-sm text-slate-200 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <header className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-accent-primary">Update API Key</p>
                <h2 className="mt-1 font-mono text-white">{keyEntry.id}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-surface-outline/50 px-3 py-1 text-xs text-slate-300 transition hover:border-accent-primary hover:text-accent-primary"
              >
                Close
              </button>
            </header>

            <div className="mt-4 space-y-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Display name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Human-friendly label"
                  className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={controlsDisabled}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Expires</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={controlsDisabled}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Requests per minute</span>
                <input
                  type="number"
                  min={0}
                  value={Number(limits?.rate?.per_minute ?? 60)}
                  onChange={(event) =>
                    setLimits((prev) => ({
                      ...(prev ?? {}),
                      rate: { ...(prev?.rate as Record<string, unknown> | undefined), per_minute: Number(event.target.value) },
                    }))
                  }
                  className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={controlsDisabled}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Budget per request</span>
                <input
                  type="number"
                  min={0}
                  value={Number(limits?.budget?.max_per_request ?? 2000)}
                  onChange={(event) =>
                    setLimits((prev) => ({
                      ...(prev ?? {}),
                      budget: { ...(prev?.budget as Record<string, unknown> | undefined), max_per_request: Number(event.target.value) },
                    }))
                  }
                  className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={controlsDisabled}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-slate-300">Max budget tokens</span>
                <input
                  type="number"
                  min={0}
                  value={Number(limits?.max_budget_tokens ?? 0)}
                  onChange={(event) => setLimits((prev) => ({ ...(prev ?? {}), max_budget_tokens: Number(event.target.value) }))}
                  className="w-32 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-right text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                  disabled={controlsDisabled}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-slate-300">Allowed branches</span>
                <MultiSelect
                  value={branchValues}
                  options={branchOptions}
                  onChange={(next) => setLimits((prev) => ({ ...(prev ?? {}), branches: next }))}
                  placeholder={branchOptions.length ? 'Choose branches' : 'No branches configured'}
                  disabled={controlsDisabled}
                  busy={loadingOptions}
                  emptyLabel="No branch options available"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-slate-300">Allowed tools</span>
                <MultiSelect
                  value={toolValues}
                  options={toolOptions}
                  onChange={(next) => setLimits((prev) => ({ ...(prev ?? {}), tools: next }))}
                  placeholder={toolOptions.length ? 'Choose tools' : 'No tools discovered'}
                  disabled={controlsDisabled}
                  busy={loadingOptions}
                  emptyLabel="No tool options available"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-slate-300">Allowed tenants</span>
                <div className="flex flex-col gap-2 text-xs text-slate-400">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
                      disabled={controlsDisabled}
                      checked={tenantValues.includes('__all__')}
                      onChange={(event) =>
                        setLimits((prev) => {
                          const checked = event.target.checked;
                          const next = { ...(prev ?? {}) };
                          if (checked) {
                            next.tenants = ['__all__'];
                          } else if (Array.isArray(next.tenants)) {
                            next.tenants = next.tenants.filter((value) => value !== '__all__');
                          }
                          return next;
                        })
                      }
                    />
                    <span>Allow all tenants</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
                      disabled={controlsDisabled}
                      checked={tenantValues.includes('__primary__')}
                      onChange={(event) =>
                        setLimits((prev) => {
                          const checked = event.target.checked;
                          const next = { ...(prev ?? {}) };
                          if (checked) {
                            next.tenants = ['__primary__'];
                          } else if (Array.isArray(next.tenants)) {
                            next.tenants = next.tenants.filter((value) => value !== '__primary__');
                          }
                          return next;
                        })
                      }
                    />
                    <span>Match primary tenant only</span>
                  </label>
                </div>
                <MultiSelect
                  value={tenantValues}
                  options={tenantOptions}
                  onChange={(next) => setLimits((prev) => ({ ...(prev ?? {}), tenants: next }))}
                  placeholder={tenantOptions.length ? 'Choose tenants' : 'Add tenant IDs'}
                  disabled={
                    controlsDisabled || tenantValues.includes('__all__') || tenantValues.includes('__primary__')
                  }
                  busy={loadingOptions}
                  emptyLabel="No tenant catalog yet"
                  allowCustom
                />
              </div>

              {error && <p className="text-sm text-accent-danger">{error}</p>}
            </div>

            <footer className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-surface-outline/60 px-4 py-2 text-xs text-slate-300 transition hover:border-accent-primary hover:text-accent-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={controlsDisabled}
                className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save changes'}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default ApiKeyEditDrawer;
