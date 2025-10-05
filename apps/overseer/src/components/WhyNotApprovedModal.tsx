import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import type { EyeState } from '../types/pipeline';

export interface WhyNotApprovedModalProps {
  eyeState: EyeState | null;
  open: boolean;
  onClose: () => void;
  onResubmit?: () => void;
}

function getMarkdown(state: EyeState | null, key: 'issues_md' | 'fix_instructions_md'): string {
  if (!state?.data) return 'No details provided.';
  const value = state.data[key];
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return 'No details provided.';
}

export function WhyNotApprovedModal({ eyeState, open, onClose, onResubmit }: WhyNotApprovedModalProps) {
  const issues = useMemo(() => getMarkdown(eyeState, 'issues_md'), [eyeState]);
  const fixes = useMemo(() => getMarkdown(eyeState, 'fix_instructions_md'), [eyeState]);

  return (
    <AnimatePresence>
      {open && eyeState ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-2xl rounded-2xl border border-brand-outline/60 bg-brand-paperElev/90 p-6 text-sm text-slate-200 shadow-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Why not approved</p>
                <h2 className="text-xl font-semibold text-white">{eyeState.eye}</h2>
                {eyeState.code && (
                  <p className="mt-1 text-xs text-slate-400">
                    Status code <span className="font-mono text-brand-accent">{eyeState.code}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-brand-outline/60 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
              >
                Close
              </button>
            </header>

            <section className="mt-4 grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4">
                <h3 className="text-sm font-semibold text-white">Issues</h3>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-300">{issues}</p>
              </article>
              <article className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4">
                <h3 className="text-sm font-semibold text-white">Fix instructions</h3>
                <p className="mt-2 whitespace-pre-line text-xs text-slate-300">{fixes}</p>
              </article>
            </section>

            <footer className="mt-4 flex justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-brand-outline/50 px-4 py-2 text-slate-200 transition hover:border-brand-accent hover:text-brand-accent"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => onResubmit?.()}
                className={clsx('rounded-full bg-brand-accent px-4 py-2 font-semibold text-brand-ink transition hover:bg-brand-primary', !onResubmit && 'cursor-not-allowed opacity-50')}
                disabled={!onResubmit}
              >
                Resubmit to host agent
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default WhyNotApprovedModal;
