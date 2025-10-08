/**
 * Third Eye MCP - Envelope Response Codes Registry
 *
 * Centralized registry of all status codes used in Eye envelopes.
 * Each code maps to an HTTP-style status code category and includes
 * semantic meaning for proper pipeline routing and error handling.
 *
 * Reference: prompt.md Section 4 (Eyes & Orchestrator)
 */

/**
 * SUCCESS CODES (2xx equivalents)
 * Indicates approval or successful completion
 */
export const SUCCESS_CODES = {
  /**
   * OK - 200 equivalent
   * Eye approved the request without any issues
   * Next action: Continue pipeline
   */
  OK: 'OK',

  /**
   * OK_WITH_NOTES - 201 equivalent
   * Eye approved but has minor suggestions or notes
   * Next action: Continue pipeline with notes logged
   */
  OK_WITH_NOTES: 'OK_WITH_NOTES',
} as const;

/**
 * NEEDS_INPUT CODES (3xx equivalents)
 * Indicates clarification or additional context required
 */
export const NEEDS_INPUT_CODES = {
  /**
   * NEED_CLARIFICATION - 300 equivalent
   * Eye needs user input to proceed (used by Sharingan, Byakugan)
   * Next action: Pause pipeline, await user response
   */
  NEED_CLARIFICATION: 'NEED_CLARIFICATION',

  /**
   * NEED_MORE_CONTEXT - 301 equivalent
   * Eye needs additional context or information (used by Jōgan, Rinnegan, Mangekyō, Tenseigan)
   * Next action: Request more details
   */
  NEED_MORE_CONTEXT: 'NEED_MORE_CONTEXT',

  /**
   * SUGGEST_ALTERNATIVE - 302 equivalent
   * Eye suggests a different approach (used by Prompt Helper)
   * Next action: Present alternative, await decision
   */
  SUGGEST_ALTERNATIVE: 'SUGGEST_ALTERNATIVE',
} as const;

/**
 * REJECTION CODES (4xx equivalents)
 * Indicates request cannot be fulfilled as-is
 */
export const REJECTION_CODES = {
  /**
   * REJECT_AMBIGUOUS - 400 equivalent
   * Request is too ambiguous to process safely (Sharingan)
   * Next action: Fail pipeline with explanation
   */
  REJECT_AMBIGUOUS: 'REJECT_AMBIGUOUS',

  /**
   * REJECT_UNSAFE - 401 equivalent
   * Request contains unsafe or prohibited content (Sharingan)
   * Next action: Fail pipeline immediately
   */
  REJECT_UNSAFE: 'REJECT_UNSAFE',

  /**
   * REJECT_INCOMPLETE - 402 equivalent
   * Missing required information to proceed
   * Next action: Fail pipeline with missing fields list
   */
  REJECT_INCOMPLETE: 'REJECT_INCOMPLETE',

  /**
   * REJECT_INCONSISTENT - 403 equivalent
   * Logically inconsistent request or plan (Byakugan)
   * Next action: Fail pipeline with consistency issues
   */
  REJECT_INCONSISTENT: 'REJECT_INCONSISTENT',

  /**
   * REJECT_NO_EVIDENCE - 404 equivalent
   * Claims lack sufficient supporting evidence (Tenseigan)
   * Next action: Fail pipeline with evidence requirements
   */
  REJECT_NO_EVIDENCE: 'REJECT_NO_EVIDENCE',

  /**
   * REJECT_BAD_PLAN - 405 equivalent
   * Plan is fundamentally flawed (Rinnegan)
   * Next action: Fail pipeline with plan critique
   */
  REJECT_BAD_PLAN: 'REJECT_BAD_PLAN',

  /**
   * REJECT_CODE_ISSUES - 406 equivalent
   * Code has critical issues that must be addressed (Mangekyō)
   * Next action: Fail pipeline with issue list
   */
  REJECT_CODE_ISSUES: 'REJECT_CODE_ISSUES',
} as const;

/**
 * ERROR CODES (5xx equivalents)
 * Indicates internal Eye or system errors
 */
export const ERROR_CODES = {
  /**
   * EYE_ERROR - 500 equivalent
   * Internal error during Eye execution
   * Next action: Log error, attempt recovery or fail gracefully
   */
  EYE_ERROR: 'EYE_ERROR',

  /**
   * EYE_TIMEOUT - 504 equivalent
   * Eye processing exceeded timeout threshold
   * Next action: Log timeout, attempt retry or fail
   */
  EYE_TIMEOUT: 'EYE_TIMEOUT',

  /**
   * INVALID_ENVELOPE - 400 equivalent
   * Malformed response envelope (validation failed)
   * Next action: Log validation error, fail pipeline
   */
  INVALID_ENVELOPE: 'INVALID_ENVELOPE',
} as const;

/**
 * PIPELINE CONTROL CODES
 * Special codes for pipeline orchestration
 */
export const PIPELINE_CODES = {
  /**
   * E_PIPELINE_ORDER - 422 equivalent
   * Eyes called out of order (Order Guard violation)
   * Next action: Fail with order violation details
   */
  E_PIPELINE_ORDER: 'E_PIPELINE_ORDER',
} as const;

/**
 * All envelope codes (unified type)
 */
export const ALL_ENVELOPE_CODES = {
  ...SUCCESS_CODES,
  ...NEEDS_INPUT_CODES,
  ...REJECTION_CODES,
  ...ERROR_CODES,
  ...PIPELINE_CODES,
} as const;

/**
 * Type-safe envelope code union
 */
export type EnvelopeCode = typeof ALL_ENVELOPE_CODES[keyof typeof ALL_ENVELOPE_CODES];

/**
 * HTTP-style status code mapping for problem+json responses
 */
export const ENVELOPE_CODE_TO_HTTP_STATUS: Record<string, number> = {
  // Success (2xx)
  OK: 200,
  OK_WITH_NOTES: 201,

  // Needs Input (300 custom, maps to 400 for HTTP)
  NEED_CLARIFICATION: 400,
  NEED_MORE_CONTEXT: 400,
  SUGGEST_ALTERNATIVE: 400,

  // Client Errors (4xx)
  REJECT_AMBIGUOUS: 400,
  REJECT_UNSAFE: 403,
  REJECT_INCOMPLETE: 422,
  REJECT_INCONSISTENT: 422,
  REJECT_NO_EVIDENCE: 422,
  REJECT_BAD_PLAN: 422,
  REJECT_CODE_ISSUES: 422,
  INVALID_ENVELOPE: 400,

  // Server Errors (5xx)
  EYE_ERROR: 500,
  EYE_TIMEOUT: 504,

  // Pipeline Errors
  E_PIPELINE_ORDER: 422,
};

/**
 * Eye-specific code subsets
 */
export const EYE_CODES = {
  overseer: [SUCCESS_CODES.OK, SUCCESS_CODES.OK_WITH_NOTES, ERROR_CODES.EYE_ERROR],

  sharingan: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    REJECTION_CODES.REJECT_AMBIGUOUS,
    NEEDS_INPUT_CODES.NEED_CLARIFICATION,
  ],

  jogan: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    NEEDS_INPUT_CODES.NEED_MORE_CONTEXT,
    NEEDS_INPUT_CODES.NEED_CLARIFICATION,
  ],

  rinnegan: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    REJECTION_CODES.REJECT_BAD_PLAN,
    NEEDS_INPUT_CODES.NEED_MORE_CONTEXT,
  ],

  byakugan: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    REJECTION_CODES.REJECT_INCONSISTENT,
    NEEDS_INPUT_CODES.NEED_CLARIFICATION,
  ],

  tenseigan: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    REJECTION_CODES.REJECT_NO_EVIDENCE,
    NEEDS_INPUT_CODES.NEED_MORE_CONTEXT,
  ],

  mangekyo: [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    REJECTION_CODES.REJECT_CODE_ISSUES,
    NEEDS_INPUT_CODES.NEED_MORE_CONTEXT,
  ],

  'prompt-helper': [
    SUCCESS_CODES.OK,
    SUCCESS_CODES.OK_WITH_NOTES,
    NEEDS_INPUT_CODES.SUGGEST_ALTERNATIVE,
  ],
} as const;

/**
 * Helper functions
 */

/**
 * Check if code indicates success
 */
export function isSuccessCode(code: string): boolean {
  return code === SUCCESS_CODES.OK || code === SUCCESS_CODES.OK_WITH_NOTES;
}

/**
 * Check if code indicates rejection
 */
export function isRejectionCode(code: string): boolean {
  return code.startsWith('REJECT_');
}

/**
 * Check if code indicates needs input
 */
export function isNeedsInputCode(code: string): boolean {
  return code.startsWith('NEED_') || code === NEEDS_INPUT_CODES.SUGGEST_ALTERNATIVE;
}

/**
 * Check if code indicates error
 */
export function isErrorCode(code: string): boolean {
  return code.startsWith('EYE_') || code === ERROR_CODES.INVALID_ENVELOPE;
}

/**
 * Get HTTP status code for envelope code
 */
export function getHttpStatus(code: string): number {
  return ENVELOPE_CODE_TO_HTTP_STATUS[code] || 500;
}

/**
 * Get human-readable description for code
 */
export function getCodeDescription(code: string): string {
  const descriptions: Record<string, string> = {
    OK: 'Approved without issues',
    OK_WITH_NOTES: 'Approved with minor suggestions',
    REJECT_AMBIGUOUS: 'Request is too ambiguous',
    REJECT_UNSAFE: 'Request contains unsafe content',
    REJECT_INCOMPLETE: 'Missing required information',
    REJECT_INCONSISTENT: 'Logically inconsistent',
    REJECT_NO_EVIDENCE: 'Claims lack evidence',
    REJECT_BAD_PLAN: 'Plan is flawed',
    REJECT_CODE_ISSUES: 'Code has critical issues',
    NEED_CLARIFICATION: 'Need user input',
    NEED_MORE_CONTEXT: 'Need additional context',
    SUGGEST_ALTERNATIVE: 'Suggest different approach',
    EYE_ERROR: 'Internal eye error',
    EYE_TIMEOUT: 'Processing timeout',
    INVALID_ENVELOPE: 'Malformed response envelope',
    E_PIPELINE_ORDER: 'Eyes called out of order',
  };

  return descriptions[code] || 'Unknown code';
}
