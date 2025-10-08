'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { ReplayTheater } from '@/components/ReplayTheater';

function ReplayContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') || 'unknown';
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!sessionId || sessionId === 'unknown') {
        setLoading(false);
        setError('No session ID provided');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const response = await fetch(`${API_URL}/api/session/${sessionId}/events`);

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        setEvents(data.events || data.data || []);
      } catch (err) {
        console.error('Failed to fetch replay events:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-brand-ink">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
              ← Home
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Replay Theater</p>
              <h1 className="mt-1 text-2xl font-semibold text-white">Session: {sessionId}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {loading ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="bg-brand-paperElev/50 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent"></div>
              <p className="mt-4 text-sm text-slate-400">Loading session events...</p>
            </GlassCard>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="bg-brand-paperElev/50 p-12 text-center">
              <p className="text-sm text-red-400">Error: {error}</p>
              <Link
                href="/"
                className="mt-4 inline-block text-sm text-brand-accent hover:underline"
              >
                Return to home
              </Link>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ReplayTheater sessionId={sessionId} events={events} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-ink">
          <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
            <div className="mx-auto max-w-7xl px-6 py-6">
              <div className="flex items-center gap-6">
                <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                  ← Home
                </Link>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Replay Theater</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white">Loading...</h1>
                </div>
              </div>
            </div>
          </div>
          <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
            <GlassCard className="bg-brand-paperElev/50 p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent"></div>
              <p className="mt-4 text-sm text-slate-400">Initializing replay theater...</p>
            </GlassCard>
          </div>
        </div>
      }
    >
      <ReplayContent />
    </Suspense>
  );
}
