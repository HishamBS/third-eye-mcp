"use client";

import { memo } from "react";
import { QualityScoreRing } from "../QualityScoreRing";
import type { EyeRendererProps } from "./types";
import { isRinneganData } from "./types";

const DIMENSION_LABELS: Readonly<Record<string, string>> = {
  completeness: "Completeness",
  feasibility: "Feasibility",
  dependencies: "Dependencies",
  risks: "Risk Coverage",
  successCriteria: "Success Criteria",
};

function getDimensionStatus(value: number): { label: string; color: string } {
  if (value >= 80) return { label: "pass", color: "#10B981" };
  if (value >= 50) return { label: "warn", color: "#F59E0B" };
  return { label: "fail", color: "#EF4444" };
}

function RinneganResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isRinneganData(data)) return null;

  const { planReview, planQualityScore, recommendations } = data;
  const dimensions = Object.entries(planReview) as Array<[string, number]>;

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-4">
        {/* Plan dimensions */}
        <div className="flex-1 space-y-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Plan Review
          </span>
          {dimensions.map(([key, value]) => {
            const status = getDimensionStatus(value);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-brand-foreground/80 w-28 truncate">
                  {DIMENSION_LABELS[key] ?? key}
                </span>
                <div className="flex-1 h-1.5 bg-brand-outline/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, value)}%`,
                      backgroundColor: status.color,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-medium w-8 text-right"
                  style={{ color: status.color }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>

        {/* Score ring */}
        <QualityScoreRing score={planQualityScore} className="shrink-0" />
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-semantic-muted uppercase tracking-wider">
            Recommendations
          </span>
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex gap-2 text-xs text-brand-foreground/80"
            >
              <span className="shrink-0" style={{ color: eyeColor }}>
                &bull;
              </span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const RinneganResult = memo(RinneganResultInner);
RinneganResult.displayName = "RinneganResult";
