import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Sharingan-specific metadata
export const SharinganMetadata = z.object({
  ambiguityScore: z.number().min(0).max(100), // 0 = crystal clear, 100 = completely ambiguous
  ambiguousTerms: z.array(z.string()), // List of ambiguous terms found
  missingContext: z.array(z.string()), // What context is missing
  clarifyingQuestions: z.array(z.string()), // Questions to resolve ambiguity
});

// Sharingan envelope extends base
export const SharinganEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('sharingan'),
  data: z.object({
    ambiguityScore: z.number().min(0).max(100).optional(),
    ambiguousTerms: z.array(z.string()).optional(),
    missingContext: z.array(z.string()).optional(),
    clarifyingQuestions: z.array(z.string()).optional(),
  }).passthrough(), // Allow additional fields
});

export type SharinganEnvelope = z.infer<typeof SharinganEnvelopeSchema>;

/**
 * Sharingan Eye - Ambiguity Radar
 * Detects vague, ambiguous, or underspecified requests
 */
/**
 * SharinganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class SharinganEye implements BaseEye {
  readonly name = 'sharingan';

  validate(envelope: unknown): envelope is SharinganEnvelope {
    return SharinganEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const sharingan = new SharinganEye();
