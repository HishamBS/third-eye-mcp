import clsx from 'clsx';
import { formatRelative } from 'date-fns';
import type { ApiKeyEntry } from '../types/admin';

export interface ApiKeyTableProps {
  apiKeys: ApiKeyEntry[];
  onRotate: (keyId: string) => void;
  onRevoke: (keyId: string) => void;
  onRestore: (keyId: string) => void;
  onEdit: (key: ApiKeyEntry) => void;
  loading?: boolean;
  highlightKeyId?: string | null;
}

function formatTimestamp(value?: number | null): string {
  if (!value) return '—';
  try {
    return formatRelative(value * 1000, new Date());
  } catch (error) {
    return new Date(value * 1000).toLocaleString();
  }
}

export function ApiKeyTable({ apiKeys, onRotate, onRevoke, onRestore, onEdit, loading = false, highlightKeyId }: ApiKeyTableProps) {
  if (!apiKeys.length) {
    return (
      <p className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-300">
        No API keys provisioned yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-outline/60 bg-surface-raised/70 shadow-lg">
      <table className="min-w-full divide-y divide-surface-outline/60 text-sm">
        <thead className="bg-surface-base/80 text-xs uppercase tracking-[0.2em] text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">Display</th>
            <th className="px-4 py-3 text-left">Key ID</th>
            <th className="px-4 py-3 text-left">Role</th>
            <th className="px-4 py-3 text-left">Tenant</th>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-left">Expires</th>
            <th className="px-4 py-3 text-left">Limits</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-outline/60 text-slate-200">
          {apiKeys.map((key) => {
            const revoked = Boolean(key.revoked_at);
            return (
              <tr
                key={key.id}
                id={`key-row-${key.id}`}
                className={clsx(
                  revoked && 'bg-red-900/20',
                  highlightKeyId === key.id && 'ring-2 ring-accent-primary/60 ring-offset-2 ring-offset-slate-900'
                )}
              >
                <td className="px-4 py-3 text-slate-200">{key.display_name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">{key.id}</td>
                <td className="px-4 py-3 text-slate-200">{key.role}</td>
                <td className="px-4 py-3 text-slate-300">{key.tenant ?? '—'}</td>
                <td className="px-4 py-3 text-slate-300">{formatTimestamp(key.created_at)}</td>
                <td className="px-4 py-3 text-slate-300">{formatTimestamp(key.expires_at)}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">
                  {(() => {
                    const summary: string[] = [];
                    if (Array.isArray(key.limits?.branches) && key.limits?.branches.length) {
                      summary.push(`Branches: ${key.limits.branches.join(', ')}`);
                    }
                    if (Array.isArray(key.limits?.tools) && key.limits?.tools.length) {
                      summary.push(`Tools: ${key.limits.tools.join(', ')}`);
                    }
                    if (Array.isArray(key.limits?.tenants) && key.limits?.tenants.length) {
                      summary.push(`Tenants: ${key.limits.tenants.join(', ')}`);
                    }
                    if (summary.length === 0) {
                      return '—';
                    }
                    return summary.join(' | ');
                  })()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                      revoked ? 'bg-accent-danger/30 text-accent-danger' : 'bg-accent-success/20 text-accent-success',
                    )}
                  >
                    {revoked ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(key)}
                      disabled={loading}
                      className="rounded-full border border-surface-outline/60 px-3 py-1 text-xs text-slate-200 transition hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onRotate(key.id)}
                      disabled={loading}
                      className="rounded-full border border-surface-outline/60 px-3 py-1 text-xs text-slate-200 transition hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                    >
                      Rotate
                    </button>
                    {revoked ? (
                      <button
                        type="button"
                        onClick={() => onRestore(key.id)}
                        disabled={loading}
                        className="rounded-full border border-accent-success/40 px-3 py-1 text-xs text-accent-success transition hover:bg-accent-success/10 disabled:opacity-50"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRevoke(key.id)}
                        disabled={loading}
                        className="rounded-full border border-accent-danger/40 px-3 py-1 text-xs text-accent-danger transition hover:bg-accent-danger/10 disabled:opacity-50"
                      >
                        Revoke
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
  );
}

export default ApiKeyTable;
