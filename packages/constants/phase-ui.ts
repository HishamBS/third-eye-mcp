/**
 * Phase UI Constants - Phase 18
 *
 * SSOT for two-phase operation UI styling and text
 * Per R13: NO magic string literals or style classes
 */

import { freezeTokens, TokenLiteral } from './taxonomy';
import { EyeStageToken } from './taxonomy';

/**
 * CSS class strings for phase badge styling
 * Per R13: Centralized styling constants
 */
export const PHASE_BADGE_COLORS: Record<EyeStageToken, string> = Object.freeze({
  [EyeStageToken.GUIDANCE]: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  [EyeStageToken.VALIDATION]: 'bg-green-500/20 text-green-400 border-green-500/40',
});

/**
 * CSS class strings for phase border accents in timeline
 * Per R13: Centralized styling constants
 */
export const PHASE_BORDER_COLORS: Record<EyeStageToken, string> = Object.freeze({
  [EyeStageToken.GUIDANCE]: 'border-l-4 border-l-blue-500/60',
  [EyeStageToken.VALIDATION]: 'border-l-4 border-l-green-500/60',
});

/**
 * Background colors for phase-coded containers
 * Per R13: Centralized styling constants
 */
export const PHASE_BG_COLORS: Record<EyeStageToken, string> = Object.freeze({
  [EyeStageToken.GUIDANCE]: 'bg-blue-500/5',
  [EyeStageToken.VALIDATION]: 'bg-green-500/5',
});

/**
 * UI text constants for phase configuration in NodeEditModal
 * Per R13: All UI text from SSOT
 */
export const PHASE_CONFIG_TEXT = Object.freeze({
  SECTION_TITLE: 'Phase Configuration',
  SECTION_DESCRIPTION: 'Configure which operational phases this Eye will execute',
  ENABLE_GUIDANCE_LABEL: 'Enable Guidance Phase',
  ENABLE_GUIDANCE_HELP: 'Eye will provide initial analysis and recommendations',
  ENABLE_VALIDATION_LABEL: 'Enable Validation Phase',
  ENABLE_VALIDATION_HELP: 'Eye will validate, review, and approve outputs',
  BOTH_DISABLED_WARNING: 'At least one phase must be enabled',
} as const);

/**
 * UI text for phase badges
 * Per R13: Display text from SSOT
 */
export const PHASE_BADGE_TEXT = Object.freeze({
  GUIDANCE_ARIA_LABEL: 'Guidance phase',
  VALIDATION_ARIA_LABEL: 'Validation phase',
} as const);
