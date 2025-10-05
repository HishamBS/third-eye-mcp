import { useMemo } from 'react';
import { usePipelineStore } from '../store/pipelineStore';

export function AdminConsole() {
  const events = usePipelineStore((state) => state.events);
  const approvals = useMemo(() => events.filter((event) => event.ok === true).length, [events]);
  const rejections = useMemo(() => events.filter((event) => event.ok === false).length, [events]);
  const uniqueEyes = useMemo(() => new Set(events.map((event) => event.eye ?? event.type)).size, [events]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10 text-slate-200">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Operator Insight</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Live Metrics Snapshot</h1>
        <p className="mt-2 text-sm text-slate-300">
          Metrics will expand as the Control Plane integrates with budgets, quotas, and provider telemetry. For now the dashboard mirrors real pipeline events to highlight approvals, rejections, and replay exports.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 shadow-glass">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total events</p>
          <p className="mt-2 text-3xl font-semibold text-white">{events.length}</p>
        </article>
        <article className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-glass">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Approvals</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-100">{approvals}</p>
        </article>
        <article className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 shadow-glass">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Rejections</p>
          <p className="mt-2 text-3xl font-semibold text-rose-100">{rejections}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-white">Eyes engaged</h2>
        <p className="mt-2 text-sm text-slate-300">{uniqueEyes} unique eyes emitted events this session.</p>
      </section>
    </main>
  );
}

export default AdminConsole;
