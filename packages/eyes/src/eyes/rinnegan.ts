import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Rinnegan-specific metadata
export const RinneganMetadata = z.object({
  planQualityScore: z.number().min(0).max(100),
  hasSteps: z.boolean(),
  stepCount: z.number(),
  hasSuccessCriteria: z.boolean(),
  hasRollback: z.boolean(),
  hasDependencies: z.boolean(),
  hasTimeEstimates: z.boolean(),
  criticalGaps: z.array(z.string()),
  riskFactors: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
  })),
});

export const RinneganEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('rinnegan'),
  data: z.object({
    planQualityScore: z.number().min(0).max(100).optional(),
    hasSteps: z.boolean().optional(),
    stepCount: z.number().optional(),
    hasSuccessCriteria: z.boolean().optional(),
    hasRollback: z.boolean().optional(),
    hasDependencies: z.boolean().optional(),
    hasTimeEstimates: z.boolean().optional(),
    criticalGaps: z.array(z.string()).optional(),
    riskFactors: z.array(z.object({
      risk: z.string(),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      mitigation: z.string(),
    })).optional(),
  }).passthrough(), // Allow additional fields
});

export type RinneganEnvelope = z.infer<typeof RinneganEnvelopeSchema>;

/**
 * Rinnegan Eye - Plan Reviewer
 * Validates implementation plans for completeness, feasibility, and risk management
 */
/**
 * RinneganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class RinneganEye implements BaseEye {
  readonly name = 'rinnegan';

  validate(envelope: unknown): envelope is RinneganEnvelope {
    return RinneganEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const rinnegan = new RinneganEye();
