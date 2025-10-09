import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Prompt Helper metadata
export const PromptHelperMetadata = z.object({
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

export const PromptHelperEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('prompt-helper'),
  data: z.object({
    structuredBrief: z.record(z.unknown()).optional(),
    briefAlignment: z.record(z.unknown()).optional(),
    qualityScore: z.number().min(0).max(100).optional(),
  }).passthrough(),
});

export type PromptHelperEnvelope = z.infer<typeof PromptHelperEnvelopeSchema>;

/**
 * Prompt Helper Eye - Prompt Optimization
 * Rewrites prompts for clarity, specificity, and effectiveness
 */
/**
 * PromptHelperEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class PromptHelperEye implements BaseEye {
  readonly name = 'prompt-helper';

  validate(envelope: unknown): envelope is PromptHelperEnvelope {
    return PromptHelperEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const promptHelper = new PromptHelperEye();
