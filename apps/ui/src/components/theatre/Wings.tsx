"use client";

/**
 * Wings - Left and right wing displays for waiting/completed Eyes
 *
 * Theatre wings showing:
 * - Left wing: Eyes waiting to perform (dimmed silhouettes)
 * - Right wing: Completed Eyes (status badges)
 */

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EyePersonaConfig } from "@third-eye/types";
import { EyeCharacter } from "./EyeCharacter";
import { wingCharacterVariants } from "./effects/animations";

export interface WaitingEye {
  /** Eye persona */
  persona: EyePersonaConfig;
  /** Whether this Eye is next to perform */
  isNext?: boolean;
}

export interface CompletedEye {
  /** Eye persona */
  persona: EyePersonaConfig;
  /** Completion status */
  status: "success" | "warning" | "error";
}

export interface LeftWingProps {
  /** Eyes waiting to perform */
  waitingEyes: WaitingEye[];
  /** Callback when Eye is clicked */
  onEyeClick?: (eyeId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface RightWingProps {
  /** Completed Eyes */
  completedEyes: CompletedEye[];
  /** Callback when Eye is clicked */
  onEyeClick?: (eyeId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status indicator icon
 */
function StatusIcon({ status }: { status: "success" | "warning" | "error" }) {
  switch (status) {
    case "success":
      return <Check className="h-3 w-3 text-emerald-400" />;
    case "warning":
      return <AlertTriangle className="h-3 w-3 text-amber-400" />;
    case "error":
      return <XCircle className="h-3 w-3 text-red-400" />;
  }
}

/**
 * Left Wing - Waiting Eyes
 */
function LeftWingComponent({
  waitingEyes,
  onEyeClick,
  className,
}: LeftWingProps) {
  if (waitingEyes.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3",
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Waiting
      </span>

      <AnimatePresence mode="popLayout">
        {waitingEyes.map((eye, index) => (
          <motion.div
            key={eye.persona.id}
            variants={wingCharacterVariants}
            initial="waiting"
            animate={eye.isNext ? "next" : "waiting"}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <EyeCharacter
              persona={eye.persona}
              state="active"
              size="small"
              position="left-wing"
              showParticles={false}
              showName={true}
              onClick={
                onEyeClick ? () => onEyeClick(eye.persona.id) : undefined
              }
            />
            {eye.isNext && (
              <div className="mt-1 text-center text-[10px] text-neutral-400">
                Next
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Queue indicator */}
      <div className="flex gap-1">
        {waitingEyes.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              i === 0 ? "bg-neutral-400" : "bg-neutral-600",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Right Wing - Completed Eyes
 */
function RightWingComponent({
  completedEyes,
  onEyeClick,
  className,
}: RightWingProps) {
  if (completedEyes.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-neutral-800/50 bg-neutral-900/30 p-3",
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Completed
      </span>

      <AnimatePresence mode="popLayout">
        {completedEyes.map((eye) => (
          <motion.div
            key={eye.persona.id}
            className="relative"
            variants={wingCharacterVariants}
            initial={{ opacity: 0, scale: 0.8 }}
            animate="completed"
            layout
          >
            <EyeCharacter
              persona={eye.persona}
              state="active"
              size="small"
              position="right-wing"
              showParticles={false}
              showName={true}
              onClick={
                onEyeClick ? () => onEyeClick(eye.persona.id) : undefined
              }
            />

            {/* Status badge */}
            <div
              className={cn(
                "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full",
                eye.status === "success" && "bg-emerald-500/20",
                eye.status === "warning" && "bg-amber-500/20",
                eye.status === "error" && "bg-red-500/20",
              )}
            >
              <StatusIcon status={eye.status} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Summary */}
      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
        <span>
          {completedEyes.filter((e) => e.status === "success").length}
        </span>
        <Check className="h-2.5 w-2.5 text-emerald-500" />
        {completedEyes.filter((e) => e.status === "warning").length > 0 && (
          <>
            <span>
              {completedEyes.filter((e) => e.status === "warning").length}
            </span>
            <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
          </>
        )}
        {completedEyes.filter((e) => e.status === "error").length > 0 && (
          <>
            <span>
              {completedEyes.filter((e) => e.status === "error").length}
            </span>
            <XCircle className="h-2.5 w-2.5 text-red-500" />
          </>
        )}
      </div>
    </div>
  );
}

export const LeftWing = memo(LeftWingComponent);
LeftWing.displayName = "LeftWing";

export const RightWing = memo(RightWingComponent);
RightWing.displayName = "RightWing";
