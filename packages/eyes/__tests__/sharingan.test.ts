import { describe, it, expect } from 'vitest';
import { clarify, type SharinganRequest } from '../sharingan.js';
import { StatusCode, DataKey } from '../constants.js';

describe('Sharingan Eye', () => {
  describe('Ambiguity Detection', () => {
    it('should detect high ambiguity in vague prompts', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Make it better' },
      };

      const response = clarify(request);

      expect(response.ok).toBe(false);
      expect(response.code).toBe(StatusCode.E_NEEDS_CLARIFICATION);
      expect(response.data[DataKey.AMBIGUOUS]).toBe(true);
      expect(response.data[DataKey.SCORE]).toBeGreaterThan(0.3);
      expect(response.data[DataKey.QUESTIONS_MD]).toContain('### Clarifying Questions');
    });

    it('should detect low ambiguity in specific prompts', () => {
      const request: SharinganRequest = {
        payload: {
          prompt: 'Create a TypeScript function named calculateSum that takes two numbers as parameters and returns their sum. Include JSDoc comments with parameter descriptions and return type.',
        },
      };

      const response = clarify(request);

      expect(response.ok).toBe(true);
      expect(response.code).toBe(StatusCode.OK_NO_CLARIFICATION_NEEDED);
      expect(response.data[DataKey.AMBIGUOUS]).toBe(false);
      expect(response.data[DataKey.SCORE]).toBeLessThan(0.3);
    });

    it('should generate clarifying questions for ambiguous prompts', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Do something' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.AMBIGUOUS]).toBe(true);
      expect(response.data[DataKey.X]).toBeGreaterThan(0);
      expect(response.data[DataKey.QUESTIONS_MD]).toBeTruthy();

      const questionsMarkdown = response.data[DataKey.QUESTIONS_MD] as string;
      expect(questionsMarkdown).toContain('### Clarifying Questions');
      expect(questionsMarkdown.split('\n').filter(line => line.startsWith('-')).length).toBeGreaterThan(0);
    });

    it('should respect custom ambiguity threshold', () => {
      const strictRequest: SharinganRequest = {
        payload: { prompt: 'Write a function to sort numbers' },
        context: { settings: { ambiguity_threshold: 0.1 } },
      };

      const lenientRequest: SharinganRequest = {
        payload: { prompt: 'Write a function to sort numbers' },
        context: { settings: { ambiguity_threshold: 0.8 } },
      };

      const strictResponse = clarify(strictRequest);
      const lenientResponse = clarify(lenientRequest);

      // Same prompt, different thresholds should yield different results
      expect(strictResponse.data[DataKey.AMBIGUOUS]).toBe(true);
      expect(lenientResponse.data[DataKey.AMBIGUOUS]).toBe(false);
    });

    it('should calculate higher scores for shorter prompts', () => {
      const shortRequest: SharinganRequest = {
        payload: { prompt: 'Fix bug' },
      };

      const longRequest: SharinganRequest = {
        payload: {
          prompt: 'Fix the authentication bug in the login component where users with special characters in their email addresses cannot log in successfully due to incorrect email validation regex',
        },
      };

      const shortResponse = clarify(shortRequest);
      const longResponse = clarify(longRequest);

      expect(shortResponse.data[DataKey.SCORE]).toBeGreaterThan(longResponse.data[DataKey.SCORE]);
    });
  });

  describe('Code Detection', () => {
    it('should detect code-related prompts with framework keywords', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Write a React component for user authentication with TypeScript' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(true);
      // Keywords are converted to lowercase in reasoning
      const reasoning = (response.data[DataKey.REASONING_MD] as string).toLowerCase();
      expect(reasoning).toContain('react');
      expect(reasoning).toContain('typescript');
    });

    it('should detect code-related prompts with file extensions', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Create a new file called utils.ts with helper functions' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(true);
      expect(response.data[DataKey.REASONING_MD]).toContain('.ts');
    });

    it('should detect code-related prompts with code fences', () => {
      const request: SharinganRequest = {
        payload: {
          prompt: 'Review this code:\n```typescript\nfunction add(a: number, b: number) { return a + b; }\n```',
        },
      };

      const response = clarify(request);

      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(true);
      expect(response.data[DataKey.REASONING_MD]).toContain('Code fence');
    });

    it('should detect non-code prompts', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Explain the concept of machine learning in simple terms for beginners' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(false);
      expect(response.data[DataKey.REASONING_MD]).toContain('No explicit code indicators');
    });

    it('should detect code action keywords', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Implement a binary search algorithm in Python' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(true);
      const reasoning = (response.data[DataKey.REASONING_MD] as string).toLowerCase();
      expect(reasoning).toContain('python');
    });
  });

  describe('Reasoning', () => {
    it('should provide clear reasoning for high ambiguity score', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Do it' },
      };

      const response = clarify(request);

      const reasoning = response.data[DataKey.REASONING_MD] as string;
      expect(reasoning).toContain('### Reasoning');
      expect(reasoning).toContain('Ambiguity score');
      if (response.data[DataKey.AMBIGUOUS]) {
        expect(reasoning).toContain('clarification required');
      }
    });

    it('should provide clear reasoning for low ambiguity score', () => {
      const request: SharinganRequest = {
        payload: {
          prompt: 'Create a new TypeScript class named UserRepository with methods for CRUD operations on user entities, including proper error handling and type safety',
        },
      };

      const response = clarify(request);

      const reasoning = response.data[DataKey.REASONING_MD] as string;
      expect(reasoning).toContain('### Reasoning');
      expect(reasoning).toContain('Ambiguity score');
      expect(response.data[DataKey.SCORE]).toBeLessThan(0.3);
    });

    it('should explain code detection in reasoning', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Build a REST API endpoint using Express.js' },
      };

      const response = clarify(request);

      const reasoning = (response.data[DataKey.REASONING_MD] as string).toLowerCase();
      // Should detect API/endpoint keywords or file extension
      expect(reasoning).toContain('api') || expect(reasoning).toContain('.js');
      expect(response.data[DataKey.IS_CODE_RELATED]).toBe(true);
    });
  });

  describe('Response Structure', () => {
    it('should return proper envelope structure', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Test prompt' },
      };

      const response = clarify(request);

      expect(response).toHaveProperty('tag', 'sharingan');
      expect(response).toHaveProperty('ok');
      expect(response).toHaveProperty('code');
      expect(response).toHaveProperty('md');
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('next_action');
    });

    it('should include policy template in response', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Test prompt' },
      };

      const response = clarify(request);

      expect(response.data[DataKey.POLICY_MD]).toBeTruthy();
      expect(typeof response.data[DataKey.POLICY_MD]).toBe('string');
    });

    it('should set correct next_action for ambiguous prompts', () => {
      const request: SharinganRequest = {
        payload: { prompt: 'Do something' },
      };

      const response = clarify(request);

      if (response.data[DataKey.AMBIGUOUS]) {
        expect(response.next_action).toBe('ASK_CLARIFICATIONS');
      }
    });

    it('should set correct next_action for code-related prompts', () => {
      const request: SharinganRequest = {
        payload: {
          prompt: 'Create a well-documented TypeScript interface for a User model with id, name, email, and createdAt fields',
        },
      };

      const response = clarify(request);

      if (!response.data[DataKey.AMBIGUOUS] && response.data[DataKey.IS_CODE_RELATED]) {
        expect(response.next_action).toBe('FOLLOW_CODE_BRANCH');
      }
    });
  });
});
