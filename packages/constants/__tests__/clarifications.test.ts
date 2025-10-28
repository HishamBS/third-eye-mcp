import { describe, it, expect } from 'vitest';
import {
  ClarificationFieldTokens,
  CLARIFICATION_FIELDS,
  CLARIFICATION_FIELD_SET,
  isClarificationField,
  isClarificationFieldToken,
  CLARIFICATION_FIELD_PROMPTS,
  REQUIRED_CLARIFICATION_FIELDS,
  CLARIFICATION_FALLBACKS,
  ClarificationField,
} from '../clarifications';

describe('Clarifications Constants', () => {
  describe('ClarificationFieldTokens', () => {
    it('should include all five canonical fields', () => {
      expect(ClarificationFieldTokens.AUDIENCE).toBe('audience');
      expect(ClarificationFieldTokens.DELIVERABLE).toBe('deliverable');
      expect(ClarificationFieldTokens.SCOPE).toBe('scope');
      expect(ClarificationFieldTokens.SUCCESS_CRITERIA).toBe('successCriteria');
      expect(ClarificationFieldTokens.REFERENCES).toBe('references');
    });

    it('should have exactly five fields', () => {
      expect(Object.keys(ClarificationFieldTokens).length).toBe(5);
    });
  });

  describe('CLARIFICATION_FIELDS', () => {
    it('should contain all canonical fields', () => {
      expect(CLARIFICATION_FIELDS).toContain(ClarificationFieldTokens.AUDIENCE);
      expect(CLARIFICATION_FIELDS).toContain(ClarificationFieldTokens.DELIVERABLE);
      expect(CLARIFICATION_FIELDS).toContain(ClarificationFieldTokens.SCOPE);
      expect(CLARIFICATION_FIELDS).toContain(ClarificationFieldTokens.SUCCESS_CRITERIA);
      expect(CLARIFICATION_FIELDS).toContain(ClarificationFieldTokens.REFERENCES);
    });

    it('should have exactly five fields', () => {
      expect(CLARIFICATION_FIELDS.length).toBe(5);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CLARIFICATION_FIELDS)).toBe(true);
    });
  });

  describe('CLARIFICATION_FIELD_SET', () => {
    it('should be a Set containing all canonical fields', () => {
      expect(CLARIFICATION_FIELD_SET.size).toBe(5);
      expect(CLARIFICATION_FIELD_SET.has(ClarificationFieldTokens.AUDIENCE)).toBe(true);
      expect(CLARIFICATION_FIELD_SET.has(ClarificationFieldTokens.DELIVERABLE)).toBe(true);
      expect(CLARIFICATION_FIELD_SET.has(ClarificationFieldTokens.SCOPE)).toBe(true);
      expect(CLARIFICATION_FIELD_SET.has(ClarificationFieldTokens.SUCCESS_CRITERIA)).toBe(true);
      expect(CLARIFICATION_FIELD_SET.has(ClarificationFieldTokens.REFERENCES)).toBe(true);
    });
  });

  describe('isClarificationField', () => {
    it('should return true for valid clarification fields', () => {
      expect(isClarificationField(ClarificationFieldTokens.AUDIENCE)).toBe(true);
      expect(isClarificationField(ClarificationFieldTokens.DELIVERABLE)).toBe(true);
      expect(isClarificationField(ClarificationFieldTokens.SCOPE)).toBe(true);
      expect(isClarificationField(ClarificationFieldTokens.SUCCESS_CRITERIA)).toBe(true);
      expect(isClarificationField(ClarificationFieldTokens.REFERENCES)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isClarificationField('invalid')).toBe(false);
      expect(isClarificationField('')).toBe(false);
      expect(isClarificationField(null)).toBe(false);
      expect(isClarificationField(undefined)).toBe(false);
      expect(isClarificationField(123)).toBe(false);
    });
  });

  describe('isClarificationFieldToken', () => {
    it('should work as an alias for isClarificationField', () => {
      expect(isClarificationFieldToken(ClarificationFieldTokens.AUDIENCE)).toBe(true);
      expect(isClarificationFieldToken(ClarificationFieldTokens.DELIVERABLE)).toBe(true);
      expect(isClarificationFieldToken('invalid')).toBe(false);
    });

    it('should be a type guard function', () => {
      const value: unknown = ClarificationFieldTokens.SCOPE;
      if (isClarificationFieldToken(value)) {
        // TypeScript should narrow the type here
        expect(value).toBe('scope');
      }
    });
  });

  describe('CLARIFICATION_FIELD_PROMPTS', () => {
    it('should have prompts for all canonical fields', () => {
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.AUDIENCE]).toBeDefined();
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.DELIVERABLE]).toBeDefined();
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.SCOPE]).toBeDefined();
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.SUCCESS_CRITERIA]).toBeDefined();
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.REFERENCES]).toBeDefined();
    });

    it('should have canonical question text', () => {
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.AUDIENCE]).toContain('Who is the audience');
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.DELIVERABLE]).toContain('What concrete deliverable');
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.SCOPE]).toContain('constraints, scope boundaries');
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.SUCCESS_CRITERIA]).toContain('success criteria');
      expect(CLARIFICATION_FIELD_PROMPTS[ClarificationFieldTokens.REFERENCES]).toContain('references, logs');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CLARIFICATION_FIELD_PROMPTS)).toBe(true);
    });
  });

  describe('REQUIRED_CLARIFICATION_FIELDS', () => {
    it('should match CLARIFICATION_FIELDS', () => {
      expect(REQUIRED_CLARIFICATION_FIELDS.length).toBe(CLARIFICATION_FIELDS.length);
      expect(REQUIRED_CLARIFICATION_FIELDS).toEqual(CLARIFICATION_FIELDS);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(REQUIRED_CLARIFICATION_FIELDS)).toBe(true);
    });
  });

  describe('CLARIFICATION_FALLBACKS', () => {
    it('should have fallbacks for all canonical fields', () => {
      expect(CLARIFICATION_FALLBACKS[ClarificationFieldTokens.AUDIENCE]).toBe('Audience not specified');
      expect(CLARIFICATION_FALLBACKS[ClarificationFieldTokens.DELIVERABLE]).toBe('Deliverable not specified');
      expect(CLARIFICATION_FALLBACKS[ClarificationFieldTokens.SCOPE]).toBe('Scope requires clarification');
      expect(CLARIFICATION_FALLBACKS[ClarificationFieldTokens.SUCCESS_CRITERIA]).toBe('Success criteria not specified');
      expect(CLARIFICATION_FALLBACKS[ClarificationFieldTokens.REFERENCES]).toBe('No references provided');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CLARIFICATION_FALLBACKS)).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should enforce ClarificationField type', () => {
      const validFields: ClarificationField[] = [
        ClarificationFieldTokens.AUDIENCE,
        ClarificationFieldTokens.DELIVERABLE,
        ClarificationFieldTokens.SCOPE,
        ClarificationFieldTokens.SUCCESS_CRITERIA,
        ClarificationFieldTokens.REFERENCES,
      ];
      expect(validFields.length).toBe(5);
    });
  });
});
