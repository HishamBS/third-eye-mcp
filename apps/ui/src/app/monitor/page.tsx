'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { EyeDashboard } from '@/components/EyeDashboard';
import { UserContributionMode } from '@/components/UserContributionMode';
import { PersonaVoiceDecorator } from '@/components/PersonaVoiceDecorator';
import { EvidenceLens } from '@/components/EvidenceLens';
import { PlanRenderer } from '@/components/PlanRenderer';
import { useWebSocket, type WSMessage } from '@/hooks/useWebSocket';
import type { PipelineEvent, EyeName } from '@third-eye/types';
import { EYE_DISPLAY_NAMES } from '@third-eye/config/constants';

interface SessionSummary {
  sessionId: string;
  status: string;
  eventCount: number;
  eyes: string[];
  createdAt: Date;
}

function MonitorContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'eyes' | 'evidence' | 'contributions' | 'plan'>('dashboard');
  const [activeEye, setActiveEye] = useState<EyeName | null>(null);

  // WebSocket connection
  const { isConnected, connectionStatus, lastMessage } = useWebSocket({
    sessionId: sessionId || undefined,
    onMessage: (message: WSMessage) => {
      console.log('[Monitor] Received WebSocket message:', message.type, message);

      // Handle real-time updates
      if (message.type === 'pipeline_event' && message.data) {
        const eventData = message.data as PipelineEvent;
        setEvents(prev => {
          // Avoid duplicates
          const exists = prev.some(e => e.id === eventData.id);
          if (exists) return prev;
          return [...prev, eventData];
        });

        // Update active eye if event is for an eye
        if (eventData.eye && !eventData.code?.startsWith('OK')) {
          setActiveEye(eventData.eye as EyeName);
        }
      } else if (message.type === 'session_update' && message.data) {
        // Refresh summary on session updates
        fetchSummary();
      }
    },
    onError: (error) => {
      // Better error logging
      const errorDetails = {
        type: error.type,
        message: error instanceof ErrorEvent ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('[Monitor] WebSocket error:', errorDetails);
    },
    onOpen: () => {
      console.log('[Monitor] WebSocket connected successfully');
    },
    onClose: () => {
      console.log('[Monitor] WebSocket disconnected');
    }
  });

  // Fetch initial data once
  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

        console.log(`[Monitor] Fetching session data for ${sessionId} from ${API_URL}`);

        const [eventsRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/api/session/${sessionId}/events`),
          fetch(`${API_URL}/api/session/${sessionId}/summary`)
        ]);

        console.log('[Monitor] Fetch responses:', {
          events: { ok: eventsRes.ok, status: eventsRes.status },
          summary: { ok: summaryRes.ok, status: summaryRes.status }
        });

        if (!eventsRes.ok || !summaryRes.ok) {
          const eventsError = !eventsRes.ok ? await eventsRes.text() : null;
          const summaryError = !summaryRes.ok ? await summaryRes.text() : null;
          console.error('[Monitor] Fetch errors:', { eventsError, summaryError });
          throw new Error(`Failed to fetch session data (Events: ${eventsRes.status}, Summary: ${summaryRes.status})`);
        }

        const eventsData = await eventsRes.json();
        const summaryData = await summaryRes.json();

        console.log('[Monitor] Fetched data:', {
          eventsCount: eventsData?.length || (eventsData?.data?.length || 0),
          summaryStatus: summaryData?.status || summaryData?.data?.status
        });

        // Handle envelope format from server (data might be wrapped)
        const actualEvents = eventsData?.data || eventsData || [];
        const actualSummary = summaryData?.data || summaryData;

        setEvents(Array.isArray(actualEvents) ? actualEvents : []);
        setSummary(actualSummary);

        // Detect active eye from most recent event
        if (actualEvents.length > 0) {
          const lastEvent = actualEvents[actualEvents.length - 1];
          if (lastEvent.eye && !lastEvent.code?.startsWith('OK')) {
            setActiveEye(lastEvent.eye as EyeName);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        console.error('[Monitor] Failed to fetch initial data:', err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [sessionId]);

  // Fetch summary helper
  const fetchSummary = async () => {
    if (!sessionId) return;
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}/summary`);
      if (response.ok) {
        const summaryData = await response.json();
        setSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  // Kill session handler
  const handleKillSession = async () => {
    if (!sessionId) return;
    if (!confirm('Are you sure you want to kill this session? This cannot be undone.')) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}/kill`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Session killed successfully');
        fetchSummary();
      } else {
        alert('Failed to kill session');
      }
    } catch (err) {
      alert('Error killing session');
      console.error(err);
    }
  };

  // Rerun eye validation handler
  const handleRerunEye = async (eye: string) => {
    if (!sessionId) return;
    if (!confirm(`Re-run validation for ${eye}?`)) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}/rerun/${eye}`, {
        method: 'POST',
      });

      if (response.ok) {
        alert(`${eye} validation re-run initiated`);
        fetchSummary();
      } else {
        alert(`Failed to re-run ${eye}`);
      }
    } catch (err) {
      alert(`Error re-running ${eye}`);
      console.error(err);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-brand-ink">
        <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Monitor</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <GlassCard className="py-12">
            <p className="text-sm text-slate-400">Provide a sessionId query parameter to view session details.</p>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-brand-ink">
        <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Monitor</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-brand-primary/40 bg-brand-primary/10 p-6"
          >
            <p className="text-sm text-brand-primary">{error}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <PersonaVoiceDecorator activeEye={activeEye}>
      <div className="min-h-screen bg-brand-ink">
        <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
          <div className="mx-auto max-w-7xl px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                  ← Home
                </Link>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time Monitor</p>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                        connectionStatus === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
                        'bg-red-400'
                      }`} />
                      <span className="text-xs text-slate-500">
                        {connectionStatus === 'connected' ? 'Live' :
                         connectionStatus === 'reconnecting' ? 'Reconnecting...' :
                         'Disconnected'}
                      </span>
                    </div>
                  </div>
                  <h1 className="mt-1 text-2xl font-semibold text-white">Session {sessionId}</h1>
                  {summary && (
                    <p className="mt-1 text-sm text-slate-400">
                      Status: {summary.status} · {summary.eventCount} events · Eyes: {summary.eyes.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleKillSession}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Kill Session
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-8">
          {(() => {
            // Check if any event has Rinnegan plan data
            const planEvent = events.find(e => e.eye === 'rinnegan' && e.dataJson?.plan_md);
            const hasPlanData = !!planEvent;

            // Build tabs array conditionally
            const baseTabs: ('dashboard' | 'timeline' | 'eyes' | 'evidence' | 'contributions' | 'plan')[] =
              ['dashboard', 'timeline', 'eyes', 'evidence', 'contributions'];
            const tabs = hasPlanData ? [...baseTabs, 'plan'] : baseTabs;

            return (
              <div className="mb-6 flex gap-2 border-b border-brand-outline/40">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-t-xl px-4 py-2 text-sm font-medium capitalize transition ${
                      activeTab === tab
                        ? 'border-b-2 border-brand-accent bg-brand-paperElev/50 text-brand-accent'
                        : 'text-slate-400 hover:bg-brand-paper/30 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            );
          })()}

          {loading ? (
            <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
          ) : (
            <>
              {/* Debug Panel - Only show in development or when there's no data */}
              {(events.length === 0 || !summary) && (
                <GlassCard className="mb-6 border-yellow-500/40 bg-yellow-500/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                      <h3 className="text-sm font-semibold text-yellow-200">Debug Information</h3>
                    </div>
                    <div className="space-y-2 text-xs text-slate-300 font-mono">
                      <div>Session ID: <span className="text-yellow-200">{sessionId}</span></div>
                      <div>WebSocket Status: <span className={
                        connectionStatus === 'connected' ? 'text-green-400' :
                        connectionStatus === 'reconnecting' ? 'text-yellow-400' : 'text-red-400'
                      }>{connectionStatus}</span></div>
                      <div>Events Loaded: <span className="text-yellow-200">{events.length}</span></div>
                      <div>Summary Loaded: <span className="text-yellow-200">{summary ? 'Yes' : 'No'}</span></div>
                      {summary && (
                        <>
                          <div>Summary Status: <span className="text-yellow-200">{summary.status}</span></div>
                          <div>Summary Event Count: <span className="text-yellow-200">{summary.eventCount}</span></div>
                          <div>Summary Eyes: <span className="text-yellow-200">{summary.eyes?.join(', ') || 'None'}</span></div>
                        </>
                      )}
                      <div className="pt-2 border-t border-yellow-500/30">
                        <div>API URL: <span className="text-yellow-200">{process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070'}</span></div>
                        <div>WS URL: <span className="text-yellow-200">{process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:7070'}</span></div>
                      </div>
                    </div>
                    {events.length === 0 && summary?.eventCount === 0 && (
                      <div className="mt-3 pt-3 border-t border-yellow-500/30">
                        <p className="text-sm text-yellow-200">
                          This session has no events yet. Events will appear here when the MCP agent executes Eyes.
                        </p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              )}

              {activeTab === 'dashboard' && (
                <EyeDashboard sessionId={sessionId} />
              )}

              {activeTab === 'contributions' && (
                <UserContributionMode
                  sessionId={sessionId}
                  onContribute={(contribution) => {
                    console.log('User contribution:', contribution);
                  }}
                />
              )}

              {activeTab === 'timeline' && (
                <GlassCard>
              <div className="space-y-3">
                {events.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">No events yet.</p>
                ) : (
                  events.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-xl border border-brand-outline/30 bg-brand-paper p-4 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{event.eye || event.type}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {(event.md || event.code) && (
                        <p className="mt-2 text-slate-300">{event.md || event.code}</p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </GlassCard>
              )}

              {activeTab === 'eyes' && (
                <GlassCard>
              <div className="space-y-3">
                {summary && summary.eyes && summary.eyes.length > 0 ? (
                  summary.eyes.map((eyeName: string, index: number) => {
                    const eyeEvents = events.filter(e => e.eye === eyeName);
                    const lastEvent = eyeEvents[eyeEvents.length - 1];
                    const status = lastEvent?.code?.startsWith('OK') ? 'success' :
                                  lastEvent?.code?.startsWith('REJECT') ? 'error' : 'pending';

                    return (
                      <motion.div
                        key={eyeName}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="rounded-xl border border-brand-outline/30 bg-brand-paper p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                status === 'success' ? 'bg-green-400' :
                                status === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                              } ${status === 'pending' ? 'animate-pulse' : ''}`}
                            />
                            <h3 className="font-semibold text-white capitalize">
                              {EYE_DISPLAY_NAMES[eyeName as EyeName] || eyeName.replace(/_/g, ' ')}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full bg-brand-accent/20 px-3 py-1 text-xs text-brand-accent">
                              {eyeEvents.length} {eyeEvents.length === 1 ? 'event' : 'events'}
                            </span>
                            <button
                              onClick={() => handleRerunEye(eyeName)}
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                            >
                              Re-run
                            </button>
                          </div>
                        </div>

                        {eyeEvents.length > 0 && (
                          <div className="space-y-2">
                            {eyeEvents.slice(-3).map((event) => (
                              <div key={event.id} className="rounded-lg bg-brand-ink/50 p-2 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-slate-500">{event.code || 'Processing'}</span>
                                  <span className="text-xs text-slate-500">
                                    {new Date(event.createdAt).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-slate-300 line-clamp-2">{event.md || 'Processing...'}</div>
                              </div>
                            ))}
                            {eyeEvents.length > 3 && (
                              <div className="text-xs text-center text-slate-500 pt-1">
                                +{eyeEvents.length - 3} more events
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-400">No Eyes executed yet.</p>
                  </div>
                )}
              </div>
            </GlassCard>
              )}

              {activeTab === 'evidence' && (
                <GlassCard>
              <div className="space-y-3">
                {events.filter(e => e.dataJson && (
                  e.dataJson.citations ||
                  e.dataJson.evidence ||
                  e.dataJson.confidence !== undefined ||
                  e.dataJson.claimValidation
                )).length > 0 ? (
                  events
                    .filter(e => e.dataJson && (
                      e.dataJson.citations ||
                      e.dataJson.evidence ||
                      e.dataJson.confidence !== undefined ||
                      e.dataJson.claimValidation
                    ))
                    .map((event, index) => {
                      const data = event.dataJson!;
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="rounded-xl border border-brand-outline/30 bg-brand-paper p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-white">
                              {EYE_DISPLAY_NAMES[event.eye as EyeName] || event.eye || event.type}
                            </span>
                            {data.confidence !== undefined && (
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                data.confidence > 0.8 ? 'bg-green-500/20 text-green-400' :
                                data.confidence > 0.5 ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {Math.round((data.confidence as number) * 100)}% confidence
                              </span>
                            )}
                          </div>

                          {data.citations && Array.isArray(data.citations) && (
                            <div className="mt-3 space-y-2">
                              <div className="text-xs font-medium text-slate-400">Citations:</div>
                              {(data.citations as string[]).map((citation, i) => (
                                <div key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-brand-accent/40 py-1">
                                  {citation}
                                </div>
                              ))}
                            </div>
                          )}

                          {data.evidence && (
                            <div className="mt-3 text-sm text-slate-300">
                              <div className="text-xs font-medium text-slate-400 mb-1">Evidence:</div>
                              <div className="rounded bg-brand-ink/50 p-2 whitespace-pre-wrap">{data.evidence as string}</div>
                            </div>
                          )}

                          {/* Use Evidence Lens for claim validation */}
                          {event.md && data.claimValidation && (
                            <div className="mt-3">
                              <div className="text-xs font-medium text-slate-400 mb-2">Evidence Lens:</div>
                              <EvidenceLens
                                draft={event.md}
                                claims={Object.entries(data.claimValidation as Record<string, boolean>).map(([text, cited]) => ({
                                  start: event.md!.indexOf(text),
                                  end: event.md!.indexOf(text) + text.length,
                                  citation: cited ? (data.citations as string[])?.[0] || 'Evidence available' : null,
                                  confidence: data.confidence as number | undefined,
                                }))}
                                expertMode={true}
                              />
                            </div>
                          )}

                          {/* Fallback for simple claim validation without Evidence Lens */}
                          {data.claimValidation && !event.md && (
                            <div className="mt-3 space-y-1">
                              <div className="text-xs font-medium text-slate-400 mb-1">Claim Validation:</div>
                              {Object.entries(data.claimValidation as Record<string, boolean>).map(([claim, isValid]) => (
                                <div key={claim} className="flex items-start gap-2 text-sm">
                                  <span className={`mt-0.5 ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                                    {isValid ? '✓' : '✗'}
                                  </span>
                                  <span className="text-slate-300">{claim}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-sm text-slate-400">
                      No evidence data available yet. Evidence is collected by Tenseigan and Byakugan Eyes.
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
              )}

              {activeTab === 'plan' && (() => {
                // Find the most recent Rinnegan event with plan data
                const planEvent = events.find(e => e.eye === 'rinnegan' && e.dataJson?.plan_md);
                const planMd = planEvent?.dataJson?.plan_md as string | undefined;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <PlanRenderer planMd={planMd} />
                  </motion.div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </PersonaVoiceDecorator>
  );
}

export default function MonitorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-ink">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        </div>
      </div>
    }>
      <MonitorContent />
    </Suspense>
  );
}
