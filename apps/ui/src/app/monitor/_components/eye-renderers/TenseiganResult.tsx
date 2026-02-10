"use client";

import { memo } from "react";
import type { EyeRendererProps } from "./types";
import { isTenseiganData } from "./types";

function TenseiganResultInner({ data, eyeColor }: EyeRendererProps) {
  if (!isTenseiganData(data)) return null;

  const { evidenceReview, citationQuality, evidenceScore, unsupported } = data;

  return (
    <div className="mt-3 space-y-3">
      {/* Evidence score */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: eyeColor }}
        >
          Evidence Review
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{
            color:
              evidenceScore >= 80
                ? "#10B981"
                : evidenceScore >= 50
                  ? "#F59E0B"
                  : "#EF4444",
          }}
        >
          {evidenceScore}/100
        </span>
      </div>

      {/* 3 stat boxes */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Total", evidenceReview.totalClaims, eyeColor],
            ["Cited", evidenceReview.citedClaims, "#10B981"],
            [
              "Uncited",
              evidenceReview.uncitedClaims,
              evidenceReview.uncitedClaims > 0 ? "#F59E0B" : "#10B981",
            ],
          ] as const
        ).map(([label, value, color]) => (
          <div
            key={label}
            className="rounded-md px-3 py-2 bg-brand-paper border border-brand-outline/20 text-center"
          >
            <div className="text-lg font-bold tabular-nums" style={{ color }}>
              {value}
            </div>
            <div className="text-[10px] text-semantic-muted uppercase tracking-wider">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Citation quality 2x2 grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {(Object.entries(citationQuality) as Array<[string, boolean]>).map(
          ([key, ok]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span
                className={ok ? "text-semantic-success" : "text-semantic-error"}
              >
                {ok ? "\u2713" : "\u2717"}
              </span>
              <span className="text-brand-foreground/80 capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
            </div>
          ),
        )}
      </div>

      {/* Unsupported claims */}
      {unsupported.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-semantic-warning uppercase tracking-wider font-medium">
            Unsupported Claims ({unsupported.length})
          </span>
          {unsupported.map((claim, i) => (
            <div
              key={i}
              className="flex gap-2 text-xs text-semantic-warning/80 rounded-md px-2 py-1.5 bg-semantic-warning/5 border border-semantic-warning/20"
            >
              <span className="shrink-0">!</span>
              <span>{claim}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const TenseiganResult = memo(TenseiganResultInner);
TenseiganResult.displayName = "TenseiganResult";
