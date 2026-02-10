"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import type { PendingAction } from "./ConversationEntry";

interface ActiveActionPanelProps {
  action: PendingAction;
  eyeColor: string;
  className?: string;
}

function ClarificationStatusCard({
  action,
  eyeColor,
}: {
  action: PendingAction;
  eyeColor: string;
}) {
  const isAnswered =
    action.type === "clarification" && action.options?.length === 0;

  return (
    <div className="max-w-[85%] mb-4">
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${eyeColor}40`,
          backgroundColor: `${eyeColor}08`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Clarification Required
          </div>
          <span
            className={cn(
              "text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full",
              isAnswered
                ? "bg-semantic-success/10 text-semantic-success"
                : "bg-semantic-warning/10 text-semantic-warning",
            )}
          >
            {isAnswered ? "Answered" : "Awaiting Agent Response"}
          </span>
        </div>
        {action.question && (
          <MarkdownRenderer content={action.question} className="text-sm" />
        )}
        {action.options && action.options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {action.options.map((opt) => (
              <span
                key={opt}
                className="rounded-md px-3 py-1.5 text-sm border border-brand-outline text-semantic-muted"
              >
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanApprovalStatusCard({ action }: { action: PendingAction }) {
  const rinnColor = SHARED_EYE_COLORS.rinnegan;

  return (
    <div className="max-w-[85%] mb-4">
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${rinnColor}40`,
          backgroundColor: `${rinnColor}08`,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: rinnColor }}
          >
            Approval Required
          </div>
          <span className="text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-semantic-warning/10 text-semantic-warning">
            Awaiting Confirmation
          </span>
        </div>
        {action.planContent && (
          <MarkdownRenderer content={action.planContent} className="text-sm" />
        )}
      </div>
    </div>
  );
}

function ActiveActionPanelInner({
  action,
  eyeColor,
  className,
}: ActiveActionPanelProps) {
  if (
    action.type === "clarification" ||
    action.type === "intent_confirmation"
  ) {
    return (
      <div className={className}>
        <ClarificationStatusCard action={action} eyeColor={eyeColor} />
      </div>
    );
  }

  if (action.type === "plan_approval") {
    return (
      <div className={className}>
        <PlanApprovalStatusCard action={action} />
      </div>
    );
  }

  return null;
}

export const ActiveActionPanel = memo(ActiveActionPanelInner);
export type { ActiveActionPanelProps };
