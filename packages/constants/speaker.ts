/**
 * Speaker Constants
 *
 * Defines speaker types for Monitor page conversation entries.
 * SSOT for all speaker-related identification and display.
 */

import { freezeTokens, TokenLiteral } from "./taxonomy";
import type { EyeId } from "./taxonomy";

export const SpeakerType = freezeTokens({
  OVERSEER: "overseer",
  AGENT: "agent",
  HUMAN: "human",
  SYSTEM: "system",
} as const);

export type SpeakerType = TokenLiteral<typeof SpeakerType>;

/**
 * Combined speaker type includes specific Eyes + generic speakers
 */
export type Speaker = EyeId | SpeakerType;

/**
 * Speaker display names for UI
 */
export const SPEAKER_DISPLAY_NAMES: Readonly<Record<SpeakerType, string>> =
  Object.freeze({
    [SpeakerType.OVERSEER]: "Overseer",
    [SpeakerType.AGENT]: "Agent",
    [SpeakerType.HUMAN]: "Human",
    [SpeakerType.SYSTEM]: "System",
  });

/**
 * Speaker icon identifiers (maps to lucide-react icon names)
 */
export const SPEAKER_ICONS: Readonly<Record<SpeakerType, string>> =
  Object.freeze({
    [SpeakerType.OVERSEER]: "eye",
    [SpeakerType.AGENT]: "bot",
    [SpeakerType.HUMAN]: "user",
    [SpeakerType.SYSTEM]: "settings",
  });

/**
 * Speaker color tokens (references theme color tokens)
 */
export const SPEAKER_COLOR_TOKENS: Readonly<Record<SpeakerType, string>> =
  Object.freeze({
    [SpeakerType.OVERSEER]: "eye-overseer",
    [SpeakerType.AGENT]: "success",
    [SpeakerType.HUMAN]: "warning",
    [SpeakerType.SYSTEM]: "muted",
  });
