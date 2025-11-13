/**
 * Envelope Constants
 *
 * Constants for envelope structure and fields.
 * No string literals or magic numbers allowed.
 */

import { freezeTokens, tokenValues } from "./taxonomy";
import type { TokenLiteral } from "./taxonomy";

/**
 * Envelope field names
 */
export const EnvelopeField = freezeTokens({
  TAG: "tag",
  OK: "ok",
  CODE: "code",
  DATA: "data",
  UI: "ui",
  NEXT: "next",
  TITLE: "title",
  SUMMARY: "summary",
  DETAILS: "details",
  ICON: "icon",
  COLOR: "color",
} as const);

export type EnvelopeField = TokenLiteral<typeof EnvelopeField>;
export const ALL_ENVELOPE_FIELDS = tokenValues(EnvelopeField);

/**
 * Semantic UI colors
 */
export const SemanticColor = freezeTokens({
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  INFO: "info",
  MUTED: "muted",
} as const);

export type SemanticColor = TokenLiteral<typeof SemanticColor>;
export const ALL_SEMANTIC_COLORS = tokenValues(SemanticColor);

/**
 * Emoji icons for UI
 */
export const EmojiIcon = freezeTokens({
  EYE: "🧿",
  SEARCH: "🔍",
  CHECK: "✅",
  WARNING: "⚠️",
  SUCCESS: "🎉",
  CROWN: "👁️",
  PROMPT: "✨",
  PLAN: "📋",
  CODE: "🔍",
  EVIDENCE: "🔬",
  FINAL: "🎉",
} as const);

export type EmojiIcon = TokenLiteral<typeof EmojiIcon>;
export const ALL_EMOJI_ICONS = tokenValues(EmojiIcon);

/**
 * Eye tags (for envelope tag field)
 */
export const EyeTag = freezeTokens({
  OVERSEER: "overseer",
  SHARINGAN: "sharingan",
  KYUUBI: "kyuubi",
  JOGAN: "jogan",
  RINNEGAN: "rinnegan",
  MANGEKYO: "mangekyo",
  TENSEIGAN: "tenseigan",
  BYAKUGAN: "byakugan",
} as const);

export type EyeTag = TokenLiteral<typeof EyeTag>;
export const ALL_EYE_TAGS = tokenValues(EyeTag);
