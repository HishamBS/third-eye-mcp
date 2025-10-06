import { z } from 'zod';

// Status codes for Eye responses
export const EyeStatusCode = z.enum([
  // Success codes (200-299)
  'OK',                    // 200: Approved without issues
  'OK_WITH_NOTES',        // 201: Approved with minor suggestions

  // Rejection codes (400-499)
  'REJECT_AMBIGUOUS',     // 400: Request is too ambiguous
  'REJECT_UNSAFE',        // 401: Request contains unsafe content
  'REJECT_INCOMPLETE',    // 402: Missing required information
  'REJECT_INCONSISTENT',  // 403: Logically inconsistent
  'REJECT_NO_EVIDENCE',   // 404: Claims lack evidence
  'REJECT_BAD_PLAN',      // 405: Plan is flawed
  'REJECT_CODE_ISSUES',   // 406: Code has critical issues

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
export const BaseEnvelopeSchema = z.object({
  eye: z.string(), // Eye name (sharingan, jogan, etc.)
  code: EyeStatusCode,
  verdict: z.enum(['APPROVED', 'REJECTED', 'NEEDS_INPUT']),
  summary: z.string().min(1).max(500), // Brief explanation
  details: z.string().optional(), // Extended explanation
  suggestions: z.array(z.string()).optional(), // Actionable suggestions
  confidence: z.number().min(0).max(100).optional(), // 0-100 confidence score
  metadata: z.record(z.unknown()).optional() // Eye-specific metadata
});

export type BaseEnvelope = z.infer<typeof BaseEnvelopeSchema>;

// Base Eye interface
export interface BaseEye {
  readonly name: string;
  readonly description: string;
  readonly version: string;

  /**
   * Process request and return structured envelope
   */
  process(input: string, context?: Record<string, any>): Promise<BaseEnvelope>;

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

// Verdict helpers
export function isApproved(envelope: BaseEnvelope): boolean {
  return envelope.verdict === 'APPROVED';
}

export function isRejected(envelope: BaseEnvelope): boolean {
  return envelope.verdict === 'REJECTED';
}

export function needsInput(envelope: BaseEnvelope): boolean {
  return envelope.verdict === 'NEEDS_INPUT';
}
