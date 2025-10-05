import { useMemo } from 'react';
import KillSwitchBar from '../../KillSwitchBar';
import DuelLauncher from '../../DuelLauncher';
import DuelResults from '../../DuelResults';
import type { PipelineEvent } from '../../../types/pipeline';

export interface OperationsTabProps {
  sessionId: string | null;
  apiKey: string | null;
  latestDraft: string;
  latestEvent: PipelineEvent | null;
  events: PipelineEvent[];
  resubmitMessage: string | null;
  loading?: boolean;
}

export function OperationsTab({
  sessionId,
  apiKey,
  latestDraft,
  latestEvent,
  events,
  resubmitMessage,
  loading = false,
}: OperationsTabProps) {
  const availableAgents = useMemo(() => {
    const roster = new Set<string>();
    events.forEach((event) => {
      const data = (event.data ?? {}) as Record<string, unknown>;
      const primary = typeof data.agent === 'string' ? data.agent : typeof data.agent_name === 'string' ? data.agent_name : null;
      if (primary) {
        roster.add(primary);
      }
      const agents = Array.isArray(data.agents) ? data.agents : [];
      agents.forEach((entry) => {
        if (typeof entry === 'string') {
          roster.add(entry);
        } else if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).agent === 'string') {
          roster.add((entry as Record<string, unknown>).agent as string);
        }
      });
    });
    return Array.from(roster).sort((a, b) => a.localeCompare(b));
  }, [events]);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="h-36 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
      ) : (
        <KillSwitchBar sessionId={sessionId ?? ''} apiKey={apiKey ?? ''} latestDraft={latestDraft} latestEvent={latestEvent ?? events.at(-1) ?? undefined} />
      )}
      <div className="grid gap-4 lg:grid-cols-[1.3fr,1fr]">
        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        ) : (
          <DuelLauncher sessionId={sessionId ?? ''} apiKey={apiKey ?? ''} availableAgents={availableAgents} />
        )}
        {loading ? (
          <div className="h-48 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        ) : (
          <DuelResults events={events} />
        )}
      </div>
      {resubmitMessage && <p className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-3 text-xs text-slate-300">{resubmitMessage}</p>}
    </div>
  );
}

export default OperationsTab;
