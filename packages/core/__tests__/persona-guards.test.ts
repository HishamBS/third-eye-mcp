import { describe, expect, it } from 'vitest';
import {
  CLARIFICATION_FIELD_PROMPTS,
  REQUIRED_CLARIFICATION_FIELDS,
  type ClarificationField,
} from '@third-eye/constants';
import type { BaseEnvelope } from '@third-eye/eyes';
import { ensureEyeBehavior, EyeBehaviorError } from '../persona-guards';

const canonicalQuestions = REQUIRED_CLARIFICATION_FIELDS.map((field) => ({
  id: field,
  text: CLARIFICATION_FIELD_PROMPTS[field],
}));

const buildBaseEnvelope = (overrides: Partial<BaseEnvelope>): BaseEnvelope => ({
  tag: 'sharingan',
  ok: false,
  code: 'NEED_CLARIFICATION',
  md: '## Clarification Needed\nCollecting canonical clarification answers.',
  data: {
    summary: 'Missing clarification responses.',
    questions: canonicalQuestions,
    ...(overrides.data ?? {}),
  },
  next: 'AWAIT_INPUT',
  ...overrides,
});

describe('persona-guards – Sharingan', () => {
  it('accepts canonical clarification payloads', () => {
    const envelope = buildBaseEnvelope({});

    expect(() => ensureEyeBehavior('sharingan', envelope)).not.toThrow();
  });

  it('rejects when any canonical prompt text is modified', () => {
    const mutated = buildBaseEnvelope({
      data: {
        summary: 'Missing fields',
        questions: canonicalQuestions.map((entry, index) =>
          index === 0 ? { ...entry, text: 'Who is this for exactly?' } : entry,
        ),
      },
    });

    expect(() => ensureEyeBehavior('sharingan', mutated)).toThrow(EyeBehaviorError);
  });

  it('rejects when ids are altered', () => {
    const mutated = buildBaseEnvelope({
      data: {
        summary: 'Missing fields',
        questions: canonicalQuestions.map((entry, index) =>
          index === 1 ? { ...entry, id: 'aud' } : entry,
        ),
      },
    });

    expect(() => ensureEyeBehavior('sharingan', mutated)).toThrow(EyeBehaviorError);
  });

  it('rejects approval envelopes that keep clarification questions', () => {
    const approval = buildBaseEnvelope({
      ok: true,
      code: 'OK_NO_CLARIFICATION_NEEDED',
      data: {
        summary: 'Clarity locked',
        resolved: REQUIRED_CLARIFICATION_FIELDS.reduce<Record<ClarificationField, string>>(
          (accumulator, field) => {
            accumulator[field] = `${field} resolved`;
            return accumulator;
          },
          {} as Record<ClarificationField, string>,
        ),
        questions: canonicalQuestions,
      },
      next: 'kyuubi',
    });

    expect(() => ensureEyeBehavior('sharingan', approval)).toThrow(EyeBehaviorError);
  });

  it('rejects approval envelopes missing resolved canonical fields', () => {
    const approval = buildBaseEnvelope({
      ok: true,
      code: 'OK_NO_CLARIFICATION_NEEDED',
      data: {
        summary: 'Clarity locked',
        resolved: {
          audience: 'Stakeholders',
        },
      },
      next: 'kyuubi',
    });

    expect(() => ensureEyeBehavior('sharingan', approval)).toThrow(EyeBehaviorError);
  });
});
