import { z } from 'zod';

/**
 * Overseer JSON Envelope - Core response format for Third Eye MCP
 *
 * All Eyes must respond with this envelope format for consistent handling
 */
export const Envelope = z.object({
  tag: z.string().describe('Eye identifier (sharingan, rinnegan, tenseigan)'),
  ok: z.boolean().describe('Success status'),
  code: z.string().describe('Status code (OK_*, E_*)'),
  md: z.string().describe('Markdown response content'),
  data: z.record(z.any()).describe('Structured data payload'),
  next: z.string().describe('Next action identifier'),
});

export type Envelope = z.infer<typeof Envelope>;

/**
 * Validate envelope from string JSON
 */
export const validateEnvelope = (s: string): boolean => {
  try {
    const parsed = JSON.parse(s);
    Envelope.parse(parsed);
    return true;
  } catch {
    return false;
  }
};

/**
 * Parse and validate envelope from string
 */
export const parseEnvelope = (s: string): Envelope | null => {
  try {
    const parsed = JSON.parse(s);
    return Envelope.parse(parsed);
  } catch {
    return null;
  }
};

/**
 * Status codes registry
 */
export const StatusCodes = {
  // Success codes
  OK_CLASSIFICATION: 'OK_CLASSIFICATION',
  OK_PLAN: 'OK_PLAN',
  OK_GENERATION: 'OK_GENERATION',
  OK_VALIDATION: 'OK_VALIDATION',

  // Error codes
  E_INVALID_INPUT: 'E_INVALID_INPUT',
  E_PROVIDER_ERROR: 'E_PROVIDER_ERROR',
  E_ROUTING_FAILED: 'E_ROUTING_FAILED',
  E_ENVELOPE_INVALID: 'E_ENVELOPE_INVALID',
  E_TIMEOUT: 'E_TIMEOUT',
  E_RATE_LIMIT: 'E_RATE_LIMIT',
} as const;

export type StatusCode = typeof StatusCodes[keyof typeof StatusCodes];

/**
 * Next action identifiers
 */
export const NextActions = {
  ROUTE_TO_RINNEGAN: 'ROUTE_TO_RINNEGAN',
  ROUTE_TO_TENSEIGAN: 'ROUTE_TO_TENSEIGAN',
  EXECUTE_PLAN: 'EXECUTE_PLAN',
  VALIDATE_OUTPUT: 'VALIDATE_OUTPUT',
  COMPLETE: 'COMPLETE',
  RETRY: 'RETRY',
  FALLBACK: 'FALLBACK',
} as const;

export type NextAction = typeof NextActions[keyof typeof NextActions];