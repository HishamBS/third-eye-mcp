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
  eye: z.literal('overseer'),
  metadata: OverseerMetadata.optional(),
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
export class OverseerEye implements BaseEye {
  readonly name = 'overseer';
  readonly description = 'Navigator - Entry point that initializes sessions and guides workflow';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<OverseerEnvelope> {
    try {
      const sessionId = context?.sessionId || `sess-${Date.now().toString(16)}`;

      const summaryLines = [OVERSEER_INTRO];
      if (input && input.trim()) {
        summaryLines.push(`\nGoal noted: \`${input.substring(0, 200)}\`. Overseer will guide; host model must produce deliverables.`);
      }

      const summary = summaryLines.join('\n');

      return {
        eye: 'overseer',
        verdict: 'APPROVED',
        confidence: 1.0,
        summary,
        details: PIPELINE_OVERVIEW,
        reasoning: 'Session initialized. Navigator recommends starting with Sharingan to detect ambiguity.',
        metadata: {
          sessionId,
          pipelinePhase: 'initialization',
          nextEye: 'sharingan',
          instructions: 'BEGIN_WITH_SHARINGAN',
        },
        tags: ['initialization', 'navigator', 'overseer'],
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        eye: 'overseer',
        verdict: 'ERROR',
        confidence: 0,
        summary: 'Overseer initialization failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        reasoning: 'Error occurred during overseer initialization',
        tags: ['error'],
        timestamp: new Date().toISOString(),
      };
    }
  }

  validate(envelope: unknown): envelope is OverseerEnvelope {
    return OverseerEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Overseer, the Navigator Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to initialize sessions and guide agents through the proper workflow.

## Your Role
- You are the REQUIRED entry point - no other Eye will respond until you run
- Initialize session context with unique session ID
- Explain Third Eye's role as oversight, NOT deliverable ownership
- Route to the correct first Eye (usually Sharingan for ambiguity detection)

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "overseer",
  "verdict": "APPROVED",
  "summary": "Brief welcome message",
  "details": "Pipeline overview and next steps",
  "reasoning": "Why this routing decision was made",
  "confidence": 100,
  "metadata": {
    "sessionId": "unique-session-id",
    "pipelinePhase": "initialization",
    "nextEye": "sharingan",
    "instructions": "BEGIN_WITH_SHARINGAN"
  }
}

## Pipeline Guidance
**Standard Flow:**
1. overseer/navigator → Initialize session
2. sharingan/clarify → Check for ambiguity
3. helper/rewrite_prompt → Refine requirements
4. jogan/confirm_intent → Confirm scope and budget

**Code Branch:**
5. rinnegan/plan_requirements → Extract requirements
6. rinnegan/plan_review → Review implementation plan
7. mangekyo/review_scaffold → Check file structure
8. mangekyo/review_impl → Review code implementation
9. mangekyo/review_tests → Validate test coverage
10. mangekyo/review_docs → Check documentation

**Text Branch:**
5. rinnegan/plan_requirements → Extract claims
6. tenseigan/validate_claims → Verify factual accuracy
7. byakugan/consistency_check → Check logical consistency

**Final Gate:**
8. rinnegan/final_approval → All gates must pass

## Key Principles
- Host agent owns ALL deliverables (code, tests, docs)
- Third Eye only provides oversight and approval gates
- Be clear, concise, and authoritative
- Always provide next step guidance`;
  }
}

// Export singleton instance
export const overseer = new OverseerEye();
