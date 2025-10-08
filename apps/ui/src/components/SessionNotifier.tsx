'use client';

import { useEffect } from 'react';
import { toast, Toaster } from 'sonner';
import { useUI } from '@/contexts/UIContext';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { WSMessage } from '@third-eye/types';

/**
 * SessionNotifier Component
 *
 * Listens for WebSocket events and shows toast notifications
 * when new sessions are created
 */
export function SessionNotifier() {
  const { selectedSessionId, setSelectedSession } = useUI();

  const handleMessage = (message: WSMessage) => {
    // Handle new session creation
    if (message.type === 'session_created') {
      const newSessionId = message.sessionId;
      const session = message.session as any;
      const config = typeof session?.configJson === 'string'
        ? JSON.parse(session.configJson)
        : session?.configJson || {};

      const agentName = config.agentName || 'Unknown Agent';
      const model = config.model || 'Unknown Model';

      // If there's already a selected session, show notification
      if (selectedSessionId && selectedSessionId !== newSessionId) {
        toast(
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20">
              <svg className="h-5 w-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">New Session Started</p>
              <p className="mt-0.5 text-sm text-slate-300">{agentName}</p>
              <p className="mt-0.5 text-xs text-slate-400">{model}</p>
            </div>
          </div>,
          {
            duration: 8000,
            action: {
              label: 'Switch',
              onClick: () => setSelectedSession(newSessionId),
            },
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          }
        );
      } else if (!selectedSessionId) {
        // If no session selected, auto-select the new one
        setSelectedSession(newSessionId);
        toast.success(
          <div className="flex items-center gap-2">
            <span>Session started: {agentName}</span>
          </div>,
          {
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          }
        );
      }
    }

    // Handle session status changes
    if (message.type === 'session_status_updated') {
      const sessionId = message.sessionId;
      const status = message.status;

      if (sessionId === selectedSessionId) {
        if (status === 'completed') {
          toast.success('Session completed successfully', {
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          });
        } else if (status === 'failed') {
          toast.error('Session failed', {
            duration: 6000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          });
        } else if (status === 'killed') {
          toast.warning('Session killed', {
            duration: 4000,
            style: {
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(12px)',
            },
          });
        }
      }
    }
  };

  // Connect to global WebSocket (not session-specific)
  useWebSocket({
    sessionId: undefined, // Listen to all sessions
    onMessage: handleMessage,
  });

  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors={false}
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          backdropFilter: 'blur(12px)',
          color: 'white',
        },
      }}
    />
  );
}
