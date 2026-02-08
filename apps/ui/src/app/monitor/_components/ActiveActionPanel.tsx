"use client";

import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { PendingAction } from "./ConversationEntry";

interface ActiveActionPanelProps {
  action: PendingAction;
  eyeColor: string;
  onClarificationSubmit: (id: string, answer: string) => void;
  onPlanApprove: () => void;
  onPlanReject: (feedback?: string) => void;
  isSubmitting: boolean;
  className?: string;
}

function ClarificationPanel({
  action,
  eyeColor,
  onClarificationSubmit,
  isSubmitting,
}: {
  action: PendingAction;
  eyeColor: string;
  onClarificationSubmit: (id: string, answer: string) => void;
  isSubmitting: boolean;
}) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = useCallback(() => {
    if (answer.trim()) {
      onClarificationSubmit(action.id, answer.trim());
    }
  }, [action.id, answer, onClarificationSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="max-w-[85%] mb-4">
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${eyeColor}40`,
          backgroundColor: `${eyeColor}08`,
        }}
      >
        <div
          className="text-[10px] font-medium uppercase tracking-wider mb-3"
          style={{ color: eyeColor }}
        >
          Your Response Needed
        </div>
        {action.question && (
          <MarkdownRenderer content={action.question} className="mb-3" />
        )}
        {action.options && action.options.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {action.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setAnswer(opt)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm border transition-colors",
                  answer === opt
                    ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                    : "border-brand-outline text-brand-foreground hover:bg-brand-paper-elev",
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={2}
            className="flex-1 rounded-md border border-brand-outline bg-brand-paper px-3 py-2 text-sm text-brand-foreground placeholder:text-semantic-muted focus:border-brand-primary focus:outline-none resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || isSubmitting}
            className="rounded-md px-4 py-2 text-sm font-medium bg-brand-primary text-white disabled:opacity-40 hover:opacity-90 transition-opacity self-end"
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanApprovalPanel({
  action,
  onPlanApprove,
  onPlanReject,
  isSubmitting,
}: {
  action: PendingAction;
  onPlanApprove: () => void;
  onPlanReject: (feedback?: string) => void;
  isSubmitting: boolean;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const rinnColor = SHARED_EYE_COLORS.rinnegan;

  const handleReject = useCallback(() => {
    onPlanReject(feedback || undefined);
    setShowRejectForm(false);
    setFeedback("");
  }, [feedback, onPlanReject]);

  return (
    <div className="max-w-[85%] mb-4">
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${rinnColor}40`,
          backgroundColor: `${rinnColor}08`,
        }}
      >
        <div
          className="text-[10px] font-medium uppercase tracking-wider mb-3"
          style={{ color: rinnColor }}
        >
          Approval Required
        </div>
        {action.planContent && (
          <MarkdownRenderer content={action.planContent} className="mb-4" />
        )}
        {!showRejectForm ? (
          <div className="flex gap-3">
            <button
              onClick={onPlanApprove}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-sm font-medium bg-semantic-success/10 text-semantic-success border border-semantic-success/30 hover:bg-semantic-success/20 transition-colors disabled:opacity-40"
            >
              Approve Plan
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={isSubmitting}
              className="rounded-md px-4 py-2 text-sm font-medium bg-semantic-error/10 text-semantic-error border border-semantic-error/30 hover:bg-semantic-error/20 transition-colors disabled:opacity-40"
            >
              Request Changes
            </button>
          </div>
        ) : (
          <div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What changes would you like?"
              rows={3}
              className="w-full rounded-md border border-brand-outline bg-brand-paper px-3 py-2 text-sm text-brand-foreground placeholder:text-semantic-muted focus:border-brand-primary focus:outline-none resize-none mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="rounded-md px-4 py-2 text-sm font-medium bg-semantic-error/10 text-semantic-error border border-semantic-error/30 hover:bg-semantic-error/20 transition-colors disabled:opacity-40"
              >
                Submit Feedback
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="rounded-md px-4 py-2 text-sm text-semantic-muted hover:text-brand-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveActionPanelInner({
  action,
  eyeColor,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  isSubmitting,
  className,
}: ActiveActionPanelProps) {
  if (
    action.type === "clarification" ||
    action.type === "intent_confirmation"
  ) {
    return (
      <div className={className}>
        <ClarificationPanel
          action={action}
          eyeColor={eyeColor}
          onClarificationSubmit={onClarificationSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  if (action.type === "plan_approval") {
    return (
      <div className={className}>
        <PlanApprovalPanel
          action={action}
          onPlanApprove={onPlanApprove}
          onPlanReject={onPlanReject}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return null;
}

export const ActiveActionPanel = memo(ActiveActionPanelInner);
export type { ActiveActionPanelProps };
