"use client";

import { memo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { type EyeId } from "@third-eye/constants";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { HEX_COLORS } from "@/constants/color-mappings";

type ConversationEntryType =
  | "eye_section_header"
  | "eye_dialogue"
  | "eye_question"
  | "eye_result"
  | "eye_error"
  | "human_answer"
  | "human_message"
  | "agent_message"
  | "agent_to_eye"
  | "plan_presented"
  | "plan_decision"
  | "system";

interface PendingAction {
  type: "clarification" | "plan_approval" | "intent_confirmation";
  id: string;
  question?: string;
  options?: string[];
  planContent?: string;
  planSteps?: number;
}

export interface ConversationEntryData {
  id: string;
  type: ConversationEntryType;
  eye: EyeId | null;
  timestamp: Date;
  speaker: {
    name: string;
    role: string;
    specialty: string | null;
    isHuman: boolean;
    isAgent: boolean;
    isSystem: boolean;
  };
  content: {
    text: string;
    markdown: string | null;
    metrics: Record<string, unknown> | null;
  };
  action: PendingAction | null;
  status: "pending" | "active" | "complete";
  alignment: "left" | "right" | "center";
}

interface ConversationEntryProps {
  entry: ConversationEntryData;
  viewMode: "strategic" | "tactical";
  className?: string;
}

const DEFAULT_EYE_COLOR = HEX_COLORS.muted;

function getEyeColor(eyeId: EyeId | null): string {
  if (!eyeId) return DEFAULT_EYE_COLOR;
  return (
    SHARED_EYE_COLORS[eyeId as keyof typeof SHARED_EYE_COLORS] ??
    DEFAULT_EYE_COLOR
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function MetricsBar({ metrics }: { metrics: Record<string, unknown> }) {
  return (
    <div className="mt-2 pt-2 border-t border-brand-outline/20 flex gap-4 text-[10px] text-semantic-muted">
      {Object.entries(metrics).map(([key, value]) => (
        <span key={key}>
          {key}: {String(value)}
        </span>
      ))}
    </div>
  );
}

function SectionHeader({ entry }: { entry: ConversationEntryData }) {
  const eyeColor = getEyeColor(entry.eye);
  const isActive = entry.status === "active";
  return (
    <div>
      <div className="flex items-center gap-3 py-4">
        <div className="h-px flex-1 bg-brand-outline/30" />
        {entry.eye && (
          <div className="relative">
            <Image
              src={`/eyes/${entry.eye}.svg`}
              width={24}
              height={24}
              alt=""
            />
            {isActive && (
              <div
                className="absolute -inset-1 rounded-full animate-spot-pulse"
                style={{ "--eye-glow": `${eyeColor}60` } as React.CSSProperties}
              />
            )}
          </div>
        )}
        <span className="text-sm font-medium" style={{ color: eyeColor }}>
          {entry.speaker.name}
        </span>
        <span className="text-xs text-semantic-muted">
          &mdash; {entry.speaker.role}
        </span>
        <div className="h-px flex-1 bg-brand-outline/30" />
      </div>
      {entry.speaker.specialty && (
        <div className="text-center text-xs text-semantic-muted italic mb-4">
          &ldquo;{entry.speaker.specialty}&rdquo;
        </div>
      )}
    </div>
  );
}

function EyeDialogue({
  entry,
  viewMode,
}: {
  entry: ConversationEntryData;
  viewMode: "strategic" | "tactical";
}) {
  const eyeColor = getEyeColor(entry.eye);
  const isActive = entry.status === "active";
  return (
    <div className="flex gap-3 max-w-[80%]">
      {entry.eye && (
        <div className="relative mt-1 flex-shrink-0">
          <Image
            src={`/eyes/${entry.eye}.svg`}
            width={32}
            height={32}
            className="rounded-full"
            alt=""
          />
          {isActive && (
            <div
              className="absolute -inset-1 rounded-full animate-spot-pulse"
              style={{ "--eye-glow": `${eyeColor}60` } as React.CSSProperties}
            />
          )}
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: eyeColor }}>
            {entry.speaker.name}
          </span>
          <span className="text-[10px] text-semantic-muted">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <div
          className={cn(
            "rounded-lg px-4 py-3 bg-brand-paper-elev",
            isActive && "animate-speak-pulse",
          )}
          style={{ borderLeft: `3px solid ${eyeColor}` }}
        >
          <MarkdownRenderer
            content={entry.content.markdown ?? entry.content.text}
          />
          {viewMode === "tactical" && entry.content.metrics && (
            <MetricsBar metrics={entry.content.metrics} />
          )}
        </div>
      </div>
    </div>
  );
}

function EyeResult({
  entry,
  viewMode,
}: {
  entry: ConversationEntryData;
  viewMode: "strategic" | "tactical";
}) {
  const eyeColor = getEyeColor(entry.eye);
  const metrics = entry.content.metrics;
  const score = metrics?.["score"] as number | undefined;
  const issues = metrics?.["issues"] as number | undefined;

  return (
    <div className="flex gap-3 max-w-[80%]">
      {entry.eye && (
        <Image
          src={`/eyes/${entry.eye}.svg`}
          width={32}
          height={32}
          className="mt-1 flex-shrink-0 rounded-full"
          alt=""
        />
      )}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium" style={{ color: eyeColor }}>
            {entry.speaker.name}
          </span>
          <span className="text-[10px] text-semantic-muted">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <div
          className="rounded-lg px-4 py-3 bg-brand-paper-elev"
          style={{ borderLeft: `3px solid ${eyeColor}` }}
        >
          <MarkdownRenderer
            content={entry.content.markdown ?? entry.content.text}
          />
          {viewMode === "tactical" && entry.content.metrics && (
            <MetricsBar metrics={entry.content.metrics} />
          )}
        </div>
        {(score !== undefined || issues !== undefined) && (
          <div className="mt-2 flex items-center gap-3 px-4 py-2 rounded bg-brand-paper text-xs">
            {score !== undefined && <span>Score: {score}/100</span>}
            {issues !== undefined && <span>Issues: {issues}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function EyeQuestion({ entry }: { entry: ConversationEntryData }) {
  const eyeColor = getEyeColor(entry.eye);
  return (
    <div className="max-w-[85%]">
      <div className="flex items-center gap-2 mb-1">
        {entry.eye && (
          <Image
            src={`/eyes/${entry.eye}.svg`}
            width={24}
            height={24}
            className="flex-shrink-0 rounded-full"
            alt=""
          />
        )}
        <span className="text-sm font-medium" style={{ color: eyeColor }}>
          {entry.speaker.name}
        </span>
        <span className="text-[10px] text-semantic-muted">
          {formatTime(entry.timestamp)}
        </span>
      </div>
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${eyeColor}40`,
          backgroundColor: `${eyeColor}08`,
        }}
      >
        <div
          className="text-[10px] font-medium uppercase tracking-wider mb-2"
          style={{ color: eyeColor }}
        >
          Clarification Needed
        </div>
        <MarkdownRenderer
          content={entry.content.markdown ?? entry.content.text}
          className="text-brand-foreground"
        />
      </div>
    </div>
  );
}

function HumanMessage({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[70%]">
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-[10px] text-semantic-muted">
            {formatTime(entry.timestamp)}
          </span>
          <span className="text-sm font-medium text-brand-foreground">You</span>
        </div>
        <div className="rounded-lg px-4 py-3 bg-brand-primary/10 border border-brand-primary/20">
          <MarkdownRenderer
            content={entry.content.markdown ?? entry.content.text}
          />
        </div>
      </div>
    </div>
  );
}

function AgentMessage({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="flex gap-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-semantic-info/10 border border-semantic-info/20 flex items-center justify-center flex-shrink-0 mt-1">
        <span className="text-xs text-semantic-info">TE</span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-semantic-info">
            Third Eye
          </span>
          <span className="text-[10px] text-semantic-muted">
            {formatTime(entry.timestamp)}
          </span>
        </div>
        <div className="rounded-lg px-4 py-3 bg-semantic-info/5 border border-semantic-info/20">
          <MarkdownRenderer
            content={entry.content.markdown ?? entry.content.text}
          />
        </div>
      </div>
    </div>
  );
}

function PlanPresented({ entry }: { entry: ConversationEntryData }) {
  const rinnColor = SHARED_EYE_COLORS.rinnegan;
  return (
    <div className="max-w-[85%]">
      <div className="flex items-center gap-2 mb-1">
        <Image
          src="/eyes/rinnegan.svg"
          width={24}
          height={24}
          className="flex-shrink-0 rounded-full"
          alt=""
        />
        <span className="text-sm font-medium" style={{ color: rinnColor }}>
          {entry.speaker.name}
        </span>
        <span className="text-[10px] text-semantic-muted">
          {formatTime(entry.timestamp)}
        </span>
      </div>
      <div
        className="rounded-lg p-4"
        style={{
          border: `1px solid ${rinnColor}40`,
          backgroundColor: `${rinnColor}08`,
        }}
      >
        <div
          className="text-[10px] font-medium uppercase tracking-wider mb-2"
          style={{ color: rinnColor }}
        >
          Execution Plan
        </div>
        <MarkdownRenderer
          content={entry.content.markdown ?? entry.content.text}
        />
      </div>
    </div>
  );
}

function PlanDecision({ entry }: { entry: ConversationEntryData }) {
  const isApproved = entry.content.text.includes("Approved");
  return (
    <div className="flex justify-center py-2">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          isApproved
            ? "bg-semantic-success/10 text-semantic-success border border-semantic-success/20"
            : "bg-semantic-error/10 text-semantic-error border border-semantic-error/20",
        )}
      >
        {entry.content.text}
      </div>
    </div>
  );
}

function EyeError({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="max-w-[80%]">
      <div className="rounded-lg p-4 bg-semantic-error/5 border border-semantic-error/40">
        <div className="text-xs font-medium text-semantic-error mb-1">
          Error
        </div>
        <MarkdownRenderer
          content={entry.content.markdown ?? entry.content.text}
        />
      </div>
    </div>
  );
}

function SystemMessage({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="flex justify-center py-1">
      <span className="text-[11px] text-semantic-muted">
        {entry.content.text}
      </span>
    </div>
  );
}

function ConversationEntryInner({
  entry,
  viewMode,
  className,
}: ConversationEntryProps) {
  const renderContent = () => {
    switch (entry.type) {
      case "eye_section_header":
        return <SectionHeader entry={entry} />;
      case "eye_dialogue":
        return <EyeDialogue entry={entry} viewMode={viewMode} />;
      case "eye_result":
        return <EyeResult entry={entry} viewMode={viewMode} />;
      case "eye_question":
        return <EyeQuestion entry={entry} />;
      case "human_answer":
      case "human_message":
        return <HumanMessage entry={entry} />;
      case "agent_message":
      case "agent_to_eye":
        return <AgentMessage entry={entry} />;
      case "plan_presented":
        return <PlanPresented entry={entry} />;
      case "plan_decision":
        return <PlanDecision entry={entry} />;
      case "eye_error":
        return <EyeError entry={entry} />;
      case "system":
        return <SystemMessage entry={entry} />;
      default:
        return <SystemMessage entry={entry} />;
    }
  };

  return <div className={cn("mb-4", className)}>{renderContent()}</div>;
}

export const ConversationEntry = memo(ConversationEntryInner);
export type { ConversationEntryType, PendingAction, ConversationEntryProps };
