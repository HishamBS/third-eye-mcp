"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";

interface QualityScoreRingProps {
  score: number;
  breakdown?: Record<string, number>;
  className?: string;
}

const RING_RADIUS = 52;
const RING_CENTER = 60;
const RING_STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const SCORE_THRESHOLD_HIGH = 80;
const SCORE_THRESHOLD_MID = 60;

function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLD_HIGH) return "rgb(var(--color-success))";
  if (score >= SCORE_THRESHOLD_MID) return "rgb(var(--color-warning))";
  return "rgb(var(--color-error))";
}

function QualityScoreRingComponent({
  score,
  breakdown,
  className,
}: QualityScoreRingProps) {
  const clampedScore = useMemo(
    () => Math.max(0, Math.min(100, score)),
    [score],
  );
  const strokeColor = useMemo(
    () => getScoreColor(clampedScore),
    [clampedScore],
  );
  const dashOffset = useMemo(
    () => CIRCUMFERENCE * (1 - clampedScore / 100),
    [clampedScore],
  );

  const breakdownEntries = useMemo(
    () => (breakdown ? Object.entries(breakdown) : []),
    [breakdown],
  );

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        viewBox={`0 0 ${RING_CENTER * 2} ${RING_CENTER * 2}`}
        className="w-24 h-24"
      >
        {/* Background circle */}
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE_WIDTH}
          className="text-brand-outline/20"
        />
        {/* Progress circle */}
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={RING_STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          className="transition-all duration-500"
        />
        {/* Center score text */}
        <text
          x={RING_CENTER}
          y={RING_CENTER}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-2xl font-bold fill-brand-foreground"
        >
          {clampedScore}
        </text>
      </svg>

      {/* Breakdown rows */}
      {breakdownEntries.length > 0 && (
        <div className="w-full space-y-1.5 px-2">
          {breakdownEntries.map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-semantic-muted flex-1 truncate capitalize">
                {label}
              </span>
              <div className="w-16 h-1.5 bg-brand-outline/20 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, value))}%`,
                    backgroundColor: getScoreColor(value),
                  }}
                />
              </div>
              <span className="text-[10px] text-semantic-muted w-6 text-right font-mono">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const QualityScoreRing = memo(QualityScoreRingComponent);
QualityScoreRing.displayName = "QualityScoreRing";
