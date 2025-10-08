'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, User, Lightbulb, CheckCircle } from 'lucide-react';

interface ContributionPrompt {
  id: string;
  eye: string;
  question: string;
  context?: string;
  type: 'missing_context' | 'clarification' | 'evidence' | 'approval';
  createdAt: Date;
}

interface UserContribution {
  promptId: string;
  answer: string;
  createdAt: Date;
}

interface UserContributionModeProps {
  sessionId: string;
  onContribute?: (contribution: UserContribution) => void;
  pollInterval?: number;
}

export function UserContributionMode({
  sessionId,
  onContribute,
  pollInterval = 3000,
}: UserContributionModeProps) {
  const [prompts, setPrompts] = useState<ContributionPrompt[]>([]);
  const [contributions, setContributions] = useState<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;

    const fetchPrompts = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const response = await fetch(`${API_URL}/api/session/${sessionId}/contribution-prompts`);

        if (response.ok) {
          const data = await response.json();
          setPrompts(data.prompts || []);
        }
      } catch (error) {
        console.error('Failed to fetch contribution prompts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
    const interval = setInterval(fetchPrompts, pollInterval);

    return () => clearInterval(interval);
  }, [sessionId, pollInterval, isEnabled]);

  const handleAnswerChange = (promptId: string, answer: string) => {
    setContributions(new Map(contributions.set(promptId, answer)));
  };

  const handleSubmit = async (prompt: ContributionPrompt) => {
    const answer = contributions.get(prompt.id);
    if (!answer?.trim()) return;

    setSubmitting(new Set(submitting.add(prompt.id)));

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: prompt.id,
          answer: answer.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit contribution');
      }

      const contribution: UserContribution = {
        promptId: prompt.id,
        answer: answer.trim(),
        createdAt: new Date(),
      };

      setSubmitted(new Set(submitted.add(prompt.id)));
      onContribute?.(contribution);

      // Remove from contributions map
      const newContributions = new Map(contributions);
      newContributions.delete(prompt.id);
      setContributions(newContributions);
    } catch (error) {
      console.error('Failed to submit contribution:', error);
      alert('Failed to submit contribution. Please try again.');
    } finally {
      const newSubmitting = new Set(submitting);
      newSubmitting.delete(prompt.id);
      setSubmitting(newSubmitting);
    }
  };

  const getPromptIcon = (type: ContributionPrompt['type']) => {
    switch (type) {
      case 'missing_context':
        return <Lightbulb className="h-5 w-5 text-amber-400" />;
      case 'clarification':
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'evidence':
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'approval':
        return <User className="h-5 w-5 text-purple-400" />;
    }
  };

  const getPromptColor = (type: ContributionPrompt['type']) => {
    switch (type) {
      case 'missing_context':
        return 'border-amber-500/40 bg-amber-500/10';
      case 'clarification':
        return 'border-blue-500/40 bg-blue-500/10';
      case 'evidence':
        return 'border-emerald-500/40 bg-emerald-500/10';
      case 'approval':
        return 'border-purple-500/40 bg-purple-500/10';
    }
  };

  const activePrompts = prompts.filter((p) => !submitted.has(p.id));

  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-outline/40 bg-brand-ink/60">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">User Contribution Mode</h3>
              <p className="text-sm text-slate-400">Answer prompts inline to assist Eyes</p>
            </div>
          </div>
          <button
            onClick={() => setIsEnabled(true)}
            className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
          >
            Enable
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
          <p className="text-sm text-slate-400">Loading contribution prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-accent/40 bg-brand-accent/20">
            <User className="h-5 w-5 text-brand-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-white">User Contribution Mode</h3>
            <p className="text-xs text-slate-400">
              {activePrompts.length} {activePrompts.length === 1 ? 'prompt' : 'prompts'} waiting
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsEnabled(false)}
          className="rounded-full border border-brand-outline/50 px-3 py-1 text-xs text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
        >
          Disable
        </button>
      </div>

      {/* Prompts List */}
      <AnimatePresence mode="popLayout">
        {activePrompts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-12 text-center"
          >
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
            <p className="mt-3 text-sm text-slate-300">All caught up!</p>
            <p className="mt-1 text-xs text-slate-400">No pending contribution prompts.</p>
          </motion.div>
        ) : (
          activePrompts.map((prompt, index) => {
            const answer = contributions.get(prompt.id) || '';
            const isSubmitting = submitting.has(prompt.id);
            const isSubmitted = submitted.has(prompt.id);

            return (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border p-6 ${getPromptColor(prompt.type)}`}
              >
                {/* Prompt Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getPromptIcon(prompt.type)}
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {prompt.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs capitalize text-slate-400">{prompt.eye}</span>
                      </div>
                      <p className="text-base font-medium text-white">{prompt.question}</p>
                      {prompt.context && (
                        <p className="mt-2 text-sm text-slate-300">{prompt.context}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(prompt.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Answer Input */}
                {!isSubmitted && (
                  <div className="space-y-3">
                    <textarea
                      value={answer}
                      onChange={(e) => handleAnswerChange(prompt.id, e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40 disabled:opacity-50"
                      rows={3}
                    />

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSubmit(prompt)}
                        disabled={!answer.trim() || isSubmitting}
                        className="flex items-center gap-2 rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-ink border-t-transparent" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Submit</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isSubmitted && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm text-emerald-300">Contribution submitted successfully!</p>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserContributionMode;
