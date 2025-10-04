import clsx from 'clsx';
import type { HeroMetrics } from '../../types/pipeline';

export interface HeroRibbonProps {
  sessionId: string | null;
  apiKey: string | null;
  connected: boolean;
  connectionAttempts: number;
  metrics: HeroMetrics | null;
  loading?: boolean;
  error?: string | null;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-outline/40 bg-surface-raised/70 px-5 py-4 text-sm text-slate-200 shadow-lg">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function HeroRibbon({ sessionId, apiKey, connected, connectionAttempts, metrics, loading = false, error }: HeroRibbonProps) {
  const showSkeleton = loading && !metrics;

  return (
    <section className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className={clsx('rounded-2xl border border-surface-outline/60 bg-surface-raised/80 px-6 py-5 text-sm text-slate-200 shadow-glass md:px-8 md:py-6', showSkeleton && 'animate-pulse')}>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-accent-primary">Active Session</p>
            <h2 className="text-2xl font-semibold text-white">{sessionId || 'No session selected'}</h2>
            <p className="mt-2 text-xs text-slate-400">API key stored locally · {apiKey ? 'configured' : 'missing'}</p>
          </div>
          <span
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-semibold',
              connected ? 'border-emerald-400/60 text-emerald-300' : 'border-rose-400/60 text-rose-300',
            )}
          >
            {connected ? 'Streaming' : 'Disconnected'}
          </span>
        </header>
        <footer className="mt-4 flex items-center gap-4 text-xs text-slate-400">
          <span>Retries: {connectionAttempts}</span>
          {loading && <span>Refreshing summary…</span>}
          {error && <span className="text-rose-300">{error}</span>}
        </footer>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl border border-surface-outline/40 bg-surface-raised/60" />
          ))
        ) : (
          <>
            <MetricCard label="Requests / min" value={metrics ? metrics.requests_per_minute.toLocaleString() : '—'} />
            <MetricCard label="Open blockers" value={metrics ? metrics.open_blockers.toString() : '0'} sub={metrics?.dominant_provider ? `Provider: ${metrics.dominant_provider}` : undefined} />
            <MetricCard
              label="Approvals"
              value={metrics ? metrics.approvals.toLocaleString() : '—'}
              sub={metrics ? `${metrics.rejections.toLocaleString()} rejections` : undefined}
            />
            <MetricCard
              label="Token usage"
              value={metrics ? `${metrics.token_usage.input.toLocaleString()} in` : '—'}
              sub={metrics ? `${metrics.token_usage.output.toLocaleString()} out` : undefined}
            />
          </>
        )}
      </div>
    </section>
  );
}

export default HeroRibbon;
