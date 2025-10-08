import { describe, expect, test } from 'vitest';
import { BaseEnvelopeSchema, legacyToEnvelope } from '../src/schemas/base';
import { buildResponse } from '../shared';
import { EyeTag, StatusCode } from '../constants';

describe('BaseEnvelopeSchema', () => {
  test('accepts next as string', () => {
    const parsed = BaseEnvelopeSchema.parse({
      tag: 'sharingan',
      ok: true,
      code: 'OK',
      md: '# Hi',
      data: {},
      next: 'PROMPT_HELPER',
      next_action: 'PROMPT_HELPER',
    });

    expect(parsed.next).toBe('PROMPT_HELPER');
  });

  test('accepts next as string array', () => {
    const parsed = BaseEnvelopeSchema.parse({
      tag: 'sharingan',
      ok: false,
      code: 'NEED_CLARIFICATION',
      md: '# Need more info',
      data: {},
      next: ['PROMPT_HELPER', 'JOGAN'],
    });

    expect(Array.isArray(parsed.next)).toBe(true);
    expect(parsed.next).toEqual(['PROMPT_HELPER', 'JOGAN']);
  });
});

describe('Envelope helpers', () => {
  test('legacyToEnvelope populates next and next_action', () => {
    const converted = legacyToEnvelope({
      eye: 'overseer',
      code: 'OK',
      verdict: 'APPROVED',
      summary: 'All good',
    });

    expect(converted.next).toBe('CONTINUE');
    expect(converted.next_action).toBe('CONTINUE');
  });

  test('buildResponse mirrors next_action when next omitted', () => {
    const envelope = buildResponse({
      tag: EyeTag.SHARINGAN,
      ok: true,
      code: StatusCode.OK,
      md: '# done',
      data: {},
      next_action: 'PROMPT_HELPER',
    });

    expect(envelope.next_action).toBe('PROMPT_HELPER');
    expect(envelope.next).toBe('PROMPT_HELPER');
  });

  test('buildResponse preserves explicit next', () => {
    const envelope = buildResponse({
      tag: EyeTag.SHARINGAN,
      ok: false,
      code: StatusCode.NEED_CLARIFICATION,
      md: '# wait',
      data: {},
      next_action: 'PROMPT_HELPER',
      next: ['PROMPT_HELPER', 'JOGAN'],
    });

    expect(envelope.next).toEqual(['PROMPT_HELPER', 'JOGAN']);
  });
});
