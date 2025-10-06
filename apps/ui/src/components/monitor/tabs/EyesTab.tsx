import { useMemo } from 'react';
import EyeCard from '../../EyeCard';
import Timeline from '../../Timeline';
import ClarificationsPanel from '../../ClarificationsPanel';
import clsx from 'clsx';
import type { EyeState, PipelineEvent, ClarificationContext } from '../../../types/pipeline';

export interface EyesTabProps {
  eyes: Record<string, EyeState>;
  events: PipelineEvent[];
  personaMode: boolean;
  onOpenDetails: (eye: string) => void;
  onShowWhy: (eye: string) => void;
  selectedEventIndex: number | undefined;
  onSelectEvent: (index: number, event: PipelineEvent) => void;
  clarifications: ClarificationContext;
  sessionId: string | null;
  apiKey: string | null;
  onClarificationsSubmitted: () => void;
  loading?: boolean;
}

const DISPLAY_ORDER = [
  'SHARINGAN',
  'PROMPT_HELPER',
  'JOGAN',
  'RINNEGAN_PLAN',
  'RINNEGAN_REVIEW',
  'RINNEGAN_FINAL',
  'MANGEKYO_SCAFFOLD',
  'MANGEKYO_IMPL',
  'MANGEKYO_TESTS',
  'MANGEKYO_DOCS',
  'TENSEIGAN',
  'BYAKUGAN',
];

export function EyesTab({
  eyes,
  events,
  personaMode,
  onOpenDetails,
  onShowWhy,
  selectedEventIndex,
  onSelectEvent,
  clarifications,
  sessionId,
  apiKey,
  onClarificationsSubmitted,
  loading = false,
}: EyesTabProps) {
  const eyeStates = useMemo(() => {
    return DISPLAY_ORDER.map((eye) => ({ eye, state: eyes[eye] })).filter((item) => item.state);
  }, [eyes]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading && !eyeStates.length
          ? DISPLAY_ORDER.slice(0, 6).map((eye) => (
              <div key={eye} className="h-48 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
            ))
          : eyeStates.map(({ eye, state }) => (
              <EyeCard
                key={eye}
                state={state}
                onClick={() => onOpenDetails(eye)}
              />
            ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <div className={clsx('rounded-2xl border border-brand-outline/40 bg-brand-paper/70 p-4', loading ? 'animate-pulse' : '')}>
          {loading && !events.length ? (
            <div className="h-48 rounded-xl bg-brand-paper/40" />
          ) : (
            <Timeline
              events={events}
              selectedIndex={selectedEventIndex}
              onSelect={(index, event) => onSelectEvent(index, event)}
              onFocusEye={(event) => event.eye && onOpenDetails(event.eye.toUpperCase())}
            />
          )}
        </div>
        <ClarificationsPanel
          sessionId={sessionId ?? ''}
          apiKey={apiKey ?? ''}
          questions={clarifications.questions}
          ambiguityScore={clarifications.ambiguityScore}
          loading={!sessionId || !apiKey || loading}
          onSubmitted={onClarificationsSubmitted}
        />
      </div>
    </div>
  );
}

export default EyesTab;
