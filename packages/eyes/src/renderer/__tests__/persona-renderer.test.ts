import { describe, it, expect } from 'vitest';
import { renderPersonaPrompt, parsePersonaResponse } from '../persona-renderer';
import { OVERSEER_BLUEPRINT } from '../../blueprints';
import { EyeStageToken } from '@third-eye/constants';

describe('Persona Runtime Renderer', () => {
  describe('renderPersonaPrompt', () => {
    it('should render guidance phase prompt', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
        'Test request context',
      );

      expect(prompt.systemPrompt).toBeDefined();
      expect(prompt.userMessage).toBeDefined();
      expect(prompt.config).toBeDefined();
      expect(prompt.config.temperature).toBe(0);
      expect(prompt.config.top_p).toBe(1);
      expect(prompt.config.response_format.type).toBe('json_object');
    });

    it('should render validation phase prompt', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.VALIDATION,
        'Test content',
      );

      expect(prompt.systemPrompt).toBeDefined();
      expect(prompt.userMessage).toBeDefined();
      expect(prompt.config).toBeDefined();
    });

    it('should include self-check instructions by default', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain('Self-Check Instructions');
    });

    it('should exclude self-check when requested', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
        undefined,
        { includeSelfCheck: false },
      );

      expect(prompt.systemPrompt).not.toContain('Self-Check Instructions');
    });

    it('should include mission in system prompt', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain(OVERSEER_BLUEPRINT.mission);
    });

    it('should include phase mission', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain('Current Task:');
    });

    it('should include behavior checklist', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain('Behavior Checklist');
    });

    it('should include response format requirements', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain('Response Format');
      expect(prompt.systemPrompt).toContain('JSON object');
    });

    it('should include example in system prompt', () => {
      const prompt = renderPersonaPrompt(
        OVERSEER_BLUEPRINT,
        EyeStageToken.GUIDANCE,
      );

      expect(prompt.systemPrompt).toContain('Example Response');
    });
  });

  describe('parsePersonaResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({ test: 'data' });
      const parsed = parsePersonaResponse(response, OVERSEER_BLUEPRINT, EyeStageToken.GUIDANCE);

      expect(parsed).toEqual({ test: 'data' });
    });

    it('should throw on invalid JSON', () => {
      expect(() => {
        parsePersonaResponse('not json', OVERSEER_BLUEPRINT, EyeStageToken.GUIDANCE);
      }).toThrow('Failed to parse response as JSON');
    });

    it('should throw on non-object response', () => {
      expect(() => {
        parsePersonaResponse('"string"', OVERSEER_BLUEPRINT, EyeStageToken.GUIDANCE);
      }).toThrow('Response is not a JSON object');
    });
  });
});

