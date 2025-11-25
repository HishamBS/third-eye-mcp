"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
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
  GLASSMORPHISM_SHADOW,
  SESSION_SELECTOR_DROPDOWN_ANIMATION,
} from "@third-eye/constants";
import { API_BASE_URL } from "@/consts/api";

interface Session {
  readonly id: string;
  readonly status: string;
  readonly createdAt: number;
  readonly input?: string;
}

interface SessionSelectorProps {
  readonly selectedSessionId: string | null;
  readonly onSessionSelect: (sessionId: string | null) => void;
}

/**
 * Session Selector Dropdown Component
 *
 * Features:
 * - Searchable session list
 * - Status badges (active/completed/failed)
 * - Recent sessions first (sorted by createdAt DESC)
 * - Glassmorphism design
 * - Quick "View in Monitor" link
 * - Keyboard navigation support
 *
 * Per R01: Uses API_BASE_URL from SSOT
 * Per R13: All text strings from constants
 */
export function SessionSelector({
  selectedSessionId,
  onSessionSelect,
}: SessionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sessions on component mount
  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/sessions?limit=50`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data?.sessions) {
          setSessions(data.data.sessions);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("[SessionSelector] Failed to fetch sessions:", err);
        setError(SESSION_SELECTOR_ERROR);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return sessions;
    }

    const query = searchQuery.toLowerCase();
    return sessions.filter(
      (session) =>
        session.id.toLowerCase().includes(query) ||
        session.input?.toLowerCase().includes(query),
    );
  }, [sessions, searchQuery]);

  // Get selected session details
  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId],
  );

  // Status badge helper
  const getStatusBadge = (status: string) => {
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
  };

  // Format session display text
  const formatSessionDisplay = (session: Session) => {
    const timestamp = new Date(session.createdAt).toLocaleString();
    const preview = session.input
      ? session.input.substring(0, 50) + (session.input.length > 50 ? "..." : "")
      : session.id;
    return { timestamp, preview };
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${GLASSMORPHISM_BG} ${GLASSMORPHISM_BORDER} px-4 py-2 rounded-lg text-sm font-medium text-brand-foreground hover:bg-brand-surface/90 transition-all duration-200 min-w-[280px] text-left flex items-center justify-between gap-2`}
        type="button"
      >
        <span className="truncate">
          {selectedSession
            ? formatSessionDisplay(selectedSession).preview
            : SESSION_SELECTOR_PLACEHOLDER}
        </span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full right-0 mt-2 w-[400px] max-h-[500px] ${GLASSMORPHISM_BG} ${GLASSMORPHISM_BORDER} ${GLASSMORPHISM_SHADOW} rounded-lg overflow-hidden z-50`}
          style={{
            animation: `fadeIn ${SESSION_SELECTOR_DROPDOWN_ANIMATION}ms ease-out`,
          }}
        >
          {/* Search Input */}
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

          {/* Session List */}
          <div className="overflow-y-auto max-h-[400px]">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 p-8 text-brand-foreground/70">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">{SESSION_SELECTOR_LOADING}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center gap-2 p-8 text-red-500">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {!isLoading && !error && filteredSessions.length === 0 && (
              <div className="p-8 text-center text-brand-foreground/50 text-sm">
                {SESSION_SELECTOR_NO_RESULTS}
              </div>
            )}

            {!isLoading &&
              !error &&
              filteredSessions.map((session) => {
                const { timestamp, preview } = formatSessionDisplay(session);
                const isSelected = session.id === selectedSessionId;

                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      onSessionSelect(isSelected ? null : session.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-brand-surface/80 transition-colors border-b border-brand-outline/20 last:border-b-0 ${
                      isSelected ? "bg-emerald-500/10" : ""
                    }`}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Session Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-brand-foreground truncate">
                            {preview}
                          </span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(session.status)}
                          <span className="text-xs text-brand-foreground/60">
                            {timestamp}
                          </span>
                        </div>
                        <div className="text-xs text-brand-foreground/50 font-mono">
                          {session.id}
                        </div>
                      </div>

                      {/* Right: View in Monitor Link */}
                      <a
                        href={`/monitor?sessionId=${session.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 p-1.5 rounded hover:bg-brand-surface/60 text-brand-foreground/70 hover:text-brand-foreground transition-colors"
                        title="View in Monitor"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close dropdown"
        />
      )}
    </div>
  );
}
