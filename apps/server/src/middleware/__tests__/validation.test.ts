import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeString, sanitizeObject, schemas } from '../validation';

describe('Validation Middleware', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should remove SQL injection patterns', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizeString(input);
      expect(result).not.toContain('DROP');
      expect(result).not.toContain('TABLE');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="evil()">Click me</div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('onclick');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = sanitizeString(input);
      expect(result).toBe('hello world');
    });

    it('should handle non-string inputs safely', () => {
      expect(sanitizeString(123 as any)).toBe(123);
      expect(sanitizeString(null as any)).toBe(null);
    });
  });

  describe('sanitizeObject', () => {
    it('should recursively sanitize nested objects', () => {
      const input = {
        name: '<script>alert(1)</script>John',
        details: {
          bio: '<b>Evil</b> bio',
          tags: ['<img src=x>', 'safe tag'],
        },
      };

      const result = sanitizeObject(input);
      expect(result.name).toBe('John');
      expect(result.details.bio).toBe('Evil bio');
      expect(result.details.tags[0]).toBe('');
      expect(result.details.tags[1]).toBe('safe tag');
    });

    it('should handle arrays', () => {
      const input = ['<script>bad</script>', 'good', '<h1>header</h1>'];
      const result = sanitizeObject(input);
      expect(result).toEqual(['bad', 'good', 'header']);
    });

    it('should preserve numbers and booleans', () => {
      const input = { age: 25, active: true };
      const result = sanitizeObject(input);
      expect(result).toEqual({ age: 25, active: true });
    });
  });

  describe('Schema Validation', () => {
    describe('mcpRun schema', () => {
      it('should validate explicit Eye mode', () => {
        const valid = { eye: 'sharingan', input: { prompt: 'test' } };
        expect(() => schemas.mcpRun.parse(valid)).not.toThrow();
      });

      it('should validate task mode', () => {
        const valid = { task: 'implement feature X' };
        expect(() => schemas.mcpRun.parse(valid)).not.toThrow();
      });

      it('should reject missing both eye and task', () => {
        const invalid = { input: { prompt: 'test' } };
        expect(() => schemas.mcpRun.parse(invalid)).toThrow();
      });

      it('should allow optional sessionId', () => {
        const valid = { task: 'test', sessionId: 'session-123' };
        expect(() => schemas.mcpRun.parse(valid)).not.toThrow();
      });
    });

    describe('duelCreate schema', () => {
      it('should validate valid duel request', () => {
        const valid = {
          eyeName: 'sharingan',
          modelA: 'claude-sonnet-4',
          modelB: 'gpt-4-turbo',
          input: 'test prompt',
          iterations: 5,
        };
        expect(() => schemas.duelCreate.parse(valid)).not.toThrow();
      });

      it('should reject missing required fields', () => {
        const invalid = { eyeName: 'sharingan' };
        expect(() => schemas.duelCreate.parse(invalid)).toThrow();
      });

      it('should reject iterations > 10', () => {
        const invalid = {
          eyeName: 'sharingan',
          modelA: 'model-a',
          modelB: 'model-b',
          input: 'test',
          iterations: 15,
        };
        expect(() => schemas.duelCreate.parse(invalid)).toThrow();
      });

      it('should default iterations to 5', () => {
        const input = {
          eyeName: 'sharingan',
          modelA: 'model-a',
          modelB: 'model-b',
          input: 'test',
        };
        const result = schemas.duelCreate.parse(input);
        expect(result.iterations).toBe(5);
      });
    });

    describe('contextAdd schema', () => {
      it('should validate valid context addition', () => {
        const valid = {
          source: 'user',
          key: 'userIntent',
          value: 'implement authentication',
        };
        expect(() => schemas.contextAdd.parse(valid)).not.toThrow();
      });

      it('should reject invalid source', () => {
        const invalid = {
          source: 'invalid',
          key: 'test',
          value: 'value',
        };
        expect(() => schemas.contextAdd.parse(invalid)).toThrow();
      });

      it('should accept eye as source', () => {
        const valid = {
          source: 'eye',
          key: 'sharinganResult',
          value: { ambiguityScore: 75 },
        };
        expect(() => schemas.contextAdd.parse(valid)).not.toThrow();
      });
    });

    describe('clarificationValidate schema', () => {
      it('should validate answer with minimum length', () => {
        const valid = { answer: 'Yes' };
        expect(() => schemas.clarificationValidate.parse(valid)).not.toThrow();
      });

      it('should reject empty answer', () => {
        const invalid = { answer: '' };
        expect(() => schemas.clarificationValidate.parse(invalid)).toThrow();
      });

      it('should accept long answers', () => {
        const valid = { answer: 'This is a detailed answer explaining my intent...' };
        expect(() => schemas.clarificationValidate.parse(valid)).not.toThrow();
      });
    });
  });
});
