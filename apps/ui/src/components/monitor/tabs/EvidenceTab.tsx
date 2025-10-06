import EvidenceLens from '../../EvidenceLens';
import SessionMemoryPanel from '../../SessionMemoryPanel';
import type { EvidenceClaim, PipelineEvent } from '../../../types/pipeline';

export interface EvidenceTabProps {
  claims: EvidenceClaim[];
  events: PipelineEvent[];
  latestDraft: string;
  byakuganEvents: PipelineEvent[];
  noviceMode: boolean;
  loading?: boolean;
}

export function EvidenceTab({ claims, events, latestDraft, byakuganEvents, noviceMode, loading = false }: EvidenceTabProps) {
  if (loading && !latestDraft) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        <div className="h-40 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EvidenceLens draft={latestDraft} claims={claims} expertMode={!noviceMode} />
      {!noviceMode && <SessionMemoryPanel byakuganEvents={byakuganEvents} />}
      {noviceMode && events.length === 0 && (
        <p className="text-xs text-slate-400">Evidence will appear as soon as the pipeline emits Byakugan or Tenseigan envelopes.</p>
      )}
    </div>
  );
}

export default EvidenceTab;
