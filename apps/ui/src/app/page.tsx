'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

interface Session {
  id: string;
  agentName?: string;
  model?: string;
  displayName?: string;
  status: 'active' | 'idle' | 'completed';
  createdAt: string;
  lastActivity?: string;
  _stats?: {
    operationsCount: number;
    tokensTotal: number;
  };
}

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'}/sessions`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return 'border-emerald-400/50 bg-emerald-500/10 text-emerald-300';
      case 'idle':
        return 'border-yellow-400/50 bg-yellow-500/10 text-yellow-300';
      case 'completed':
        return 'border-slate-400/50 bg-slate-500/10 text-slate-300';
      default:
        return 'border-slate-400/50 bg-slate-500/10 text-slate-300';
    }
  };

  const getStatusIndicator = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'idle':
        return '🟡';
      case 'completed':
        return '⚫';
      default:
        return '⚪';
    }
  };

  const getSessionDisplayName = (session: Session) => {
    if (session.displayName) return session.displayName;
    if (session.agentName && session.model) {
      return `${session.agentName} - ${session.model}`;
    }
    return session.id;
  };

  const getTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <main className="min-h-screen bg-brand-ink px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Third Eye MCP</p>
          <h1 className="mt-3 text-4xl font-semibold text-white">Agent Sessions</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Monitor AI agents connected to your local Third Eye MCP server. Sessions are automatically created when agents connect and make tool calls.
          </p>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-brand-outline/40 bg-brand-paperElev/60"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 p-12 text-center shadow-glass">
            <div className="mx-auto max-w-md">
              <p className="text-lg font-semibold text-white">No Agent Sessions Yet</p>
              <p className="mt-2 text-sm text-slate-400">
                Connect an AI agent (like Claude Desktop, Cursor, or GPT-4) to your Third Eye MCP server to start monitoring.
              </p>
              <div className="mt-6 rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">Quick Setup</p>
                <ol className="mt-3 space-y-2 text-sm text-slate-300">
                  <li>1. Configure your AI agent to connect to this MCP server</li>
                  <li>2. Set provider API keys in Settings → Models</li>
                  <li>3. Agent calls will auto-create sessions here</li>
                </ol>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => router.push('/connections')}
                  className="flex-1 rounded-full bg-brand-accent px-6 py-2.5 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                >
                  Connection Guides
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="flex-1 rounded-full border border-brand-accent/60 px-6 py-2.5 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                >
                  Settings
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <motion.button
                key={session.id}
                onClick={() => router.push(`/monitor?sessionId=${session.id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full rounded-2xl border border-brand-outline/60 bg-brand-paperElev/80 p-6 text-left shadow-glass transition-all hover:border-brand-accent/60 hover:shadow-xl"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStatusIndicator(session.status)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {getSessionDisplayName(session)}
                        </h3>
                        {(session.agentName || session.model) && (
                          <p className="mt-1 text-xs text-slate-400">
                            {session.agentName && <span>{session.agentName}</span>}
                            {session.agentName && session.model && <span> • </span>}
                            {session.model && <span className="font-mono">{session.model}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-300">
                      <div>
                        <span className="text-slate-500">Status: </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusColor(session.status)}`}>
                          {session.status === 'active' && 'Active now'}
                          {session.status === 'idle' && `Idle ${getTimeAgo(session.lastActivity)}`}
                          {session.status === 'completed' && `Completed ${getTimeAgo(session.lastActivity)}`}
                        </span>
                      </div>
                      {session._stats && (
                        <>
                          <div>
                            <span className="text-slate-500">Operations: </span>
                            <span className="font-semibold text-white">{session._stats.operationsCount}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Tokens: </span>
                            <span className="font-semibold text-white">{(session._stats.tokensTotal / 1000).toFixed(1)}k</span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-slate-500">Created: </span>
                        <span className="text-white">{getTimeAgo(session.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-brand-accent">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/60 p-6 shadow-glass">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Configuration</h2>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Connections', href: '/connections', desc: 'MCP setup guides' },
                { name: 'Eyes', href: '/eyes', desc: 'Built-in + custom' },
                { name: 'Models', href: '/models', desc: 'Providers + routing' },
                { name: 'Personas', href: '/personas', desc: 'Eye personalities' },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="w-full rounded-lg border border-brand-outline/30 bg-brand-paper/50 p-3 text-left transition hover:border-brand-accent/60 hover:bg-brand-paper"
                >
                  <div className="font-semibold text-white">{link.name}</div>
                  <div className="text-xs text-slate-400">{link.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/60 p-6 shadow-glass">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Workflows</h2>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Pipelines', href: '/pipelines', desc: 'Visual builder' },
                { name: 'Strictness', href: '/strictness', desc: 'Profiles + sliders' },
                { name: 'Prompts', href: '/prompts', desc: 'Library' },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="w-full rounded-lg border border-brand-outline/30 bg-brand-paper/50 p-3 text-left transition hover:border-brand-accent/60 hover:bg-brand-paper"
                >
                  <div className="font-semibold text-white">{link.name}</div>
                  <div className="text-xs text-slate-400">{link.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/60 p-6 shadow-glass">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">System</h2>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Settings', href: '/settings', desc: 'App config' },
                { name: 'Database', href: '/database', desc: 'Browse + backup' },
                { name: 'Metrics', href: '/metrics', desc: 'Performance' },
              ].map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className="w-full rounded-lg border border-brand-outline/30 bg-brand-paper/50 p-3 text-left transition hover:border-brand-accent/60 hover:bg-brand-paper"
                >
                  <div className="font-semibold text-white">{link.name}</div>
                  <div className="text-xs text-slate-400">{link.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
