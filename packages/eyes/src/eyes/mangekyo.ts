import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Mangekyō has 4 gates: Implementation, Tests, Documentation, Security
export const CodeGate = z.enum(['implementation', 'tests', 'documentation', 'security']);

export const GateResult = z.object({
  gate: CodeGate,
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.object({
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    message: z.string(),
    line: z.number().optional(),
    suggestion: z.string().optional(),
  })),
});

export const MangekyoMetadata = z.object({
  overallScore: z.number().min(0).max(100),
  gates: z.array(GateResult),
  passedGates: z.number(),
  totalGates: z.literal(4),
  codeLanguage: z.string().optional(),
  linesAnalyzed: z.number(),
});

export const MangekyoEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('mangekyo'),
  metadata: MangekyoMetadata.optional(),
});

export type MangekyoEnvelope = z.infer<typeof MangekyoEnvelopeSchema>;

/**
 * Mangekyō Eye - Code Review (4 Gates)
 * Reviews code through 4 gates: Implementation, Tests, Documentation, Security
 */
/**
 * MangekyoEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class MangekyoEye implements BaseEye {
  readonly name = 'mangekyo';

  validate(envelope: unknown): envelope is MangekyoEnvelope {
    return MangekyoEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const mangekyo = new MangekyoEye();
