import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePipelineStore } from '../store/pipelineStore';
import Timeline from '../components/Timeline';
import EyeDrawer from '../components/EyeDrawer';

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

export function ReplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
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
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10 text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Replay</p>
          <h1 className="text-3xl font-semibold text-white">Session Timeline — {sessionId}</h1>
          <p className="mt-2 text-sm text-slate-400">Scrub through Overseer events to review approvals, rejections, and user inputs. Press play for an animated reenactment.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span>Speed</span>
            <select
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              className="rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-1 text-xs text-slate-100"
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
            className="rounded-full border border-brand-outline/40 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
      </header>

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

      {activeEvent ? (
        <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 text-sm text-slate-200">
          <header className="flex items-center justify-between text-xs text-slate-400">
            <span>{activeEvent.eye ?? activeEvent.type}</span>
            <span>{activeEvent.code ?? ''}</span>
          </header>
          <p className="mt-3 text-sm text-slate-200">{activeEvent.md ?? 'No summary provided.'}</p>
          <button
            type="button"
            onClick={() => activeEvent.eye && setDrawerEye(activeEvent.eye)}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-brand-outline/50 px-4 py-2 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10"
          >
            View Eye payload
          </button>
        </section>
      ) : (
        <p className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-5 text-sm text-slate-300">No events captured yet.</p>
      )}

      <EyeDrawer
        isOpen={Boolean(drawerEye)}
        onClose={() => setDrawerEye(null)}
        state={drawerEye ? eyes[drawerEye] ?? null : null}
        personaMode
      />
    </main>
  );
}

export default ReplayPage;
