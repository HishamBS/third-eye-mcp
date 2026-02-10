"use client";

import { memo } from "react";
import type { EyeRendererProps, MangekyoIssue } from "./types";
import { isMangekyoData } from "./types";

const REVIEW_LABELS: Readonly<Record<string, string>> = {
  structure: "Structure",
  naming: "Naming",
  errorHandling: "Error Handling",
  typeSafety: "Type Safety",
  performance: "Performance",
  security: "Security",
  testing: "Testing",
};

const SEVERITY_COLORS: Readonly<Record<string, string>> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#6B7280",
};

function getDimensionBadge(value: number): { label: string; color: string } {
  if (value >= 80) return { label: "pass", color: "#10B981" };
  if (value >= 50) return { label: "warn", color: "#F59E0B" };
  return { label: "fail", color: "#EF4444" };
}

function MangekyoResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isMangekyoData(data)) return null;

  const { codeReview, codeQualityScore, strengths, issues } = data;
  const dimensions = Object.entries(codeReview) as Array<[string, number]>;

  return (
    <div className="mt-3 space-y-3">
      {/* Score header */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: eyeColor }}
        >
          Code Review
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{
            color:
              codeQualityScore >= 80
                ? "#10B981"
                : codeQualityScore >= 50
                  ? "#F59E0B"
                  : "#EF4444",
          }}
        >
          {codeQualityScore}/100
        </span>
      </div>

      {/* 7-dimension grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {dimensions.map(([key, value]) => {
          const badge = getDimensionBadge(value);
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-brand-foreground/80 truncate">
                {REVIEW_LABELS[key] ?? key}
              </span>
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                style={{
                  backgroundColor: `${badge.color}15`,
                  color: badge.color,
                }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Issues table */}
      {issues.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] text-semantic-muted uppercase tracking-wider">
            Issues ({issues.length})
          </span>
          <div className="space-y-1">
            {issues.map((issue: MangekyoIssue, i: number) => {
              const sevColor =
                SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.medium;
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs rounded-md px-2 py-1.5 bg-brand-paper"
                  style={{ borderLeft: `2px solid ${sevColor}` }}
                >
                  <span
                    className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium uppercase shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `${sevColor}15`,
                      color: sevColor,
                    }}
                  >
                    {issue.severity}
                  </span>
                  <div className="min-w-0">
                    <span className="text-brand-foreground/60 font-mono text-[10px]">
                      {issue.file}:{issue.line}
                    </span>
                    <div className="text-brand-foreground/80">
                      {issue.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-semantic-muted uppercase tracking-wider">
            Strengths
          </span>
          {strengths.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-xs text-brand-foreground/80"
            >
              <span className="text-semantic-success shrink-0">&#10003;</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const MangekyoResult = memo(MangekyoResultInner);
MangekyoResult.displayName = "MangekyoResult";
