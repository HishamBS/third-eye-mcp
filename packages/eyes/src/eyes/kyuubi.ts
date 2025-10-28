import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Kyuubi metadata
export const KyuubiMetadata = z.object({
  originalLength: z.number(),
  optimizedLength: z.number(),
  clarityScore: z.number().min(0).max(100),
  improvements: z.array(z.object({
    category: z.enum(['clarity', 'specificity', 'structure', 'conciseness', 'context']),
    before: z.string(),
    after: z.string(),
    reason: z.string(),
  })),
  rewrittenPrompt: z.string().optional(),
});

export const KyuubiEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('kyuubi'),
  data: z.object({
    structuredBrief: z.record(z.unknown()).optional(),
    briefAlignment: z.record(z.unknown()).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
  }).passthrough(),
});

export type KyuubiEnvelope = z.infer<typeof KyuubiEnvelopeSchema>;

/**
 * Kyuubi Eye - Prompt Optimization
 * Rewrites prompts for clarity, specificity, and effectiveness
 */
/**
 * KyuubiEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class KyuubiEye implements BaseEye {
  readonly name = 'kyuubi';

  validate(envelope: unknown): envelope is KyuubiEnvelope {
    return KyuubiEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const kyuubi = new KyuubiEye();
