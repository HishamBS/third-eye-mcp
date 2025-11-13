/**
 * ConversationEntry Component
 *
 * Displays a single conversation entry in the Timeline tab.
 * Professional, strictly-typed, with no hardcoded values.
 * Phase 18: Added phase badge support and color-coded borders
 */

import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { SpeakerBadge } from "./SpeakerBadge";
import { PhaseBadge } from "./PhaseBadge";
import {
  SPEAKER_DISPLAY_NAMES,
  SpeakerType,
  type Speaker,
  PHASE_BORDER_COLORS,
  PHASE_BG_COLORS,
  EyeStageToken,
} from "@third-eye/constants";

export interface ConversationEntryData {
  readonly id: string;
  readonly timestamp: Date;
  readonly speaker: Speaker;
  readonly message: string;
  readonly stage?: "guidance" | "validation";
  readonly metadata?: {
    readonly code?: string;
    readonly dataJson?: Record<string, unknown>;
  };
}

export interface ConversationEntryProps {
  readonly entry: ConversationEntryData;
  readonly index: number;
}

function getSpeakerDisplayName(speaker: Speaker): string {
  // Check if it's a generic speaker type
  if (speaker in SpeakerType) {
    return SPEAKER_DISPLAY_NAMES[speaker as SpeakerType];
  }
  // It's an Eye - use speaker as-is (should be name from database)
  // If display name needed, should be provided from API response
  return speaker;
}

/**
 * Get phase-specific styling classes
 * Per R13: Styling from SSOT
 */
function getPhaseStyles(stage?: "guidance" | "validation") {
  if (!stage) {
    return {
      border: "",
      background: "",
    };
  }

  const stageToken =
    stage === "guidance" ? EyeStageToken.GUIDANCE : EyeStageToken.VALIDATION;
  return {
    border: PHASE_BORDER_COLORS[stageToken],
    background: PHASE_BG_COLORS[stageToken],
  };
}

/**
 * Renders a conversation entry with avatar, name, timestamp, message, and metadata
 * Phase 18: Added phase badge and color-coded styling
 */
export function ConversationEntry({ entry, index }: ConversationEntryProps) {
  const speakerName = getSpeakerDisplayName(entry.speaker);
  const phaseStyles = getPhaseStyles(entry.stage);

  return (
    <motion.div
      key={entry.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="group"
    >
      <div className="flex gap-3">
        <SpeakerBadge speaker={entry.speaker} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-brand-foreground">
              {speakerName}
            </span>
            {entry.stage && <PhaseBadge stage={entry.stage} size="sm" />}
            <span className="text-xs text-semantic-muted flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {entry.timestamp.toLocaleTimeString()}
            </span>
            {entry.metadata?.code && (
              <span className="text-xs px-2 py-0.5 rounded bg-brand-paper text-semantic-muted font-mono">
                {entry.metadata.code}
              </span>
            )}
          </div>

          <div
            className={`rounded-lg bg-brand-paper/60 border border-brand-outline/30 p-3 ${phaseStyles.border} ${phaseStyles.background}`}
          >
            <p className="text-sm text-semantic-muted whitespace-pre-wrap break-words">
              {entry.message}
            </p>

            {entry.metadata?.dataJson &&
              Object.keys(entry.metadata.dataJson).length > 0 && (
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-semantic-muted hover:text-semantic-muted">
                    Technical Data
                  </summary>
                  <pre className="mt-2 p-2 rounded bg-brand-ink/50 text-semantic-muted overflow-x-auto">
                    {JSON.stringify(entry.metadata.dataJson, null, 2)}
                  </pre>
                </details>
              )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
