"use client";

import { memo, useCallback, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { EyeId, ALL_EYE_IDS } from "@third-eye/constants";
import { EYE_DISPLAY_NAMES, EYE_ROLE_TITLES } from "@third-eye/constants";
import { SHARED_EYE_COLORS } from "@third-eye/theme";

type EyeStatus = "standby" | "active" | "complete" | "error";

interface EyeRosterProps {
  eyeStates: Record<string, EyeStatus>;
  activeEye: string | null;
  pipelineRoute: string[];
  onEyeClick: (eyeId: string) => void;
  className?: string;
}

const EYE_SPECIALTIES: Readonly<Record<string, string>> = Object.freeze({
  overseer: "Orchestrates the pipeline and determines optimal routing",
  sharingan: "Analyzes requests for ambiguities and hidden complexities",
  kyuubi: "Identifies patterns and builds structured prompts",
  jogan: "Verifies interpreted intent matches actual goals",
  rinnegan: "Creates strategic execution plans for approval",
  mangekyo: "Reviews code quality with precision",
  tenseigan: "Validates facts and claims against evidence",
  byakugan: "Final comprehensive inspection before delivery",
});

const STATUS_LABELS: Readonly<Record<EyeStatus, string>> = Object.freeze({
  standby: "STANDBY",
  active: "ACTIVE",
  complete: "COMPLETE",
  error: "ERROR",
});

const EYE_IMAGE_SIZE = 36;

interface EyeCardProps {
  eyeId: EyeId;
  status: EyeStatus;
  isActive: boolean;
  onClick: (eyeId: string) => void;
}

function EyeCardComponent({ eyeId, status, isActive, onClick }: EyeCardProps) {
  const eyeColor = SHARED_EYE_COLORS[eyeId];
  const displayName = EYE_DISPLAY_NAMES[eyeId];
  const roleTitle = EYE_ROLE_TITLES[eyeId];
  const specialty = EYE_SPECIALTIES[eyeId];

  const handleClick = useCallback(() => onClick(eyeId), [onClick, eyeId]);

  const containerClasses = useMemo(() => {
    const base =
      "px-3 py-2.5 mx-2 mb-1.5 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-3";

    if (isActive) {
      return cn(base, "border bg-brand-paper-elev");
    }

    switch (status) {
      case "complete":
        return cn(
          base,
          "border border-semantic-success/20 hover:bg-brand-paper-elev",
        );
      case "error":
        return cn(
          base,
          "border border-semantic-error/20 hover:bg-brand-paper-elev",
        );
      default:
        return cn(base, "border border-transparent hover:bg-brand-paper-elev");
    }
  }, [isActive, status]);

  const badgeClasses = useMemo(() => {
    const base = "text-[10px] font-medium px-1.5 py-0.5 rounded-full";

    if (status === "active") {
      return base;
    }

    switch (status) {
      case "complete":
        return cn(base, "bg-semantic-success/10 text-semantic-success");
      case "error":
        return cn(base, "bg-semantic-error/10 text-semantic-error");
      default:
        return cn(base, "bg-brand-outline/20 text-semantic-muted");
    }
  }, [status]);

  const containerStyle = useMemo(() => {
    if (isActive) {
      return {
        borderColor: `${eyeColor}66`,
        boxShadow: `0 0 12px ${eyeColor}25`,
      };
    }
    return undefined;
  }, [isActive, eyeColor]);

  const badgeStyle = useMemo(() => {
    if (status === "active") {
      return {
        backgroundColor: `${eyeColor}1A`,
        color: eyeColor,
      };
    }
    return undefined;
  }, [status, eyeColor]);

  return (
    <div
      role="button"
      tabIndex={0}
      className={containerClasses}
      style={containerStyle}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      title={specialty}
    >
      <Image
        src={`/eyes/${eyeId}.svg`}
        alt={displayName}
        width={EYE_IMAGE_SIZE}
        height={EYE_IMAGE_SIZE}
        className="rounded-full flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-brand-foreground truncate">
          {displayName}
        </div>
        <div className="text-xs text-semantic-muted truncate">{roleTitle}</div>
        <span className={badgeClasses} style={badgeStyle}>
          {STATUS_LABELS[status]}
        </span>
      </div>
    </div>
  );
}

const EyeCard = memo(EyeCardComponent);
EyeCard.displayName = "EyeCard";

function EyeRosterComponent({
  eyeStates,
  activeEye,
  pipelineRoute: _pipelineRoute,
  onEyeClick,
  className,
}: EyeRosterProps) {
  const getEyeStatus = useCallback(
    (eyeId: string): EyeStatus => eyeStates[eyeId] ?? "standby",
    [eyeStates],
  );

  return (
    <aside
      className={cn(
        "w-60 border-r border-brand-outline bg-brand-paper overflow-y-auto flex flex-col",
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-semantic-muted px-3 pt-3 pb-2 flex-shrink-0">
        SPECIALIST ROSTER
      </div>
      <div className="flex-1 overflow-y-auto pb-2">
        {ALL_EYE_IDS.map((eyeId) => (
          <EyeCard
            key={eyeId}
            eyeId={eyeId as EyeId}
            status={getEyeStatus(eyeId)}
            isActive={activeEye === eyeId}
            onClick={onEyeClick}
          />
        ))}
      </div>
    </aside>
  );
}

export const EyeRoster = memo(EyeRosterComponent);
EyeRoster.displayName = "EyeRoster";
