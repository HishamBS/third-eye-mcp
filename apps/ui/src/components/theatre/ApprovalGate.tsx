"use client";

/**
 * ApprovalGate - The dramatic decision moment
 *
 * Presents the plan for approval with:
 * - Plan content displayed as scrollable markdown
 * - Dramatic dual spotlights on approve/reject buttons
 * - Clear step count and summary
 */

import { memo, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EyePersonaConfig, PlanApprovalData } from "@third-eye/types";

export interface ApprovalGateProps {
  /** Eye persona presenting the plan */
  persona: EyePersonaConfig;
  /** Plan data */
  plan: PlanApprovalData;
  /** Approve callback */
  onApprove: () => void;
  /** Reject callback with optional feedback */
  onReject: (feedback?: string) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function ApprovalGateComponent({
  persona,
  plan,
  onApprove,
  onReject,
  isSubmitting = false,
  className,
}: ApprovalGateProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showRejectFeedback, setShowRejectFeedback] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");

  const handleApprove = useCallback(() => {
    if (!isSubmitting) {
      onApprove();
    }
  }, [isSubmitting, onApprove]);

  const handleRejectClick = useCallback(() => {
    setShowRejectFeedback(true);
  }, []);

  const handleRejectConfirm = useCallback(() => {
    if (!isSubmitting) {
      onReject(rejectFeedback.trim() || undefined);
    }
  }, [isSubmitting, onReject, rejectFeedback]);

  const handleRejectCancel = useCallback(() => {
    setShowRejectFeedback(false);
    setRejectFeedback("");
  }, []);

  return (
    <motion.div
      className={cn("w-full max-w-2xl", className)}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
    >
      {/* Plan card */}
      <div
        className="rounded-xl border-2 overflow-hidden"
        style={{
          borderColor: `${persona.color.primary}60`,
          backgroundColor: `${persona.color.primary}05`,
          boxShadow: `0 0 40px ${persona.color.glow}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ backgroundColor: `${persona.color.primary}10` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${persona.color.primary}20`,
                border: `2px solid ${persona.color.primary}40`,
              }}
            >
              <FileText
                className="h-5 w-5"
                style={{ color: persona.color.primary }}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-100">
                {persona.name}'s Strategy
              </h3>
              <p className="text-sm text-neutral-400">
                {plan.stepCount} step{plan.stepCount !== 1 ? "s" : ""} planned
                {plan.estimatedTime && ` · ${plan.estimatedTime}`}
              </p>
            </div>
          </div>

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Plan content */}
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="max-h-80 overflow-y-auto px-6 py-4">
              {/* Render markdown-like content */}
              <div
                className="prose prose-sm prose-invert max-w-none"
                style={{ fontFamily: "var(--font-narrative, serif)" }}
              >
                {/* Simple markdown rendering - split by newlines */}
                {plan.planMarkdown.split("\n").map((line, index) => {
                  // Headers
                  if (line.startsWith("###")) {
                    return (
                      <h4
                        key={index}
                        className="text-base font-semibold text-neutral-200 mt-4 mb-2"
                      >
                        {line.replace(/^###\s*/, "")}
                      </h4>
                    );
                  }
                  if (line.startsWith("##")) {
                    return (
                      <h3
                        key={index}
                        className="text-lg font-semibold text-neutral-100 mt-4 mb-2"
                      >
                        {line.replace(/^##\s*/, "")}
                      </h3>
                    );
                  }
                  if (line.startsWith("#")) {
                    return (
                      <h2
                        key={index}
                        className="text-xl font-bold text-neutral-100 mt-4 mb-2"
                      >
                        {line.replace(/^#\s*/, "")}
                      </h2>
                    );
                  }
                  // List items
                  if (line.match(/^[-*]\s/)) {
                    return (
                      <li
                        key={index}
                        className="text-neutral-300 ml-4 list-disc"
                      >
                        {line.replace(/^[-*]\s/, "")}
                      </li>
                    );
                  }
                  if (line.match(/^\d+\.\s/)) {
                    return (
                      <li
                        key={index}
                        className="text-neutral-300 ml-4 list-decimal"
                      >
                        {line.replace(/^\d+\.\s/, "")}
                      </li>
                    );
                  }
                  // Empty lines
                  if (!line.trim()) {
                    return <br key={index} />;
                  }
                  // Regular paragraphs
                  return (
                    <p key={index} className="text-neutral-300 mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="border-t border-neutral-800 px-6 py-4">
          {showRejectFeedback ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                What would you like to change? (Optional)
              </p>
              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="Describe your concerns or desired changes..."
                rows={3}
                className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus:border-neutral-600 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleRejectCancel}
                  className="flex-1 rounded-lg border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectConfirm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Reject button */}
              <motion.button
                onClick={handleRejectClick}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-6 py-3 text-base font-semibold transition-all",
                  "border-red-500/40 bg-red-500/10 text-red-400",
                  "hover:border-red-500/60 hover:bg-red-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                <X className="h-5 w-5" />
                Request Changes
              </motion.button>

              {/* Approve button */}
              <motion.button
                onClick={handleApprove}
                disabled={isSubmitting}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-6 py-3 text-base font-semibold transition-all",
                  "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                  "hover:border-emerald-500/60 hover:bg-emerald-500/20",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
              >
                <Check className="h-5 w-5" />
                Approve Plan
              </motion.button>
            </div>
          )}
        </div>

        {/* Submitting indicator */}
        {isSubmitting && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-2">
              <motion.div
                className="h-2 w-2 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm text-neutral-400">
                Processing your decision...
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const ApprovalGate = memo(ApprovalGateComponent);
ApprovalGate.displayName = "ApprovalGate";
