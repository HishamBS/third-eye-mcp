'use client';

import { useEffect, useState } from 'react';
import { useUI } from '@/contexts/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveSession {
  sessionId: string;
  status: string;
  createdAt: Date;
  eventCount: number;
  lastActivity: Date;
  agentName: string;
  model: string;
  displayName: string;
}

interface SessionSelectorProps {
  className?: string;
}

export function SessionSelector({ className = '' }: SessionSelectorProps) {
  const { selectedSessionId, setSelectedSession } = useUI();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/active`);

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();

    // Refresh every 5 seconds
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent session selection

    if (!confirm('Delete this session?')) return;

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
      const response = await fetch(`${API_URL}/api/session/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds: [sessionId] }),
      });

      if (response.ok) {
        // Remove from UI immediately
        setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        if (selectedSessionId === sessionId) {
          setSelectedSession(null);
        }
        // Refresh to confirm
        setTimeout(() => fetchActiveSessions(), 300);
      } else {
        alert('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session');
    }
  };

  const handleDeleteAllSessions = async () => {
    try {
      setDeleting(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

      // Get all session IDs to delete
      const sessionIds = sessions.map(s => s.sessionId);

      if (sessionIds.length === 0) {
        setShowDeleteConfirm(false);
        setDeleting(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/session/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIds }),
      });

      if (response.ok) {
        const result = await response.json();
        const deletedCount = result.data?.deleted || 0;

        // Force clear UI immediately
        setSessions([]);
        setSelectedSession(null);
        setShowDeleteConfirm(false);

        // Show success only if we actually deleted something
        if (deletedCount > 0) {
          setDeleteSuccess(true);
          setTimeout(() => setDeleteSuccess(false), 3000);
        }

        // Refresh from server to confirm
        setTimeout(() => fetchActiveSessions(), 500);
      } else {
        console.error('Failed to delete sessions');
        alert('Failed to delete sessions. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting sessions:', error);
      alert('Error deleting sessions. Please check console.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 rounded-xl border border-brand-outline/40 bg-brand-paper/80 px-4 py-2.5 text-sm transition-all hover:border-brand-accent/60 hover:bg-brand-paper"
      >
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${selectedSession ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="font-medium text-white">
            {selectedSession
              ? `${selectedSession.agentName.substring(0, 20)}${selectedSession.agentName.length > 20 ? '...' : ''}`
              : 'No Session Selected'}
          </span>
        </div>

        {sessions.length > 0 && (
          <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent">
            {sessions.length}
          </span>
        )}

        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-brand-outline/40 bg-brand-paperElev shadow-2xl"
          >
            <div className="border-b border-brand-outline/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Active Sessions</h3>
                <button
                  onClick={fetchActiveSessions}
                  disabled={loading}
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-brand-paper hover:text-brand-accent disabled:opacity-50"
                >
                  <svg
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">No active sessions</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Connect an MCP agent to start a session
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session) => {
                    const isSelected = session.sessionId === selectedSessionId;
                    const timeSinceActivity = Date.now() - new Date(session.lastActivity).getTime();
                    const isRecent = timeSinceActivity < 60000; // Less than 1 minute

                    return (
                      <div
                        key={session.sessionId}
                        onClick={() => {
                          setSelectedSession(session.sessionId);
                          setIsOpen(false);
                        }}
                        className={`w-full rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-accent/60 bg-brand-accent/10'
                            : 'border-brand-outline/20 bg-brand-paper/60 hover:border-brand-accent/40 hover:bg-brand-paper'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${isRecent ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                              <span className="truncate text-sm font-medium text-white">
                                {session.agentName}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span className="truncate">{session.model}</span>
                              <span>•</span>
                              <span>{session.eventCount} events</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteSession(session.sessionId, e)}
                              className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Delete session"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            {isSelected && (
                              <svg className="h-5 w-5 flex-shrink-0 text-brand-accent" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          ID: {session.sessionId.substring(0, 8)}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {sessions.length > 0 && (
              <div className="border-t border-brand-outline/30 p-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedSession(null);
                    setIsOpen(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-brand-paper hover:text-white"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  Delete All Sessions
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => !deleting && setShowDeleteConfirm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-brand-outline/40 bg-brand-paperElev p-6 shadow-2xl"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Delete All Sessions?</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This will permanently delete all {sessions.length} session{sessions.length !== 1 ? 's' : ''} and their associated data. This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-brand-outline/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-paper disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllSessions}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {deleteSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 rounded-lg border border-green-500/40 bg-green-500/10 px-6 py-3 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-400">All sessions deleted successfully</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
