"use client";

/**
 * CurtainOverlay - Theatrical curtain animation
 *
 * Creates the dramatic curtain open/close effect for
 * session start and end. The curtains part from center
 * in classic theatre style.
 */

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CurtainState } from "@third-eye/types";

export interface CurtainOverlayProps {
  /** Current curtain state */
  state: CurtainState;
  /** Session title to display on curtain */
  sessionTitle?: string;
  /** Callback when curtain animation completes */
  onAnimationComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Curtain panel component (one side)
 */
interface CurtainPanelProps {
  side: "left" | "right";
  state: CurtainState;
  prefersReducedMotion: boolean | null;
}

function CurtainPanel({
  side,
  state,
  prefersReducedMotion,
}: CurtainPanelProps) {
  const isLeft = side === "left";

  // Calculate target X position based on state
  const getX = () => {
    switch (state) {
      case "closed":
        return "0%";
      case "opening":
      case "open":
        return isLeft ? "-100%" : "100%";
      case "closing":
        return "0%";
      default:
        return "0%";
    }
  };

  return (
    <motion.div
      className={cn("absolute inset-y-0 w-1/2", isLeft ? "left-0" : "right-0")}
      initial={{ x: "0%" }}
      animate={{ x: getX() }}
      transition={{
        duration: prefersReducedMotion ? 0 : state === "opening" ? 1.2 : 1.0,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Curtain fabric */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            ${isLeft ? "to left" : "to right"},
            #8b0000 0%,
            #6b0000 30%,
            #5a0000 70%,
            #4a0000 100%
          )`,
        }}
      >
        {/* Vertical folds */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                background: `linear-gradient(
                  to right,
                  transparent 0%,
                  rgba(0, 0, 0, 0.2) 20%,
                  rgba(0, 0, 0, 0.3) 50%,
                  rgba(0, 0, 0, 0.2) 80%,
                  transparent 100%
                )`,
              }}
            />
          ))}
        </div>

        {/* Top drape shadow */}
        <div
          className="absolute inset-x-0 top-0 h-20"
          style={{
            background: `linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0.4) 0%,
              transparent 100%
            )`,
          }}
        />

        {/* Bottom shadow */}
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{
            background: `linear-gradient(
              to top,
              rgba(0, 0, 0, 0.5) 0%,
              transparent 100%
            )`,
          }}
        />

        {/* Gold trim on inner edge */}
        <div
          className={cn(
            "absolute inset-y-0 w-4",
            isLeft ? "right-0" : "left-0",
          )}
          style={{
            background: `linear-gradient(
              ${isLeft ? "to left" : "to right"},
              #d4af37 0%,
              #b8963e 50%,
              #a08030 100%
            )`,
            boxShadow: `${isLeft ? "-" : ""}2px 0 8px rgba(212, 175, 55, 0.5)`,
          }}
        />

        {/* Gold tassels at bottom */}
        <div
          className={cn(
            "absolute bottom-8 flex flex-col gap-1",
            isLeft ? "right-8" : "left-8",
          )}
        >
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-amber-400 to-amber-600" />
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-0.5 rounded-full bg-gradient-to-b from-amber-500 to-amber-700"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CurtainOverlayComponent({
  state,
  sessionTitle,
  onAnimationComplete,
  className,
}: CurtainOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  // Don't render if curtain is fully open (for performance)
  if (state === "open") {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-50 overflow-hidden",
        state === "closed" && "pointer-events-auto",
        className,
      )}
      aria-hidden="true"
    >
      {/* Stage frame (always visible during curtain animation) */}
      <div className="absolute inset-0">
        {/* Top valance */}
        <div
          className="absolute inset-x-0 top-0 h-16"
          style={{
            background: `linear-gradient(
              to bottom,
              #5a0000 0%,
              #4a0000 50%,
              #3a0000 100%
            )`,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Gold trim */}
          <div
            className="absolute inset-x-0 bottom-0 h-2"
            style={{
              background:
                "linear-gradient(to right, #a08030, #d4af37, #a08030)",
            }}
          />
          {/* Scalloped edge decoration */}
          <div className="absolute inset-x-0 -bottom-4 flex justify-center">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="mx-4 h-8 w-16 rounded-b-full"
                style={{
                  background: `linear-gradient(
                    to bottom,
                    #5a0000 0%,
                    #4a0000 100%
                  )`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Left curtain panel */}
        <CurtainPanel
          side="left"
          state={state}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* Right curtain panel */}
        <CurtainPanel
          side="right"
          state={state}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>

      {/* Center content (visible when closed) */}
      {state === "closed" && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Decorative frame */}
          <div className="relative">
            {/* Corner decorations */}
            <div className="absolute -left-8 -top-8 h-16 w-16 border-l-2 border-t-2 border-amber-500/50" />
            <div className="absolute -right-8 -top-8 h-16 w-16 border-r-2 border-t-2 border-amber-500/50" />
            <div className="absolute -bottom-8 -left-8 h-16 w-16 border-b-2 border-l-2 border-amber-500/50" />
            <div className="absolute -bottom-8 -right-8 h-16 w-16 border-b-2 border-r-2 border-amber-500/50" />

            <div className="px-12 py-8 text-center">
              {sessionTitle && (
                <>
                  <p
                    className="mb-2 text-xs uppercase tracking-[0.3em] text-amber-500/70"
                    style={{ fontFamily: "var(--font-display, serif)" }}
                  >
                    Now Presenting
                  </p>
                  <h2
                    className="mb-4 text-2xl font-light tracking-wide text-amber-100"
                    style={{ fontFamily: "var(--font-display, serif)" }}
                  >
                    {sessionTitle}
                  </h2>
                </>
              )}
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50" />
                <div className="h-2 w-2 rotate-45 bg-amber-500/70" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Animation complete callback */}
      <motion.div
        initial={false}
        animate={{ opacity: state === "open" ? 0 : 1 }}
        transition={{
          duration: state === "opening" ? 1.2 : 1.0,
        }}
        onAnimationComplete={() => {
          if (state === "opening" || state === "closing") {
            onAnimationComplete?.();
          }
        }}
      />
    </div>
  );
}

export const CurtainOverlay = memo(CurtainOverlayComponent);
CurtainOverlay.displayName = "CurtainOverlay";
