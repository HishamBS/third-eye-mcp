/**
 * Eye Persona Resolver - Dynamic Eye Character Resolution
 *
 * Resolves Eye personas with priority:
 * 1. Pipeline custom config (user-defined)
 * 2. Built-in defaults (the 8 we know)
 * 3. Auto-generated fallback (unknown Eyes)
 *
 * This ensures the theatre adapts to ANY cast of characters.
 */

import {
  EYE_PERSONAS,
  isBuiltInEye,
  formatPhrase,
  type EyePersona,
  type VoiceTone,
  type VoiceStyle,
} from "@third-eye/constants";
import type {
  EyePersonaConfig,
  CustomEyeConfig,
  PipelineContext,
  EyeColorPalette,
  EyeVoice,
  EyePhrases,
  EyeAnimationSpeeds,
} from "@third-eye/types";

/**
 * Generate a consistent color from a string hash
 * Used for unknown Eyes to get reproducible colors
 */
export function generateColorFromHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate HSL color with good saturation and lightness
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 8) % 20); // 60-80%
  const lightness = 45 + (Math.abs(hash >> 16) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Convert HSL string to hex
 */
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return "#6b7280"; // gray-500 fallback

  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Generate a color palette from a base color
 */
function generateColorPalette(baseColor: string): EyeColorPalette {
  const hex = baseColor.startsWith("hsl") ? hslToHex(baseColor) : baseColor;

  // Parse hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return {
    primary: hex,
    glow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    bg: `bg-[${hex}]/20`,
    text: `text-[${hex}]`,
    border: `border-[${hex}]/40`,
    hex,
  };
}

/**
 * Format Eye name for display
 * "custom_validator" => "Custom Validator"
 */
export function formatEyeName(eyeId: string): string {
  return eyeId
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generate generic phrases for unknown Eyes
 */
function generateGenericPhrases(eyeId: string): EyePhrases {
  const name = formatEyeName(eyeId);
  return {
    greeting: `${name} is ready to assist...`,
    analyzing: `${name} is analyzing the situation...`,
    complete: `${name} has completed the analysis.`,
    error: `${name} encountered an issue.`,
    processing: `${name} is processing...`,
    waiting: `Awaiting ${name}'s response...`,
  };
}

/**
 * Generate fallback persona for unknown Eyes
 */
function generateFallbackPersona(eyeId: string): EyePersonaConfig {
  const baseColor = generateColorFromHash(eyeId);
  const colorPalette = generateColorPalette(baseColor);

  return {
    id: eyeId,
    name: formatEyeName(eyeId),
    role: "Custom Eye",
    symbol: eyeId.charAt(0).toUpperCase(),
    color: colorPalette,
    voice: {
      tone: "neutral" as VoiceTone,
      style: "professional" as VoiceStyle,
    },
    entranceDirection: "left",
    phrases: generateGenericPhrases(eyeId),
    animationSpeeds: {
      entrance: 600,
      speaking: 1500,
      exit: 500,
    },
    isBuiltIn: false,
  };
}

/**
 * Convert built-in EyePersona to EyePersonaConfig
 */
function builtInToConfig(persona: EyePersona): EyePersonaConfig {
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    symbol: persona.symbol,
    color: persona.color,
    voice: persona.voice,
    entranceDirection: persona.entranceDirection,
    phrases: persona.phrases as unknown as EyePhrases,
    animationSpeeds: persona.animationSpeeds,
    isBuiltIn: true,
  };
}

/**
 * Merge custom config with base persona
 */
function mergeWithCustom(
  base: EyePersonaConfig,
  custom: CustomEyeConfig,
): EyePersonaConfig {
  return {
    ...base,
    name: custom.name ?? base.name,
    role: custom.role ?? base.role,
    color: custom.color ? { ...base.color, ...custom.color } : base.color,
    voice: custom.voice ? { ...base.voice, ...custom.voice } : base.voice,
    phrases: custom.phrases
      ? { ...base.phrases, ...custom.phrases }
      : base.phrases,
  };
}

/**
 * Resolve Eye persona with priority-based lookup
 *
 * Priority order:
 * 1. Pipeline custom config
 * 2. Built-in defaults
 * 3. Auto-generated fallback
 */
export function resolveEyePersona(
  eyeId: string,
  pipelineContext?: PipelineContext,
): EyePersonaConfig {
  // 1. Check pipeline custom config first
  if (pipelineContext?.customEyes?.[eyeId]) {
    const customConfig = pipelineContext.customEyes[eyeId];

    // If there's a built-in base, merge with custom
    if (isBuiltInEye(eyeId)) {
      const builtIn = builtInToConfig(EYE_PERSONAS[eyeId]);
      return mergeWithCustom(builtIn, customConfig);
    }

    // Otherwise, generate fallback and merge
    const fallback = generateFallbackPersona(eyeId);
    return mergeWithCustom(fallback, customConfig);
  }

  // 2. Check built-in defaults
  if (isBuiltInEye(eyeId)) {
    return builtInToConfig(EYE_PERSONAS[eyeId]);
  }

  // 3. Generate fallback for unknown Eyes
  return generateFallbackPersona(eyeId);
}

/**
 * Get persona with formatted dialogue helper
 */
export function getEyePersonaWithHelpers(
  eyeId: string,
  pipelineContext?: PipelineContext,
): {
  persona: EyePersonaConfig;
  formatDialogue: (
    template: string,
    variables: Record<string, string | number>,
  ) => string;
} {
  const persona = resolveEyePersona(eyeId, pipelineContext);

  return {
    persona,
    formatDialogue: (
      template: string,
      variables: Record<string, string | number>,
    ) => formatPhrase(template, variables),
  };
}

/**
 * Get entrance animation config based on direction
 */
export function getEntranceAnimation(
  direction: "left" | "right" | "above" | "below",
) {
  switch (direction) {
    case "left":
      return {
        initial: { x: -200, opacity: 0, scale: 0.8 },
        animate: { x: 0, opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: "easeOut" },
      };
    case "right":
      return {
        initial: { x: 200, opacity: 0, scale: 0.8 },
        animate: { x: 0, opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: "easeOut" },
      };
    case "above":
      return {
        initial: { y: -100, opacity: 0, scale: 1.2 },
        animate: { y: 0, opacity: 1, scale: 1 },
        transition: { duration: 0.8, ease: "easeOut" },
      };
    case "below":
      return {
        initial: { y: 100, opacity: 0, scale: 0.8 },
        animate: { y: 0, opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: "easeOut" },
      };
  }
}

/**
 * Get exit animation config
 */
export function getExitAnimation(
  direction: "left" | "right" | "above" | "below",
) {
  switch (direction) {
    case "left":
      return {
        exit: { x: -200, opacity: 0, scale: 0.8 },
        transition: { duration: 0.4, ease: "easeIn" },
      };
    case "right":
      return {
        exit: { x: 200, opacity: 0, scale: 0.8 },
        transition: { duration: 0.4, ease: "easeIn" },
      };
    case "above":
      return {
        exit: { y: -100, opacity: 0, scale: 1.2 },
        transition: { duration: 0.5, ease: "easeIn" },
      };
    case "below":
      return {
        exit: { y: 100, opacity: 0, scale: 0.8 },
        transition: { duration: 0.4, ease: "easeIn" },
      };
  }
}

/**
 * Check if persona is for a built-in Eye
 */
export function isBuiltInPersona(persona: EyePersonaConfig): boolean {
  return persona.isBuiltIn;
}

/**
 * Get all built-in Eye personas as configs
 */
export function getAllBuiltInPersonas(): EyePersonaConfig[] {
  return Object.values(EYE_PERSONAS).map(builtInToConfig);
}
