import { useEffect } from 'react';
import MetricsOverview from '../components/MetricsOverview';
import { useAdminStore } from '../store/adminStore';

export interface MetricsPageProps {
  apiKey: string;
}

export function MetricsPage({ apiKey }: MetricsPageProps) {
  const { metrics, loadingMetrics, fetchMetrics, error } = useAdminStore();

  useEffect(() => {
    if (apiKey) {
      fetchMetrics(apiKey).catch(() => {});
    }
  }, [apiKey, fetchMetrics]);

  useEffect(() => {
    if (!apiKey) return undefined;
    const interval = window.setInterval(() => {
      fetchMetrics(apiKey).catch(() => {});
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [apiKey, fetchMetrics]);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Observability</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Provider & Budget Metrics</h1>
        <p className="mt-2 text-sm text-slate-300">Live Prometheus snapshots aggregated from the Overseer API.</p>
      </header>

      {error && <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm text-accent-danger">{error}</p>}

      <MetricsOverview metrics={metrics} loading={loadingMetrics} />
    </section>
  );
}

export default MetricsPage;
