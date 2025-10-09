import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Byakugan-specific metadata
export const Inconsistency = z.object({
  type: z.enum(['logical', 'temporal', 'factual', 'scope', 'assumption']),
  severity: z.enum(['minor', 'moderate', 'major', 'critical']),
  description: z.string(),
  conflictingStatements: z.array(z.string()),
  suggestion: z.string(),
});

export const ByakuganMetadata = z.object({
  consistencyScore: z.number().min(0).max(100),
  inconsistenciesFound: z.number(),
  inconsistenciesByType: z.record(z.number()),
  inconsistenciesBySeverity: z.record(z.number()),
  inconsistencies: z.array(Inconsistency),
  assumptions: z.array(z.string()),
  logicalFlaws: z.array(z.string()),
});

export const ByakuganEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('byakugan'),
  data: z.object({
    finalReview: z.record(z.unknown()).optional(),
    overallScore: z.number().min(0).max(100).optional(),
    criticalIssues: z.array(z.string()).optional(),
    minorIssues: z.array(z.string()).optional(),
  }).passthrough(),
});

export type ByakuganEnvelope = z.infer<typeof ByakuganEnvelopeSchema>;

/**
 * Byakugan Eye - Consistency Checker
 * Detects logical inconsistencies, contradictions, and flawed assumptions
 */
/**
 * ByakuganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class ByakuganEye implements BaseEye {
  readonly name = 'byakugan';

  validate(envelope: unknown): envelope is ByakuganEnvelope {
    return ByakuganEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const byakugan = new ByakuganEye();
