/**
 * Eye Icons - SVG Path References
 * 
 * Single Source of Truth for all Eye SVG paths
 * SVG files are located in apps/ui/public/eyes/
 */

import { freezeTokens } from './taxonomy';
import type { TokenLiteral } from './taxonomy';
import { EyeId } from './taxonomy';

export const EyeIconPaths = freezeTokens({
  [EyeId.OVERSEER]: '/eyes/overseer.svg',
  [EyeId.SHARINGAN]: '/eyes/sharingan.svg',
  [EyeId.KYUUBI]: '/eyes/kyuubi.svg',
  [EyeId.JOGAN]: '/eyes/jogan.svg',
  [EyeId.RINNEGAN]: '/eyes/rinnegan.svg',
  [EyeId.MANGEKYO]: '/eyes/mangekyo.svg',
  [EyeId.TENSEIGAN]: '/eyes/tenseigan.svg',
  [EyeId.BYAKUGAN]: '/eyes/byakugan.svg',
} as const);

export type EyeIconPath = TokenLiteral<typeof EyeIconPaths>;
export const ALL_EYE_ICON_PATHS = Object.freeze(Object.values(EyeIconPaths));

/**
 * Get SVG icon path for an eye by ID
 */
export function getEyeIconPath(eyeId: EyeId): string {
  return EyeIconPaths[eyeId] || '';
}

