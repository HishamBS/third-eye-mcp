"use client";

/**
 * DialogueBox - Speech bubble with typewriter effect
 *
 * Renders Eye dialogue in theatre-style presentation:
 * - Character name header
 * - Typewriter text animation
 * - Glowing border while speaking
 * - Optional expand/collapse for technical details
 */

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EyePersonaConfig } from "@third-eye/types";
import { dialogueVariants, dialogueBubbleVariants } from "./effects/animations";

export interface DialogueBoxProps {
  /** Eye persona for styling */
  persona: EyePersonaConfig;
  /** Message to display */
  message: string;
  /** Whether currently typing the message */
  isTyping?: boolean;
  /** Typing speed in ms per character */
  typingSpeed?: number;
  /** Technical details to show in expandable section */
  details?: string | Record<string, unknown>;
  /** Callback when typing completes */
  onTypingComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Hook for typewriter effect
 */
function useTypewriter(
  text: string,
  isTyping: boolean,
  speed: number,
  onComplete?: () => void,
) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isTyping) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    // Reset on new text
    setDisplayText("");
    setIsComplete(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isTyping, speed, onComplete]);

  return { displayText, isComplete };
}

function DialogueBoxComponent({
  persona,
  message,
  isTyping = false,
  typingSpeed = 30,
  details,
  onTypingComplete,
  className,
}: DialogueBoxProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(false);

  // Skip typewriter if reduced motion
  const effectiveTyping = isTyping && !prefersReducedMotion;

  const { displayText, isComplete } = useTypewriter(
    message,
    effectiveTyping,
    typingSpeed,
    onTypingComplete,
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Format details for display
  const formattedDetails = details
    ? typeof details === "string"
      ? details
      : JSON.stringify(details, null, 2)
    : null;

  return (
    <motion.div
      className={cn("w-full max-w-2xl", className)}
      variants={dialogueVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Speaker header */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: persona.color.primary }}
        >
          {persona.name}
        </span>
        <span className="text-xs text-neutral-500">speaks:</span>
      </div>

      {/* Dialogue bubble */}
      <motion.div
        className="relative rounded-lg border p-4"
        style={{
          backgroundColor: `${persona.color.primary}08`,
          borderColor: `${persona.color.primary}40`,
        }}
        variants={dialogueBubbleVariants}
        animate={effectiveTyping && !isComplete ? "speaking" : "idle"}
      >
        {/* Glow effect while typing */}
        <AnimatePresence>
          {effectiveTyping && !isComplete && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                boxShadow: `0 0 20px ${persona.color.glow}`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Message text */}
        <p
          className="text-base leading-relaxed text-neutral-200"
          style={{ fontFamily: "var(--font-narrative, serif)" }}
        >
          {effectiveTyping ? displayText : message}
          {/* Typing cursor */}
          {effectiveTyping && !isComplete && (
            <motion.span
              className="ml-0.5 inline-block h-5 w-0.5"
              style={{ backgroundColor: persona.color.primary }}
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </p>

        {/* Expandable details section */}
        {formattedDetails && (
          <div className="mt-4 border-t border-neutral-700/50 pt-3">
            <button
              onClick={toggleExpanded}
              className="flex w-full items-center justify-between text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
            >
              <span>Technical Details</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <pre className="mt-2 max-h-60 overflow-auto rounded bg-neutral-900/50 p-3 text-xs text-neutral-300 font-mono">
                    {formattedDetails}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Speech tail (pointing to character) */}
      <div
        className="ml-8 h-0 w-0"
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `8px solid ${persona.color.primary}40`,
        }}
      />
    </motion.div>
  );
}

export const DialogueBox = memo(DialogueBoxComponent);
DialogueBox.displayName = "DialogueBox";
