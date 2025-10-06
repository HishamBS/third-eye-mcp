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

interface Issue {
  category: string;
  description: string;
  fix?: string;
}

function parseIssues(state: EyeState | null): Issue[] {
  if (!state?.data?.issues_md) return [];

  const issuesText = state.data.issues_md as string;
  const lines = issuesText.split('\n').filter(l => l.trim());

  const issues: Issue[] = [];
  let currentIssue: Partial<Issue> = {};

  for (const line of lines) {
    // Category headers (e.g., "**Security:**")
    if (line.match(/^\*\*[\w\s]+:\*\*/)) {
      if (currentIssue.category && currentIssue.description) {
        issues.push(currentIssue as Issue);
      }
      currentIssue = { category: line.replace(/\*\*/g, '').replace(':', '').trim() };
    }
    // Issue descriptions
    else if (line.startsWith('-') || line.startsWith('*')) {
      currentIssue.description = line.replace(/^[-*]\s*/, '').trim();
    }
    // Fix suggestions
    else if (line.toLowerCase().includes('fix:') || line.toLowerCase().includes('suggestion:')) {
      currentIssue.fix = line.split(/fix:|suggestion:/i)[1]?.trim();
    }
    // Fallback - treat as description if we have a category
    else if (currentIssue.category && !currentIssue.description) {
      currentIssue.description = line.trim();
    }
  }

  if (currentIssue.category && currentIssue.description) {
    issues.push(currentIssue as Issue);
  }

  // Fallback to simple parsing if no structured issues found
  if (issues.length === 0) {
    return [{
      category: 'General',
      description: issuesText,
    }];
  }

  return issues;
}

function getMarkdown(state: EyeState | null, key: 'issues_md' | 'fix_instructions_md'): string {
  if (!state?.data) return 'No details provided.';
  const value = state.data[key];
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return 'No details provided.';
}

export function WhyNotApprovedModal({ eyeState, open, onClose, onResubmit }: WhyNotApprovedModalProps) {
  const parsedIssues = useMemo(() => parseIssues(eyeState), [eyeState]);
  const fixes = useMemo(() => getMarkdown(eyeState, 'fix_instructions_md'), [eyeState]);

  const categoryColors: Record<string, string> = {
    'Security': 'border-rose-500/40 bg-rose-500/10',
    'Performance': 'border-amber-500/40 bg-amber-500/10',
    'Quality': 'border-blue-500/40 bg-blue-500/10',
    'Documentation': 'border-purple-500/40 bg-purple-500/10',
    'General': 'border-slate-500/40 bg-slate-500/10',
  };

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

            <section className="mt-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Issues Found ({parsedIssues.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {parsedIssues.map((issue, index) => {
                  const colorClass = categoryColors[issue.category] || categoryColors['General'];
                  return (
                    <article key={index} className={`rounded-lg border ${colorClass} p-3`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-white">{issue.category}</div>
                          <div className="mt-1 text-xs text-slate-300">{issue.description}</div>
                          {issue.fix && (
                            <div className="mt-2 rounded bg-brand-paper/60 p-2 text-xs text-emerald-400">
                              <span className="font-semibold">💡 Fix:</span> {issue.fix}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {fixes !== 'No details provided.' && (
                <article className="rounded-xl border border-brand-outline/40 bg-brand-paper/80 p-4 mt-4">
                  <h3 className="text-sm font-semibold text-white">General Fix Instructions</h3>
                  <p className="mt-2 whitespace-pre-line text-xs text-slate-300">{fixes}</p>
                </article>
              )}
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
