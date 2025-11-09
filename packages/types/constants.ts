import type { StrictnessLevel } from './enums';

export const TOOL_NAME = 'third_eye_overseer' as const;
export const CLI_BIN = 'third-eye-mcp' as const;
export const CLI_EXEC = `bunx ${CLI_BIN}` as const;
export const DATA_DIRECTORY = '.third-eye-mcp' as const;

export type StrictnessPresetId = 'casual' | 'enterprise' | 'security';

export interface StrictnessSettings {
  ambiguityThreshold: number;
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

export const STRICTNESS_PRESETS: Record<StrictnessPresetId, StrictnessPreset> = {
  casual: {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed validation for quick iterations',
    settings: {
      ambiguityThreshold: 60,
      citationCutoff: 50,
      consistencyTolerance: 70,
      mangekyoStrictness: 50,
    },
    mangekyoLevel: 'lenient',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Balanced validation for production work',
    settings: {
      ambiguityThreshold: 40,
      citationCutoff: 70,
      consistencyTolerance: 60,
      mangekyoStrictness: 70,
    },
    mangekyoLevel: 'standard',
  },
  security: {
    id: 'security',
    name: 'Security',
    description: 'Strict validation for high-assurance systems',
    settings: {
      ambiguityThreshold: 20,
      citationCutoff: 90,
      consistencyTolerance: 40,
      mangekyoStrictness: 90,
    },
    mangekyoLevel: 'strict',
  },
} as const;

export const DEFAULT_STRICTNESS_PRESET: StrictnessPresetId = 'enterprise';
