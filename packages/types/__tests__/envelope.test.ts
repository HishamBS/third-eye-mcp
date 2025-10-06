import { describe, test, expect } from 'vitest';
import {
  validateEnvelope,
  parseEnvelope,
  Envelope,
  StatusCodes,
  NextActions
} from '../envelope';
import type { Envelope as EnvelopeType } from '../envelope';

describe('Envelope Validation', () => {
  test('should validate valid envelope JSON', () => {
    const validEnvelope = JSON.stringify({
      tag: 'sharingan',
      ok: true,
      code: 'OK_GENERATION',
      md: '# Success\n\nGenerated code',
      data: { language: 'typescript' },
      next: 'COMPLETE'
    });

    expect(validateEnvelope(validEnvelope)).toBe(true);
  });

  test('should reject invalid envelope JSON', () => {
    const invalidEnvelope = JSON.stringify({
      tag: 'sharingan',
      ok: true,
      // missing required fields
    });

    expect(validateEnvelope(invalidEnvelope)).toBe(false);
  });

  test('should reject malformed JSON', () => {
    const malformedJson = '{ invalid json }';
    expect(validateEnvelope(malformedJson)).toBe(false);
  });

  test('should reject non-envelope JSON', () => {
    const nonEnvelope = JSON.stringify({
      foo: 'bar',
      baz: 123
    });

    expect(validateEnvelope(nonEnvelope)).toBe(false);
  });

  test('should validate envelope with empty data', () => {
    const envelopeWithEmptyData = JSON.stringify({
      tag: 'rinnegan',
      ok: true,
      code: 'OK_PLAN',
      md: '# Plan',
      data: {},
      next: 'EXECUTE_PLAN'
    });

    expect(validateEnvelope(envelopeWithEmptyData)).toBe(true);
  });

  test('should validate error envelope', () => {
    const errorEnvelope = JSON.stringify({
      tag: 'tenseigan',
      ok: false,
      code: 'E_PROVIDER_ERROR',
      md: '## Error\n\nProvider failed',
      data: { error: 'Connection refused' },
      next: 'RETRY'
    });

    expect(validateEnvelope(errorEnvelope)).toBe(true);
  });
});

describe('Envelope Parsing', () => {
  test('should parse valid envelope', () => {
    const validEnvelopeJson = JSON.stringify({
      tag: 'sharingan',
      ok: true,
      code: 'OK_GENERATION',
      md: '# Code',
      data: { snippet: 'console.log("hello")' },
      next: 'COMPLETE'
    });

    const envelope = parseEnvelope(validEnvelopeJson);

    expect(envelope).not.toBeNull();
    expect(envelope).toHaveProperty('tag', 'sharingan');
    expect(envelope).toHaveProperty('ok', true);
    expect(envelope).toHaveProperty('code', 'OK_GENERATION');
    expect(envelope).toHaveProperty('md');
    expect(envelope).toHaveProperty('data');
    expect(envelope).toHaveProperty('next', 'COMPLETE');
  });

  test('should return null for invalid envelope', () => {
    const invalidJson = JSON.stringify({ invalid: 'envelope' });
    const envelope = parseEnvelope(invalidJson);

    expect(envelope).toBeNull();
  });

  test('should return null for malformed JSON', () => {
    const malformedJson = '{ not json }';
    const envelope = parseEnvelope(malformedJson);

    expect(envelope).toBeNull();
  });

  test('should parse envelope with nested data', () => {
    const complexEnvelope = JSON.stringify({
      tag: 'rinnegan',
      ok: true,
      code: 'OK_PLAN',
      md: '# Architecture Plan',
      data: {
        steps: ['step1', 'step2'],
        metadata: {
          estimatedTime: 120,
          complexity: 'high'
        }
      },
      next: 'EXECUTE_PLAN'
    });

    const envelope = parseEnvelope(complexEnvelope);

    expect(envelope).not.toBeNull();
    expect(envelope?.data).toHaveProperty('steps');
    expect(envelope?.data).toHaveProperty('metadata');
    expect(envelope?.data.steps).toEqual(['step1', 'step2']);
    expect(envelope?.data.metadata.complexity).toBe('high');
  });
});

describe('Envelope Type Safety', () => {
  test('should enforce Envelope type structure', () => {
    const envelope: EnvelopeType = {
      tag: 'sharingan',
      ok: true,
      code: 'OK_GENERATION',
      md: '# Test',
      data: { test: 'value' },
      next: 'COMPLETE'
    };

    // TypeScript should enforce all required fields
    expect(envelope.tag).toBeDefined();
    expect(envelope.ok).toBeDefined();
    expect(envelope.code).toBeDefined();
    expect(envelope.md).toBeDefined();
    expect(envelope.data).toBeDefined();
    expect(envelope.next).toBeDefined();
  });

  test('should validate with Zod schema', () => {
    const validData = {
      tag: 'rinnegan',
      ok: true,
      code: 'OK_PLAN',
      md: '# Plan',
      data: {},
      next: 'COMPLETE'
    };

    const result = Envelope.safeParse(validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validData);
    }
  });

  test('should reject invalid data with Zod', () => {
    const invalidData = {
      tag: 'sharingan',
      ok: 'not-a-boolean', // should be boolean
      code: 'OK',
      md: '# Test',
      data: {},
      next: 'COMPLETE'
    };

    const result = Envelope.safeParse(invalidData);

    expect(result.success).toBe(false);
  });
});

describe('StatusCodes Registry', () => {
  test('should have success codes', () => {
    expect(StatusCodes.OK_CLASSIFICATION).toBe('OK_CLASSIFICATION');
    expect(StatusCodes.OK_PLAN).toBe('OK_PLAN');
    expect(StatusCodes.OK_GENERATION).toBe('OK_GENERATION');
    expect(StatusCodes.OK_VALIDATION).toBe('OK_VALIDATION');
  });

  test('should have error codes', () => {
    expect(StatusCodes.E_INVALID_INPUT).toBe('E_INVALID_INPUT');
    expect(StatusCodes.E_PROVIDER_ERROR).toBe('E_PROVIDER_ERROR');
    expect(StatusCodes.E_ROUTING_FAILED).toBe('E_ROUTING_FAILED');
    expect(StatusCodes.E_ENVELOPE_INVALID).toBe('E_ENVELOPE_INVALID');
    expect(StatusCodes.E_TIMEOUT).toBe('E_TIMEOUT');
    expect(StatusCodes.E_RATE_LIMIT).toBe('E_RATE_LIMIT');
  });

  test('success codes should start with OK_', () => {
    const successCodes = Object.entries(StatusCodes)
      .filter(([key]) => key.startsWith('OK_'))
      .map(([, value]) => value);

    successCodes.forEach(code => {
      expect(code).toMatch(/^OK_/);
    });
  });

  test('error codes should start with E_', () => {
    const errorCodes = Object.entries(StatusCodes)
      .filter(([key]) => key.startsWith('E_'))
      .map(([, value]) => value);

    errorCodes.forEach(code => {
      expect(code).toMatch(/^E_/);
    });
  });
});

describe('NextActions Registry', () => {
  test('should have routing actions', () => {
    expect(NextActions.ROUTE_TO_RINNEGAN).toBe('ROUTE_TO_RINNEGAN');
    expect(NextActions.ROUTE_TO_TENSEIGAN).toBe('ROUTE_TO_TENSEIGAN');
  });

  test('should have execution actions', () => {
    expect(NextActions.EXECUTE_PLAN).toBe('EXECUTE_PLAN');
    expect(NextActions.VALIDATE_OUTPUT).toBe('VALIDATE_OUTPUT');
  });

  test('should have control flow actions', () => {
    expect(NextActions.COMPLETE).toBe('COMPLETE');
    expect(NextActions.RETRY).toBe('RETRY');
    expect(NextActions.FALLBACK).toBe('FALLBACK');
  });
});

describe('Real-World Envelope Scenarios', () => {
  test('should validate Sharingan code generation envelope', () => {
    const sharinganEnvelope = JSON.stringify({
      tag: 'sharingan',
      ok: true,
      code: 'OK_GENERATION',
      md: '# Generated Function\n\n```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```',
      data: {
        language: 'typescript',
        snippet: 'function add(a: number, b: number): number { return a + b; }',
        explanation: 'Simple addition function with type hints'
      },
      next: 'VALIDATE_OUTPUT'
    });

    expect(validateEnvelope(sharinganEnvelope)).toBe(true);
    const parsed = parseEnvelope(sharinganEnvelope);
    expect(parsed?.tag).toBe('sharingan');
    expect(parsed?.data.language).toBe('typescript');
  });

  test('should validate Rinnegan planning envelope', () => {
    const rinneganEnvelope = JSON.stringify({
      tag: 'rinnegan',
      ok: true,
      code: 'OK_PLAN',
      md: '# Implementation Plan\n\n1. Setup\n2. Implementation\n3. Testing',
      data: {
        steps: [
          { id: 1, description: 'Setup environment' },
          { id: 2, description: 'Implement feature' },
          { id: 3, description: 'Write tests' }
        ],
        estimatedTime: 240
      },
      next: 'EXECUTE_PLAN'
    });

    expect(validateEnvelope(rinneganEnvelope)).toBe(true);
    const parsed = parseEnvelope(rinneganEnvelope);
    expect(parsed?.data.steps).toHaveLength(3);
  });

  test('should validate error envelope with retry', () => {
    const errorEnvelope = JSON.stringify({
      tag: 'tenseigan',
      ok: false,
      code: 'E_PROVIDER_ERROR',
      md: '## Error\n\nProvider timeout after 3 retries',
      data: {
        error: 'Connection timeout',
        retries: 3,
        lastAttempt: Date.now()
      },
      next: 'FALLBACK'
    });

    expect(validateEnvelope(errorEnvelope)).toBe(true);
    const parsed = parseEnvelope(errorEnvelope);
    expect(parsed?.ok).toBe(false);
    expect(parsed?.next).toBe('FALLBACK');
  });
});
