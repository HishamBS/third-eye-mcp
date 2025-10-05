import type { MetricsOverview as MetricsOverviewType } from '../types/admin';

export interface MetricsOverviewProps {
  metrics: MetricsOverviewType | null;
  loading?: boolean;
}

export function MetricsOverview({ metrics, loading = false }: MetricsOverviewProps) {
  if (loading) {
    return <p className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-300">Loading metrics…</p>;
  }
  if (!metrics) {
    return <p className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-300">No metrics captured yet.</p>;
  }

  const totalRequests = metrics.requests?.total ?? 0;
  const requestEntries = metrics.requests?.byTool ?? [];
  const providerEntries = metrics.providers?.byProvider ?? [];
  const budgets = metrics.budgets?.byKey ?? [];
  const budgetsTracked = metrics.budgets?.total ?? 0;
  const providersObserved = metrics.providers?.total ?? 0;
  const promStatus = metrics.prometheus ?? null;

  const badgeClass = (() => {
    switch (promStatus?.status) {
      case 'connected':
        return 'border-accent-success/60 bg-accent-success/10 text-accent-success';
      case 'degraded':
        return 'border-amber-400/60 bg-amber-400/10 text-amber-200';
      case 'disabled':
      default:
        return 'border-surface-outline/60 bg-surface-base text-slate-300';
    }
  })();

  const statusLabel = (() => {
    switch (promStatus?.status) {
      case 'connected':
        return 'Prometheus connected';
      case 'degraded':
        return 'Prometheus degraded';
      case 'disabled':
      default:
        return 'Prometheus disabled';
    }
  })();

  const modeLabel = (() => {
    switch (promStatus?.mode) {
      case 'prometheus':
        return 'Live Prometheus snapshots';
      case 'fallback':
        return 'Fallback to local counters';
      case 'local':
      default:
        return 'Local counters (Prometheus off)';
    }
  })();

  const lastScrapeText = promStatus?.lastScrape
    ? new Date(promStatus.lastScrape * 1000).toLocaleString()
    : 'No scrapes recorded yet';
  const baseUrlText = promStatus?.baseUrl?.trim() || 'Not configured';

  const summaryGridClass = promStatus ? 'grid gap-4 md:grid-cols-4' : 'grid gap-4 md:grid-cols-3';

  return (
    <section className="space-y-6">
      <div className={summaryGridClass}>
        {promStatus && (
          <article className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 shadow-lg">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Prometheus</p>
            <div className="mt-3 space-y-2">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                {statusLabel}
              </span>
              <p className="text-xs text-slate-400">{modeLabel}</p>
            </div>
            <dl className="mt-4 space-y-2 text-xs text-slate-300">
              <div className="flex flex-col">
                <dt className="text-slate-400">Last scrape</dt>
                <dd className="font-mono text-[11px] text-slate-200">{lastScrapeText}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="text-slate-400">Endpoint</dt>
                <dd className="truncate font-mono text-[11px] text-slate-200" title={baseUrlText}>
                  {baseUrlText}
                </dd>
              </div>
            </dl>
          </article>
        )}
        <article className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total requests</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totalRequests.toLocaleString()}</p>
        </article>
        <article className="rounded-2xl border border-accent-success/40 bg-accent-success/10 p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-success">Budgets tracked</p>
          <p className="mt-2 text-3xl font-semibold text-accent-success">{budgetsTracked}</p>
        </article>
        <article className="rounded-2xl border border-accent-primary/40 bg-accent-primary/10 p-6 shadow-lg">
          <p className="text-xs uppercase tracking-[0.2em] text-accent-primary">Providers observed</p>
          <p className="mt-2 text-3xl font-semibold text-accent-primary">{providersObserved}</p>
        </article>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-200">
          <h3 className="text-lg font-semibold text-white">Requests by tool</h3>
          {requestEntries.length ? (
            <ul className="mt-3 space-y-2">
              {requestEntries.map((entry) => (
                <li key={`${entry.tool}:${entry.status}`} className="flex items-center justify-between gap-3">
                  <span>
                    <span>{entry.tool}</span>
                    <span className="ml-2 rounded-full border border-surface-outline/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      {entry.status || '—'}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">{entry.branch}</span>
                  </span>
                  <span className="font-mono text-xs">{entry.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No request traffic recorded.</p>
          )}
        </div>
        <div className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-200">
          <h3 className="text-lg font-semibold text-white">Budget consumption</h3>
          {budgets.length ? (
            <ul className="mt-3 space-y-2">
              {budgets.map((entry) => (
                <li key={entry.key_id} className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-300">{entry.key_id}</span>
                  <span className="font-mono text-xs">{entry.tokens.toLocaleString()} tokens</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No budget usage yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6 text-sm text-slate-200">
        <h3 className="text-lg font-semibold text-white">Provider performance</h3>
        {providerEntries.length ? (
          <ul className="mt-3 space-y-2">
            {providerEntries.map((entry) => {
              const latency = Number.isFinite(entry.average_latency_ms) ? entry.average_latency_ms : 0;
              return (
                <li key={`${entry.provider}:${entry.tool}`} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-white">{entry.provider}</span>
                    <span className="ml-2 text-xs text-slate-400">{entry.tool}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <span>{entry.count.toLocaleString()} calls</span>
                    <span>{latency.toFixed(1)} ms</span>
                    <span className={entry.failures ? 'text-accent-danger' : ''}>{entry.failures} failures</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-400">No provider metrics collected.</p>
        )}
      </div>
    </section>
  );
}

export default MetricsOverview;
