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

// NOTE: Eye metadata (names, descriptions, colors) are stored in database (eye_settings table).
// DEFAULT_PIPELINE removed - routing is dynamic via Overseer LLM or AutoRouter analysis.
