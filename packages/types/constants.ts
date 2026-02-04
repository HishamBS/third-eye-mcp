import type { StrictnessLevel } from "./enums";

export const TOOL_NAME = "third_eye_overseer" as const;
export const CLI_BIN = "third-eye-mcp" as const;
export const CLI_EXEC = `bunx ${CLI_BIN}` as const;
export const DATA_DIRECTORY = ".third-eye-mcp" as const;

export type StrictnessPresetId = "casual" | "enterprise" | "security";

export interface StrictnessSettings {
  ambiguityThreshold: number;
  riskThreshold: number; // Threshold for risky operation detection (lower = stricter)
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: number;
}

export interface StrictnessPreset {
  id: StrictnessPresetId;
  name: string;
  description: string;
  settings: StrictnessSettings;
  mangekyoLevel: StrictnessLevel;
}

export const STRICTNESS_PRESETS: Record<StrictnessPresetId, StrictnessPreset> =
  {
    casual: {
      id: "casual",
      name: "Casual",
      description: "Relaxed validation for quick iterations",
      settings: {
        ambiguityThreshold: 50, // Lowered from 60 for better clarity detection
        riskThreshold: 80, // High tolerance - only block extreme danger
        citationCutoff: 50,
        consistencyTolerance: 70,
        mangekyoStrictness: 50,
      },
      mangekyoLevel: "lenient",
    },
    enterprise: {
      id: "enterprise",
      name: "Enterprise",
      description: "Balanced validation for production work",
      settings: {
        ambiguityThreshold: 25, // Lowered from 40 - clear tasks like "JWT auth" should pass
        riskThreshold: 50, // Medium - flag DROP/DELETE/production operations
        citationCutoff: 70,
        consistencyTolerance: 60,
        mangekyoStrictness: 70,
      },
      mangekyoLevel: "standard",
    },
    security: {
      id: "security",
      name: "Security",
      description: "Strict validation for high-assurance systems",
      settings: {
        ambiguityThreshold: 15, // Lowered from 20 for stricter clarity requirements
        riskThreshold: 20, // Strict - confirm any modification operation
        citationCutoff: 90,
        consistencyTolerance: 40,
        mangekyoStrictness: 90,
      },
      mangekyoLevel: "strict",
    },
  } as const;

export const DEFAULT_STRICTNESS_PRESET: StrictnessPresetId = "enterprise";
