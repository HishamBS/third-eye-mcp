import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Jōgan-specific metadata
export const JoganMetadata = z.object({
  primaryIntent: z.enum([
    'create', 'read', 'update', 'delete', 'refactor', 'debug', 'test', 'document',
    'deploy', 'configure', 'analyze', 'optimize', 'secure', 'migrate', 'unknown'
  ]),
  secondaryIntents: z.array(z.string()),
  intentConfidence: z.number().min(0).max(100),
  implicitRequirements: z.array(z.string()), // What they didn't say but probably need
  potentialMisalignment: z.array(z.string()), // Where stated vs. intended might differ
  suggestedScope: z.enum(['minimal', 'moderate', 'comprehensive', 'unclear']),
});

export const JoganEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('jogan'),
  data: z.object({
    primaryIntent: z.string().optional(), // Accept any string (LLM returns uppercase/lowercase/mixed)
    secondaryIntents: z.array(z.string()).optional(),
    intentConfidence: z.number().min(0).max(100).optional(),
    implicitRequirements: z.array(z.string()).optional(),
    potentialMisalignment: z.array(z.string()).optional(),
    suggestedScope: z.string().optional(), // Accept any string
  }).passthrough(), // Allow additional fields
});

export type JoganEnvelope = z.infer<typeof JoganEnvelopeSchema>;

/**
 * Jōgan Eye - Intent Analysis
 * Analyzes the true intent behind requests, detecting misalignment between stated and intended goals
 */
/**
 * JoganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class JoganEye implements BaseEye {
  readonly name = 'jogan';

  validate(envelope: unknown): envelope is JoganEnvelope {
    return JoganEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const jogan = new JoganEye();
