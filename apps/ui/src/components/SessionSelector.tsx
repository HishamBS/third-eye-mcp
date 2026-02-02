"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useUI } from "@/contexts/UIContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Check, ExternalLink, Loader2, AlertCircle, Trash2, RefreshCw, X } from "lucide-react";
import {
  useSessionList,
  type NormalizedSession,
} from "@/hooks/useSessionList";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
  STATUS_BG_COLORS,
} from "@/constants/color-mappings";
import { TIMING } from "@/constants/timing";
import { ROUTES } from "@/constants/routes";
import { ARIA_LABELS } from "@/constants/accessibility";
import { MESSAGES } from "@/constants/messages";
import {
  SESSION_SELECTOR_PLACEHOLDER,
  SESSION_SELECTOR_SEARCH_PLACEHOLDER,
  SESSION_SELECTOR_NO_RESULTS,
  SESSION_SELECTOR_LOADING,
  SESSION_SELECTOR_ERROR,
  SESSION_SELECTOR_LABEL_ACTIVE,
  SESSION_SELECTOR_LABEL_COMPLETED,
  SESSION_SELECTOR_LABEL_FAILED,
  SESSION_STATUS_ACTIVE,
  SESSION_STATUS_COMPLETED,
  SESSION_STATUS_FAILED,
  GLASSMORPHISM_BG,
  GLASSMORPHISM_BORDER,
} from "@third-eye/constants";

/**
 * Configuration options for SessionSelector behavior
 */
interface SessionSelectorConfig {
  /** Enable delete single session functionality */
  readonly allowDelete?: boolean;
  /** Enable delete all sessions functionality */
  readonly allowDeleteAll?: boolean;
  /** Show search input in dropdown */
  readonly showSearch?: boolean;
  /** Show "View in Monitor" link per session */
  readonly showMonitorLink?: boolean;
  /** Auto-poll for session updates */
  readonly autoPoll?: boolean;
  /** Poll interval in milliseconds */
  readonly pollInterval?: number;
  /** Use navigation to update URL on selection */
  readonly useNavigation?: boolean;
  /** Custom placeholder text */
  readonly placeholder?: string;
  /** Minimum width for the trigger button */
  readonly minWidth?: string;
}

/**
 * Props for controlled mode (external state management)
 */
interface ControlledProps {
  /** Currently selected session ID (controlled mode) */
  readonly selectedSessionId: string | null;
  /** Callback when session selection changes (controlled mode) */
  readonly onSessionSelect: (sessionId: string | null) => void;
  /** Component is in controlled mode (not using UIContext) */
  readonly controlled: true;
}

/**
 * Props for uncontrolled mode (UIContext state management)
 */
interface UncontrolledProps {
  /** Component uses UIContext for state (default behavior) */
  readonly controlled?: false;
}

type SessionSelectorProps = {
  readonly className?: string;
  readonly config?: SessionSelectorConfig;
} & (ControlledProps | UncontrolledProps);

/**
 * Default configuration for global nav usage
 */
const DEFAULT_GLOBAL_CONFIG: SessionSelectorConfig = {
  allowDelete: true,
  allowDeleteAll: true,
  showSearch: false,
  showMonitorLink: true,
  autoPoll: true,
  pollInterval: 5000,
  useNavigation: true,
  minWidth: "180px",
};

/**
 * Default configuration for pipeline builder usage
 */
const DEFAULT_PIPELINE_CONFIG: SessionSelectorConfig = {
  allowDelete: false,
  allowDeleteAll: false,
  showSearch: true,
  showMonitorLink: true,
  autoPoll: false,
  pollInterval: 5000,
  useNavigation: false,
  placeholder: SESSION_SELECTOR_PLACEHOLDER,
  minWidth: "280px",
};

/**
 * Unified Session Selector Component
 *
 * Supports two modes:
 * 1. Uncontrolled (default): Uses UIContext for state management
 * 2. Controlled: Uses external state via props
 *
 * Per R01: SSOT for session selection UI
 * Per R04: Optimized with useCallback/useMemo
 * Per R07: Strict typing throughout
 *
 * @example
 * // Global nav usage (uncontrolled, with delete)
 * <SessionSelector config={{ allowDelete: true, autoPoll: true }} />
 *
 * @example
 * // Pipeline builder usage (controlled, with search)
 * <SessionSelector
 *   controlled
 *   selectedSessionId={sessionId}
 *   onSessionSelect={setSessionId}
 *   config={{ showSearch: true, autoPoll: false }}
 * />
 */
export function SessionSelector(props: SessionSelectorProps) {
  const { className = "" } = props;

  // Determine if controlled mode
  const isControlled = "controlled" in props && props.controlled === true;

  // Get appropriate config defaults
  const defaultConfig = isControlled ? DEFAULT_PIPELINE_CONFIG : DEFAULT_GLOBAL_CONFIG;
  const config = { ...defaultConfig, ...props.config };

  // UIContext for uncontrolled mode
  const uiContext = useUI();

  // State management based on mode
  const selectedSessionId = isControlled
    ? (props as ControlledProps).selectedSessionId
    : uiContext.selectedSessionId;

  const setSelectedSession = useCallback(
    (sessionId: string | null) => {
      if (isControlled) {
        (props as ControlledProps).onSessionSelect(sessionId);
      } else {
        uiContext.setSelectedSession(sessionId);
      }
    },
    [isControlled, props, uiContext],
  );

  // Use the shared session list hook
  const {
    sessions,
    loading,
    error,
    refetch,
    deleteSession,
    deleteAllSessions,
    filterSessions,
  } = useSessionList({
    autoPoll: config.autoPoll,
    pollInterval: config.pollInterval,
    fetchOnMount: true,
    enabled: true,
  });

  // Local state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Navigation (only used in uncontrolled mode with navigation enabled)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Refs
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-select first session if none selected (uncontrolled mode only)
  useEffect(() => {
    if (!isControlled && !selectedSessionId && sessions.length > 0 && !hasUserInteracted) {
      setSelectedSession(sessions[0].sessionId);
    }
  }, [isControlled, selectedSessionId, sessions, hasUserInteracted, setSelectedSession]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filtered sessions based on search
  const filteredSessions = useMemo(() => {
    return config.showSearch ? filterSessions(searchQuery) : sessions;
  }, [config.showSearch, filterSessions, searchQuery, sessions]);

  // Find selected session
  const selectedSession = useMemo(
    () => sessions.find((s) => s.sessionId === selectedSessionId),
    [sessions, selectedSessionId],
  );

  // Navigation helpers
  const updateUrlParams = useCallback(
    (sessionId: string | null) => {
      if (!config.useNavigation) return;

      const params = new URLSearchParams(
        searchParams ? Array.from(searchParams.entries()) : [],
      );

      if (sessionId) {
        params.set("sessionId", sessionId);
      } else {
        params.delete("sessionId");
      }

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [config.useNavigation, pathname, router, searchParams],
  );

  // Selection handlers
  const handleSelect = useCallback(
    (sessionId: string) => {
      setHasUserInteracted(true);
      setSelectedSession(sessionId);
      setIsOpen(false);
      if (config.useNavigation && pathname === ROUTES.MONITOR) {
        updateUrlParams(sessionId);
      }
    },
    [config.useNavigation, pathname, setSelectedSession, updateUrlParams],
  );

  const handleClear = useCallback(() => {
    setHasUserInteracted(true);
    setSelectedSession(null);
    setIsOpen(false);
    if (config.useNavigation && pathname === ROUTES.MONITOR) {
      updateUrlParams(null);
    }
  }, [config.useNavigation, pathname, setSelectedSession, updateUrlParams]);

  const handleSelectAndNavigate = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedSession(sessionId);
      setIsOpen(false);
      setHasUserInteracted(true);
      router.push(`${ROUTES.MONITOR}?sessionId=${sessionId}`);
    },
    [router, setSelectedSession],
  );

  // Delete handlers
  const handleDeleteSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(MESSAGES.CONFIRM_DELETE_SESSION)) return;

      const success = await deleteSession(sessionId);
      if (success && selectedSessionId === sessionId) {
        setSelectedSession(null);
        setHasUserInteracted(true);
        if (config.useNavigation && pathname === ROUTES.MONITOR) {
          updateUrlParams(null);
        }
      } else if (!success) {
        alert(MESSAGES.ERROR_DELETE_SESSION);
      }

      // Refresh to confirm
      setTimeout(() => refetch(), TIMING.POLL_DEBOUNCE_MS);
    },
    [
      config.useNavigation,
      deleteSession,
      pathname,
      refetch,
      selectedSessionId,
      setSelectedSession,
      updateUrlParams,
    ],
  );

  const handleDeleteAllSessions = useCallback(async () => {
    setDeleting(true);

    try {
      const deletedCount = await deleteAllSessions();

      setSelectedSession(null);
      setHasUserInteracted(true);
      setShowDeleteConfirm(false);

      if (config.useNavigation && pathname === ROUTES.MONITOR) {
        updateUrlParams(null);
      }

      if (deletedCount > 0) {
        setDeleteSuccess(true);
        setTimeout(() => setDeleteSuccess(false), TIMING.DELETE_SUCCESS_MS);
      }

      // Refresh from server
      setTimeout(() => refetch(), TIMING.POLL_RETRY_MS);
    } catch {
      alert(MESSAGES.ERROR_DELETE_SESSIONS);
    } finally {
      setDeleting(false);
    }
  }, [
    config.useNavigation,
    deleteAllSessions,
    pathname,
    refetch,
    setSelectedSession,
    updateUrlParams,
  ]);

  // Status badge helper
  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case SESSION_STATUS_ACTIVE:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
            {SESSION_SELECTOR_LABEL_ACTIVE}
          </span>
        );
      case SESSION_STATUS_COMPLETED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
            {SESSION_SELECTOR_LABEL_COMPLETED}
          </span>
        );
      case SESSION_STATUS_FAILED:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded-full">
            {SESSION_SELECTOR_LABEL_FAILED}
          </span>
        );
      default:
        return null;
    }
  }, []);

  // Activity indicator
  const isRecentActivity = useCallback((session: NormalizedSession) => {
    const timeSinceActivity = Date.now() - session.lastActivity.getTime();
    return timeSinceActivity < 60000; // Less than 1 minute
  }, []);

  // Display helpers
  const displayName = selectedSession?.displayName ?? "No Session Selected";
  const truncatedName = displayName.length > 24 ? `${displayName.substring(0, 24)}…` : displayName;
  const placeholder = config.placeholder ?? "No Session Selected";

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 rounded-xl border border-brand-outline/40 bg-brand-paper/80 px-4 py-2.5 text-sm transition-all hover:border-brand-accent/60 hover:bg-brand-paper`}
        style={{ minWidth: config.minWidth }}
        type="button"
      >
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${selectedSession ? `${STATUS_BG_COLORS.success} animate-pulse` : "bg-brand-outline"}`}
          />
          <span className="font-medium text-brand-foreground truncate">
            {selectedSession ? truncatedName : placeholder}
          </span>
        </div>

        {sessions.length > 0 && (
          <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent">
            {sessions.length}
          </span>
        )}

        {selectedSessionId ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="h-4 w-4 text-semantic-muted hover:text-brand-foreground transition-colors cursor-pointer flex items-center justify-center"
            title={ARIA_LABELS.CLEAR_SELECTION}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
              }
            }}
          >
            <X className="h-4 w-4" />
          </div>
        ) : (
          <svg
            className={`h-4 w-4 text-semantic-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 z-50 mt-2 rounded-xl border border-brand-outline/40 bg-brand-paperElev shadow-2xl ${config.showSearch ? "w-[400px]" : "w-80"}`}
          >
            {/* Header */}
            <div className="border-b border-brand-outline/30 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-foreground">
                  Active Sessions
                </h3>
                <button
                  onClick={() => refetch()}
                  disabled={loading}
                  className="rounded-lg p-1 text-semantic-muted transition-colors hover:bg-brand-paper hover:text-brand-accent disabled:opacity-50"
                  type="button"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            {config.showSearch && (
              <div className="p-3 border-b border-brand-outline/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-foreground/50" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={SESSION_SELECTOR_SEARCH_PLACEHOLDER}
                    className="w-full pl-10 pr-4 py-2 bg-brand-surface/60 border border-brand-outline/30 rounded-md text-sm text-brand-foreground placeholder:text-brand-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
              </div>
            )}

            {/* Session List */}
            <div className="max-h-96 overflow-y-auto p-2">
              {loading && filteredSessions.length === 0 && (
                <div className="flex items-center justify-center gap-2 p-8 text-brand-foreground/70">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{SESSION_SELECTOR_LOADING}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center gap-2 p-8 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{SESSION_SELECTOR_ERROR}</span>
                </div>
              )}

              {!loading && !error && filteredSessions.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-semantic-muted">
                    {config.showSearch && searchQuery ? SESSION_SELECTOR_NO_RESULTS : "No active sessions"}
                  </p>
                  {!searchQuery && (
                    <p className="mt-1 text-xs text-semantic-muted">
                      Connect an MCP agent to start a session
                    </p>
                  )}
                </div>
              )}

              {!loading && !error && filteredSessions.length > 0 && (
                <div className="space-y-1">
                  {filteredSessions.map((session) => {
                    const isSelected = session.sessionId === selectedSessionId;
                    const isRecent = isRecentActivity(session);

                    return (
                      <div
                        key={session.sessionId}
                        onClick={() => handleSelect(session.sessionId)}
                        className={`w-full rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? "border-brand-accent/60 bg-brand-accent/10"
                            : "border-brand-outline/20 bg-brand-paper/60 hover:border-brand-accent/40 hover:bg-brand-paper"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${isRecent ? `${STATUS_BG_COLORS.success} animate-pulse` : STATUS_BG_COLORS.warning}`}
                              />
                              <span className="truncate text-sm font-medium text-brand-foreground">
                                {session.displayName}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </div>

                            {session.agentName && session.agentName !== session.displayName && (
                              <p className="mt-1 text-xs text-semantic-muted truncate">
                                {session.agentName}
                              </p>
                            )}

                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {config.showSearch && getStatusBadge(session.status)}
                              <span className="text-xs text-semantic-muted truncate">
                                {session.model}
                              </span>
                              <span className="text-xs text-semantic-muted">•</span>
                              <span className="text-xs text-semantic-muted">
                                {session.eventCount} events
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {config.showMonitorLink && (
                              <button
                                onClick={(e) => handleSelectAndNavigate(session.sessionId, e)}
                                className="rounded p-1 text-semantic-muted hover:text-brand-accent transition-colors"
                                title={ARIA_LABELS.SELECT_AND_VIEW_SESSION}
                                type="button"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            )}

                            {config.allowDelete && (
                              <button
                                onClick={(e) => handleDeleteSession(session.sessionId, e)}
                                className={`rounded p-1 text-semantic-muted ${STATUS_BG_COLORS_SUBTLE.error} hover:${STATUS_TEXT_COLORS.error} transition-colors`}
                                title={ARIA_LABELS.DELETE_SESSION}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-semantic-muted font-mono">
                          ID: {session.sessionId.substring(0, 8)}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delete All Button */}
            {config.allowDeleteAll && sessions.length > 0 && (
              <div className="border-t border-brand-outline/30 p-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`w-full rounded-lg px-3 py-2 text-sm ${STATUS_TEXT_COLORS.error} transition-colors hover:${STATUS_BG_COLORS_SUBTLE.error} hover:opacity-90`}
                  type="button"
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
                <h3 className="text-lg font-semibold text-brand-foreground">
                  Delete All Sessions?
                </h3>
                <p className="mt-2 text-sm text-semantic-muted">
                  This will permanently delete all {sessions.length} session
                  {sessions.length !== 1 ? "s" : ""} and their associated data.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 rounded-lg border border-brand-outline/40 px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-paper disabled:opacity-50"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllSessions}
                  disabled={deleting}
                  className={`flex-1 rounded-lg ${STATUS_BG_COLORS.error} px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:opacity-90 disabled:opacity-50`}
                  type="button"
                >
                  {deleting ? MESSAGES.DELETING : MESSAGES.DELETE_ALL}
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
            className={`fixed bottom-6 right-6 z-50 rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} px-6 py-3 shadow-lg backdrop-blur-sm`}
          >
            <div className="flex items-center gap-3">
              <Check className={`h-5 w-5 ${STATUS_TEXT_COLORS.success}`} />
              <span className={`text-sm font-medium ${STATUS_TEXT_COLORS.success}`}>
                All sessions deleted successfully
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for closing dropdown (for controlled mode without click-outside) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          role="presentation"
        />
      )}
    </div>
  );
}

// Export type for consumers
export type { SessionSelectorConfig, NormalizedSession };
