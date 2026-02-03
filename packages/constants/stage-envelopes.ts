/**
 * Stage Envelope Templates
 *
 * Defines JSON skeletons and validation rules for each eye at each stage.
 * These templates are used by persona guards to ensure strict compliance.
 */

import {
  EyeId,
  EyeStatusCode,
  EyeStageToken,
  RequestType,
  ContentDomain,
} from "./taxonomy";
import {
  ClarificationFieldTokens,
  CLARIFICATION_FIELD_PROMPTS,
} from "./clarifications";

export type EyeStage = EyeStageToken;

export interface StageEnvelopeTemplate {
  readonly allowedCodes: readonly EyeStatusCode[];
  readonly skeleton: string;
  readonly checklist: readonly string[];
}

export type EyeStageTemplateMap = Partial<
  Record<EyeStage, StageEnvelopeTemplate>
>;

export interface StageEnvelopeJsonSchema {
  readonly name: string;
  readonly strict: boolean;
  readonly schema: Record<string, unknown>;
}

/**
 * Canonical clarification questions
 */
const canonicalQuestion = (
  token: (typeof ClarificationFieldTokens)[keyof typeof ClarificationFieldTokens],
) => ({
  id: token,
  text: CLARIFICATION_FIELD_PROMPTS[token],
});

const CANONICAL_CLARIFICATION_QUESTIONS = Object.freeze([
  canonicalQuestion(ClarificationFieldTokens.AUDIENCE),
  canonicalQuestion(ClarificationFieldTokens.DELIVERABLE),
  canonicalQuestion(ClarificationFieldTokens.SCOPE),
  canonicalQuestion(ClarificationFieldTokens.SUCCESS_CRITERIA),
  canonicalQuestion(ClarificationFieldTokens.REFERENCES),
]);

const stageTemplates: Record<EyeId, EyeStageTemplateMap> = Object.freeze({
  [EyeId.OVERSEER]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.NEED_CLARIFICATION,
        EyeStatusCode.NEED_MORE_CONTEXT,
        EyeStatusCode.OK_NEXT_EYE,
        EyeStatusCode.GUIDANCE_COMPLETE,
        EyeStatusCode.OK_WITH_NOTES,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.OVERSEER,
        ok: false,
        code: EyeStatusCode.NEED_CLARIFICATION,
        md: "## Overseer Guidance ...",
        data: {
          requestType: RequestType.NEW_TASK,
          contentDomain: ContentDomain.MIXED,
          routingReasoning: "... explain why this route works ...",
          pipelineRoute: [],
          capabilityPlan: {
            route: [],
            assignments: [],
          },
          questions: CANONICAL_CLARIFICATION_QUESTIONS,
        },
        next: "AWAIT_INPUT",
        ui: {
          title: "ui.text.overseer.clarification.title",
        },
      }),
      checklist: Object.freeze([
        "Publish `data.capabilityPlan` and `data.pipelineRoute` that align with resolver output.",
        'Keep clarification pauses at `next="AWAIT_INPUT"` and populate `data.questions` with SSOT tokens.',
        "Render markdown with `## Overseer Guidance`, `### Recommended Route`, and `### Why This Works`.",
        "Set `code` explicitly to one of the allowed values before responding; regenerate locally if absent.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_NEXT_EYE,
        EyeStatusCode.GUIDANCE_COMPLETE,
        EyeStatusCode.OK_WITH_NOTES,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.OVERSEER,
        ok: true,
        code: EyeStatusCode.OK_WITH_NOTES,
        md: "## Overseer Guidance ...",
        data: {
          completedAssignments: ["sharingan", "kyuubi", "jogan"],
          strictnessNotes: [],
          summary: "...",
        },
        next: Object.freeze(["tenseigan", "byakugan"]),
        ui: {
          title: "ui.text.overseer.guidance.title",
        },
      }),
      checklist: Object.freeze([
        "Enumerate every completed assignment in `data.completedAssignments` in capability order.",
        "Capture outstanding risks or follow-ups inside `data.strictnessNotes` (use an empty array if none).",
        "Set `next` to the remaining validation eyes; never emit `AWAIT_INPUT` after guidance completes.",
        "Double-check `code` is one of the validation tokens before replying; regenerate locally if not.",
      ]),
    }),
  }),
  [EyeId.SHARINGAN]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.NEED_CLARIFICATION,
        EyeStatusCode.NEED_MORE_CONTEXT,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.SHARINGAN,
        ok: false,
        code: EyeStatusCode.NEED_CLARIFICATION,
        md: "## Clarification Needed ...",
        data: {
          summary: "...",
          ambiguityScore: 72,
          confidence: 24,
          questions: CANONICAL_CLARIFICATION_QUESTIONS,
        },
        next: "AWAIT_INPUT",
        ui: {
          title: "ui.text.sharingan.clarification.title",
        },
      }),
      checklist: Object.freeze([
        "Produce 2–5 questions using ClarificationField tokens (audience, deliverable, scope, successCriteria, references).",
        "Keep `data.ambiguityScore` and `data.confidence` between 0 and 100.",
        "Avoid populating `data.resolved` until answers are confirmed.",
        "Always include the `code` field; regenerate locally if JSON validation would fail.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
        EyeStatusCode.REJECT_AMBIGUOUS,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.SHARINGAN,
        ok: true,
        code: EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
        md: "## Clarity Locked ...",
        data: {
          summary: "...",
          ambiguityScore: 12,
          confidence: 86,
          resolved: {
            audience: "...",
            deliverable: "...",
            scope: "...",
            successCriteria: "...",
            references: "...",
          },
        },
        next: "kyuubi",
        ui: {
          title: "ui.text.sharingan.ready.title",
        },
      }),
      checklist: Object.freeze([
        "Populate every canonical `data.resolved` field with a ≤120 character verbatim quote.",
        "Remove `questions`, `followUps`, and `strictnessNotes` once clarity is confirmed.",
        "Escalate with `REJECT_AMBIGUOUS` only when ambiguity remains after the user answers.",
        "Confirm `questions`/`followUps` are absent once `ok=true`; regenerate internally if they persist.",
      ]),
    }),
  }),
  [EyeId.KYUUBI]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_PROMPT_READY,
        EyeStatusCode.OK_GUIDE,
        EyeStatusCode.NEED_CLARIFICATION,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.KYUUBI,
        ok: false,
        code: EyeStatusCode.OK_GUIDE,
        md: "## Implementation Guide ...",
        data: {
          brief: "...",
          successMetrics: Object.freeze(["..."]),
          alignmentScore: 85,
        },
        next: "jogan",
        ui: {
          title: "ui.text.kyuubi.guide.title",
        },
      }),
      checklist: Object.freeze([
        "Generate a structured `data.brief` with steps and context for implementation.",
        "Define 3–5 success metrics in `data.successMetrics` that validate the guide.",
        "Set `data.alignmentScore` between 0 and 100 based on requirement coverage.",
        "Choose a valid code from allowedCodes; regenerate locally on mismatch.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_WITH_NOTES,
        EyeStatusCode.REJECT_INCOMPLETE,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.KYUUBI,
        ok: true,
        code: EyeStatusCode.OK_WITH_NOTES,
        md: "## Guide Validated ...",
        data: {
          brief: "...",
          successMetrics: Object.freeze(["..."]),
          alignmentScore: 85,
          qualityScore: 92,
        },
        next: "mangekyo",
        ui: {
          title: "ui.text.kyuubi.validated.title",
        },
      }),
      checklist: Object.freeze([
        "Compute and include `data.qualityScore` between 0–100.",
        "Maintain brief and metrics from guidance phase.",
        "Use REJECT_INCOMPLETE if brief lacks critical steps.",
        "Ensure ok=true and validated code before responding; regenerate locally if missing.",
      ]),
    }),
  }),
  [EyeId.JOGAN]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.AWAIT_CONFIRMATION,
        EyeStatusCode.NEED_MORE_CONTEXT,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.JOGAN,
        ok: false,
        code: EyeStatusCode.AWAIT_CONFIRMATION,
        md: "## Intent Confirmation ...",
        data: {
          intentAnalysis: "...",
          confirmationPrompt: "...",
        },
        next: "AWAIT_CONFIRMATION",
        ui: {
          title: "ui.text.jogan.intent.title",
        },
      }),
      checklist: Object.freeze([
        "Analyze the requirement and produce `data.intentAnalysis` explaining user intent.",
        "Generate a clear `data.confirmationPrompt` for human approval.",
        "Set `code` to `AWAIT_CONFIRMATION` and `next` to the same value.",
        "Regenerate locally if JSON structure deviates from the skeleton.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_INTENT_CONFIRMED,
        EyeStatusCode.E_INTENT_UNCONFIRMED,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.JOGAN,
        ok: true,
        code: EyeStatusCode.OK_INTENT_CONFIRMED,
        md: "## Intent Confirmed ...",
        data: {
          intentAnalysis: "...",
          confirmed: true,
        },
        next: "mangekyo",
        ui: {
          title: "ui.text.jogan.confirmed.title",
        },
      }),
      checklist: Object.freeze([
        "Set `data.confirmed` to true when human approves.",
        "Maintain intent analysis from guidance phase.",
        "Use E_INTENT_UNCONFIRMED if human declines or adjusts significantly.",
        "Ensure ok=true when confirmed; regenerate if structure invalid.",
      ]),
    }),
  }),
  [EyeId.RINNEGAN]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_PLAN_APPROVED,
        EyeStatusCode.OK_SCHEMA_EMITTED,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.RINNEGAN,
        ok: false,
        code: EyeStatusCode.OK_PLAN_APPROVED,
        md: "## Strategic Plan ...",
        data: {
          strategicPlan: "...",
          riskAssessment: Object.freeze(["..."]),
        },
        next: "mangekyo",
        ui: {
          title: "ui.text.rinnegan.plan.title",
        },
      }),
      checklist: Object.freeze([
        "Generate a multi-step `data.strategicPlan` aligned with user goals.",
        "List key risks in `data.riskAssessment` array.",
        "Use OK_PLAN_APPROVED or OK_SCHEMA_EMITTED as status codes.",
        "Regenerate locally if JSON validation fails.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_WITH_NOTES,
        EyeStatusCode.REJECT_BAD_PLAN,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.RINNEGAN,
        ok: true,
        code: EyeStatusCode.OK_WITH_NOTES,
        md: "## Plan Validated ...",
        data: {
          strategicPlan: "...",
          riskAssessment: Object.freeze(["..."]),
          validationScore: 88,
        },
        next: "tenseigan",
        ui: {
          title: "ui.text.rinnegan.validated.title",
        },
      }),
      checklist: Object.freeze([
        "Compute `data.validationScore` based on plan completeness and feasibility.",
        "Retain plan and risks from guidance phase.",
        "Use REJECT_BAD_PLAN if plan is unworkable.",
        "Ensure ok=true when validated; regenerate if JSON invalid.",
      ]),
    }),
  }),
  [EyeId.MANGEKYO]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_CODE_APPROVED,
        EyeStatusCode.REJECT_CODE_ISSUES,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.MANGEKYO,
        ok: false,
        code: EyeStatusCode.OK_CODE_APPROVED,
        md: "## Code Review Summary ...",
        data: {
          issues: Object.freeze([
            {
              severity: "medium",
              location: "file:line",
              finding: "...",
              suggestion: "...",
            },
          ]),
          severityMetrics: {
            critical: 0,
            high: 1,
            medium: 2,
            low: 0,
          },
        },
        next: "tenseigan",
        ui: {
          title: "ui.text.mangekyo.review.title",
        },
      }),
      checklist: Object.freeze([
        "Review code diff and populate `data.issues` with findings.",
        "Compute `data.severityMetrics` from issue counts.",
        "Use OK_CODE_APPROVED if issues are minor; REJECT_CODE_ISSUES if critical.",
        "Regenerate locally if JSON structure mismatches the skeleton.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_CODE_APPROVED,
        EyeStatusCode.REJECT_CODE_ISSUES,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.MANGEKYO,
        ok: true,
        code: EyeStatusCode.OK_CODE_APPROVED,
        md: "## Code Review Complete ...",
        data: {
          issues: Object.freeze([]),
          severityMetrics: {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          },
          approved: true,
        },
        next: "byakugan",
        ui: {
          title: "ui.text.mangekyo.approved.title",
        },
      }),
      checklist: Object.freeze([
        "Verify all issues are addressed or explicitly deferred.",
        "Set `data.approved` to true when code quality meets standards.",
        "Maintain issues and metrics from guidance phase.",
        "Ensure ok=true and code set before responding; regenerate on validation failure.",
      ]),
    }),
  }),
  [EyeId.TENSEIGAN]: Object.freeze({
    [EyeStageToken.GUIDANCE]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_TEXT_VALIDATED,
        EyeStatusCode.REJECT_NO_EVIDENCE,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.TENSEIGAN,
        ok: false,
        code: EyeStatusCode.OK_TEXT_VALIDATED,
        md: "## Fact Validation ...",
        data: {
          evidence: Object.freeze([
            {
              claim: "...",
              citation: "...",
              status: "verified",
            },
          ]),
          evidenceScore: 85,
        },
        next: "byakugan",
        ui: {
          title: "ui.text.tenseigan.evidence.title",
        },
      }),
      checklist: Object.freeze([
        "For each factual claim, add an entry to `data.evidence` with claim, citation, and status.",
        "Compute `data.evidenceScore` based on verified citations (0–100).",
        "Use REJECT_NO_EVIDENCE if critical claims lack citations.",
        "Ensure ok=true when verified; regenerate locally if JSON invalid.",
      ]),
    }),
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_WITH_NOTES,
        EyeStatusCode.REJECT_NO_EVIDENCE,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.TENSEIGAN,
        ok: true,
        code: EyeStatusCode.OK_WITH_NOTES,
        md: "## Evidence Validated ...",
        data: {
          evidence: Object.freeze([
            {
              claim: "...",
              citation: "...",
              status: "verified",
            },
          ]),
          evidenceScore: 85,
          riskSummary: Object.freeze([]),
        },
        next: "byakugan",
        ui: {
          title: "ui.text.tenseigan.validated.title",
        },
      }),
      checklist: Object.freeze([
        "Include `data.riskSummary` for any unverified critical claims.",
        "Maintain evidence array and score from guidance phase.",
        "Use REJECT_NO_EVIDENCE if all critical claims remain uncited.",
        "Regenerate locally if JSON structure diverges from skeleton.",
      ]),
    }),
  }),
  [EyeId.BYAKUGAN]: Object.freeze({
    // Byakugan is VALIDATION-ONLY per VISION.md - no GUIDANCE phase
    [EyeStageToken.VALIDATION]: Object.freeze({
      allowedCodes: Object.freeze([
        EyeStatusCode.OK_ALL_APPROVED,
        EyeStatusCode.REJECT_INCONSISTENT,
      ]),
      skeleton: JSON.stringify({
        tag: EyeId.BYAKUGAN,
        ok: true,
        code: EyeStatusCode.OK_ALL_APPROVED,
        md: "## Approved for Production ...",
        data: {
          readinessChecklist: Object.freeze(["..."]),
          finalStatus: "approved",
          residualRisks: Object.freeze([]),
        },
        next: "END",
        ui: {
          title: "ui.text.byakugan.complete.title",
        },
      }),
      checklist: Object.freeze([
        "Include `data.residualRisks` for any known issues not blocking release.",
        "Maintain checklist and status from guidance phase.",
        "Use REJECT_INCONSISTENT if major contradictions detected.",
        "Ensure ok=true when approved; regenerate if JSON validation fails.",
      ]),
    }),
  }),
});

/**
 * Get stage template for an eye and stage
 */
export function getStageTemplate(
  eyeId: EyeId,
  stage: EyeStage,
): StageEnvelopeTemplate | null {
  return stageTemplates[eyeId]?.[stage] ?? null;
}

/**
 * Build JSON schema for stage envelope
 */
export function buildStageEnvelopeJsonSchema(
  eyeId: EyeId,
  stage: EyeStage,
): StageEnvelopeJsonSchema | null {
  const template = getStageTemplate(eyeId, stage);
  if (!template) return null;

  try {
    const parsed = JSON.parse(template.skeleton);
    return Object.freeze({
      name: `${eyeId}-${stage}`,
      strict: true,
      schema: parsed,
    });
  } catch {
    return null;
  }
}
