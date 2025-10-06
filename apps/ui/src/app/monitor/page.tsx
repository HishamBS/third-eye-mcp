'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

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

function MonitorContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'eyes' | 'evidence'>('timeline');

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

        const [eventsRes, summaryRes] = await Promise.all([
          fetch(`${API_URL}/sessions/${sessionId}/events`),
          fetch(`${API_URL}/sessions/${sessionId}/summary`)
        ]);

        if (!eventsRes.ok || !summaryRes.ok) {
          throw new Error('Failed to fetch session data');
        }

        const eventsData = await eventsRes.json();
        const summaryData = await summaryRes.json();

        setEvents(eventsData);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

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
    <div className="min-h-screen bg-brand-ink">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
              ← Home
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Real-time Monitor</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Session {sessionId}</h1>
              {summary && (
                <p className="mt-1 text-sm text-slate-400">
                  Status: {summary.status} · {summary.eventCount} events · Eyes: {summary.eyes.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex gap-2 border-b border-brand-outline/40">
          {(['timeline', 'eyes', 'evidence'] as const).map((tab) => (
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

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60" />
        ) : (
          <GlassCard>
            {activeTab === 'timeline' && (
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
            )}
            {activeTab === 'eyes' && (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">Eyes view coming soon...</p>
              </div>
            )}
            {activeTab === 'evidence' && (
              <div className="py-12 text-center">
                <p className="text-sm text-slate-400">Evidence view coming soon...</p>
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
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
