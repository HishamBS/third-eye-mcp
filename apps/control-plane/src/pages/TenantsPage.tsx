import { FormEvent, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useAdminStore } from '../store/adminStore';
import type { TenantCreatePayload, TenantEntry, TenantUpdatePayload } from '../types/admin';

export interface TenantsPageProps {
  apiKey: string;
  disabled?: boolean;
}

function formatTimestamp(value?: number | null): string {
  if (!value) return '—';
  try {
    return formatDistanceToNow(new Date(value * 1000), { addSuffix: true });
  } catch (error) {
    console.error(error);
    return new Date(value * 1000).toLocaleString();
  }
}

function normalizeTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(',')
        .map((token) => token.trim())
        .filter((token) => token.length > 0),
    ),
  );
}

interface TenantFormState {
  id: string;
  display_name: string;
  description: string;
  tags: string;
}

const DEFAULT_FORM: TenantFormState = {
  id: '',
  display_name: '',
  description: '',
  tags: '',
};

function TenantCreateForm({ onCreate, disabled }: { onCreate: (payload: TenantCreatePayload) => Promise<void>; disabled: boolean }) {
  const [formState, setFormState] = useState<TenantFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy || disabled) return;
    if (!formState.id.trim() || !formState.display_name.trim()) {
      setError('Tenant ID and display name are required');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await onCreate({
        id: formState.id.trim(),
        display_name: formState.display_name.trim(),
        description: formState.description.trim() || undefined,
        tags: normalizeTags(formState.tags),
      });
      setFormState(DEFAULT_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-outline/60 bg-surface-raised/80 p-6 shadow-lg">
      <header>
        <h2 className="text-lg font-semibold text-white">Create Tenant</h2>
        <p className="mt-1 text-sm text-slate-300">Register a new tenant to scope API keys and reporting.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Tenant ID
          <input
            required
            minLength={2}
            value={formState.id}
            disabled={busy || disabled}
            onChange={(event) => setFormState((prev) => ({ ...prev, id: event.target.value }))}
            className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            placeholder="tenant-slug"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Display name
          <input
            required
            minLength={2}
            value={formState.display_name}
            disabled={busy || disabled}
            onChange={(event) => setFormState((prev) => ({ ...prev, display_name: event.target.value }))}
            className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            placeholder="Tenant Friendly Name"
          />
        </label>
      </div>
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        Description (optional)
        <textarea
          rows={2}
          value={formState.description}
          disabled={busy || disabled}
          onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
          className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          placeholder="Notes about the tenant"
        />
      </label>
      <label className="flex flex-col gap-2 text-sm text-slate-200">
        Tags (comma separated)
        <input
          value={formState.tags}
          disabled={busy || disabled}
          onChange={(event) => setFormState((prev) => ({ ...prev, tags: event.target.value }))}
          className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          placeholder="primary, production"
        />
      </label>
      {error && <p className="text-sm text-accent-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy || disabled}
        className="rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-accent-primary/80 disabled:opacity-50"
      >
        {busy ? 'Creating…' : 'Create tenant'}
      </button>
    </form>
  );
}

interface TenantEditProps {
  tenant: TenantEntry;
  onClose: () => void;
  onSave: (tenantId: string, payload: TenantUpdatePayload) => Promise<void>;
  disabled: boolean;
}

function TenantEditDrawer({ tenant, onClose, onSave, disabled }: TenantEditProps) {
  const [displayName, setDisplayName] = useState(tenant.display_name);
  const [description, setDescription] = useState(tenant.description ?? '');
  const [tags, setTags] = useState(tenant.tags.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (busy || disabled) return;
    try {
      setBusy(true);
      setError(null);
      await onSave(tenant.id, {
        display_name: displayName.trim() || tenant.display_name,
        description: description.trim() || null,
        tags: normalizeTags(tags),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tenant');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur">
      <div className="w-full max-w-lg rounded-2xl border border-surface-outline/60 bg-surface-raised/90 p-6 text-sm text-slate-200 shadow-xl">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent-primary">Edit Tenant</p>
            <h2 className="font-mono text-white">{tenant.id}</h2>
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
              disabled={busy || disabled}
              onChange={(event) => setDisplayName(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Description</span>
            <textarea
              rows={3}
              value={description}
              disabled={busy || disabled}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Tags</span>
            <input
              value={tags}
              disabled={busy || disabled}
              onChange={(event) => setTags(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              placeholder="primary, production"
            />
          </label>
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
            disabled={busy || disabled}
            className="rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition hover:bg-accent-primary/80 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function TenantsPage({ apiKey, disabled = false }: TenantsPageProps) {
  const {
    tenants,
    loadingTenants,
    fetchTenants,
    createTenant,
    updateTenant,
    archiveTenant,
    restoreTenant,
    error,
  } = useAdminStore((state) => ({
    tenants: state.tenants,
    loadingTenants: state.loadingTenants,
    fetchTenants: state.fetchTenants,
    createTenant: state.createTenant,
    updateTenant: state.updateTenant,
    archiveTenant: state.archiveTenant,
    restoreTenant: state.restoreTenant,
    error: state.error,
  }));

  const [includeArchived, setIncludeArchived] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantEntry | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    fetchTenants(apiKey, { includeArchived, search }).catch((err) => {
      console.error(err);
    });
  }, [apiKey, includeArchived, search, fetchTenants]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = searchInput.trim();
    setSearch(value || null);
  };

  const handleCreate = async (payload: TenantCreatePayload) => {
    if (!apiKey || disabled) return;
    await createTenant(apiKey, payload);
    await fetchTenants(apiKey, { includeArchived, search });
  };

  const handleUpdate = async (tenantId: string, payload: TenantUpdatePayload) => {
    if (!apiKey || disabled) return;
    await updateTenant(apiKey, tenantId, payload);
    await fetchTenants(apiKey, { includeArchived, search });
  };

  const handleArchive = async (tenantId: string) => {
    if (!apiKey || disabled) return;
    await archiveTenant(apiKey, tenantId);
    await fetchTenants(apiKey, { includeArchived, search });
  };

  const handleRestore = async (tenantId: string) => {
    if (!apiKey || disabled) return;
    await restoreTenant(apiKey, tenantId);
    await fetchTenants(apiKey, { includeArchived, search });
  };

  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [tenants]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 shadow-lg">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Tenant Directory</h2>
            <p className="text-sm text-slate-300">Track tenant health, key usage, and lifecycle status.</p>
          </div>
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              disabled={disabled}
              placeholder="Search tenants"
              className="w-60 rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeArchived}
                disabled={disabled}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
              />
              <span>Include archived</span>
            </label>
            <button
              type="submit"
              disabled={disabled}
              className="rounded-full border border-surface-outline/50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 transition hover:border-accent-primary hover:text-accent-primary"
            >
              Filter
            </button>
          </form>
        </header>
        {loadingTenants ? (
          <p className="mt-6 text-sm text-slate-300">Loading tenants…</p>
        ) : sortedTenants.length === 0 ? (
          <p className="mt-6 text-sm text-slate-300">No tenants discovered yet.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-surface-outline/50">
            <table className="min-w-full divide-y divide-surface-outline/60 text-sm">
              <thead className="bg-surface-base/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Display</th>
                  <th className="px-4 py-3 text-left">Tenant ID</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Active Keys</th>
                  <th className="px-4 py-3 text-left">Total Keys</th>
                  <th className="px-4 py-3 text-left">Last Rotation</th>
                  <th className="px-4 py-3 text-left">Last Activity</th>
                  <th className="px-4 py-3 text-left">Tags</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-outline/60 text-slate-200">
                {sortedTenants.map((tenant) => {
                  const archived = Boolean(tenant.archived_at);
                  return (
                    <tr key={tenant.id} className={clsx(archived && 'bg-red-900/20')}>
                      <td className="px-4 py-3 font-semibold text-white">{tenant.display_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">{tenant.id}</td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                            archived ? 'bg-accent-danger/30 text-accent-danger' : 'bg-accent-success/20 text-accent-success',
                          )}
                        >
                          {archived ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-200">{tenant.active_keys}</td>
                      <td className="px-4 py-3 text-slate-200">{tenant.total_keys}</td>
                      <td className="px-4 py-3 text-slate-300">{formatTimestamp(tenant.last_key_rotated_at)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatTimestamp(tenant.last_key_used_at)}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {tenant.tags.length ? tenant.tags.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTenant(tenant)}
                            disabled={disabled}
                            className="rounded-full border border-surface-outline/60 px-3 py-1 text-xs text-slate-200 transition hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                          >
                            Edit
                          </button>
                          {archived ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(tenant.id)}
                              disabled={disabled}
                              className="rounded-full border border-accent-success/40 px-3 py-1 text-xs text-accent-success transition hover:bg-accent-success/10 disabled:opacity-50"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleArchive(tenant.id)}
                              disabled={disabled}
                              className="rounded-full border border-accent-danger/40 px-3 py-1 text-xs text-accent-danger transition hover:bg-accent-danger/10 disabled:opacity-50"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TenantCreateForm onCreate={handleCreate} disabled={disabled || !apiKey} />

      {editingTenant && (
        <TenantEditDrawer
          tenant={editingTenant}
          disabled={disabled || !apiKey}
          onClose={() => setEditingTenant(null)}
          onSave={handleUpdate}
        />
      )}

      {error && <p className="text-sm text-accent-danger">{error}</p>}
    </div>
  );
}

export default TenantsPage;
