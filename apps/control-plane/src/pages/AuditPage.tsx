import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import AuditTrail from '../components/AuditTrail';
import { useAdminStore } from '../store/adminStore';

export interface AuditPageProps {
  apiKey: string;
}

export function AuditPage({ apiKey }: AuditPageProps) {
  const { audit, loadingAudit, fetchAudit, error } = useAdminStore();
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [tenant, setTenant] = useState('');

  useEffect(() => {
    if (apiKey) {
      fetchAudit(apiKey, { limit: 100 }).catch(() => {});
    }
  }, [apiKey, fetchAudit]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey) return;
    fetchAudit(apiKey, {
      tenant: tenant || null,
      since: since ? Date.parse(since) / 1000 : undefined,
      until: until ? Date.parse(until) / 1000 : undefined,
      limit: 200,
    }).catch(() => {});
  };

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Audit trail</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Operator Actions</h1>
        <p className="mt-2 text-sm text-slate-300">Filter, export, and review all administrative events emitted by the Overseer backend.</p>
      </header>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-4 text-sm text-slate-200">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Since</span>
            <input
              type="datetime-local"
              value={since}
              onChange={(event) => setSince(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Until</span>
            <input
              type="datetime-local"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Tenant</span>
            <input
              value={tenant}
              onChange={(event) => setTenant(event.target.value)}
              className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              placeholder="tenant-id"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
            >
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {error && <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm text-accent-danger">{error}</p>}

      <AuditTrail records={audit} loading={loadingAudit} />
    </section>
  );
}

export default AuditPage;
