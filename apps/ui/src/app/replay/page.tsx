'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePipelineStore } from '@/store/pipelineStore';
import Timeline from '@/components/Timeline';
import EyeDrawer from '@/components/EyeDrawer';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export default function ReplayPage() {
  const params = useParams<{ sessionId?: string }>();
  const sessionId = params.sessionId || 'unknown';
  const events = usePipelineStore((state) => state.events);
  const eyes = usePipelineStore((state) => state.eyes);
  const [index, setIndex] = useState<number>(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [drawerEye, setDrawerEye] = useState<string | null>(null);

  const ordered = useMemo(() => [...events], [events]);

  useEffect(() => {
    if (!playing) return;
    if (!ordered.length) return;

    const timeout = setTimeout(() => {
      setIndex((prev) => {
        if (prev >= ordered.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 600 / speed);
    return () => clearTimeout(timeout);
  }, [playing, ordered, speed, index]);

  const activeEvent = ordered[index];

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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Replay</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Session Timeline — {sessionId}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <span>Speed</span>
                <select
                  value={speed}
                  onChange={(event) => setSpeed(Number(event.target.value))}
                  className="rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-100 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                >
                  {SPEED_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}×
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setPlaying((prev) => !prev)}
                className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                {playing ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="bg-brand-paperElev/50 p-4">
            <p className="text-sm text-slate-400">
              Scrub through Overseer events to review approvals, rejections, and user inputs. Press play for an animated reenactment.
            </p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Timeline
            events={ordered}
            selectedIndex={index}
            onSelect={(value) => setIndex(value)}
            onFocusEye={(event) => {
              if (event.eye) {
                setDrawerEye(event.eye);
              }
            }}
          />
        </motion.div>

        {activeEvent ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard>
              <header className="mb-3 flex items-center justify-between text-xs text-slate-400">
                <span>{activeEvent.eye ?? activeEvent.type}</span>
                <span>{activeEvent.code ?? ''}</span>
              </header>
              <p className="text-sm text-slate-200">{activeEvent.md ?? 'No summary provided.'}</p>
              {activeEvent.eye && (
                <button
                  type="button"
                  onClick={() => setDrawerEye(activeEvent.eye)}
                  className="mt-4 rounded-full border border-brand-outline/50 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                >
                  View Eye payload
                </button>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="py-12 text-center">
              <p className="text-sm text-slate-400">No events captured yet.</p>
            </GlassCard>
          </motion.div>
        )}

        <EyeDrawer
          isOpen={Boolean(drawerEye)}
          onClose={() => setDrawerEye(null)}
          state={drawerEye ? eyes[drawerEye] ?? null : null}
          personaMode
        />
      </div>
    </div>
  );
}
