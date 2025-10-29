/**
 * ConversationEntry Component
 *
 * Displays a single conversation entry in the Timeline tab.
 * Professional, strictly-typed, with no hardcoded values.
 */

import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { SpeakerBadge } from './SpeakerBadge';
import { SPEAKER_DISPLAY_NAMES, SpeakerType, type Speaker } from '@third-eye/constants';
import { EYE_DISPLAY_NAMES } from '@third-eye/config/constants';
import type { EyeName } from '@third-eye/types';

export interface ConversationEntryData {
  readonly id: string;
  readonly timestamp: Date;
  readonly speaker: Speaker;
  readonly message: string;
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
  // It's an Eye
  return EYE_DISPLAY_NAMES[speaker as EyeName] || speaker;
}

/**
 * Renders a conversation entry with avatar, name, timestamp, message, and metadata
 */
export function ConversationEntry({ entry, index }: ConversationEntryProps) {
  const speakerName = getSpeakerDisplayName(entry.speaker);

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
            <span className="font-semibold text-sm text-white">
              {speakerName}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {entry.timestamp.toLocaleTimeString()}
            </span>
            {entry.metadata?.code && (
              <span className="text-xs px-2 py-0.5 rounded bg-brand-paper text-slate-400 font-mono">
                {entry.metadata.code}
              </span>
            )}
          </div>

          <div className="rounded-lg bg-brand-paper/60 border border-brand-outline/30 p-3">
            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
              {entry.message}
            </p>

            {entry.metadata?.dataJson && Object.keys(entry.metadata.dataJson).length > 0 && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-400">
                  Technical Data
                </summary>
                <pre className="mt-2 p-2 rounded bg-brand-ink/50 text-slate-400 overflow-x-auto">
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
