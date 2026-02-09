"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { TIMING } from "@/constants/timing";

type ViewMode = "strategic" | "tactical";
type ConnectionStatus = "connected" | "disconnected" | "reconnecting";

interface HeaderBarProps {
  sessionId: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  connectionStatus: ConnectionStatus;
  missionSummary: string;
  className?: string;
}

export const SESSION_ID_DISPLAY_LENGTH = 8;

const CONNECTION_STATUS_CONFIG = {
  connected: {
    container:
      "bg-semantic-success/10 text-semantic-success border-semantic-success/30",
    label: "LIVE",
    showPulse: true,
  },
  reconnecting: {
    container:
      "bg-semantic-warning/10 text-semantic-warning border-semantic-warning/30",
    label: "RECONNECTING",
    showPulse: false,
  },
  disconnected: {
    container:
      "bg-semantic-muted/10 text-semantic-muted border-semantic-muted/30",
    label: "DISCONNECTED",
    showPulse: false,
  },
} as const;

function HeaderBarComponent({
  sessionId,
  viewMode,
  onViewModeChange,
  connectionStatus,
  missionSummary,
  className,
}: HeaderBarProps) {
  const [copied, setCopied] = useState(false);

  const statusConfig = useMemo(
    () => CONNECTION_STATUS_CONFIG[connectionStatus],
    [connectionStatus],
  );

  const displaySessionId = useMemo(
    () => (sessionId ? sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH) : null),
    [sessionId],
  );

  const handleCopySessionId = useCallback(() => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), TIMING.COPY_FEEDBACK_MS);
    });
  }, [sessionId]);

  const handleStrategicClick = useCallback(
    () => onViewModeChange("strategic"),
    [onViewModeChange],
  );

  const handleTacticalClick = useCallback(
    () => onViewModeChange("tactical"),
    [onViewModeChange],
  );

  return (
    <header
      className={cn(
        "h-14 px-4 flex items-center gap-4 border-b border-brand-outline bg-brand-paper",
        className,
      )}
    >
      {/* Brand */}
      <span className="text-brand-foreground font-bold tracking-wider text-sm whitespace-nowrap">
        THIRD EYE
      </span>

      {/* Separator */}
      <div className="w-px h-6 bg-brand-outline" />

      {/* Mission summary */}
      <span className="text-semantic-muted text-sm truncate flex-1 min-w-0">
        {missionSummary}
      </span>

      {/* View toggle */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleStrategicClick}
          className={cn(
            "px-3 py-1.5 text-xs rounded-md border transition-colors duration-200",
            viewMode === "strategic"
              ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30"
              : "text-semantic-muted border-transparent hover:text-brand-foreground",
          )}
        >
          Strategic
        </button>
        <button
          type="button"
          onClick={handleTacticalClick}
          className={cn(
            "px-3 py-1.5 text-xs rounded-md border transition-colors duration-200",
            viewMode === "tactical"
              ? "bg-brand-primary/10 text-brand-primary border-brand-primary/30"
              : "text-semantic-muted border-transparent hover:text-brand-foreground",
          )}
        >
          Tactical
        </button>
      </div>

      {/* Connection status pill */}
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium flex-shrink-0",
          statusConfig.container,
        )}
      >
        {statusConfig.showPulse && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-semantic-success opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-semantic-success" />
          </span>
        )}
        {statusConfig.label}
      </div>

      {/* Session ID */}
      {displaySessionId && (
        <button
          type="button"
          onClick={handleCopySessionId}
          className="text-xs text-semantic-muted hover:text-brand-foreground transition-colors flex-shrink-0 font-mono"
          title={copied ? "Copied!" : `Click to copy: ${sessionId}`}
        >
          {copied ? "Copied" : displaySessionId}
        </button>
      )}
    </header>
  );
}

export const HeaderBar = memo(HeaderBarComponent);
HeaderBar.displayName = "HeaderBar";
