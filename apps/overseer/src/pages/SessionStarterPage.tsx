import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { fetchSessionDetail, fetchSessions } from '../lib/api';
import type { SessionDetail, SessionOverview } from '../types/pipeline';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function statusBadgeClass(status: SessionOverview['status']): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40';
    case 'blocked':
      return 'bg-rose-500/20 text-rose-200 border border-rose-400/40';
    default:
      return 'bg-slate-500/20 text-slate-200 border border-slate-400/30';
  }
}

function formatStatusLabel(status: SessionOverview['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'blocked':
      return 'Blocked';
    default:
      return 'In Progress';
  }
}

export function SessionStarterPage() {
  const [storedKey, setStoredKey] = useLocalStorage<string>('third-eye.api-key', '');
  const [storedSession, setStoredSession] = useLocalStorage<string>('third-eye.session-id', '');
  const [autoOpenLatest, setAutoOpenLatest] = useLocalStorage<boolean>('third-eye.portal.auto-open', false);

  const navigate = useNavigate();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const instanceIdRef = useRef<string>(crypto.randomUUID());

  const [keyDraft, setKeyDraft] = useState(storedKey);
  const [sessions, setSessions] = useState<SessionOverview[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>(storedSession);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [hasAutoLaunched, setHasAutoLaunched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedSession = params.get('session');
    const autoParam = params.get('auto') === '1';
    const channel = new BroadcastChannel('third-eye-portal');
    channelRef.current = channel;
    const instanceId = instanceIdRef.current;
    let acknowledged = false;

    channel.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'hello' && data.id && data.id !== instanceId) {
        channel.postMessage({ type: 'ack', id: data.id });
        return;
      }
      if (data.type === 'ack' && data.id === instanceId && autoParam && requestedSession) {
        acknowledged = true;
        // Another window is already open; this auto window can close itself.
        try {
          window.close();
        } catch (error) {
          // ignore
        }
        return;
      }
      if (data.type === 'open-session' && data.session && data.id !== instanceId) {
        setSelectedSession(data.session);
        setHasAutoLaunched(true);
        if (data.navigate) {
          navigate(`/session/${encodeURIComponent(data.session)}`);
        }
      }
    };

    channel.postMessage({ type: 'hello', id: instanceId });

    if (requestedSession) {
      setSelectedSession(requestedSession);
      setHasAutoLaunched(true);
      channel.postMessage({ type: 'open-session', session: requestedSession, navigate: true, id: instanceId });
      if (autoParam) {
        // If no one acked within a short window, assume no portal is open and navigate here.
        setTimeout(() => {
          if (!acknowledged) {
            navigate(`/session/${encodeURIComponent(requestedSession)}`);
          }
        }, 300);
      }
    }

    if (requestedSession || autoParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [navigate]);

  useEffect(() => {
    setKeyDraft(storedKey);
    setHasAutoLaunched(false);
  }, [storedKey]);

  useEffect(() => {
    if (!storedKey) {
      setSessions([]);
      setSelectedSession('');
      setSessionDetail(null);
      setSessionsError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setSessionsLoading(true);
    setSessionsError(null);
    fetchSessions({ apiKey: storedKey, limit: 20, signal: controller.signal })
      .then((items) => {
        setSessions(items);
        if (!items.length) {
          setSelectedSession('');
          setSessionDetail(null);
          return;
        }
        const preferred = storedSession && items.some((item) => item.session_id === storedSession)
          ? storedSession
          : items[0].session_id;
        setSelectedSession(preferred);
        if (autoOpenLatest && preferred && !hasAutoLaunched) {
          setHasAutoLaunched(true);
          navigate(`/session/${encodeURIComponent(preferred)}`);
        }
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setSessionsError(error instanceof Error ? error.message : 'Failed to load sessions');
        setSessions([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSessionsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [storedKey, storedSession, autoOpenLatest, hasAutoLaunched, navigate]);

  useEffect(() => {
    if (!storedKey || !selectedSession) {
      setSessionDetail(null);
      setDetailError(null);
      return;
    }

    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    fetchSessionDetail({ apiKey: storedKey, sessionId: selectedSession, signal: controller.signal })
      .then((detail) => {
        if (!controller.signal.aborted) {
          setSessionDetail(detail);
          setStoredSession(detail.session_id);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setDetailError(error instanceof Error ? error.message : 'Failed to load session');
          setSessionDetail(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [storedKey, selectedSession, setStoredSession]);

  const selectedOverview = useMemo(() => sessions.find((session) => session.session_id === selectedSession) ?? null, [sessions, selectedSession]);

  const timelinePreview = useMemo(() => {
    if (!sessionDetail) return [];
    const events = sessionDetail.events || [];
    const start = events.length > 5 ? events.slice(events.length - 5) : events;
    return start;
  }, [sessionDetail]);

  const handleKeySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = keyDraft.trim();
    setStoredKey(trimmed);
  };

  const handleRefreshSessions = () => {
    if (!storedKey) return;
    setHasAutoLaunched(true);
    setStoredSession(selectedSession);
    setSessionsLoading(true);
    setSessionsError(null);
    fetchSessions({ apiKey: storedKey, limit: 20 })
      .then((items) => {
        setSessions(items);
        if (!items.length) {
          setSelectedSession('');
          setSessionDetail(null);
        }
      })
      .catch((error) => {
        setSessionsError(error instanceof Error ? error.message : 'Failed to refresh sessions');
      })
      .finally(() => setSessionsLoading(false));
  };

  const handleSessionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedSession(event.target.value);
    setHasAutoLaunched(true);
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'open-session', session: event.target.value, id: instanceIdRef.current });
    }
  };

  const handleOpenMonitor = () => {
    if (!selectedSession) return;
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'open-session', session: selectedSession, id: instanceIdRef.current, navigate: true });
    }
    navigate(`/session/${encodeURIComponent(selectedSession)}`);
  };

  const handleOpenReplay = () => {
    if (!selectedSession) return;
    navigate(`/replay/${encodeURIComponent(selectedSession)}`);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10 text-slate-200">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Third Eye Overseer</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Session Portal</h1>
        <p className="mt-3 text-sm text-slate-300">
          Manage your Overseer sessions from one place. Store your API key locally, browse recent activity, and jump straight into the Truth Monitor without hunting for session identifiers.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,320px),1fr]">
        <form
          onSubmit={handleKeySubmit}
          className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 p-6 shadow-glass"
        >
          <h2 className="text-lg font-semibold text-white">API Key</h2>
          <p className="mt-2 text-sm text-slate-400">Keys are only stored in this browser. Paste a valid Overseer API key to load your sessions.</p>
          <label className="mt-4 flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">API Key</span>
            <input
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="sk_live_..."
              className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-3 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              autoComplete="off"
              aria-label="API key"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40"
          >
            {storedKey ? 'Update Key' : 'Connect Key'}
          </button>
          <label className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={autoOpenLatest}
              onChange={(event) => {
                setAutoOpenLatest(event.target.checked);
                setHasAutoLaunched(false);
              }}
              className="h-4 w-4 rounded border border-brand-outline/50 bg-brand-paper accent-brand-accent"
            />
            Auto-open the newest session after connecting
          </label>
          <p className="mt-6 text-xs text-slate-500">
            Need new credentials? Visit the Control Plane to generate or rotate admin API keys.
          </p>
        </form>

        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/60 p-6 shadow-glass">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Recent Sessions</h2>
                <p className="text-sm text-slate-400">Select an active session to preview status before opening the Truth Monitor.</p>
              </div>
              <button
                type="button"
                onClick={handleRefreshSessions}
                disabled={sessionsLoading || !storedKey}
                className="rounded-full border border-brand-outline/40 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-accent hover:text-brand-accent disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {!storedKey && (
              <p className="mt-4 rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4 text-sm text-slate-400">
                Paste your API key to load available sessions.
              </p>
            )}

            {storedKey && sessionsLoading && (
              <p className="mt-4 animate-pulse rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4 text-sm text-slate-400">
                Loading sessions…
              </p>
            )}

            {storedKey && sessionsError && !sessionsLoading && (
              <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{sessionsError}</p>
            )}

            {storedKey && !sessionsLoading && !sessionsError && sessions.length === 0 && (
              <p className="mt-4 rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4 text-sm text-slate-400">
                No sessions found yet. Run your first Overseer workflow to see it here.
              </p>
            )}

            {storedKey && !sessionsLoading && sessions.length > 0 && (
              <div className="mt-4 space-y-4">
                <label className="flex flex-col gap-2 text-sm text-slate-300">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Select session</span>
                  <select
                    value={selectedSession}
                    onChange={handleSessionChange}
                    className="rounded-xl border border-brand-outline/50 bg-brand-paper px-3 py-3 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  >
                    {sessions.map((session) => (
                      <option key={session.session_id} value={session.session_id}>
                        {session.title} · {formatDate(session.last_event_at ?? session.created_at)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedOverview && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Status</p>
                        <p className="text-base font-semibold text-white">{selectedOverview.title}</p>
                        <p className="text-xs text-slate-400">Session {selectedOverview.session_id}</p>
                      </div>
                      <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', statusBadgeClass(selectedOverview.status))}>
                        {formatStatusLabel(selectedOverview.status)}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</dt>
                        <dd className="text-sm text-slate-200">{formatDate(selectedOverview.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Last activity</dt>
                        <dd className="text-sm text-slate-200">{formatDate(selectedOverview.last_event_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">Approvals vs blocks</dt>
                        <dd className="text-sm text-slate-200">
                          {selectedOverview.eye_counts.approvals} ✓ / {selectedOverview.eye_counts.rejections} ✕
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/60 p-6 shadow-glass">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Session Preview</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenReplay}
                  disabled={!selectedSession}
                  className="rounded-full border border-brand-outline/40 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-accent hover:text-brand-accent disabled:opacity-50"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={handleOpenMonitor}
                  disabled={!selectedSession}
                  className="rounded-full bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                >
                  Open Monitor
                </button>
              </div>
            </div>

            {!selectedSession && <p className="mt-4 text-sm text-slate-400">Choose a session to see a summary.</p>}
            {detailLoading && <p className="mt-4 animate-pulse text-sm text-slate-400">Loading session details…</p>}
            {detailError && !detailLoading && <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{detailError}</p>}

            {sessionDetail && !detailLoading && !detailError && (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status summary</p>
                  <p className="mt-1 text-base font-semibold text-white">{sessionDetail.title}</p>
                  <p className="mt-1 text-xs text-slate-400">Tenant: {sessionDetail.tenant ?? '—'}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Approvals: {sessionDetail.eye_counts.approvals} · Blocks: {sessionDetail.eye_counts.rejections}
                  </p>
                </div>

                {sessionDetail.eyes.length > 0 && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
                    <h3 className="text-sm font-semibold text-white">Latest Eye States</h3>
                    <dl className="mt-3 grid gap-3 md:grid-cols-2">
                      {sessionDetail.eyes.map((eye) => (
                        <div key={eye.eye ?? 'unknown'} className="rounded-lg border border-brand-outline/30 bg-brand-paper px-3 py-2">
                          <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">{eye.eye ?? 'Unknown'}</dt>
                          <dd className="mt-1 text-sm text-slate-200">
                            {eye.code || (eye.ok === true ? 'OK' : eye.ok === false ? 'Rejected' : 'Pending')}
                          </dd>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDate(eye.ts)}</p>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {timelinePreview.length > 0 && (
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4">
                    <h3 className="text-sm font-semibold text-white">Recent timeline</h3>
                    <ul className="mt-3 space-y-2 text-xs text-slate-300">
                      {timelinePreview.map((event, index) => (
                        <li key={`${event.eye}-${event.ts}-${index}`} className="rounded-lg border border-brand-outline/30 bg-brand-paper px-3 py-2">
                          <p className="font-semibold text-slate-200">{event.eye ?? 'Unknown'} — {event.code ?? 'Event'}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDate(event.ts)}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default SessionStarterPage;
