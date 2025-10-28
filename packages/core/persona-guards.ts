import {
  CLARIFICATION_FIELD_PROMPTS,
  REQUIRED_CLARIFICATION_FIELDS,
  type ClarificationField,
} from '@third-eye/constants';
import type { BaseEnvelope } from '@third-eye/eyes';

const SHARINGAN_ID = 'sharingan';
const SHARINGAN_GUIDANCE_CODES = new Set<string>([
  'NEED_CLARIFICATION',
  'NEED_MORE_CONTEXT',
  'REJECT_AMBIGUOUS',
]);
const SHARINGAN_APPROVAL_CODES = new Set<string>(['OK_NO_CLARIFICATION_NEEDED']);

type QuestionEntry = string | Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normaliseQuestion = (entry: QuestionEntry): { id: string | null; text: string | null } => {
  if (typeof entry === 'string') {
    return { id: null, text: entry.trim() || null };
  }

  const candidateId = isObject(entry) && typeof entry.id === 'string' ? entry.id.trim() : null;
  const candidateText = (() => {
    if (!isObject(entry)) {
      return null;
    }
    if (typeof entry.text === 'string') {
      return entry.text.trim();
    }
    if (typeof entry.question === 'string') {
      return entry.question.trim();
    }
    if (typeof entry.value === 'string') {
      return entry.value.trim();
    }
    return null;
  })();

  return {
    id: candidateId,
    text: candidateText && candidateText.length > 0 ? candidateText : null,
  };
};

const assertSharinganQuestions = (envelope: BaseEnvelope): void => {
  const data = (envelope.data ?? {}) as Record<string, unknown>;
  const rawQuestions = Array.isArray(data.questions) ? (data.questions as QuestionEntry[]) : [];

  if (rawQuestions.length !== REQUIRED_CLARIFICATION_FIELDS.length) {
    throw new EyeBehaviorError(
      SHARINGAN_ID,
      `questions_missing_canonical_fields_${rawQuestions.length}`,
    );
  }

  REQUIRED_CLARIFICATION_FIELDS.forEach((expectedField: ClarificationField, index: number) => {
    const entry = rawQuestions[index] ?? null;
    const { id, text } = normaliseQuestion(entry);
    const canonicalPrompt = CLARIFICATION_FIELD_PROMPTS[expectedField];

    if (id !== null && id !== expectedField) {
      throw new EyeBehaviorError(
        SHARINGAN_ID,
        `questions_canonical_id_mismatch_${id}_${expectedField}`,
      );
    }

    if (text !== canonicalPrompt) {
      throw new EyeBehaviorError(
        SHARINGAN_ID,
        `questions_canonical_prompt_mismatch_${expectedField}`,
      );
    }
  });
};

const assertSharinganResolution = (envelope: BaseEnvelope): void => {
  const data = (envelope.data ?? {}) as Record<string, unknown>;
  const resolved = isObject(data.resolved) ? (data.resolved as Record<string, unknown>) : null;

  if (!resolved) {
    throw new EyeBehaviorError(SHARINGAN_ID, 'missing_resolution');
  }

  REQUIRED_CLARIFICATION_FIELDS.forEach((field) => {
    const value = resolved[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new EyeBehaviorError(SHARINGAN_ID, `resolved_missing_${field}`);
    }
  });
};

const ensureSharinganBehavior = (envelope: BaseEnvelope): void => {
  if (envelope.tag !== SHARINGAN_ID) {
    throw new EyeBehaviorError(SHARINGAN_ID, `unexpected_tag_${envelope.tag ?? 'unknown'}`);
  }

  if (envelope.ok) {
    if (!SHARINGAN_APPROVAL_CODES.has(envelope.code)) {
      throw new EyeBehaviorError(
        SHARINGAN_ID,
        `approval_status_not_allowed_${envelope.code ?? 'unknown'}`,
      );
    }

    const data = (envelope.data ?? {}) as Record<string, unknown>;
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      throw new EyeBehaviorError(SHARINGAN_ID, 'questions_present_on_approval');
    }

    assertSharinganResolution(envelope);
    return;
  }

  if (!SHARINGAN_GUIDANCE_CODES.has(envelope.code)) {
    throw new EyeBehaviorError(
      SHARINGAN_ID,
      `clarification_status_not_allowed_${envelope.code ?? 'unknown'}`,
    );
  }

  assertSharinganQuestions(envelope);
};

export class EyeBehaviorError extends Error {
  readonly eyeId: string;
  readonly reason: string;

  constructor(eyeId: string, reason: string) {
    super(`Eye "${eyeId}" violated persona contract: ${reason}`);
    this.eyeId = eyeId;
    this.reason = reason;
  }
}

export const ensureEyeBehavior = (eyeId: string, envelope: BaseEnvelope): void => {
  switch (eyeId) {
    case SHARINGAN_ID:
      ensureSharinganBehavior(envelope);
      break;
    default:
      break;
  }
};
