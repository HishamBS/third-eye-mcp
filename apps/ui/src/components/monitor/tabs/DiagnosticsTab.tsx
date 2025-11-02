import RawEventPanel from '../../RawEventPanel';
import Leaderboards from '../../Leaderboards';
import type { PipelineEvent, SessionSummary } from '../../../types/pipeline';

export interface DiagnosticsTabProps {
  events: PipelineEvent[];
  selectedEvent: PipelineEvent | null;
  sessionId: string | null;
  apiKey: string | null;
  summary: SessionSummary | null;
  connected: boolean;
  connectionAttempts: number;
  loading?: boolean;
}

export function DiagnosticsTab({ events, selectedEvent, sessionId, apiKey, summary, connected, connectionAttempts, loading = false }: DiagnosticsTabProps) {
  return (
    <div className="space-y-6">
      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-surface-outline/40 bg-surface-raised/60" />
      ) : (
        <section className="rounded-2xl border border-surface-outline/40 bg-surface-raised/80 p-5 text-sm text-semantic-muted">
          <h3 className="text-lg font-semibold text-brand-foreground">Connection Diagnostics</h3>
          <div className="mt-3 grid gap-3 text-xs text-semantic-muted sm:grid-cols-3">
            <div>
              <p>Status</p>
              <p className="text-brand-foreground">{connected ? 'Connected' : 'Disconnected'}</p>
            </div>
            <div>
              <p>Retry attempts</p>
              <p className="text-brand-foreground">{connectionAttempts}</p>
            </div>
            <div>
              <p>Dominant provider</p>
              <p className="text-brand-foreground">{summary?.hero_metrics?.dominant_provider ?? '—'}</p>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-surface-outline/40 bg-surface-raised/60" />
      ) : (
        <RawEventPanel event={selectedEvent ?? events.at(-1) ?? null} />
      )}

      {sessionId && apiKey && !loading && <Leaderboards />}
    </div>
  );
}

export default DiagnosticsTab;
