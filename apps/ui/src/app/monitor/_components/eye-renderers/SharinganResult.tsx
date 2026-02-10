"use client";

import { memo } from "react";
import type { EyeRendererProps } from "./types";
import { isSharinganData } from "./types";

function SharinganResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isSharinganData(data)) return null;

  const { ambiguityScore, confidence, questions, resolved } = data;
  const resolvedEntries = Object.entries(resolved ?? {});
  const invertedColor =
    ambiguityScore <= 20
      ? "#10B981"
      : ambiguityScore <= 50
        ? "#F59E0B"
        : "#EF4444";

  return (
    <div className="mt-3 space-y-3">
      {/* Score row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-semantic-muted">
            Ambiguity
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: invertedColor }}
          >
            {ambiguityScore}/100
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-semantic-muted">
            Confidence
          </span>
          <span className="text-sm font-medium text-brand-foreground tabular-nums">
            {confidence}%
          </span>
        </div>
      </div>

      {/* Questions cards */}
      {questions.length > 0 && (
        <div className="space-y-2">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Questions ({questions.length})
          </span>
          {questions.map((q, i) => (
            <div
              key={q.id ?? i}
              className="flex gap-2 rounded-md px-3 py-2 bg-brand-paper"
              style={{ border: `1px dashed ${eyeColor}30` }}
            >
              <span
                className="font-mono text-xs font-semibold shrink-0 mt-0.5"
                style={{ color: eyeColor }}
              >
                {i + 1}.
              </span>
              <span className="text-sm text-brand-foreground/80">{q.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Resolved fields */}
      {resolvedEntries.length > 0 && (
        <div className="space-y-1.5">
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: eyeColor }}
          >
            Resolved
          </span>
          <div className="grid grid-cols-2 gap-2">
            {resolvedEntries.map(([key, value]) => (
              <div key={key} className="flex items-start gap-1.5 text-xs">
                <span className="text-semantic-success mt-0.5 shrink-0">
                  &#10003;
                </span>
                <span>
                  <span className="font-medium text-brand-foreground">
                    {key}:
                  </span>{" "}
                  <span className="text-brand-foreground/70">{value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const SharinganResult = memo(SharinganResultInner);
SharinganResult.displayName = "SharinganResult";
