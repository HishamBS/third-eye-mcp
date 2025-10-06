import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import clsx from 'clsx';
import type { SessionSettingsPayload, SessionOverview } from '../types/pipeline';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sessionStatusTone(status: SessionOverview['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40';
    case 'blocked':
      return 'bg-rose-500/20 text-rose-200 border border-rose-400/40';
    default:
      return 'bg-slate-500/20 text-slate-200 border border-slate-400/30';
  }
}

function sessionStatusLabel(status: SessionOverview['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'blocked':
      return 'Blocked';
    default:
      return 'In Progress';
  }
}

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export interface SessionHeaderProps {
  sessionId: string;
  onSessionSubmit: (sessionId: string) => void;
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  noviceMode: boolean;
  personaMode: boolean;
  onNoviceToggle: (value: boolean) => void;
  onPersonaToggle: (value: boolean) => void;
  settings: SessionSettingsPayload | null;
  onSettingsSave: (settings: SessionSettingsPayload) => Promise<void> | void;
  onApplyProfile: (profile: SessionSettingsPayload) => Promise<void> | void;
  settingsSaving?: boolean;
  connected: boolean;
  connectionAttempts: number;
  sessions: SessionOverview[];
  sessionsLoading?: boolean;
  sessionsError?: string | null;
  onRefreshSessions: () => void;
  autoFollow: boolean;
  onAutoFollowChange: (value: boolean) => void;
}

export function SessionHeader({
  sessionId,
  onSessionSubmit,
  apiKey,
  onApiKeyChange,
  noviceMode,
  personaMode,
  onNoviceToggle,
  onPersonaToggle,
  settings,
  onSettingsSave,
  onApplyProfile,
  settingsSaving = false,
  connected,
  connectionAttempts,
  sessions,
  sessionsLoading = false,
  sessionsError = null,
  onRefreshSessions,
  autoFollow,
  onAutoFollowChange,
}: SessionHeaderProps) {
  const [draftSession, setDraftSession] = useState(sessionId);
  const [draftSettings, setDraftSettings] = useState<SessionSettingsPayload>(() => settings ?? {});
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDraftSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    setDraftSettings(settings ?? {});
  }, [settings]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const bTimestamp = parseTimestamp(b.last_event_at ?? b.created_at);
      const aTimestamp = parseTimestamp(a.last_event_at ?? a.created_at);
      const diff = bTimestamp - aTimestamp;
      if (diff !== 0) return diff;
      return b.session_id.localeCompare(a.session_id);
    });
  }, [sessions]);

  const sessionMeta = useMemo(() => {
    return sortedSessions.find((item) => item.session_id === draftSession) ?? null;
  }, [sortedSessions, draftSession]);

  const showSessionSkeleton = sessionsLoading && sortedSessions.length === 0;

  const handleSettingsSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    try {
      await onSettingsSave(draftSettings);
      setFeedback('Settings updated successfully.');
    } catch (error) {
      console.error(error);
      setFeedback('Failed to update settings.');
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 px-6 py-6 text-sm text-slate-200 shadow-glass md:px-8 md:py-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-brand-accent">Session Controls</p>
          <h1 className="text-2xl font-semibold text-white">Truth Monitor</h1>
          <p className="mt-2 text-sm text-slate-400">
            Connect to a live Overseer session to stream Eye envelopes in real time. API keys are never stored remotely; they live in your browser storage only.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          <span className={clsx('rounded-full border px-3 py-1 font-medium', connected ? 'border-emerald-400/50 text-emerald-300' : 'border-rose-400/60 text-rose-300')}>
            {connected ? 'Realtime Connected' : 'Disconnected'}
          </span>
          {connectionAttempts > 0 && (
            <span className="text-slate-400">Retries: {connectionAttempts}</span>
          )}
        </div>
      </header>

      <form
        className="mt-6 grid gap-4 md:grid-cols-[2fr,2fr,auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onSessionSubmit(draftSession.trim());
        }}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400" htmlFor="session-selector">
            Session
          </label>
          <div className="flex flex-col gap-2">
            {showSessionSkeleton ? (
              <div className="h-12 animate-pulse rounded-xl border border-brand-outline/40 bg-brand-paper/60" />
            ) : (
              <div className="flex gap-2">
                <select
                  id="session-selector"
                  value={draftSession}
                  onChange={(event) => {
                    const next = event.target.value;
                    setDraftSession(next);
                    if (next) {
                      onSessionSubmit(next);
                    }
                  }}
                  disabled={sessionsLoading || !sortedSessions.length}
                  className="flex-1 rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-60"
                >
                  {sortedSessions.length ? (
                    sortedSessions.map((item) => (
                      <option key={item.session_id} value={item.session_id}>
                        {item.title || item.session_id}
                      </option>
                    ))
                  ) : (
                    <option value="">{sessionsLoading ? 'Loading sessions…' : 'No sessions available'}</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={onRefreshSessions}
                  className="inline-flex items-center justify-center rounded-full border border-brand-outline/50 px-3 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40 disabled:opacity-60"
                  disabled={sessionsLoading}
                >
                  {sessionsLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
            )}
            {sessionsError && <p className="text-xs text-rose-300">{sessionsError}</p>}
            {sessionMeta && !showSessionSkeleton && (
              <dl className="grid gap-3 rounded-xl border border-brand-outline/40 bg-brand-paper/70 px-3 py-2 text-xs text-slate-300 sm:grid-cols-3">
                <div>
                  <dt className="uppercase tracking-[0.2em] text-slate-500">Status</dt>
                  <dd>
                    <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold', sessionStatusTone(sessionMeta.status))}>
                      {sessionStatusLabel(sessionMeta.status)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.2em] text-slate-500">Tenant</dt>
                  <dd className="mt-1 text-slate-200">{sessionMeta.tenant ?? '—'}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.2em] text-slate-500">Last activity</dt>
                  <dd className="mt-1 text-slate-200">{formatTimestamp(sessionMeta.last_event_at ?? sessionMeta.created_at)}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">API Key</span>
          <input
            value={apiKey}
            required
            onChange={(event) => onApiKeyChange(event.target.value)}
            className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
            placeholder="Paste bearer token"
            aria-label="API key"
            autoComplete="off"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
          >
            Connect
          </button>
        </div>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-3 rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4">
          <h3 className="text-sm font-semibold text-white">User Modes</h3>
          <div className="flex items-center justify-between">
            <span>Novice mode</span>
            <input
              type="checkbox"
              checked={noviceMode}
              onChange={(event) => onNoviceToggle(event.target.checked)}
              className="h-4 w-8 cursor-pointer rounded-full border border-brand-outline/50 bg-brand-paper accent-brand-accent"
              aria-label="Toggle novice mode"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Persona voice</span>
            <input
              type="checkbox"
              checked={personaMode}
              onChange={(event) => onPersonaToggle(event.target.checked)}
              className="h-4 w-8 cursor-pointer rounded-full border border-brand-outline/50 bg-brand-paper accent-brand-accent"
              aria-label="Toggle persona mode"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Auto-follow session</span>
            <input
              type="checkbox"
              checked={autoFollow}
              onChange={(event) => onAutoFollowChange(event.target.checked)}
              className="h-4 w-8 cursor-pointer rounded-full border border-brand-outline/50 bg-brand-paper accent-brand-accent"
              aria-label="Toggle auto-follow session"
            />
          </div>
        </div>

        <form className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4" onSubmit={handleSettingsSubmit}>
          <h3 className="text-sm font-semibold text-white">Session Settings</h3>
          <p className="mt-1 text-xs text-slate-400">Tune Overseer strictness per session.</p>

          <label className="mt-3 flex flex-col gap-2 text-xs text-slate-400">
            Strictness profile
            <select
              className="rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              defaultValue="choose"
              onChange={async (event) => {
                const value = event.target.value as 'choose' | 'casual' | 'enterprise' | 'security';
                if (value === 'choose') return;
                const profiles: Record<'casual' | 'enterprise' | 'security', SessionSettingsPayload> = {
                  casual: { ambiguity_threshold: 0.45, citation_cutoff: 0.7, consistency_tolerance: 0.8, require_rollback: false, mangekyo: 'lenient' },
                  enterprise: { ambiguity_threshold: 0.35, citation_cutoff: 0.85, consistency_tolerance: 0.85, require_rollback: true, mangekyo: 'normal' },
                  security: { ambiguity_threshold: 0.25, citation_cutoff: 0.95, consistency_tolerance: 0.92, require_rollback: true, mangekyo: 'strict' },
                };
                const profile = profiles[value];
                setDraftSettings(profile);
                await onApplyProfile(profile);
              }}
            >
              <option value="choose" disabled>
                Select profile…
              </option>
              <option value="casual">Casual</option>
              <option value="enterprise">Enterprise</option>
              <option value="security">Security</option>
            </select>
          </label>

          <label className="mt-3 flex flex-col gap-2">
            <span>Ambiguity threshold: {Math.round((draftSettings.ambiguity_threshold ?? 0.35) * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draftSettings.ambiguity_threshold ?? 0.35}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, ambiguity_threshold: Number(event.target.value) }))}
            />
          </label>

          <label className="mt-3 flex flex-col gap-2">
            <span>Citation cutoff: {Math.round((draftSettings.citation_cutoff ?? 0.8) * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draftSettings.citation_cutoff ?? 0.8}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, citation_cutoff: Number(event.target.value) }))}
            />
          </label>

          <label className="mt-3 flex items-center justify-between gap-2">
            <span>Require rollback plan</span>
            <input
              type="checkbox"
              checked={Boolean(draftSettings.require_rollback)}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, require_rollback: event.target.checked }))}
              className="h-4 w-8 cursor-pointer rounded-full border border-brand-outline/50 bg-brand-paper accent-brand-accent"
            />
          </label>

          <label className="mt-3 flex flex-col gap-2">
            <span>Consistency tolerance: {Math.round((draftSettings.consistency_tolerance ?? 0.85) * 100)}%</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={draftSettings.consistency_tolerance ?? 0.85}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, consistency_tolerance: Number(event.target.value) }))}
            />
          </label>

          <label className="mt-3 flex flex-col gap-2">
            <span>Mangekyō strictness</span>
            <select
              value={draftSettings.mangekyo ?? 'normal'}
              onChange={(event) => setDraftSettings((prev) => ({ ...prev, mangekyo: event.target.value }))}
              className="rounded-lg border border-brand-outline/50 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
            >
              <option value="lenient">Lenient</option>
              <option value="normal">Normal</option>
              <option value="strict">Strict</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={settingsSaving}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-brand-outline/50 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {settingsSaving ? 'Saving…' : 'Save settings'}
          </button>
          {feedback && <p className="mt-2 text-xs text-slate-400">{feedback}</p>}
        </form>

        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4">
          <h3 className="text-sm font-semibold text-white">Legend</h3>
          <ul className="mt-2 space-y-2 text-xs text-slate-400">
            <li>✅ Green chip — Eye approved; proceed.</li>
            <li>🟥 Red chip — Blocked; open drawer for issues & fixes.</li>
            <li>🟡 Amber chip — Awaiting response or pending clarifications.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default SessionHeader;
