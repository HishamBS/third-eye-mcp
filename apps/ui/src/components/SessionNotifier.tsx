"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast, Toaster } from "sonner";
import { useUI } from "@/contexts/UIContext";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { WSMessage } from "@third-eye/types";
import { TOAST_STYLE } from "@/constants/design-tokens";

// Session data structure from WebSocket message
interface SessionData {
  configJson?: string | Record<string, unknown>;
  agentName?: string;
  displayName?: string;
}

/**
 * Paths where auto-session selection should NOT occur.
 * These are configuration pages where users need to stay focused
 * without being redirected due to WebSocket session events.
 */
const NON_AUTO_SELECT_PATHS = [
  "/eyes",
  "/settings",
  "/providers",
  "/personas",
  "/models",
  "/connections",
  "/pipelines",
  "/strictness",
  "/database",
];

/**
 * Check if the current path should block auto-session selection
 */
function shouldBlockAutoSelect(pathname: string): boolean {
  return NON_AUTO_SELECT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * SessionNotifier Component
 *
 * Listens for WebSocket events and shows toast notifications
 * when new sessions are created.
 *
 * Bug Fix: Added navigation guards to prevent auto-session selection
 * on configuration pages (eyes, settings, providers, etc.) to avoid
 * disrupting user workflow.
 */
export function SessionNotifier() {
  const { selectedSessionId, setSelectedSession } = useUI();
  const pathname = usePathname();

  const handleMessage = (message: WSMessage) => {
    // Handle new session creation
    if (message.type === "session_created") {
      const newSessionId = message.sessionId;
      const session = (message as { session?: SessionData }).session;
      const config =
        typeof session?.configJson === "string"
          ? JSON.parse(session.configJson)
          : session?.configJson || {};

      const agentName =
        config.agentName || session?.agentName || "Unknown Agent";
      const displayName =
        config.displayName || session?.displayName || agentName;
      const model = config.model || "Unknown Model";

      // Check if we should block auto-selection on this page
      const blockAutoSelect = shouldBlockAutoSelect(pathname);

      // If there's already a selected session, show notification
      if (selectedSessionId && selectedSessionId !== newSessionId) {
        toast(
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent/20">
              <svg
                className="h-5 w-5 text-brand-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-brand-foreground">
                New Session Started
              </p>
              <p className="mt-0.5 text-sm text-semantic-muted">
                {displayName}
              </p>
              <p className="mt-0.5 text-xs text-semantic-muted">{model}</p>
            </div>
          </div>,
          {
            duration: 8000,
            action: {
              label: "Switch",
              onClick: () => setSelectedSession(newSessionId),
            },
            style: TOAST_STYLE,
          },
        );
      } else if (!selectedSessionId && !blockAutoSelect) {
        // If no session selected and not on a config page, auto-select the new one
        setSelectedSession(newSessionId);
        toast.success(
          <div className="flex items-center gap-2">
            <span>Session started: {agentName}</span>
          </div>,
          {
            duration: 4000,
            style: TOAST_STYLE,
          },
        );
      } else if (!selectedSessionId && blockAutoSelect) {
        // On config pages, just show notification without auto-selecting
        toast.info(
          <div className="flex items-center gap-2">
            <span>New session: {agentName}</span>
          </div>,
          {
            duration: 4000,
            action: {
              label: "Select",
              onClick: () => setSelectedSession(newSessionId),
            },
            style: TOAST_STYLE,
          },
        );
      }
    }

    // Handle session status changes
    if (message.type === "session_status_updated") {
      const sessionId = message.sessionId;
      const status = message.status;

      if (sessionId === selectedSessionId) {
        if (status === "completed") {
          toast.success("Session completed successfully", {
            duration: 4000,
            style: TOAST_STYLE,
          });
        } else if (status === "failed") {
          toast.error("Session failed", {
            duration: 6000,
            style: TOAST_STYLE,
          });
        } else if (status === "killed") {
          toast.warning("Session killed", {
            duration: 4000,
            style: TOAST_STYLE,
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
        style: TOAST_STYLE,
      }}
    />
  );
}
