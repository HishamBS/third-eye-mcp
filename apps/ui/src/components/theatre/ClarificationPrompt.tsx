"use client";

/**
 * ClarificationPrompt - The Eye asks the audience
 *
 * Dramatic presentation of clarification questions:
 * - Spotlight dims on stage
 * - Question appears with emphasis
 * - Input styled as "audience response card"
 */

import { memo, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Send, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  EyePersonaConfig,
  ClarificationPromptData,
} from "@third-eye/types";

export interface ClarificationPromptProps {
  /** Eye persona asking the question */
  persona: EyePersonaConfig;
  /** Clarification data */
  clarification: ClarificationPromptData;
  /** Submit answer callback */
  onSubmit: (answer: string) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function ClarificationPromptComponent({
  persona,
  clarification,
  onSubmit,
  isSubmitting = false,
  className,
}: ClarificationPromptProps) {
  const prefersReducedMotion = useReducedMotion();
  const [answer, setAnswer] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (answer.trim() && !isSubmitting) {
        onSubmit(answer.trim());
      }
    },
    [answer, isSubmitting, onSubmit],
  );

  const handleOptionClick = useCallback(
    (option: string) => {
      if (!isSubmitting) {
        onSubmit(option);
      }
    },
    [isSubmitting, onSubmit],
  );

  return (
    <motion.div
      className={cn("w-full max-w-xl", className)}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
    >
      {/* Question card */}
      <div
        className="rounded-xl border-2 p-6"
        style={{
          borderColor: `${persona.color.primary}60`,
          backgroundColor: `${persona.color.primary}08`,
          boxShadow: `0 0 30px ${persona.color.glow}`,
        }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              backgroundColor: `${persona.color.primary}20`,
              border: `2px solid ${persona.color.primary}40`,
            }}
          >
            <HelpCircle
              className="h-5 w-5"
              style={{ color: persona.color.primary }}
            />
          </div>
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: persona.color.primary }}
            >
              {persona.name} asks:
            </span>
            {clarification.isRequired && (
              <span className="ml-2 text-xs text-red-400">Required</span>
            )}
          </div>
        </div>

        {/* Question */}
        <p
          className="mb-4 text-lg text-neutral-100"
          style={{ fontFamily: "var(--font-narrative, serif)" }}
        >
          {clarification.question}
        </p>

        {/* Context if provided */}
        {clarification.context && (
          <p className="mb-4 text-sm text-neutral-400">
            {clarification.context}
          </p>
        )}

        {/* Options or free-form input */}
        {clarification.options && clarification.options.length > 0 ? (
          <div className="space-y-2">
            {clarification.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                disabled={isSubmitting}
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  "border-neutral-700 bg-neutral-800/50 text-neutral-200",
                  "hover:border-neutral-600 hover:bg-neutral-800",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                style={{
                  ["--hover-border" as string]: persona.color.primary,
                }}
              >
                {option}
              </button>
            ))}

            {/* Or type custom */}
            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-neutral-900 px-4 text-xs text-neutral-500">
                  or type your own response
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Free-form input */}
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="relative">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your response..."
              disabled={isSubmitting}
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg border px-4 py-3 text-sm",
                "border-neutral-700 bg-neutral-800/50 text-neutral-200",
                "placeholder:text-neutral-500",
                "focus:border-neutral-600 focus:outline-none focus:ring-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              style={{
                ["--tw-ring-color" as string]: `${persona.color.primary}40`,
              }}
            />
            <button
              type="submit"
              disabled={!answer.trim() || isSubmitting}
              className={cn(
                "absolute bottom-3 right-3 rounded-lg p-2 transition-all",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              style={{
                backgroundColor: answer.trim()
                  ? `${persona.color.primary}20`
                  : "transparent",
                color: answer.trim()
                  ? persona.color.primary
                  : "rgb(115 115 115)",
              }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Submitting indicator */}
        {isSubmitting && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <motion.div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: persona.color.primary }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-sm text-neutral-400">
              Processing your response...
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const ClarificationPrompt = memo(ClarificationPromptComponent);
ClarificationPrompt.displayName = "ClarificationPrompt";
