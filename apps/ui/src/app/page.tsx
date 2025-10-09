'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useUI } from '@/contexts/UIContext';
import {
  Eye, Zap, PlayCircle, ShieldAlert, FolderTree, Trophy,
  Download, MessageSquare, History, ArrowRight, Activity,
  Cpu, CheckCircle2
} from 'lucide-react';

interface RealtimeStats {
  sessions: number;
  runs: number;
  successRate: number;
  avgLatency: number;
  providers: Array<{ id: string; status: 'online' | 'offline' }>;
}

const WOW_FEATURES = [
  {
    id: 'evidence-lens',
    title: 'Evidence Lens',
    description: 'Live claim validation with confidence scores',
    icon: <Eye className="h-6 w-6" />,
    color: 'from-blue-500 to-cyan-500',
    href: '/monitor?tab=evidence',
    demo: '95% confidence ✓',
  },
  {
    id: 'duel-mode',
    title: 'Duel Mode',
    description: 'Model comparison arena',
    icon: <Zap className="h-6 w-6" />,
    color: 'from-purple-500 to-pink-500',
    href: '/duel',
    demo: 'GPT-4 vs Claude',
  },
  {
    id: 'replay-theater',
    title: 'Replay Theater',
    description: 'Session playback with speed controls',
    icon: <PlayCircle className="h-6 w-6" />,
    color: 'from-orange-500 to-red-500',
    href: '/replay',
    demo: '0.5x - 5x speed',
  },
  {
    id: 'kill-switch',
    title: 'Kill Switch',
    description: 'One-click hallucination check',
    icon: <ShieldAlert className="h-6 w-6" />,
    color: 'from-red-500 to-rose-500',
    href: '/monitor',
    demo: 'Re-validate now',
  },
  {
    id: 'visual-plan',
    title: 'Visual Plan Renderer',
    description: 'File tree + Kanban board',
    icon: <FolderTree className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-500',
    href: '/monitor?tab=plan',
    demo: '5 phases tracked',
  },
  {
    id: 'leaderboards',
    title: 'Leaderboards',
    description: 'Provider/model rankings',
    icon: <Trophy className="h-6 w-6" />,
    color: 'from-yellow-500 to-amber-500',
    href: '/metrics',
    demo: 'Groq leads 342ms',
  },
  {
    id: 'export-engine',
    title: 'Export Engine',
    description: 'PDF/HTML/JSON/MD downloads',
    icon: <Download className="h-6 w-6" />,
    color: 'from-indigo-500 to-blue-500',
    href: '/monitor',
    demo: '4 formats ready',
  },
  {
    id: 'adaptive-clarifications',
    title: 'Adaptive Clarifications',
    description: 'Sharingan inline Q&A',
    icon: <MessageSquare className="h-6 w-6" />,
    color: 'from-teal-500 to-cyan-500',
    href: '/monitor?eye=sharingan',
    demo: '3 questions asked',
  },
  {
    id: 'session-memory',
    title: 'Session Memory',
    description: 'Byakugan context tracking',
    icon: <History className="h-6 w-6" />,
    color: 'from-violet-500 to-purple-500',
    href: '/monitor?tab=evidence',
    demo: '12 refs tracked',
  },
];

export default function HomePage() {
  const { selectedSessionId } = useUI();
  const [stats, setStats] = useState<RealtimeStats>({
    sessions: 0,
    runs: 0,
    successRate: 0,
    avgLatency: 0,
    providers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      // Use Next.js API routes (same-origin, no CORS issues)
      // Fetch metrics
      try {
        const metricsRes = await fetch('/api/metrics');
        if (metricsRes.ok) {
          const metrics = await metricsRes.json();
          setStats(prev => ({
            ...prev,
            sessions: metrics.totalSessions || 0,
            runs: metrics.totalRuns || metrics.totalCalls || 0,
            successRate: Math.round(metrics.approvalRate || 0),
            avgLatency: Math.round(metrics.avgLatency || 0),
          }));
        }
      } catch (err) {
        console.warn('Metrics endpoint unavailable');
      }

      // Fetch health via backend server (CORS fixed)
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const healthRes = await fetch(`${API_URL}/health`);
        if (healthRes.ok) {
          const health = await healthRes.json();
          const providers = ['groq', 'openrouter', 'ollama', 'lmstudio'];
          setStats(prev => ({
            ...prev,
            providers: providers.map(id => ({
              id,
              status: health.checks?.providers?.[id] ? 'online' as const : 'offline' as const,
            })),
          }));
        }
      } catch (err) {
        console.warn('Health endpoint unavailable');
        // Set all providers to offline
        setStats(prev => ({
          ...prev,
          providers: ['groq', 'openrouter', 'ollama', 'lmstudio'].map(id => ({
            id,
            status: 'offline' as const,
          })),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ink">
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/20 via-purple-500/10 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col items-center gap-6">
              <Image
                src="/logo.svg"
                alt="Third Eye MCP logo"
                width={320}
                height={320}
                priority
                className="h-32 w-auto drop-shadow-[0_20px_45px_rgba(88,28,135,0.35)]"
              />
              <h1 className="text-6xl font-bold bg-gradient-to-r from-brand-accent via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Third Eye MCP
              </h1>
            </div>
            <p className="mt-6 text-xl text-slate-300">
              Local-first AI orchestration with multi-Eye validation
            </p>
            <div className="mt-10 flex justify-center space-x-4">
              <Link
                href="/connections"
                className="rounded-xl bg-brand-accent px-8 py-4 text-lg font-semibold text-white hover:bg-brand-accent/90 transition-colors shadow-lg shadow-brand-accent/50"
              >
                Connect Agent
              </Link>
              <Link
                href="/monitor"
                className="rounded-xl border border-brand-accent/40 bg-brand-paper/60 px-8 py-4 text-lg font-semibold text-white hover:bg-brand-paper/80 transition-colors"
              >
                View Demo
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white flex items-center space-x-2">
              <Activity className="h-6 w-6 text-brand-accent animate-pulse" />
              <span>Live MCP Activity</span>
            </h2>
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              )}
              <span className="text-sm text-slate-400">Real-time</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/40 p-4">
              <div className="text-sm text-slate-400">Sessions</div>
              <div className="text-3xl font-bold text-white mt-1">{stats.sessions}</div>
            </div>
            <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/40 p-4">
              <div className="text-sm text-slate-400">Runs</div>
              <div className="text-3xl font-bold text-white mt-1">{stats.runs}</div>
            </div>
            <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/40 p-4">
              <div className="text-sm text-slate-400">Success Rate</div>
              <div className="text-3xl font-bold text-green-400 mt-1">{stats.successRate}%</div>
            </div>
            <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/40 p-4">
              <div className="text-sm text-slate-400">Avg Latency</div>
              <div className="text-3xl font-bold text-cyan-400 mt-1">{stats.avgLatency}ms</div>
            </div>
            <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/40 p-4">
              <div className="text-sm text-slate-400 mb-2">Providers</div>
              <div className="flex items-center space-x-1">
                {stats.providers.map(p => (
                  <div
                    key={p.id}
                    className={`h-3 w-3 rounded-full ${
                      p.status === 'online' ? 'bg-green-400' : 'bg-gray-600'
                    }`}
                    title={`${p.id}: ${p.status}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-brand-outline/30 bg-brand-ink/40 p-6">
            <div className="flex items-center justify-center space-x-3 text-slate-400">
              <Cpu className="h-5 w-5 animate-spin" style={{ animationDuration: '3s' }} />
              <span>Monitoring pipeline executions...</span>
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-brand-accent to-purple-400 bg-clip-text text-transparent">
          WOW Features
        </h2>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Powerful tools for AI orchestration, validation, and analysis. All features work with real-time data.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WOW_FEATURES.map((feature, index) => {
            // Build href with sessionId if available
            const href = selectedSessionId
              ? `${feature.href}${feature.href.includes('?') ? '&' : '?'}sessionId=${selectedSessionId}`
              : feature.href;

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={href}>
                <GlassCard className="group cursor-pointer hover:border-brand-accent/60 transition-all duration-300 p-6 h-full">
                  <div className={`inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-brand-accent transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">{feature.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-brand-accent font-mono">{feature.demo}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" />
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-semibold text-white mb-4">
            Ready to get started?
          </h3>
          <p className="text-slate-400 mb-8">
            Connect your AI agent and experience the power of multi-Eye validation
          </p>
          <Link
            href="/connections"
            className="inline-flex items-center space-x-2 rounded-xl bg-gradient-to-r from-brand-accent to-purple-500 px-8 py-4 text-lg font-semibold text-white hover:shadow-2xl hover:shadow-brand-accent/50 transition-all"
          >
            <span>Get Started</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
