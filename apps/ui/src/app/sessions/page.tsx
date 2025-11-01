'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUI } from '@/contexts/UIContext';
import { ViewModeToggle, ViewModeDescription } from '@/components/ViewModeToggle';
import { API_BASE_URL } from '@/consts/api';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

// Session status color mappings (SSOT)
const SESSION_STATUS_COLORS = Object.freeze({
  active: `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success} ${STATUS_BORDER_COLORS_SUBTLE.success}`,
  completed: `${STATUS_BG_COLORS_SUBTLE.info} ${STATUS_TEXT_COLORS.info} ${STATUS_BORDER_COLORS_SUBTLE.info}`,
  failed: `${STATUS_BG_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error} ${STATUS_BORDER_COLORS_SUBTLE.error}`,
} as const);

type SessionStatus = keyof typeof SESSION_STATUS_COLORS;

interface Session {
  id: string;
  agentName: string | null;
  model: string | null;
  displayName: string | null;
  status: SessionStatus;
  createdAt: string;
  lastActivity: string | null;
  configJson: Record<string, unknown> | null;
}

export default function SessionsPage() {
  const { viewMode } = useUI();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let filtered = sessions;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.id.toLowerCase().includes(query) ||
        s.agentName?.toLowerCase().includes(query) ||
        s.model?.toLowerCase().includes(query) ||
        s.displayName?.toLowerCase().includes(query)
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, filterStatus, searchQuery]);

  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/session`);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    return SESSION_STATUS_COLORS[status];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-ink flex items-center justify-center">
        <div className="text-brand-foreground text-xl">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-ink">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-brand-outline hover:text-brand-accent transition-colors">
                Back
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Monitoring</p>
                <h1 className="text-2xl font-semibold text-brand-foreground mt-1">All Sessions</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-brand-outline text-sm">
                {filteredSessions.length} of {sessions.length} sessions
              </div>
              <ViewModeToggle />
              <button
                onClick={fetchSessions}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <ViewModeDescription />

        <div className="mt-6 mb-6 flex gap-4 items-center">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-md px-4 py-2 bg-brand-paper border border-brand-outline/50 rounded-xl text-brand-foreground placeholder-brand-outline focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-brand-paper border border-brand-outline/50 rounded-xl text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-brand-paper border border-brand-outline/50 rounded-xl p-12 text-center">
            <p className="text-brand-outline text-lg mb-2">No sessions found</p>
            <p className="text-brand-outline text-sm">
              {sessions.length === 0
                ? 'Sessions will appear here when agents connect via MCP'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="bg-brand-paper border border-brand-outline/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-brand-ink/50 border-b border-brand-outline/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-outline uppercase tracking-wider">
                    Session ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-outline uppercase tracking-wider">
                    Agent / Model
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-outline uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-brand-outline uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-brand-outline uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-outline/30">
                {filteredSessions.map((session, index) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-brand-ink/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <code className="text-brand-accent font-mono text-sm">
                        {session.id.substring(0, 12)}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-brand-foreground text-sm">
                        {session.agentName || 'Unknown Agent'}
                      </div>
                      {viewMode === 'expert' && session.model && (
                        <div className="text-brand-outline text-xs font-mono mt-1">
                          {session.model}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-brand-outline text-sm">
                      {formatDate(session.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/playground/${session.id}`}
                        className="inline-flex items-center px-4 py-2 rounded-lg border border-brand-accent/40 text-brand-accent hover:bg-brand-accent/10 transition-colors text-sm font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-brand-paper border border-brand-outline/50 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-brand-outline mb-1">Total Sessions</div>
            <div className="text-2xl font-bold text-brand-foreground">{sessions.length}</div>
          </div>
          <div className="bg-brand-paper border border-brand-outline/50 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-brand-outline mb-1">Active</div>
            <div className={`text-2xl font-bold ${STATUS_TEXT_COLORS.success}`}>
              {sessions.filter(s => s.status === 'active').length}
            </div>
          </div>
          <div className="bg-brand-paper border border-brand-outline/50 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-brand-outline mb-1">Completed</div>
            <div className={`text-2xl font-bold ${STATUS_TEXT_COLORS.info}`}>
              {sessions.filter(s => s.status === 'completed').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
