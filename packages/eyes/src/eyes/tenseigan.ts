import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Tenseigan-specific metadata
export const Claim = z.object({
  claim: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  hasEvidence: z.boolean(),
  evidenceType: z.enum(['data', 'citation', 'example', 'reasoning', 'none']).optional(),
  evidenceQuality: z.enum(['strong', 'moderate', 'weak', 'missing']),
  suggestion: z.string().optional(),
});

export const TenseiganMetadata = z.object({
  evidenceScore: z.number().min(0).max(100),
  totalClaims: z.number(),
  claimsWithEvidence: z.number(),
  claimsWithoutEvidence: z.number(),
  claims: z.array(Claim),
  unsupportedClaims: z.array(z.string()),
});

export const TenseiganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('tenseigan'),
  metadata: TenseiganMetadata.optional(),
});

export type TenseiganEnvelope = z.infer<typeof TenseiganEnvelopeSchema>;

/**
 * Tenseigan Eye - Evidence Validator
 * Validates that all claims are supported by evidence (data, citations, examples, or sound reasoning)
 */
/**
 * TenseiganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class TenseiganEye implements BaseEye {
  readonly name = 'tenseigan';

  validate(envelope: unknown): envelope is TenseiganEnvelope {
    return TenseiganEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const tenseigan = new TenseiganEye();
