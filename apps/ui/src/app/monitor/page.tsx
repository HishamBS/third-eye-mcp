'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useWebSocket, type WSMessage } from '@/hooks/useWebSocket';
import type { EyeName } from '@third-eye/types';
import { EYE_DISPLAY_NAMES, EYE_COLORS } from '@third-eye/config/constants';
import { Clock, User, Bot, Eye } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';

interface SessionSummary {
  sessionId: string;
  status: string;
  eventCount: number;
  eyes: string[];
  createdAt: Date;
}

interface ConversationEntry {
  id: string;
  timestamp: Date;
  speaker: 'overseer' | 'agent' | 'human' | EyeName;
  message: string;
  metadata?: {
    code?: string;
    dataJson?: any;
  };
}

interface ApiPipelineEvent {
  id: string;
  sessionId: string;
  type: string;
  eye?: string | null;
  code?: string | null;
  md?: string | null;
  dataJson?: Record<string, unknown> | null;
  createdAt: string;
}

const KNOWN_EYES = new Set(Object.keys(EYE_DISPLAY_NAMES));

function normalizeEyeName(value?: string | null): EyeName | undefined {
  if (!value) return undefined;
  if (KNOWN_EYES.has(value)) return value as EyeName;
  const normalized = value.replace(/[-:]/g, '_');
  if (KNOWN_EYES.has(normalized)) {
    return normalized as EyeName;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function firstString(values: Array<unknown>): string | undefined {
  for (const value of values) {
    const str = getString(value);
    if (str) return str;
  }
  return undefined;
}

function deriveSpeaker(params: { type?: string; eye?: string; data?: Record<string, unknown>; speaker?: string }): ConversationEntry['speaker'] {
  const candidateSpeaker = params.speaker || (params.data ? getString((params.data as any).speaker) : undefined);
  if (candidateSpeaker === 'agent') return 'agent';
  if (candidateSpeaker === 'human') return 'human';

  const resolvedEye = normalizeEyeName(candidateSpeaker)
    || normalizeEyeName(params.eye)
    || (params.data ? normalizeEyeName(getString((params.data as any).eye)) : undefined);

  if (resolvedEye) {
    return resolvedEye;
  }

  if (params.type === 'agent_message' || params.type === 'agent_response') {
    return 'agent';
  }

  if (params.type === 'user_input' || params.type === 'user_input_request' || params.type === 'user_input_received') {
    return 'human';
  }

  return 'overseer';
}

function normalizeApiEvent(event: ApiPipelineEvent): ConversationEntry {
  const data = asRecord(event.dataJson);
  const message = firstString([
    event.md,
    data?.md,
    data?.details,
    data?.summary,
  ]) || 'Processing...';

  return {
    id: event.id,
    timestamp: new Date(event.createdAt),
    speaker: deriveSpeaker({ type: event.type, eye: event.eye || undefined, data }),
    message,
    metadata: {
      code: event.code || undefined,
      dataJson: data,
    },
  };
}

function normalizeWebSocketPipelineMessage(message: WSMessage): ConversationEntry | null {
  const payload = asRecord(message.data);
  if (!payload) return null;

  const result = asRecord(payload.result);
  const ui = asRecord(payload.ui);
  const timestampMs = typeof payload.timestamp === 'number' ? payload.timestamp : message.timestamp;

  const idParts = [
    getString(payload.runId),
    getString(payload.eventType),
    getString(payload.status),
    getString(payload.eye),
    timestampMs ? String(timestampMs) : undefined,
  ].filter(Boolean);

  const id = idParts.length > 0
    ? `ws-${idParts.join(':')}`
    : `ws-${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now())}`;

  const code = getString(payload.code) || (result ? getString(result.code) : undefined);

  const messageText = firstString([
    ui?.details,
    ui?.summary,
    ui?.title,
    payload.md,
    result?.md,
    payload.error,
  ]) || 'Processing...';

  return {
    id,
    timestamp: new Date(timestampMs),
    speaker: deriveSpeaker({
      type: getString(payload.eventType) || message.type,
      eye: getString(payload.eye),
      data: payload,
      speaker: getString(payload.speaker),
    }),
    message: messageText,
    metadata: {
      code: code || undefined,
      dataJson: payload,
    },
  };
}

function getSpeakerColor(speaker: string): string {
  if (speaker === 'overseer') return '#6366f1'; // indigo
  if (speaker === 'agent') return '#10b981'; // green
  if (speaker === 'human') return '#f59e0b'; // amber
  return EYE_COLORS[speaker as EyeName] || '#8b5cf6'; // purple default
}

function getSpeakerIcon(speaker: string) {
  if (speaker === 'agent') return <Bot className="h-4 w-4" />;
  if (speaker === 'human') return <User className="h-4 w-4" />;
  return <Eye className="h-4 w-4" />;
}

function MonitorContent() {
  const searchParams = useSearchParams();
  const { selectedSessionId, setSelectedSession } = useUI();
  const sessionIdFromQuery = searchParams.get('sessionId');
  const sessionId = sessionIdFromQuery ?? selectedSessionId ?? null;

  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionIdFromQuery && sessionIdFromQuery !== selectedSessionId) {
      setSelectedSession(sessionIdFromQuery);
    }
  }, [sessionIdFromQuery, selectedSessionId, setSelectedSession]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, autoScroll]);

  const upsertEntry = (entry: ConversationEntry) => {
    setEntries((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === entry.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }

      const next = [...prev, entry];
      next.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      return next;
    });
  };

  // WebSocket connection
  const { connectionStatus } = useWebSocket({
    sessionId: sessionId || undefined,
    onMessage: (message: WSMessage) => {
      console.log('[Monitor] Received WebSocket message:', message.type, message);

      // Handle real-time updates
      if (message.type === 'pipeline_event') {
        const entry = normalizeWebSocketPipelineMessage(message);
        if (entry) {
          upsertEntry(entry);
        }
      } else if (message.type === 'session_update' && message.data) {
        // Refresh summary on session updates
        fetchSummary();
      }
    },
    onError: (error) => {
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
      setEntries([]);
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

        // Backend returns envelope format: {success: true, data: [...]}
        const initialEntries = Array.isArray(eventsData.data)
          ? (eventsData.data as ApiPipelineEvent[]).map(normalizeApiEvent)
          : [];

        initialEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        setEntries(initialEntries);
        setSummary(summaryData.data);
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
        setSummary(summaryData.data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const conversationEntries = entries;

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
            <p className="text-lg text-white mb-2">No Session Selected</p>
            <p className="text-sm text-slate-400 mb-6">
              Select a session to watch real-time agent conversations
            </p>
            <Link
              href="/"
              className="inline-flex items-center space-x-2 rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white hover:bg-brand-accent/90 transition-colors"
            >
              <span>Back to Dashboard</span>
            </Link>
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
                <h1 className="mt-1 text-2xl font-semibold text-white">Session {sessionId?.slice(0, 8)}...</h1>
                {summary && (
                  <p className="mt-1 text-sm text-slate-400">
                    Status: {summary.status} · {summary.eventCount} events
                    {summary.eyes && summary.eyes.length > 0 && ` · Eyes: ${summary.eyes.map(e => EYE_DISPLAY_NAMES[e as EyeName] || e).join(', ')}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-brand-outline bg-brand-paper text-brand-accent focus:ring-brand-accent"
                />
                Auto-scroll
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Conversation Log</h2>
            <div className="text-xs text-slate-500">
              {conversationEntries.length} {conversationEntries.length === 1 ? 'message' : 'messages'}
            </div>
          </div>

          {loading ? (
            <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
          ) : conversationEntries.length === 0 ? (
            <div className="py-16 text-center">
              <Eye className="h-12 w-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg text-white mb-2">No Conversation Yet</p>
              <p className="text-sm text-slate-400">
                Waiting for agent to start communicating...
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {conversationEntries.map((entry, index) => {
                const speakerColor = getSpeakerColor(entry.speaker);
                const speakerName = entry.speaker === 'overseer' ? 'Overseer' :
                                   entry.speaker === 'agent' ? 'Agent' :
                                   entry.speaker === 'human' ? 'Human' :
                                   EYE_DISPLAY_NAMES[entry.speaker as EyeName] || entry.speaker;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group"
                  >
                    <div className="flex gap-3">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: speakerColor }}
                      >
                        {getSpeakerIcon(entry.speaker)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: speakerColor }}
                          >
                            {speakerName}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                          {entry.metadata?.code && (
                            <span className="text-xs px-2 py-0.5 rounded bg-brand-paper text-slate-400 font-mono">
                              {entry.metadata.code}
                            </span>
                          )}
                        </div>

                        <div className="rounded-lg bg-brand-paper/60 border border-brand-outline/30 p-3">
                          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                            {entry.message}
                          </p>

                          {entry.metadata?.dataJson && Object.keys(entry.metadata.dataJson).length > 0 && (
                            <details className="mt-2 text-xs">
                              <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                                Technical Data
                              </summary>
                              <pre className="mt-2 p-2 rounded bg-brand-ink/50 text-slate-400 overflow-x-auto">
                                {JSON.stringify(entry.metadata.dataJson, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              <div ref={conversationEndRef} />
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}


// TODO: Add speaker detection in event mapping:
// const events = pipelineEvents.map(event => ({
//   ...event,
//   speaker: event.type === 'user_input' ? 'User' :
//            event.type === 'eye_call' ? 'Assistant' : 'System',
//   icon: event.type === 'user_input' ? '👤' :
//         event.type === 'eye_call' ? getEyeIcon(event.eye) : '⚙️'
// }));

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
