"use client";

import { memo, Fragment } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SHARED_EYE_COLORS } from "@third-eye/theme";
import { type EyeId, EYE_DISPLAY_NAMES } from "@third-eye/constants";
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
  | "routing_announced"
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
  const previousEye = entry.content.metrics?.previousEye as EyeId | undefined;
  const prevEyeColor = previousEye ? getEyeColor(previousEye) : null;

  return (
    <div>
      <div className="flex items-center gap-3 py-4">
        <div className="h-px flex-1 bg-brand-outline/30" />
        {previousEye && (
          <>
            <Image
              src={`/eyes/${previousEye}.svg`}
              width={16}
              height={16}
              alt=""
              className="rounded-full opacity-50"
            />
            <span className="text-xs" style={{ color: `${prevEyeColor}80` }}>
              {EYE_DISPLAY_NAMES[previousEye] ?? previousEye}
            </span>
            <span className="text-semantic-muted text-xs">&rarr;</span>
          </>
        )}
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
            style={{
              boxShadow: `0 0 0 2px ${eyeColor}26`,
            }}
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

function getScoreColor(score: number): string {
  if (score >= 80) return HEX_COLORS.success ?? "#22c55e";
  if (score >= 50) return HEX_COLORS.warning ?? "#f59e0b";
  return HEX_COLORS.error ?? "#ef4444";
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
          style={{
            boxShadow: `0 0 0 2px ${eyeColor}26`,
          }}
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
          <div className="mt-2 flex items-center gap-3 px-3 py-1.5 rounded-md bg-brand-paper border border-brand-outline/20 text-xs">
            {score !== undefined && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: getScoreColor(score) }}
                />
                <span className="text-brand-foreground/70">Score</span>
                <span className="font-medium text-brand-foreground">
                  {score}/100
                </span>
              </span>
            )}
            {issues !== undefined && (
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      issues === 0
                        ? (HEX_COLORS.success ?? "#22c55e")
                        : (HEX_COLORS.warning ?? "#f59e0b"),
                  }}
                />
                <span className="text-brand-foreground/70">Issues</span>
                <span className="font-medium text-brand-foreground">
                  {issues}
                </span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EyeQuestion({ entry }: { entry: ConversationEntryData }) {
  const eyeColor = getEyeColor(entry.eye);
  const options = entry.action?.options;
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
        {options && options.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {options.map((option, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm border border-brand-outline/20 bg-brand-paper"
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-medium"
                  style={{ borderColor: `${eyeColor}60`, color: eyeColor }}
                >
                  {idx + 1}
                </span>
                <span className="text-brand-foreground/80">{option}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HumanMessage({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[70%]">
        <div className="flex items-center justify-end gap-2 mb-1">
          <span className="text-[10px] text-semantic-muted">
            {formatTime(entry.timestamp)}
          </span>
          <span className="text-sm font-medium text-brand-foreground">You</span>
        </div>
        <div className="rounded-2xl rounded-tr-md px-4 py-3 bg-brand-primary/10 border border-brand-primary/20 transition-shadow hover:shadow-[0_0_12px_rgba(var(--color-primary)/0.08)]">
          <MarkdownRenderer
            content={entry.content.markdown ?? entry.content.text}
          />
        </div>
      </div>
      <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center flex-shrink-0 mt-6">
        <span className="text-xs font-medium text-brand-primary">U</span>
      </div>
    </div>
  );
}

function AgentMessage({ entry }: { entry: ConversationEntryData }) {
  return (
    <div className="flex gap-3 max-w-[80%]">
      <div className="w-8 h-8 rounded-full bg-semantic-info/10 border border-semantic-info/20 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
        <Image
          src="/eyes/overseer.svg"
          width={24}
          height={24}
          alt=""
          className="rounded-full"
        />
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
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-brand-outline/20" />
      <span className="text-[11px] text-semantic-muted">
        {entry.content.text}
      </span>
      <div className="h-px flex-1 bg-brand-outline/20" />
    </div>
  );
}

const EYE_NAME_ABBREV_LENGTH = 4;

function RoutingAnnounced({ entry }: { entry: ConversationEntryData }) {
  const overseerColor = SHARED_EYE_COLORS.overseer;
  const route = entry.content.metrics?.route as string[] | undefined;
  const summary = entry.content.metrics?.summary as string | undefined;

  if (!route || route.length === 0) {
    return <SystemMessage entry={entry} />;
  }

  return (
    <div className="flex justify-center py-3">
      <div
        className="rounded-lg px-5 py-3 bg-brand-paper-elev max-w-[90%]"
        style={{ border: `1px solid ${overseerColor}30` }}
      >
        <div
          className="text-[10px] font-medium uppercase tracking-wider mb-3 text-center"
          style={{ color: overseerColor }}
        >
          Pipeline Route
        </div>
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {route.map((eyeId, index) => {
            const color =
              SHARED_EYE_COLORS[eyeId as keyof typeof SHARED_EYE_COLORS] ??
              DEFAULT_EYE_COLOR;
            const displayName =
              EYE_DISPLAY_NAMES[eyeId as keyof typeof EYE_DISPLAY_NAMES] ??
              eyeId;
            const shortName = displayName.substring(0, EYE_NAME_ABBREV_LENGTH);

            return (
              <Fragment key={eyeId}>
                {index > 0 && (
                  <div className="flex items-center mx-1">
                    <span className="w-3 border-t border-dashed border-semantic-muted/40" />
                    <span className="text-semantic-muted text-[10px]">
                      &rsaquo;
                    </span>
                    <span className="w-3 border-t border-dashed border-semantic-muted/40" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-0.5">
                  <Image
                    src={`/eyes/${eyeId}.svg`}
                    width={16}
                    height={16}
                    alt=""
                    className="rounded-full"
                  />
                  <span
                    className="text-[8px] uppercase tracking-wider font-medium"
                    style={{ color }}
                  >
                    {shortName}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
        {summary && (
          <div className="text-xs text-semantic-muted text-center mt-2 pt-2 border-t border-brand-outline/20">
            {summary}
          </div>
        )}
      </div>
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
      case "routing_announced":
        return <RoutingAnnounced entry={entry} />;
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
