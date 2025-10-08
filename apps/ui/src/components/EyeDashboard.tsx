'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Shield, Search, GitBranch, Code2, Sparkles, Crown, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EyeStatus {
  eye: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'needs_input';
  lastRun?: Date;
  totalRuns: number;
  successRate: number;
  avgLatency: number;
  currentTask?: string;
}

interface EyeDashboardProps {
  sessionId?: string;
  pollInterval?: number;
}

const EYE_CONFIG: Record<string, { icon: LucideIcon; color: string; description: string }> = {
  sharingan: {
    icon: Eye,
    color: 'red',
    description: 'Ambiguity detection & clarification',
  },
  rinnegan: {
    icon: Shield,
    color: 'purple',
    description: 'Requirements & approval gating',
  },
  byakugan: {
    icon: Search,
    color: 'blue',
    description: 'Consistency & memory checks',
  },
  tenseigan: {
    icon: Sparkles,
    color: 'cyan',
    description: 'Evidence & citation validation',
  },
  mangekyo: {
    icon: Code2,
    color: 'amber',
    description: 'Code review across 4 phases',
  },
  jogan: {
    icon: GitBranch,
    color: 'pink',
    description: 'Auto-routing & orchestration',
  },
  overseer: {
    icon: Crown,
    color: 'gold',
    description: 'Master coordinator',
  },
};

function getStatusChip(status: EyeStatus['status']) {
  switch (status) {
    case 'running':
      return (
        <div className="flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/40 px-3 py-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-blue-300">Running</span>
        </div>
      );
    case 'success':
      return (
        <div className="flex items-center gap-2 rounded-full bg-green-500/20 border border-green-500/40 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-xs font-medium text-green-300">Ready</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <span className="text-xs font-medium text-red-300">Error</span>
        </div>
      );
    case 'needs_input':
      return (
        <div className="flex items-center gap-2 rounded-full bg-yellow-500/20 border border-yellow-500/40 px-3 py-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
          <span className="text-xs font-medium text-yellow-300">Needs Input</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2 rounded-full bg-slate-500/20 border border-slate-500/40 px-3 py-1">
          <div className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="text-xs font-medium text-slate-300">Idle</span>
        </div>
      );
  }
}

export function EyeDashboard({ sessionId, pollInterval = 5000 }: EyeDashboardProps) {
  const [eyeStatuses, setEyeStatuses] = useState<EyeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEyeStatuses = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const endpoint = sessionId
          ? `${API_URL}/api/eyes/status?sessionId=${sessionId}`
          : `${API_URL}/api/eyes/status`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch eye statuses: ${response.statusText}`);
        }

        const data = await response.json();
        setEyeStatuses(data.eyes || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch eye statuses:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch eye statuses');
      } finally {
        setLoading(false);
      }
    };

    fetchEyeStatuses();
    const interval = setInterval(fetchEyeStatuses, pollInterval);

    return () => clearInterval(interval);
  }, [sessionId, pollInterval]);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.keys(EYE_CONFIG).map((eye) => (
          <div
            key={eye}
            className="h-56 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paper/60"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center">
        <p className="text-sm text-red-300">Error: {error}</p>
        <p className="mt-2 text-xs text-red-400">Unable to load Eye statuses</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Eye Dashboard</h2>
          <p className="mt-1 text-sm text-slate-400">
            Real-time status of all 7 Eyes {sessionId && `for session ${sessionId}`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-brand-outline/40 bg-brand-paper/60 px-4 py-2">
          <Activity className="h-4 w-4 text-brand-accent" />
          <span className="text-sm text-slate-300">
            {eyeStatuses.filter((e) => e.status === 'running').length} active
          </span>
        </div>
      </div>

      {/* Eye Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Object.entries(EYE_CONFIG).map(([eyeName, config], index) => {
          const eyeStatus = eyeStatuses.find((s) => s.eye === eyeName) || {
            eye: eyeName,
            status: 'idle' as const,
            totalRuns: 0,
            successRate: 0,
            avgLatency: 0,
          };

          const Icon = config.icon;
          const isActive = eyeStatus.status === 'running' || eyeStatus.status === 'needs_input';

          return (
            <motion.div
              key={eyeName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative overflow-hidden rounded-2xl border p-6 transition-all hover:scale-105 hover:shadow-xl ${
                isActive
                  ? `border-${config.color}-500/50 bg-gradient-to-br from-${config.color}-500/10 to-${config.color}-600/5 shadow-lg shadow-${config.color}-500/20`
                  : 'border-brand-outline/40 bg-brand-paper/60 hover:border-brand-accent/50'
              }`}
            >
              {/* Background Glow Effect */}
              {isActive && (
                <div
                  className={`absolute inset-0 opacity-20 bg-gradient-radial from-${config.color}-500/30 to-transparent blur-xl`}
                />
              )}

              {/* Card Content */}
              <div className="relative z-10">
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border ${
                      isActive
                        ? `border-${config.color}-500/40 bg-${config.color}-500/20`
                        : 'border-brand-outline/40 bg-brand-ink/60'
                    } transition-all group-hover:scale-110`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        isActive ? `text-${config.color}-400` : 'text-slate-400'
                      }`}
                    />
                  </div>
                  {getStatusChip(eyeStatus.status)}
                </div>

                {/* Eye Name & Description */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold capitalize text-white">{eyeName}</h3>
                  <p className="mt-1 text-xs text-slate-400">{config.description}</p>
                </div>

                {/* Current Task */}
                {eyeStatus.currentTask && (
                  <div className="mb-4 rounded-lg border border-brand-outline/30 bg-brand-ink/40 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Current Task
                    </p>
                    <p className="mt-1 text-xs text-slate-300 line-clamp-2">{eyeStatus.currentTask}</p>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-brand-ink/40 p-2">
                    <p className="text-slate-500">Runs</p>
                    <p className="mt-1 font-semibold text-white">{eyeStatus.totalRuns}</p>
                  </div>
                  <div className="rounded-lg bg-brand-ink/40 p-2">
                    <p className="text-slate-500">Success</p>
                    <p className="mt-1 font-semibold text-emerald-400">
                      {eyeStatus.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-brand-ink/40 p-2">
                    <p className="text-slate-500">Avg Latency</p>
                    <p className="mt-1 font-semibold text-blue-400">{eyeStatus.avgLatency.toFixed(0)}ms</p>
                  </div>
                </div>

                {/* Last Run */}
                {eyeStatus.lastRun && (
                  <div className="mt-3 border-t border-brand-outline/30 pt-3 text-center">
                    <p className="text-[10px] text-slate-500">
                      Last run: {new Date(eyeStatus.lastRun).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Total Runs</p>
          <p className="mt-2 text-2xl font-bold text-white">
            {eyeStatuses.reduce((sum, eye) => sum + eye.totalRuns, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Avg Success Rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {eyeStatuses.length > 0
              ? (
                  eyeStatuses.reduce((sum, eye) => sum + eye.successRate, 0) / eyeStatuses.length
                ).toFixed(1)
              : 0}
            %
          </p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Active Eyes</p>
          <p className="mt-2 text-2xl font-bold text-blue-400">
            {eyeStatuses.filter((e) => e.status === 'running').length} / {eyeStatuses.length}
          </p>
        </div>
        <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/60 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Avg Latency</p>
          <p className="mt-2 text-2xl font-bold text-slate-200">
            {eyeStatuses.length > 0
              ? (
                  eyeStatuses.reduce((sum, eye) => sum + eye.avgLatency, 0) / eyeStatuses.length
                ).toFixed(0)
              : 0}
            ms
          </p>
        </div>
      </div>
    </div>
  );
}

export default EyeDashboard;
