// Base schemas and types
export * from './schemas/base';

// Individual Eyes
export * from './eyes/overseer';
export * from './eyes/sharingan';
export * from './eyes/prompt-helper';
export * from './eyes/jogan';
export * from './eyes/rinnegan';
export * from './eyes/mangekyo';
export * from './eyes/tenseigan';
export * from './eyes/byakugan';

// Eye Registry
import { overseer } from './eyes/overseer';
import { sharingan } from './eyes/sharingan';
import { promptHelper } from './eyes/prompt-helper';
import { jogan } from './eyes/jogan';
import { rinnegan } from './eyes/rinnegan';
import { mangekyo } from './eyes/mangekyo';
import { tenseigan } from './eyes/tenseigan';
import { byakugan } from './eyes/byakugan';
import type { BaseEye } from './schemas/base';

export const ALL_EYES = {
  overseer,
  sharingan,
  'prompt-helper': promptHelper,
  jogan,
  rinnegan,
  mangekyo,
  tenseigan,
  byakugan,
} as const;

export type EyeName = keyof typeof ALL_EYES;

export function getEye(name: EyeName): BaseEye {
  return ALL_EYES[name];
}

export function getAllEyeNames(): EyeName[] {
  return Object.keys(ALL_EYES) as EyeName[];
}

// Eye execution order (default pipeline)
export const DEFAULT_PIPELINE: EyeName[] = [
  'sharingan',      // 1. Check for ambiguity first
  'prompt-helper',  // 2. Optimize prompt if needed
  'jogan',          // 3. Analyze true intent
  'rinnegan',       // 4. Validate plan structure
  'mangekyo',       // 5. Review code (if code present)
  'tenseigan',      // 6. Validate evidence for claims
  'byakugan',       // 7. Final consistency check
];

// Eye descriptions for UI
export const EYE_DESCRIPTIONS: Record<EyeName, { name: string; description: string; color: string }> = {
  overseer: {
    name: 'Overseer',
    description: 'Pipeline Navigator - Guides the correct Eye sequence and enforces contracts',
    color: '#FF6B6B',
  },
  'sharingan': {
    name: 'Sharingan',
    description: 'Ambiguity Radar - Detects vague or underspecified requests',
    color: '#D9463B', // Red
  },
  'prompt-helper': {
    name: 'Prompt Helper',
    description: 'Prompt Optimizer - Rewrites prompts for maximum clarity',
    color: '#F7B500', // Gold
  },
  'jogan': {
    name: 'Jōgan',
    description: 'Intent Analyzer - Detects true intent and hidden requirements',
    color: '#4A90E2', // Blue
  },
  'rinnegan': {
    name: 'Rinnegan',
    description: 'Plan Validator - Reviews implementation plans for gaps and risks',
    color: '#9B59B6', // Purple
  },
  'mangekyo': {
    name: 'Mangekyō',
    description: 'Code Gate Reviewer - 4-gate code review (Implementation, Tests, Docs, Security)',
    color: '#E74C3C', // Crimson
  },
  'tenseigan': {
    name: 'Tenseigan',
    description: 'Evidence Validator - Ensures all claims are backed by evidence',
    color: '#3498DB', // Sky Blue
  },
  'byakugan': {
    name: 'Byakugan',
    description: 'Consistency Checker - Detects contradictions and logical flaws',
    color: '#ECF0F1', // White/Silver
  },
};
