"use client";

/**
 * Marquee - Theatre-style header with session info
 *
 * Classic theatre marquee displaying:
 * - Session title and ID
 * - Current act information
 * - Live/review mode indicator
 * - Connection status
 * - Animated border lights
 */

import { memo, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryActId } from "@third-eye/types";
import { STORY_ACTS } from "@third-eye/constants";
import { marqueeVariants } from "./effects/animations";

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected";

export interface MarqueeProps {
  /** Session ID */
  sessionId: string | null;
  /** Session title (optional) */
  sessionTitle?: string;
  /** Current story act */
  currentAct: StoryActId;
  /** Currently active Eye name */
  activeEye?: string | null;
  /** Whether in live mode or reviewing */
  isLive?: boolean;
  /** Review timestamp when not live */
  reviewTimestamp?: Date;
  /** Connection status */
  connectionStatus?: ConnectionStatus;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Connection status indicator
 */
function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: {
      icon: Wifi,
      color: "text-emerald-400",
      pulse: false,
      label: "Live",
    },
    connecting: {
      icon: RefreshCw,
      color: "text-amber-400",
      pulse: true,
      label: "Connecting",
    },
    reconnecting: {
      icon: RefreshCw,
      color: "text-amber-400",
      pulse: true,
      label: "Reconnecting",
    },
    disconnected: {
      icon: WifiOff,
      color: "text-red-400",
      pulse: false,
      label: "Disconnected",
    },
  }[status];

  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1.5", config.color)}>
      <Icon className={cn("h-3.5 w-3.5", config.pulse && "animate-spin")} />
      <span className="text-xs font-medium">{config.label}</span>
    </div>
  );
}

/**
 * Animated marquee border lights
 */
function MarqueeLights({
  prefersReducedMotion,
}: {
  prefersReducedMotion: boolean | null;
}) {
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
    );
  }

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 h-1"
      style={{
        background: `repeating-linear-gradient(
          90deg,
          #d4af37 0px,
          #d4af37 8px,
          #a08030 8px,
          #a08030 16px
        )`,
        backgroundSize: "32px 100%",
      }}
      animate={{
        backgroundPosition: ["0% 0%", "100% 0%"],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function MarqueeComponent({
  sessionId,
  sessionTitle,
  currentAct,
  activeEye,
  isLive = true,
  reviewTimestamp,
  connectionStatus = "connected",
  className,
}: MarqueeProps) {
  const prefersReducedMotion = useReducedMotion();

  // Get act info
  const actInfo = useMemo(() => {
    return STORY_ACTS[currentAct];
  }, [currentAct]);

  // Format session display
  const sessionDisplay = useMemo(() => {
    if (sessionTitle) return sessionTitle;
    if (sessionId) return `Session #${sessionId.slice(0, 8)}`;
    return "No Session";
  }, [sessionId, sessionTitle]);

  // Format review timestamp
  const reviewTimeDisplay = useMemo(() => {
    if (!reviewTimestamp) return null;
    return reviewTimestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [reviewTimestamp]);

  return (
    <motion.header
      className={cn(
        "relative border-b bg-neutral-900/80 backdrop-blur-sm",
        className,
      )}
      style={{ borderColor: actInfo.color.primary + "40" }}
      variants={marqueeVariants}
      initial="initial"
      animate="animate"
    >
      {/* Main content */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Session info */}
        <div className="flex items-center gap-4">
          {/* Theatre icon */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded border"
            style={{
              borderColor: actInfo.color.primary + "60",
              backgroundColor: actInfo.color.primary + "10",
            }}
          >
            <Eye className="h-4 w-4" style={{ color: actInfo.color.primary }} />
          </div>

          {/* Title and act */}
          <div className="flex flex-col">
            <h1
              className="text-sm font-medium tracking-wide text-neutral-100"
              style={{ fontFamily: "var(--font-display, serif)" }}
            >
              {sessionDisplay}
            </h1>
            <div className="flex items-center gap-2">
              <span
                className="text-xs"
                style={{ color: actInfo.color.primary }}
              >
                {actInfo.title}
              </span>
              <span className="text-xs text-neutral-500">
                {actInfo.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Active Eye (if any) */}
        {activeEye && (
          <div className="hidden md:flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-200">{activeEye}</span>
              {" is performing"}
            </span>
          </div>
        )}

        {/* Right: Mode and connection */}
        <div className="flex items-center gap-4">
          {/* Live/Review mode */}
          {isLive ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                Reviewing: {reviewTimeDisplay}
              </span>
            </div>
          )}

          {/* Connection status */}
          <ConnectionIndicator status={connectionStatus} />
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute left-4 top-0 bottom-0 flex items-center">
        <div
          className="h-full w-0.5"
          style={{
            background: `linear-gradient(to bottom, transparent, ${actInfo.color.primary}60, transparent)`,
          }}
        />
      </div>
      <div className="absolute right-4 top-0 bottom-0 flex items-center">
        <div
          className="h-full w-0.5"
          style={{
            background: `linear-gradient(to bottom, transparent, ${actInfo.color.primary}60, transparent)`,
          }}
        />
      </div>

      {/* Animated border lights */}
      <MarqueeLights prefersReducedMotion={prefersReducedMotion} />
    </motion.header>
  );
}

export const Marquee = memo(MarqueeComponent);
Marquee.displayName = "Marquee";
