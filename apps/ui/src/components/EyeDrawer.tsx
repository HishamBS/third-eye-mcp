import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { renderMarkdown } from '../lib/markdown';
import type { EyeState } from '../types/pipeline';

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'why', label: 'Why' },
  { id: 'issues', label: 'Issues' },
  { id: 'fixes', label: 'Fixes' },
  { id: 'raw', label: 'Raw' },
] as const;

export interface EyeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: EyeState | null;
  noviceMode?: boolean;
  personaMode?: boolean;
}

function tabContent(tabId: string, state: EyeState | null) {
  if (!state) return '';
  const data = state.data ?? {};

  switch (tabId) {
    case 'summary':
      return state.md ?? 'No summary available yet.';
    case 'why':
      return typeof data.reasoning_md === 'string' ? data.reasoning_md : 'Reasoning not provided.';
    case 'issues':
      return typeof data.issues_md === 'string' ? data.issues_md : 'No issues logged.';
    case 'fixes':
      return typeof data.fix_instructions_md === 'string'
        ? data.fix_instructions_md
        : 'No fix instructions available.';
    case 'raw':
      return `\n\n
data: \n\n

${JSON.stringify(data, null, 2)}`;
    default:
      return '';
  }
}

const personaMeta: Record<string, { prefix: string; tone: string }> = {
  SHARINGAN: { prefix: 'Itachi', tone: 'text-eye-sharingan' },
  PROMPT_HELPER: { prefix: 'Konan', tone: 'text-eye-prompt' },
  JOGAN: { prefix: 'Boruto', tone: 'text-eye-jogan' },
  RINNEGAN_PLAN: { prefix: 'Nagato', tone: 'text-eye-rinnegan' },
  RINNEGAN_REVIEW: { prefix: 'Nagato', tone: 'text-eye-rinnegan' },
  RINNEGAN_FINAL: { prefix: 'Nagato', tone: 'text-eye-rinnegan' },
  MANGEKYO_SCAFFOLD: { prefix: 'Madara', tone: 'text-eye-mangekyo' },
  MANGEKYO_IMPL: { prefix: 'Madara', tone: 'text-eye-mangekyo' },
  MANGEKYO_TESTS: { prefix: 'Fugaku', tone: 'text-eye-mangekyo' },
  MANGEKYO_DOCS: { prefix: 'Shisui', tone: 'text-eye-mangekyo' },
  TENSEIGAN: { prefix: 'Hamura', tone: 'text-eye-tenseigan' },
  BYAKUGAN: { prefix: 'Hinata', tone: 'text-eye-byakugan' },
};

export function EyeDrawer({ isOpen, onClose, state, noviceMode = false, personaMode = true }: EyeDrawerProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('summary');

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('summary');
    }
  }, [isOpen]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-4 pb-6 pt-12 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className="w-full max-w-3xl rounded-2xl border border-brand-outline/60 bg-brand-paperElev/90 p-6 shadow-glass"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Eye detail</p>
                <h2 className="text-2xl font-semibold text-white">{state?.eye ?? 'Unknown eye'}</h2>
                {personaMode && state?.eye && personaMeta[state.eye] ? (
                  <p className={clsx('mt-1 text-sm font-semibold', personaMeta[state.eye].tone)}>
                    Persona voice: {personaMeta[state.eye].prefix}
                  </p>
                ) : null}
                {state?.code && (
                  <p className="mt-2 text-sm text-slate-300">
                    Status code <span className="font-mono text-brand-accent">{state.code}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-brand-outline/60 px-3 py-1 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40"
              >
                Close
              </button>
            </header>

            <nav aria-label="Eye detail tabs" className="mt-6 flex flex-wrap gap-2 text-sm">
              {TABS.map((tab) => {
                if (tab.id === 'raw' && noviceMode) return null;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={clsx(
                      'rounded-full px-4 py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/40',
                      isActive
                        ? 'bg-brand-accent/20 text-brand-accent shadow-inner shadow-brand-accent/50'
                        : 'border border-brand-outline/60 text-slate-300 hover:border-brand-accent hover:text-brand-accent',
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            <section className="mt-6 max-h-[24rem] overflow-y-auto rounded-xl border border-brand-outline/40 bg-brand-paper p-5 text-sm text-slate-100">
              <div
                className="space-y-3 leading-relaxed [&_ul]:space-y-2 [&_li]:ml-5 [&_li]:list-disc [&_code]:font-mono [&_strong]:text-brand-accent"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(tabContent(activeTab, state)) }}
              />
            </section>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default EyeDrawer;
