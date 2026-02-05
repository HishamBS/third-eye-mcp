"use client";

/**
 * StageArea - Complete stage with wings and center stage
 *
 * Assembles the full theatrical stage:
 * - Left wing (waiting Eyes)
 * - Center stage (active performance)
 * - Right wing (completed Eyes)
 */

import { memo, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type {
  TheatreState,
  TheatreActionType,
  ClarificationPromptData,
  PlanApprovalData,
} from "@third-eye/types";
import { resolveEyePersona } from "@/lib/eye-persona-resolver";
import {
  CenterStage,
  LeftWing,
  RightWing,
  ClarificationPrompt,
  ApprovalGate,
  type WaitingEye,
  type CompletedEye,
} from "@/components/theatre";

export interface StageAreaProps {
  /** Theatre state from orchestrator */
  state: TheatreState;
  /** Submit clarification answer */
  onClarificationSubmit?: (id: string, answer: string) => void;
  /** Approve plan */
  onPlanApprove?: () => void;
  /** Reject plan with optional feedback */
  onPlanReject?: (feedback?: string) => void;
  /** Click on waiting Eye */
  onWaitingEyeClick?: (eyeId: string) => void;
  /** Click on completed Eye */
  onCompletedEyeClick?: (eyeId: string) => void;
  /** Action submission in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function StageAreaComponent({
  state,
  onClarificationSubmit,
  onPlanApprove,
  onPlanReject,
  onWaitingEyeClick,
  onCompletedEyeClick,
  isSubmitting = false,
  className,
}: StageAreaProps) {
  // Build waiting Eyes list
  const waitingEyesData = useMemo<WaitingEye[]>(() => {
    return state.waitingEyes.map((eyeId, index) => ({
      persona: resolveEyePersona(eyeId),
      isNext: index === 0,
    }));
  }, [state.waitingEyes]);

  // Build completed Eyes list
  const completedEyesData = useMemo<CompletedEye[]>(() => {
    return state.completedEyes.map((completed) => ({
      persona: resolveEyePersona(completed.eye),
      status: completed.status,
    }));
  }, [state.completedEyes]);

  // Active Eye persona
  const activePersona = useMemo(() => {
    if (!state.activeEye) return null;
    return resolveEyePersona(state.activeEye);
  }, [state.activeEye]);

  // Suspense state
  const suspenseState = useMemo(() => {
    if (state.eyeState === "thinking" && state.currentDialogue) {
      return {
        isActive: true,
        message: state.currentDialogue,
        startTime: new Date(),
      };
    }
    return null;
  }, [state.eyeState, state.currentDialogue]);

  // Render action area based on pending action type
  const renderActionArea = useCallback(
    (action: { type: TheatreActionType; data: Record<string, unknown> }) => {
      if (!activePersona) return null;

      switch (action.type) {
        case "clarification_input":
        case "clarification_form":
          const clarificationData: ClarificationPromptData = {
            id: (action.data.id as string) ?? "clarification",
            question:
              (action.data.question as string) ?? "Please provide more details",
            context: action.data.context as string,
            options: action.data.options as string[],
            isRequired: (action.data.isRequired as boolean) ?? true,
          };

          return (
            <ClarificationPrompt
              persona={activePersona}
              clarification={clarificationData}
              onSubmit={(answer) =>
                onClarificationSubmit?.(clarificationData.id, answer)
              }
              isSubmitting={isSubmitting}
            />
          );

        case "plan_approval":
          const planData: PlanApprovalData = {
            planId: (action.data.planId as string) ?? "plan",
            planMarkdown:
              (action.data.planMarkdown as string) ??
              (action.data.md as string) ??
              "",
            stepCount: (action.data.stepCount as number) ?? 1,
            estimatedTime: action.data.estimatedTime as string,
          };

          return (
            <ApprovalGate
              persona={activePersona}
              plan={planData}
              onApprove={() => onPlanApprove?.()}
              onReject={(feedback) => onPlanReject?.(feedback)}
              isSubmitting={isSubmitting}
            />
          );

        case "intent_confirmation":
          // Similar to clarification but for intent
          const intentData: ClarificationPromptData = {
            id: (action.data.id as string) ?? "intent",
            question:
              (action.data.summary as string) ?? "Please confirm your intent",
            context: action.data.details as string,
            options: ["Yes, that's correct", "No, let me clarify"],
            isRequired: true,
          };

          return (
            <ClarificationPrompt
              persona={activePersona}
              clarification={intentData}
              onSubmit={(answer) =>
                onClarificationSubmit?.(intentData.id, answer)
              }
              isSubmitting={isSubmitting}
            />
          );

        case "review_issues":
          // Display issues and allow acknowledgment
          const issueQuestion: ClarificationPromptData = {
            id: "review-issues",
            question:
              "Issues have been identified. How would you like to proceed?",
            context: action.data.issues as string,
            options: [
              "Address the issues",
              "Request more details",
              "Proceed anyway",
            ],
            isRequired: true,
          };

          return (
            <ClarificationPrompt
              persona={activePersona}
              clarification={issueQuestion}
              onSubmit={(answer) =>
                onClarificationSubmit?.(issueQuestion.id, answer)
              }
              isSubmitting={isSubmitting}
            />
          );

        default:
          return null;
      }
    },
    [
      activePersona,
      isSubmitting,
      onClarificationSubmit,
      onPlanApprove,
      onPlanReject,
    ],
  );

  return (
    <div className={cn("relative flex h-full min-h-[500px]", className)}>
      {/* Left Wing - Waiting Eyes */}
      {waitingEyesData.length > 0 && (
        <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <LeftWing
            waitingEyes={waitingEyesData}
            onEyeClick={onWaitingEyeClick}
          />
        </div>
      )}

      {/* Center Stage */}
      <div className="flex-1">
        <CenterStage
          activeEye={activePersona}
          eyeState={state.eyeState}
          dialogue={state.currentDialogue}
          isTypingDialogue={state.isTyping}
          suspenseState={suspenseState}
          pendingAction={state.pendingAction}
          renderActionArea={renderActionArea}
          className="h-full"
        />
      </div>

      {/* Right Wing - Completed Eyes */}
      {completedEyesData.length > 0 && (
        <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
          <RightWing
            completedEyes={completedEyesData}
            onEyeClick={onCompletedEyeClick}
          />
        </div>
      )}
    </div>
  );
}

export const StageArea = memo(StageAreaComponent);
StageArea.displayName = "StageArea";
