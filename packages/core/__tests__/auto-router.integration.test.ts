/**
 * Auto-Router Integration Tests
 *
 * Tests dynamic routing based on Overseer LLM decisions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoRouter } from '../auto-router';
import { EyeOrchestrator } from '../orchestrator';
import type { BaseEnvelope } from '@third-eye/eyes';

// Mock WebSocket manager
vi.mock('../../apps/server/src/websocket', () => ({
  wsManager: {
    emitEyeStarted: vi.fn(),
    emitEyeComplete: vi.fn(),
    emitSessionStatus: vi.fn(),
    emitOverseerRoute: vi.fn(),
  },
}));

describe('AutoRouter - Dynamic Routing Integration', () => {
  let autoRouter: AutoRouter;
  let mockOrchestrator: any;

  beforeEach(() => {
    autoRouter = new AutoRouter();
    mockOrchestrator = (autoRouter as any).orchestrator;

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Vague Request → Overseer includes Sharingan', () => {
    it('should route through sharingan for vague new task', async () => {
      const task = 'Generate a palm care guide';

      // Mock Overseer response with sharingan in route
      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized\n\nRouting through guidance Eyes',
        data: {
          requestType: 'new_task',
          contentDomain: 'text',
          complexity: 'moderate',
          pipelineRoute: ['sharingan', 'prompt-helper', 'jogan', 'tenseigan', 'byakugan'],
          routingReasoning: 'Vague request needs clarification and refinement',
          skipReasons: {
            rinnegan: 'Not a planning task',
            mangekyo: 'Not code-related'
          }
        },
        next: 'sharingan'
      };

      // Mock Eye responses
      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-1' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        // Other Eyes return OK
        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: { outputForNext: task },
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(true);
      expect(result.results.length).toBe(6); // overseer + 5 eyes

      // Verify Eyes were called in correct order
      const eyeCalls = (mockOrchestrator.runEye as any).mock.calls.map((call: any[]) => call[0]);
      expect(eyeCalls).toEqual(['overseer', 'sharingan', 'prompt-helper', 'jogan', 'tenseigan', 'byakugan']);
    });
  });

  describe('Clear Request → Overseer skips Sharingan', () => {
    it('should skip sharingan for clear new task', async () => {
      const task = 'Generate 500-word indoor palm care guide for Saudi beginners with watering schedule';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized\n\nRequest is clear, skipping clarification',
        data: {
          requestType: 'new_task',
          contentDomain: 'text',
          complexity: 'moderate',
          pipelineRoute: ['jogan', 'tenseigan', 'byakugan'],
          routingReasoning: 'Clear and specific request, only needs intent confirmation and validation',
          skipReasons: {
            sharingan: 'Request is already clear',
            'prompt-helper': 'Requirements well-structured'
          }
        },
        next: 'jogan'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-2' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: { outputForNext: task },
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(true);
      expect(result.results.length).toBe(4); // overseer + 3 eyes

      const eyeCalls = (mockOrchestrator.runEye as any).mock.calls.map((call: any[]) => call[0]);
      expect(eyeCalls).toEqual(['overseer', 'jogan', 'tenseigan', 'byakugan']);
      expect(eyeCalls).not.toContain('sharingan');
    });
  });

  describe('Review Request → Overseer skips all guidance Eyes', () => {
    it('should skip guidance eyes for review content', async () => {
      const task = 'Review this code: const add = (a, b) => a + b;';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized\n\nReview task, skipping guidance',
        data: {
          requestType: 'review_content',
          contentDomain: 'code',
          complexity: 'simple',
          pipelineRoute: ['mangekyo'],
          routingReasoning: 'Code review with content provided, route directly to validation',
          skipReasons: {
            sharingan: 'Content already provided',
            jogan: 'Review task, no intent confirmation needed',
            tenseigan: 'Code domain, not text'
          }
        },
        next: 'mangekyo'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-3' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(true);
      expect(result.results.length).toBe(2); // overseer + mangekyo

      const eyeCalls = (mockOrchestrator.runEye as any).mock.calls.map((call: any[]) => call[0]);
      expect(eyeCalls).toEqual(['overseer', 'mangekyo']);
      expect(eyeCalls).not.toContain('sharingan');
      expect(eyeCalls).not.toContain('jogan');
    });
  });

  describe('AWAIT_INPUT Handling', () => {
    it('should pause session when Eye returns AWAIT_INPUT', async () => {
      const task = 'Review my guide';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized',
        data: {
          requestType: 'review_content',
          contentDomain: 'text',
          complexity: 'simple',
          pipelineRoute: ['tenseigan', 'byakugan'],
          routingReasoning: 'Text review',
        },
        next: 'tenseigan'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-4' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        if (eye === 'tenseigan') {
          return {
            tag: eye,
            ok: false,
            code: 'NEED_INPUT',
            md: '# Need more information',
            data: { question: 'What is the target audience?' },
            next: 'AWAIT_INPUT'
          };
        }

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('Awaiting human input');
      expect(result.results.length).toBe(2); // overseer + tenseigan

      // Verify session state is saved
      const state = await autoRouter.getSessionState('test-session-4');
      expect(state).toBeDefined();
      expect(state?.status).toBe('awaiting_input');
      expect(state?.pendingRoute).toEqual(['byakugan']);
    });

    it('should resume flow after AWAIT_INPUT with human response', async () => {
      const sessionId = 'test-session-5';
      const humanResponse = 'Target audience is beginners in Saudi Arabia';

      // Setup initial paused state
      const pausedState = {
        status: 'awaiting_input' as const,
        currentEye: 'tenseigan',
        completedEyes: ['overseer', 'tenseigan'],
        pendingRoute: ['byakugan'],
        context: {
          task: 'Review my guide',
          results: [
            { tag: 'overseer', ok: true, code: 'OK', md: '', data: {}, next: 'tenseigan' },
            { tag: 'tenseigan', ok: false, code: 'NEED_INPUT', md: '', data: {}, next: 'AWAIT_INPUT' }
          ],
          humanInputs: []
        }
      };

      (autoRouter as any).sessionStates.set(sessionId, pausedState);

      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.resumeFlow(sessionId, humanResponse);

      expect(result.completed).toBe(true);
      expect(result.results.length).toBe(3); // previous 2 + byakugan

      // Verify human input was recorded
      const finalState = await autoRouter.getSessionState(sessionId);
      expect(finalState?.context.humanInputs).toContain(humanResponse);
    });
  });

  describe('AWAIT_REVISION Handling', () => {
    it('should pause and retry Eye when AWAIT_REVISION is returned', async () => {
      const task = 'Review this code';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized',
        data: {
          requestType: 'review_content',
          contentDomain: 'code',
          complexity: 'simple',
          pipelineRoute: ['mangekyo'],
          routingReasoning: 'Code review',
        },
        next: 'mangekyo'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-6' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        if (eye === 'mangekyo') {
          return {
            tag: eye,
            ok: false,
            code: 'ISSUES_FOUND',
            md: '# Code has issues',
            data: { issues: ['Missing error handling'] },
            next: 'AWAIT_REVISION'
          };
        }

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('requires revision');

      // Verify session state includes the Eye to retry
      const state = await autoRouter.getSessionState('test-session-6');
      expect(state?.status).toBe('awaiting_revision');
      expect(state?.pendingRoute).toContain('mangekyo'); // Should retry this Eye
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid Overseer response gracefully', async () => {
      const task = 'Invalid task';

      const invalidOverseerResponse = {
        tag: 'overseer',
        ok: true,
        code: 'OK',
        md: '# Invalid',
        data: {
          // Missing required fields
        },
        next: 'sharingan'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-7' });
      vi.spyOn(mockOrchestrator, 'runEye').mockResolvedValue(invalidOverseerResponse as any);

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('invalid routing decision');
    });

    it('should handle Eye rejection and stop pipeline', async () => {
      const task = 'Review content';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized',
        data: {
          requestType: 'review_content',
          contentDomain: 'text',
          complexity: 'simple',
          pipelineRoute: ['tenseigan', 'byakugan'],
          routingReasoning: 'Text review',
        },
        next: 'tenseigan'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-8' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        if (eye === 'tenseigan') {
          return {
            tag: eye,
            ok: false,
            code: 'REJECTED',
            md: '# Content rejected',
            data: { reason: 'Contains misinformation' },
            next: 'STOP'
          };
        }

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(false);
      expect(result.error).toContain('rejected');
      expect(result.results.length).toBe(2); // Should stop after rejection

      const eyeCalls = (mockOrchestrator.runEye as any).mock.calls.map((call: any[]) => call[0]);
      expect(eyeCalls).not.toContain('byakugan'); // Should not continue to byakugan
    });
  });

  describe('Mixed Content Routing', () => {
    it('should route through multiple validators for mixed content', async () => {
      const task = 'Review my API implementation and documentation';

      const overseerResponse: BaseEnvelope = {
        tag: 'overseer',
        ok: true,
        code: 'ROUTE_DECIDED',
        md: '# Session Initialized',
        data: {
          requestType: 'review_content',
          contentDomain: 'mixed',
          complexity: 'comprehensive',
          pipelineRoute: ['mangekyo', 'tenseigan', 'byakugan'],
          routingReasoning: 'Mixed content requires code and documentation validation',
          skipReasons: {
            sharingan: 'All content provided upfront'
          }
        },
        next: 'mangekyo'
      };

      vi.spyOn(mockOrchestrator, 'createSession').mockResolvedValue({ sessionId: 'test-session-9' });
      vi.spyOn(mockOrchestrator, 'runEye').mockImplementation(async (eye: string) => {
        if (eye === 'overseer') return overseerResponse;

        return {
          tag: eye,
          ok: true,
          code: 'OK',
          md: `# ${eye} passed`,
          data: {},
          next: 'CONTINUE'
        };
      });

      const result = await autoRouter.executeFlow(task);

      expect(result.completed).toBe(true);
      expect(result.results.length).toBe(4); // overseer + 3 validators

      const eyeCalls = (mockOrchestrator.runEye as any).mock.calls.map((call: any[]) => call[0]);
      expect(eyeCalls).toEqual(['overseer', 'mangekyo', 'tenseigan', 'byakugan']);
    });
  });
});
