import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Overseer-specific metadata
export const OverseerMetadata = z.object({
  sessionId: z.string(),
  pipelinePhase: z.enum(['initialization', 'clarification', 'planning', 'review', 'approval']),
  nextEye: z.string().optional(),
  instructions: z.string(),
});

// Overseer envelope extends base
export const OverseerEnvelopeSchema = BaseEnvelopeSchema.extend({
  tag: z.literal('overseer'),
});

export type OverseerEnvelope = z.infer<typeof OverseerEnvelopeSchema>;

const OVERSEER_INTRO = `### Overseer Introduction
Third Eye MCP is an Overseer. Host agents own all deliverables. This navigator is the required entry point; no other eye will respond until it runs.`;

const PIPELINE_OVERVIEW = `### Next Steps
- The MCP bridge auto-populates session context; clients only send payload (and reasoning when required).
- Call sharingan/clarify to score ambiguity and gather questions.
- Use helper/rewrite_prompt to engineer a ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT brief.
- Run jogan/confirm_intent to ensure scope and token budgets are approved.
- Follow the Code branch (Rinnegan + Mangekyō phases) for implementation work.
- Follow the Text branch (Rinnegan -> Tenseigan -> Byakugan) for factual or narrative work.
- Finish with rinnegan/final_approval once every gate returns ok=true.`;

/**
 * Overseer Eye - Navigator
 * Entry point for all Third Eye workflows. Initializes session and guides to next step.
 */
/**
 * OverseerEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class OverseerEye implements BaseEye {
  readonly name = 'overseer';

  validate(envelope: unknown): envelope is OverseerEnvelope {
    return OverseerEnvelopeSchema.safeParse(envelope).success;
  }
}

// Export singleton instance
export const overseer = new OverseerEye();
