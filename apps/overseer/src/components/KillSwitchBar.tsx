import { useState } from 'react';
import clsx from 'clsx';
import { postKillSwitch } from '../lib/api';
import type { PipelineEvent } from '../types/pipeline';

export interface KillSwitchBarProps {
  sessionId: string;
  apiKey: string;
  latestDraft: string;
  latestEvent?: PipelineEvent;
}

export function KillSwitchBar({ sessionId, apiKey, latestDraft, latestEvent }: KillSwitchBarProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const disabled = !sessionId || !apiKey || !latestDraft || status === 'running';

  const handleClick = async () => {
    if (disabled) return;
    try {
      setStatus('running');
      setMessage('Revalidating draft via Tenseigan + Byakugan…');
      const topic = (latestEvent?.data as Record<string, unknown>)?.topic as string | undefined;
      const result = await postKillSwitch({
        sessionId,
        apiKey,
        draftMd: latestDraft,
        topic: topic ?? 'general',
        context: latestEvent?.data ?? {},
      });
      const tenseigan = result?.tenseigan as { ok?: boolean; md?: string } | undefined;
      const byakugan = result?.byakugan as { ok?: boolean; md?: string } | undefined;
      if (tenseigan?.ok === false || byakugan?.ok === false) {
        setStatus('error');
        setMessage(tenseigan?.md ?? byakugan?.md ?? 'Validation failed — inspect Eye issues for fixes.');
      } else {
        setStatus('success');
        setMessage('Kill switch completed. Watch the Eyes for updated verdicts.');
      }
    } catch (error) {
      console.error(error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Kill switch failed — see Rinnegan instructions.');
    }
  };

  return (
    <section className={clsx('rounded-2xl border p-5 text-sm', status === 'error' ? 'border-rose-500/50 bg-rose-500/10 text-rose-100' : 'border-brand-outline/40 bg-brand-paperElev/70 text-slate-200')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Hallucination Kill Switch</p>
          <p className="mt-1 text-sm">Force Tenseigan + Byakugan to re-run on the current draft.</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          className="rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Revalidating…' : 'Re-run validation'}
        </button>
      </div>
      {message && <p className="mt-3 text-xs text-slate-300">{message}</p>}
    </section>
  );
}

export default KillSwitchBar;
