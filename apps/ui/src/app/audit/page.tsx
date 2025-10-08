'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import AuditTrail from '@/components/AuditTrail';
import type { AuditRecord } from '@/components/AuditTrail';

export default function AuditPage() {
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState('');
  const [until, setUntil] = useState('');
  const [tenant, setTenant] = useState('');

  const fetchAudit = async (filters?: { limit?: number; since?: string; until?: string; tenant?: string }) => {
    setLoadingAudit(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.set('limit', filters.limit.toString());
      if (filters?.since) params.set('since', filters.since.toString());
      if (filters?.until) params.set('until', filters.until.toString());
      if (filters?.tenant) params.set('tenant', filters.tenant);

      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit records');

      const data = await response.json();
      setAudit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchAudit({ limit: 100 });
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchAudit({
      tenant: tenant || null,
      since: since ? Date.parse(since) / 1000 : undefined,
      until: until ? Date.parse(until) / 1000 : undefined,
      limit: 200,
    });
  };

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Security</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Audit Trail</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Since</span>
                  <input
                    type="datetime-local"
                    value={since}
                    onChange={(event) => setSince(event.target.value)}
                    className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Until</span>
                  <input
                    type="datetime-local"
                    value={until}
                    onChange={(event) => setUntil(event.target.value)}
                    className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Tenant</span>
                  <input
                    value={tenant}
                    onChange={(event) => setTenant(event.target.value)}
                    className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    placeholder="tenant-id"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </form>
          </GlassCard>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4 text-sm text-brand-primary"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AuditTrail records={audit} loading={loadingAudit} />
        </motion.div>
      </div>
    </div>
  );
}
