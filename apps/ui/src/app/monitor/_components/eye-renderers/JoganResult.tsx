"use client";

import { memo } from "react";
import type { EyeRendererProps } from "./types";
import { isJoganData } from "./types";

const RISK_COLORS: Readonly<Record<string, string>> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#F97316",
  critical: "#EF4444",
};

function JoganResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isJoganData(data)) return null;

  const { intentAnalysis, riskWarning } = data;
  const riskColor = RISK_COLORS[intentAnalysis.riskLevel] ?? RISK_COLORS.medium;

  return (
    <div className="mt-3 space-y-3">
      {/* Intent card */}
      <div
        className="rounded-md px-3 py-2.5 bg-brand-paper"
        style={{ border: `1px solid ${eyeColor}20` }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Intent Analysis
          </span>
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${riskColor}15`,
              color: riskColor,
              border: `1px solid ${riskColor}30`,
            }}
          >
            {intentAnalysis.riskLevel}
          </span>
        </div>

        <div className="text-sm font-medium text-brand-foreground mb-1">
          {intentAnalysis.primary}
        </div>

        {intentAnalysis.secondary && (
          <div className="text-xs text-brand-foreground/60 mb-2">
            Secondary: {intentAnalysis.secondary}
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-brand-paper-elev text-brand-foreground/70 border border-brand-outline/20">
            {intentAnalysis.scope}
          </span>
        </div>

        {/* Deliverables */}
        {intentAnalysis.deliverables.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-semantic-muted uppercase tracking-wider">
              Deliverables
            </span>
            {intentAnalysis.deliverables.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-brand-foreground/80"
              >
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: eyeColor }}
                />
                <span>{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk warning alert */}
      {riskWarning && (
        <div
          className="rounded-md px-3 py-2 text-xs"
          style={{
            backgroundColor: `${riskColor}08`,
            border: `1px solid ${riskColor}30`,
            color: riskColor,
          }}
        >
          <span className="font-medium">Risk: </span>
          {riskWarning}
        </div>
      )}
    </div>
  );
}

export const JoganResult = memo(JoganResultInner);
JoganResult.displayName = "JoganResult";
