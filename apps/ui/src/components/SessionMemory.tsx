'use client';

import { useState, useEffect } from 'react';
import { Brain, Clock, ChevronRight, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface PriorRun {
  id: string;
  eye: string;
  inputMd: string;
  outputJson: Record<string, unknown>;
  verdict: string;
  createdAt: string;
  relevanceScore?: number;
}

interface SessionMemoryProps {
  sessionId: string;
  currentInput?: string;
  maxResults?: number;
}

export function SessionMemory({ sessionId, currentInput, maxResults = 10 }: SessionMemoryProps) {
  const [priorRuns, setPriorRuns] = useState<PriorRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchPriorRuns();
  }, [sessionId]);

  const fetchPriorRuns = async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/${sessionId}/runs?limit=${maxResults}`);
      if (response.ok) {
        const data = await response.json();
        // Calculate relevance if current input is provided
        const runsWithRelevance = data.map((run: PriorRun) => ({
          ...run,
          relevanceScore: currentInput ? calculateRelevance(run.inputMd, currentInput) : 0,
        }));
        // Sort by relevance, then by recency
        runsWithRelevance.sort((a: PriorRun, b: PriorRun) => {
          if (a.relevanceScore !== b.relevanceScore) {
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setPriorRuns(runsWithRelevance);
      }
    } catch (error) {
      console.error('Failed to fetch prior runs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple relevance calculation based on word overlap
  const calculateRelevance = (priorInput: string, currentInput: string): number => {
    const priorWords = new Set(priorInput.toLowerCase().split(/\s+/));
    const currentWords = currentInput.toLowerCase().split(/\s+/);

    let matches = 0;
    currentWords.forEach(word => {
      if (priorWords.has(word)) matches++;
    });

    return currentWords.length > 0 ? matches / currentWords.length : 0;
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toUpperCase()) {
      case 'APPROVED':
        return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
      case 'REJECTED':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'NEEDS_INPUT':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const getEyeIcon = (eye: string) => {
    const icons: Record<string, string> = {
      sharingan: '👁️',
      rinnegan: '🌀',
      tenseigan: '💫',
      jogan: '🔮',
      byakugan: '👀',
      mangekyo: '⚡',
    };
    return icons[eye] || '🧿';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const visibleRuns = expanded ? priorRuns : priorRuns.slice(0, 5);

  return (
    <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/60 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Brain className="h-5 w-5 text-purple-400" />
          Session Memory
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          {priorRuns.length} runs
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-brand-paper/70"
            />
          ))}
        </div>
      ) : priorRuns.length === 0 ? (
        <div className="rounded-xl border border-brand-outline/30 bg-brand-paper/50 p-8 text-center">
          <Brain className="mx-auto h-12 w-12 text-slate-500" />
          <p className="mt-3 text-slate-400">No prior runs in this session yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Byakugan will reference past validations for consistency checking
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visibleRuns.map((run, index) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className="group rounded-xl border border-brand-outline/30 bg-brand-paper/70 p-4 transition-all hover:border-brand-accent/50 hover:bg-brand-paper"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getEyeIcon(run.eye)}</span>
                      <div>
                        <h4 className="font-medium capitalize text-white">{run.eye}</h4>
                        <p className="text-xs text-slate-400">{formatTimeAgo(run.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {run.relevanceScore !== undefined && run.relevanceScore > 0.3 && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
                          {Math.round(run.relevanceScore * 100)}% match
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${getVerdictColor(
                          run.verdict
                        )}`}
                      >
                        {run.verdict}
                      </span>
                    </div>
                  </div>

                  <p className="mb-2 line-clamp-2 text-sm text-slate-300">
                    {run.inputMd}
                  </p>

                  {run.outputJson?.summary && (
                    <p className="line-clamp-1 text-xs text-slate-400">
                      {run.outputJson.summary}
                    </p>
                  )}

                  <Link
                    href={`#run-${run.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-brand-accent opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    View details
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {priorRuns.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-full border border-brand-outline/40 py-2 text-sm font-medium text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
            >
              {expanded ? 'Show Less' : `Show ${priorRuns.length - 5} More`}
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          )}

          <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
            <p className="text-xs text-purple-300">
              <strong>Byakugan Consistency Check:</strong> References these prior runs to detect
              contradictions and ensure logical consistency across your session.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
