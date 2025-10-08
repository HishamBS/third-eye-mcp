import { z } from 'zod';

// Status codes for Eye responses
export const EyeStatusCode = z.enum([
  // Generic success codes (200-299)
  'OK',                    // 200: Approved without issues
  'OK_WITH_NOTES',        // 201: Approved with minor suggestions

  // Specific success codes for each Eye
  'OK_NO_CLARIFICATION_NEEDED',
  'OK_INTENT_CONFIRMED',
  'OK_PROMPT_READY',
  'OK_SCHEMA_EMITTED',
  'OK_PLAN_APPROVED',
  'OK_SCAFFOLD_APPROVED',
  'OK_IMPL_APPROVED',
  'OK_TESTS_APPROVED',
  'OK_DOCS_APPROVED',
  'OK_CODE_APPROVED',
  'OK_TEXT_VALIDATED',
  'OK_CONSISTENT',
  'OK_ALL_APPROVED',

  // Generic rejection codes (400-499)
  'REJECT_AMBIGUOUS',     // 400: Request is too ambiguous
  'REJECT_UNSAFE',        // 401: Request contains unsafe content
  'REJECT_INCOMPLETE',    // 402: Missing required information
  'REJECT_INCONSISTENT',  // 403: Logically inconsistent
  'REJECT_NO_EVIDENCE',   // 404: Claims lack evidence
  'REJECT_BAD_PLAN',      // 405: Plan is flawed
  'REJECT_CODE_ISSUES',   // 406: Code has critical issues

  // Specific error codes for each Eye
  'E_NEEDS_CLARIFICATION',
  'E_INTENT_UNCONFIRMED',
  'E_PLAN_INCOMPLETE',
  'E_REASONING_MISSING',
  'E_SCAFFOLD_ISSUES',
  'E_IMPL_ISSUES',
  'E_TESTS_INSUFFICIENT',
  'E_DOCS_MISSING',
  'E_CITATIONS_MISSING',
  'E_CONTRADICTION_DETECTED',
  'E_PHASES_INCOMPLETE',

  // Clarification needed (300-399)
  'NEED_CLARIFICATION',   // 300: Need user input
  'NEED_MORE_CONTEXT',    // 301: Need additional context
  'SUGGEST_ALTERNATIVE',  // 302: Suggest different approach

  // Eye errors (500-599)
  'EYE_ERROR',           // 500: Internal eye error
  'EYE_TIMEOUT',         // 504: Processing timeout
  'INVALID_ENVELOPE'     // 400: Malformed response envelope
]);

export type EyeStatusCodeType = z.infer<typeof EyeStatusCode>;

// Base envelope schema that all Eyes must return
// Conforms to Overseer JSON Envelope format from prompt.md
export const BaseEnvelopeSchema = z.object({
  tag: z.string(), // Eye identifier (sharingan, jogan, rinnegan, etc.)
  ok: z.boolean(), // Success status (true = approved, false = rejected/error)
  code: EyeStatusCode, // Status code (OK, REJECT_*, NEED_*)
  md: z.string().min(1), // Markdown response content (formatted explanation)
  data: z.record(z.unknown()), // Structured data payload (eye-specific data)
  next: z.union([z.string(), z.array(z.string()).min(1)]), // Next action identifier(s)
  next_action: z.string().optional(),
});

export type BaseEnvelope = z.infer<typeof BaseEnvelopeSchema>;

// Legacy envelope fields (for backward compatibility during migration)
export type LegacyEnvelope = {
  eye: string;
  code: EyeStatusCodeType;
  verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
  summary: string;
  details?: string;
  suggestions?: string[];
  confidence?: number;
  metadata?: Record<string, unknown>;
};

// Base Eye interface
export interface BaseEye {
  readonly name: string;
  readonly description: string;
  readonly version: string;


  /**
   * Validate that envelope conforms to this Eye's schema
   */
  validate(envelope: unknown): envelope is BaseEnvelope;

  /**
   * Get persona (system prompt) for this Eye
   */
  getPersona(): string;
}

// Helper to create status code with description
export function createStatusCode(code: EyeStatusCodeType, description: string): { code: EyeStatusCodeType; description: string } {
  return { code, description };
}

// Envelope helpers
export function isApproved(envelope: BaseEnvelope): boolean {
  return envelope.ok && (envelope.code === 'OK' || envelope.code === 'OK_WITH_NOTES');
}

export function isRejected(envelope: BaseEnvelope): boolean {
  return !envelope.ok && envelope.code.startsWith('REJECT_');
}

export function needsInput(envelope: BaseEnvelope): boolean {
  return envelope.code.startsWith('NEED_');
}

// Helper to convert legacy envelope to new format
export function legacyToEnvelope(legacy: LegacyEnvelope): BaseEnvelope {
  return {
    tag: legacy.eye,
    ok: legacy.verdict === 'APPROVED',
    code: legacy.code,
    md: `${legacy.summary}\n\n${legacy.details || ''}`.trim(),
    data: {
      ...(legacy.metadata || {}),
      confidence: legacy.confidence,
      suggestions: legacy.suggestions,
    },
    next: legacy.verdict === 'APPROVED' ? 'CONTINUE' :
          legacy.verdict === 'NEEDS_INPUT' ? 'AWAIT_INPUT' : 'REJECT',
    next_action: legacy.verdict === 'APPROVED' ? 'CONTINUE' :
          legacy.verdict === 'NEEDS_INPUT' ? 'AWAIT_INPUT' : 'REJECT',
  };
}
