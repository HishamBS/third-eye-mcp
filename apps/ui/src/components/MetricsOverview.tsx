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
  latencyHistogram?: Record<string, number>;
  tokensPerSession?: number;
  approvalRate?: number;
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
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Calls</p>
          <p className="mt-2 text-2xl font-semibold text-white">{metrics.totalCalls.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Tokens</p>
          <p className="mt-2 text-2xl font-semibold text-white">{metrics.totalTokens.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tokens/Session</p>
          <p className="mt-2 text-2xl font-semibold text-white">{(metrics.tokensPerSession || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Approval Rate</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">{(metrics.approvalRate || 0).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Uptime</p>
          <p className="mt-2 text-2xl font-semibold text-white">{(metrics.uptime / 3600).toFixed(1)}h</p>
        </div>
      </div>

      {metrics.latencyHistogram && (
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Latency Histogram</h2>
          <div className="space-y-3">
            {Object.entries(metrics.latencyHistogram).map(([bucket, count]) => {
              const maxCount = Math.max(...Object.values(metrics.latencyHistogram!));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={bucket}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{bucket}</span>
                    <span className="text-slate-400">{count} runs</span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-full bg-brand-ink/50">
                    <div
                      className="h-full bg-gradient-to-r from-brand-accent to-brand-primary transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
