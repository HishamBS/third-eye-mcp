"use client";

import { memo } from "react";
import { QualityScoreRing } from "../QualityScoreRing";
import type { EyeRendererProps } from "./types";
import { isByakuganData } from "./types";

const REVIEW_LABELS: Readonly<Record<string, string>> = {
  clarity: "Clarity",
  completeness: "Completeness",
  correctness: "Correctness",
  quality: "Quality",
  readiness: "Readiness",
};

function getBarColor(value: number): string {
  if (value >= 80) return "#10B981";
  if (value >= 50) return "#F59E0B";
  return "#EF4444";
}

function ByakuganResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isByakuganData(data)) return null;

  const { finalReview, overallScore, strengths, issues } = data;
  const dimensions = Object.entries(finalReview) as Array<[string, number]>;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-4">
        {/* 5 progress bars */}
        <div className="flex-1 space-y-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Final Review
          </span>
          {dimensions.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-brand-foreground/80 w-24 truncate">
                {REVIEW_LABELS[key] ?? key}
              </span>
              <div className="flex-1 h-1.5 bg-brand-outline/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, value)}%`,
                    backgroundColor: getBarColor(value),
                  }}
                />
              </div>
              <span
                className="text-[10px] font-medium w-8 text-right tabular-nums"
                style={{ color: getBarColor(value) }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Score ring */}
        <QualityScoreRing score={overallScore} className="shrink-0" />
      </div>

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

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-semantic-warning uppercase tracking-wider font-medium">
            Issues ({issues.length})
          </span>
          {issues.map((issue, i) => (
            <div
              key={i}
              className="flex gap-2 text-xs text-brand-foreground/70"
            >
              <span className="text-semantic-warning shrink-0">&bull;</span>
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const ByakuganResult = memo(ByakuganResultInner);
ByakuganResult.displayName = "ByakuganResult";
