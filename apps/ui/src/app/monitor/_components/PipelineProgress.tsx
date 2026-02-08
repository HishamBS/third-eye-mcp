"use client";

import { memo, Fragment } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { ALL_EYE_IDS, EYE_DISPLAY_NAMES } from "@third-eye/constants";

type EyeState = "standby" | "active" | "complete" | "error";

interface PipelineProgressProps {
  eyeStates: Record<string, EyeState>;
  pipelineRoute: string[];
  activeEye: string | null;
  onEyeClick: (eyeId: string) => void;
  className?: string;
}

function PipelineProgressInner({
  eyeStates,
  pipelineRoute,
  activeEye,
  onEyeClick,
  className,
}: PipelineProgressProps) {
  const eyeIds = pipelineRoute.length > 0 ? pipelineRoute : ALL_EYE_IDS;

  return (
    <div
      className={cn(
        "h-[60px] px-6 border-t border-brand-outline bg-brand-paper flex items-center justify-center gap-1",
        className,
      )}
    >
      <div className="flex items-center gap-1">
        {eyeIds.map((eyeId, index) => {
          const state: EyeState = eyeStates[eyeId] ?? "standby";
          const eyeColor =
            SHARED_EYE_COLORS[eyeId as keyof typeof SHARED_EYE_COLORS];
          const isActive = state === "active";
          const isComplete = state === "complete";
          const isError = state === "error";
          const displayName =
            EYE_DISPLAY_NAMES[eyeId as keyof typeof EYE_DISPLAY_NAMES];
          const shortName =
            displayName?.substring(0, 4) ?? eyeId.substring(0, 4);

          return (
            <Fragment key={eyeId}>
              {index > 0 && <div className="w-4 h-px bg-brand-outline/30" />}
              <button
                onClick={() => onEyeClick(eyeId)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-1.5 py-1 rounded transition-all",
                  state === "standby" && "opacity-40",
                  isActive && "opacity-100",
                  isComplete && "opacity-100",
                  isError && "opacity-100",
                )}
                title={displayName}
              >
                <div className="relative">
                  <Image
                    src={`/eyes/${eyeId}.svg`}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  {isActive && (
                    <div
                      className="absolute -inset-1 rounded-full animate-pulse"
                      style={{ boxShadow: `0 0 8px ${eyeColor}60` }}
                    />
                  )}
                  {isComplete && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-semantic-success border border-brand-paper" />
                  )}
                  {isError && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-semantic-error border border-brand-paper" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[8px] uppercase tracking-wider",
                    isActive
                      ? "text-brand-foreground font-medium"
                      : "text-semantic-muted",
                  )}
                  style={isActive ? { color: eyeColor } : undefined}
                >
                  {shortName}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const PipelineProgress = memo(PipelineProgressInner);
export type { PipelineProgressProps, EyeState };
