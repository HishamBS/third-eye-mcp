'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { GlassCard } from '@/components/ui/GlassCard';
import { PipelineVisualization } from '@/components/monitor/PipelineVisualization';
import { PerformanceMetrics } from '@/components/monitor/PerformanceMetrics';
import { EvidenceTrail } from '@/components/monitor/EvidenceTrail';
import { useWebSocket } from '@/hooks/useWebSocket';

interface PipelineEvent {
  id: string;
  sessionId: string;
  eye: string | null;
  type: string;
  code: string | null;
  md: string | null;
  dataJson: Record<string, any> | null;
  nextAction: string | null;
  createdAt: Date;
}

interface SessionSummary {
  sessionId: string;
  status: string;
  eventCount: number;
  eyes: string[];
  createdAt: Date;
}

interface RunData {
  id: string;
  sessionId: string;
  eye: string;
  model: string | null;
  latencyMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  outputJson: Record<string, any> | null;
  createdAt: Date;
}

function EnhancedMonitorContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [runs, setRuns] = useState<RunData[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'metrics' | 'evidence' | 'timeline'>('pipeline');
  const [isLive, setIsLive] = useState(false);

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage, connectionStatus } = useWebSocket({
    sessionId: sessionId || undefined,
    onMessage: (message) => {
      console.log('📡 Real-time update:', message);

      if (message.type === 'pipeline_event') {
        setEvents(prev => [message.data, ...prev]);
        setIsLive(true);
      } else if (message.type === 'run_completed') {
        setRuns(prev => [message.data, ...prev]);
      } else if (message.type === 'session_update') {
        // Refresh session data
        fetchSessionData();
      }
    },
    onOpen: () => {
      console.log('📡 Connected to real-time monitor');
      setIsLive(true);
    },
    onClose: () => {
      console.log('📡 Disconnected from real-time monitor');
      setIsLive(false);
    }
  });

  const fetchSessionData = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

      const [eventsRes, summaryRes, runsRes] = await Promise.all([
        fetch(`${API_URL}/api/session/${sessionId}/events`),
        fetch(`${API_URL}/api/session/${sessionId}/summary`),
        fetch(`${API_URL}/api/session/${sessionId}/runs`)
      ]);

      if (!eventsRes.ok || !summaryRes.ok) {
        throw new Error('Failed to fetch session data');
      }

      const eventsData = await eventsRes.json();
      const summaryData = await summaryRes.json();
      const runsData = runsRes.ok ? await runsRes.json() : { runs: [] };

      // Handle RFC7807 envelope format
      const events = eventsData.success ? eventsData.data : eventsData;
      const summary = summaryData.success ? summaryData.data : summaryData;
      const runs = runsData.success ? runsData.data.runs : runsData.runs || [];

      setEvents(Array.isArray(events) ? events : []);
      setSummary(summary);
      setRuns(Array.isArray(runs) ? runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [sessionId]);

  // Auto-refresh every 30 seconds if not connected to WebSocket
  useEffect(() => {
    if (!isConnected && sessionId) {
      const interval = setInterval(fetchSessionData, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, sessionId]);

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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time Monitor</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Enhanced Pipeline Monitor</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <GlassCard className="py-12">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/logo.svg"
                  alt="Third Eye MCP logo"
                  width={80}
                  height={80}
                  className="h-12 w-auto"
                  priority
                />
                <h2 className="text-xl font-semibold text-white">Third Eye MCP Monitor</h2>
              </div>
              <p className="text-sm text-slate-400">Provide a sessionId query parameter to view real-time pipeline execution.</p>
              <div className="mt-6 text-xs text-slate-500">
                <p>Features:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Live pipeline visualization with Eye flow</li>
                  <li>• Real-time performance metrics and token usage</li>
                  <li>• Evidence trail with fact-checking and validation</li>
                  <li>• WebSocket integration for instant updates</li>
                </ul>
              </div>
            </div>
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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time Monitor</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Error</h1>
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
            <button
              onClick={fetchSessionData}
              className="mt-4 rounded-lg bg-brand-accent px-4 py-2 text-sm text-white hover:bg-brand-accent/80"
            >
              Retry
            </button>
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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Enhanced Monitor</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Session {sessionId}</h1>
                {summary && (
                  <p className="mt-1 text-sm text-slate-400">
                    Status: {summary.status} · {summary.eventCount} events · Eyes: {summary.eyes.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-3">
              <div className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-xs ${
                isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : connectionStatus === 'reconnecting'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <div className={`h-2 w-2 rounded-full ${
                  isConnected
                    ? 'bg-green-400 animate-pulse'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-red-400'
                }`} />
                <span>
                  {isConnected ? 'LIVE' : connectionStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
                </span>
              </div>

              <button
                onClick={fetchSessionData}
                className="rounded-lg border border-brand-outline/40 bg-brand-paper/60 px-3 py-2 text-xs text-slate-300 hover:bg-brand-paper/80"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 border-b border-brand-outline/40">
          {([
            { id: 'pipeline', label: 'Pipeline Flow', icon: '🔄' },
            { id: 'metrics', label: 'Performance', icon: '📊' },
            { id: 'evidence', label: 'Evidence Trail', icon: '🔍' },
            { id: 'timeline', label: 'Timeline', icon: '📝' }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-brand-accent bg-brand-paperElev/50 text-brand-accent'
                  : 'text-slate-400 hover:bg-brand-paper/30 hover:text-slate-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60"
            />
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'pipeline' && (
                <PipelineVisualization
                  sessionId={sessionId}
                  events={events}
                  isLive={isLive}
                />
              )}

              {activeTab === 'metrics' && (
                <GlassCard>
                  <PerformanceMetrics events={events} runs={runs} />
                </GlassCard>
              )}

              {activeTab === 'evidence' && (
                <GlassCard>
                  <EvidenceTrail events={events} sessionId={sessionId} />
                </GlassCard>
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
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-white">{event.eye || event.type}</span>
                              {event.code && (
                                <span className={`rounded px-2 py-1 text-xs ${
                                  event.code === 'OK' ? 'bg-green-500/20 text-green-400' :
                                  event.code.startsWith('REJECT_') ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {event.code}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(event.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {event.md && (
                            <p className="mt-2 text-slate-300">{event.md}</p>
                          )}
                          {event.dataJson && Object.keys(event.dataJson).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-slate-400">
                                View data
                              </summary>
                              <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-xs text-slate-400">
                                {JSON.stringify(event.dataJson, null, 2)}
                              </pre>
                            </details>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </GlassCard>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function EnhancedMonitorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-ink">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        </div>
      </div>
    }>
      <EnhancedMonitorContent />
    </Suspense>
  );
}
