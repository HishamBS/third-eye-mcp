"use client";

/**
 * CenterStage - Main performance area
 *
 * The heart of the theatre where the active Eye performs:
 * - Spotlight zone with Eye avatar
 * - Dialogue presentation
 * - Interactive action areas
 */

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  EyePersonaConfig,
  EyeCharacterState,
  TheatreActionType,
  SuspenseState,
} from "@third-eye/types";
import { EyeCharacter } from "./EyeCharacter";
import { DialogueBox } from "./DialogueBox";
import { Spotlight } from "./effects";
import { SessionSelector } from "@/components/SessionSelector";

export interface CenterStageProps {
  /** Active Eye persona (null if no one on stage) */
  activeEye: EyePersonaConfig | null;
  /** Current state of the active Eye */
  eyeState: EyeCharacterState;
  /** Current dialogue being spoken */
  dialogue: string | null;
  /** Whether dialogue is being typed */
  isTypingDialogue?: boolean;
  /** Suspense state for in-progress actions */
  suspenseState: SuspenseState | null;
  /** Pending interactive action */
  pendingAction: {
    type: TheatreActionType;
    data: Record<string, unknown>;
  } | null;
  /** Action area render prop */
  renderActionArea?: (action: {
    type: TheatreActionType;
    data: Record<string, unknown>;
  }) => React.ReactNode;
  /** Callback when dialogue typing completes */
  onDialogueComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Suspense indicator for in-progress actions
 */
function SuspenseIndicator({ state }: { state: SuspenseState }) {
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Animated dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-neutral-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>

      {/* Message */}
      <p
        className="text-sm text-neutral-400"
        style={{ fontFamily: "var(--font-narrative, serif)" }}
      >
        {state.message}
      </p>

      {/* Progress bar if available */}
      {state.progress !== undefined && (
        <div className="w-48 overflow-hidden rounded-full bg-neutral-800 h-1.5">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
            initial={{ width: 0 }}
            animate={{ width: `${state.progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Empty stage placeholder with session selector
 */
function EmptyStage() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="h-24 w-24 rounded-full border-2 border-dashed border-neutral-700 flex items-center justify-center">
        <span className="text-4xl text-neutral-700">?</span>
      </div>
      <div className="text-center">
        <h2
          className="text-xl font-semibold text-neutral-300 mb-2"
          style={{ fontFamily: "var(--font-narrative, serif)" }}
        >
          Select a Session
        </h2>
        <p
          className="text-sm text-neutral-500 mb-4"
          style={{ fontFamily: "var(--font-narrative, serif)" }}
        >
          Choose a session to monitor in real-time
        </p>
        <SessionSelector
          config={{
            allowDelete: false,
            allowDeleteAll: false,
            showSearch: true,
            showMonitorLink: false,
            autoPoll: true,
            useNavigation: true,
            minWidth: "280px",
          }}
        />
      </div>
    </motion.div>
  );
}

function CenterStageComponent({
  activeEye,
  eyeState,
  dialogue,
  isTypingDialogue = false,
  suspenseState,
  pendingAction,
  renderActionArea,
  onDialogueComplete,
  className,
}: CenterStageProps) {
  // Spotlight configuration
  const spotlightConfig = useMemo(() => {
    if (!activeEye) {
      return {
        color: "#d4af37",
        intensity: "dim" as const,
        isActive: false,
      };
    }

    return {
      color: activeEye.color.primary,
      intensity:
        eyeState === "speaking" || eyeState === "celebrating"
          ? ("bright" as const)
          : eyeState === "thinking"
            ? ("normal" as const)
            : ("normal" as const),
      isActive: eyeState !== "offstage" && eyeState !== "exiting",
    };
  }, [activeEye, eyeState]);

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center min-h-[400px]",
        className,
      )}
    >
      {/* Spotlight */}
      <Spotlight
        targetPosition={{ x: 50, y: 40 }}
        color={spotlightConfig.color}
        intensity={spotlightConfig.intensity}
        isActive={spotlightConfig.isActive}
        className="absolute inset-0 -z-10"
      />

      {/* Stage content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Active Eye character */}
          {activeEye ? (
            <motion.div
              key={activeEye.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EyeCharacter
                persona={activeEye}
                state={eyeState}
                size="large"
                position="center"
                showParticles={true}
                showName={true}
              />
            </motion.div>
          ) : (
            <EmptyStage key="empty" />
          )}
        </AnimatePresence>

        {/* Dialogue area */}
        <AnimatePresence mode="wait">
          {suspenseState && suspenseState.isActive ? (
            <SuspenseIndicator key="suspense" state={suspenseState} />
          ) : dialogue && activeEye ? (
            <DialogueBox
              key="dialogue"
              persona={activeEye}
              message={dialogue}
              isTyping={isTypingDialogue}
              onTypingComplete={onDialogueComplete}
            />
          ) : null}
        </AnimatePresence>

        {/* Action area */}
        <AnimatePresence>
          {pendingAction && renderActionArea && (
            <motion.div
              key="action"
              className="w-full max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
            >
              {renderActionArea(pendingAction)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stage floor gradient */}
      <div
        className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
        style={{
          background: `linear-gradient(to top,
            rgba(0, 0, 0, 0.3) 0%,
            transparent 100%
          )`,
        }}
      />
    </div>
  );
}

export const CenterStage = memo(CenterStageComponent);
CenterStage.displayName = "CenterStage";
