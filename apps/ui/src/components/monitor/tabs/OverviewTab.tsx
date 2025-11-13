import Leaderboards from "../../Leaderboards";
import PlanRenderer from "../../PlanRenderer";
import ExportBar from "../../ExportBar";
import type { SessionSummary } from "../../../types/pipeline";

export interface OverviewTabProps {
  summary: SessionSummary | null;
  sessionId: string | null;
  apiKey: string | null;
  latestPlanMd?: string;
  loading?: boolean;
}

export function OverviewTab({
  summary,
  sessionId,
  apiKey,
  latestPlanMd,
  loading = false,
}: OverviewTabProps) {
  const showSkeleton = loading && !summary;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-surface-outline/40 bg-surface-raised/80 p-6 text-sm text-semantic-muted">
        <h3 className="text-lg font-semibold text-brand-foreground">
          Session Snapshot
        </h3>
        {showSkeleton ? (
          <div className="mt-4 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-full bg-brand-outline/40" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-surface-outline/30 bg-surface-base/40 p-4"
                >
                  <div className="h-3 w-20 animate-pulse rounded-full bg-brand-outline/50" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-brand-outline/40" />
                </div>
              ))}
            </div>
          </div>
        ) : summary ? (
          <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-semantic-muted">
            <div>
              <dt>Status</dt>
              <dd className="text-brand-foreground">
                {summary.status ?? "Unknown"}
              </dd>
            </div>
            <div>
              <dt>Tenant</dt>
              <dd className="text-brand-foreground">{summary.tenant ?? "—"}</dd>
            </div>
            <div>
              <dt>Dominant Provider</dt>
              <dd className="text-brand-foreground">
                {summary.hero_metrics?.dominant_provider ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-xs text-semantic-muted">
            Summary data will appear once the stream is active.
          </p>
        )}
      </section>

      {sessionId && apiKey && !showSkeleton && <Leaderboards />}

      {latestPlanMd && !showSkeleton && <PlanRenderer planMd={latestPlanMd} />}

      {sessionId && apiKey && !showSkeleton && (
        <ExportBar sessionId={sessionId} />
      )}
    </div>
  );
}

export default OverviewTab;
