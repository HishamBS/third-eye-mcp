"use client";

import { memo } from "react";
import type { EyeRendererProps } from "./types";
import { isKyuubiData } from "./types";

const ALIGNMENT_FIELDS = [
  "objective",
  "audience",
  "format",
  "tone",
  "constraints",
] as const;

function KyuubiResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isKyuubiData(data)) return null;

  const { briefAlignment, alignmentScore, questions, scopeClarity } = data;

  return (
    <div className="mt-3 space-y-3">
      {/* Alignment checklist */}
      <div className="space-y-1.5">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: eyeColor }}
        >
          Brief Alignment
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {ALIGNMENT_FIELDS.map((field) => {
            const ok = briefAlignment[field];
            return (
              <div key={field} className="flex items-center gap-1.5 text-xs">
                <span
                  className={
                    ok ? "text-semantic-success" : "text-semantic-error"
                  }
                >
                  {ok ? "\u2713" : "\u2717"}
                </span>
                <span className="capitalize text-brand-foreground/80">
                  {field}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score badges */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-semantic-muted">
            Score
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: eyeColor }}
          >
            {alignmentScore}/100
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-semantic-muted">
            Scope Clarity
          </span>
          <div className="w-16 h-1.5 bg-brand-outline/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, scopeClarity)}%`,
                backgroundColor: eyeColor,
              }}
            />
          </div>
          <span className="text-xs text-brand-foreground/70 tabular-nums">
            {scopeClarity}%
          </span>
        </div>
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-semantic-muted uppercase tracking-wider">
            Gaps Identified
          </span>
          {questions.map((q, i) => (
            <div
              key={i}
              className="flex gap-2 text-xs text-brand-foreground/80"
            >
              <span className="font-mono shrink-0" style={{ color: eyeColor }}>
                {i + 1}.
              </span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const KyuubiResult = memo(KyuubiResultInner);
KyuubiResult.displayName = "KyuubiResult";
