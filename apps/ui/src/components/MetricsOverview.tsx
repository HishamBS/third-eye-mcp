'use client';

export interface ProviderMetrics {
  provider: string;
  totalCalls: number;
  successRate: number;
  avgLatency: number;
  totalTokens: number;
}

export interface MetricsData {
  providers: ProviderMetrics[];
  totalCalls: number;
  totalTokens: number;
  uptime: number;
}

export interface MetricsOverviewProps {
  metrics: MetricsData | null;
  loading: boolean;
}

export default function MetricsOverview({ metrics, loading }: MetricsOverviewProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/70 p-6">
        <p className="animate-pulse text-sm text-slate-400">Loading metrics...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/70 p-6">
        <p className="text-sm text-slate-400">No metrics available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Calls</p>
          <p className="mt-2 text-2xl font-semibold text-white">{metrics.totalCalls.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Tokens</p>
          <p className="mt-2 text-2xl font-semibold text-white">{metrics.totalTokens.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Uptime</p>
          <p className="mt-2 text-2xl font-semibold text-white">{(metrics.uptime / 3600).toFixed(1)}h</p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Provider Performance</h2>
        {metrics.providers.map((provider) => (
          <div
            key={provider.provider}
            className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{provider.provider}</p>
                <p className="text-xs text-slate-400">
                  {provider.totalCalls} calls · {provider.avgLatency.toFixed(0)}ms avg
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-400">{provider.successRate.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">success rate</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
