/**
 * SpeakerBadge Component
 *
 * Displays speaker avatar with icon and color based on speaker type.
 * Uses SSOT constants for colors and icons - no hardcoded values.
 */

import { DynamicIcon } from "@/components/ui/DynamicIcon";
import {
  SPEAKER_ICONS,
  SPEAKER_COLOR_TOKENS,
  type Speaker,
  SpeakerType,
} from "@third-eye/constants";
import { EYE_COLORS } from "@third-eye/config/constants";
import type { EyeName } from "@third-eye/types";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

export interface SpeakerBadgeProps {
  readonly speaker: Speaker;
  readonly size?: "sm" | "md" | "lg";
}

function getSpeakerIconName(speaker: Speaker): string {
  // Check if it's a generic speaker type
  if (speaker in SpeakerType) {
    return SPEAKER_ICONS[speaker as SpeakerType];
  }
  // It's an Eye, use generic eye icon
  return "eye";
}

function getSpeakerColorClass(speaker: Speaker): string {
  // Check if it's a generic speaker type
  if (speaker in SpeakerType) {
    const token = SPEAKER_COLOR_TOKENS[speaker as SpeakerType];
    // Map tokens to Tailwind classes
    if (token === "success") return STATUS_BG_COLORS.success;
    if (token === "warning") return STATUS_BG_COLORS.warning;
    if (token === "muted") return "bg-brand-outline";
    if (token === "eye-overseer") return "bg-indigo-500";
  }

  // For Eyes, use Eye color from config
  const eyeColor = EYE_COLORS[speaker as EyeName];
  if (eyeColor) {
    // Convert hex to Tailwind-compatible inline style
    // This is a temporary solution - ideally colors should be CSS variables
    return eyeColor;
  }

  // Fallback
  return STATUS_BG_COLORS.info;
}

const SIZE_CLASSES = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
} as const;

const ICON_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
} as const;

/**
 * Renders a speaker badge with icon and appropriate color
 */
export function SpeakerBadge({ speaker, size = "md" }: SpeakerBadgeProps) {
  const iconName = getSpeakerIconName(speaker);
  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];

  const colorValue = getSpeakerColorClass(speaker);
  const isHexColor = colorValue.startsWith("#");

  return (
    <div
      className={`flex-shrink-0 ${sizeClass} rounded-full flex items-center justify-center text-brand-foreground ${
        isHexColor ? "" : colorValue
      }`}
      style={isHexColor ? { backgroundColor: colorValue } : undefined}
    >
      <DynamicIcon name={iconName} size={iconSize} />
    </div>
  );
}
