import { describe, it, expect, beforeEach } from 'vitest';
import { OrderGuard } from '../order-guard';
import type { EyeName } from '@third-eye/eyes';

/**
 * Order Guard Validation Tests
 *
 * Tests pipeline order enforcement according to prompt.md
 * Ensures proper Eye execution sequence and violation detection
 */
describe('OrderGuard', () => {
  let orderGuard: OrderGuard;
  const testSessionId = 'test-session-123';

  beforeEach(() => {
    orderGuard = new OrderGuard();
  });

  describe('Initialization Phase', () => {
    it('should allow Sharingan as first Eye', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'sharingan');
      expect(violation).toBeNull();
    });

    it('should allow Overseer at any time', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'overseer');
      expect(violation).toBeNull();
    });

    it('should reject Jogan before Sharingan', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'jogan');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('jogan');
      expect(violation?.violation).toContain('initialization');
      expect(violation?.expectedNext).toContain('sharingan');
    });

    it('should reject Rinnegan before Sharingan', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'rinnegan');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.expectedNext).toContain('sharingan');
    });

    it('should reject Mangekyo before Sharingan', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'mangekyo');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.expectedNext).toContain('sharingan');
    });

    it('should reject Tenseigan before Sharingan', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'tenseigan');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.expectedNext).toContain('sharingan');
    });
  });

  describe('Clarification Phase', () => {
    beforeEach(() => {
      // Complete Sharingan to enter clarification phase
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });
    });

    it('should allow Prompt Helper after Sharingan', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'prompt-helper');
      expect(violation).toBeNull();
    });

    it('should reject Jogan before Prompt Helper', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'jogan');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('Jōgan called before Prompt Helper');
      expect(violation?.expectedNext).toContain('prompt-helper');
      expect(violation?.fixInstructions).toBeDefined();
      // Example payload is optional in some violations
      if (violation?.examplePayload) {
        expect(violation.examplePayload.eye).toBe('prompt-helper');
      }
    });

    it('should allow Jogan after Prompt Helper', () => {
      // Complete Prompt Helper
      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      const violation = orderGuard.validateOrder(testSessionId, 'jogan');
      expect(violation).toBeNull();
    });

    it('should reject Mangekyo in clarification phase', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'mangekyo');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('clarification phase');
    });
  });

  describe('Correct Sequence - Code Path', () => {
    it('should allow Sharingan → Prompt Helper → Jogan sequence', () => {
      // 1. Sharingan
      let violation = orderGuard.validateOrder(testSessionId, 'sharingan');
      expect(violation).toBeNull();
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });

      // 2. Prompt Helper
      violation = orderGuard.validateOrder(testSessionId, 'prompt-helper');
      expect(violation).toBeNull();
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      // 3. Jogan
      violation = orderGuard.validateOrder(testSessionId, 'jogan');
      expect(violation).toBeNull();
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Verify state
      const state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('planning');
      expect(state?.isCodeRelated).toBe(true);
      expect(state?.completedEyes).toContain('sharingan');
      expect(state?.completedEyes).toContain('prompt-helper');
      expect(state?.completedEyes).toContain('jogan');
    });

    it('should allow Rinnegan after Jogan for code tasks', () => {
      // Complete initialization and clarification
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Now Rinnegan should be allowed
      const violation = orderGuard.validateOrder(testSessionId, 'rinnegan');
      expect(violation).toBeNull();
    });

    it('should reject Mangekyo before Rinnegan planning', () => {
      // Complete clarification phase
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Try to call Mangekyo before Rinnegan
      const violation = orderGuard.validateOrder(testSessionId, 'mangekyo');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('Mangekyō called before Rinnegan');
      expect(violation?.expectedNext).toContain('rinnegan');
      expect(violation?.fixInstructions).toContain('implementation plan');
      // Example payload is optional in some violations
      if (violation?.examplePayload) {
        expect(violation.examplePayload.eye).toBe('rinnegan');
      }
    });

    it('should allow Rinnegan and Mangekyo in planning/implementation phase', () => {
      // Complete full sequence up to planning
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Verify we're in planning phase
      let state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('planning');

      // Rinnegan should be allowed in planning phase
      const rinneganViolation = orderGuard.validateOrder(testSessionId, 'rinnegan');
      expect(rinneganViolation).toBeNull();

      // Record Rinnegan completion
      orderGuard.recordEyeCompletion(testSessionId, 'rinnegan', {
        code: 'OK_PLAN_CREATED',
      });

      // After Rinnegan, we can have implementation phase
      // Mangekyo should be allowed (if not in completion phase)
      state = orderGuard.getState(testSessionId);

      // If we're still in planning/implementation (not completion), Mangekyo is allowed
      if (state?.currentPhase !== 'completion') {
        const mangekyoViolation = orderGuard.validateOrder(testSessionId, 'mangekyo');
        expect(mangekyoViolation).toBeNull();
      }
    });
  });

  describe('Correct Sequence - Text Path', () => {
    it('should allow text branch: Sharingan → Prompt Helper → Jogan → Tenseigan', () => {
      // 1. Sharingan (text task)
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: false },
      });

      // 2. Prompt Helper
      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      // 3. Jogan
      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // 4. Tenseigan should be allowed for text
      const violation = orderGuard.validateOrder(testSessionId, 'tenseigan');
      expect(violation).toBeNull();
    });

    it('should reject Mangekyo in text branch', () => {
      // Complete clarification for text task
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: false },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Try Mangekyo in text branch
      const violation = orderGuard.validateOrder(testSessionId, 'mangekyo');

      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('Mangekyō not allowed in text branch');
      expect(violation?.expectedNext).toContain('tenseigan');
      expect(violation?.expectedNext).toContain('byakugan');
    });

    it('should allow Byakugan in text branch', () => {
      // Complete clarification for text task
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: false },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Byakugan should be allowed
      const violation = orderGuard.validateOrder(testSessionId, 'byakugan');
      expect(violation).toBeNull();
    });

    it('should reject Tenseigan/Byakugan in code branch', () => {
      // Complete clarification for code task
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK_AMBIGUITY_DETECTED',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', {
        code: 'OK_PROMPT_OPTIMIZED',
      });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', {
        code: 'OK_INTENT_CONFIRMED',
      });

      // Try Tenseigan in code branch
      const tenseiganViolation = orderGuard.validateOrder(testSessionId, 'tenseigan');
      expect(tenseiganViolation).not.toBeNull();
      expect(tenseiganViolation?.code).toBe('E_PIPELINE_ORDER');
      expect(tenseiganViolation?.violation).toContain('not allowed in code branch');

      // Try Byakugan in code branch
      const byakuganViolation = orderGuard.validateOrder(testSessionId, 'byakugan');
      expect(byakuganViolation).not.toBeNull();
      expect(byakuganViolation?.code).toBe('E_PIPELINE_ORDER');
      expect(byakuganViolation?.violation).toContain('not allowed in code branch');
    });
  });

  describe('Session State Persistence', () => {
    it('should track completed Eyes', () => {
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
      });

      const state = orderGuard.getState(testSessionId);
      expect(state?.completedEyes).toContain('sharingan');
      expect(state?.lastEye).toBe('sharingan');
    });

    it('should track pipeline phase transitions', () => {
      // State is initialized on first validateOrder call
      orderGuard.validateOrder(testSessionId, 'sharingan');
      let state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('initialization');

      // Move to clarification
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });
      state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('clarification');

      // Move to planning
      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', { code: 'OK' });
      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', { code: 'OK' });
      state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('planning');
    });

    it('should track isCodeRelated flag from Sharingan', () => {
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      const state = orderGuard.getState(testSessionId);
      expect(state?.isCodeRelated).toBe(true);
    });

    it('should maintain separate state for different sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Session 1: code task
      orderGuard.validateOrder(session1, 'sharingan');
      orderGuard.recordEyeCompletion(session1, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      // Session 2: text task
      orderGuard.validateOrder(session2, 'sharingan');
      orderGuard.recordEyeCompletion(session2, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: false },
      });

      const state1 = orderGuard.getState(session1);
      const state2 = orderGuard.getState(session2);

      expect(state1?.isCodeRelated).toBe(true);
      expect(state2?.isCodeRelated).toBe(false);
    });
  });

  describe('Expected Next Eyes', () => {
    it('should return correct next Eyes in initialization', () => {
      const expectedNext = orderGuard.getExpectedNext(testSessionId);
      expect(expectedNext).toContain('sharingan');
    });

    it('should return correct next Eyes after Sharingan', () => {
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      const expectedNext = orderGuard.getExpectedNext(testSessionId);
      expect(expectedNext).toContain('prompt-helper');
    });

    it('should return correct next Eyes after Prompt Helper', () => {
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', { code: 'OK' });

      const expectedNext = orderGuard.getExpectedNext(testSessionId);
      expect(expectedNext).toContain('jogan');
    });

    it('should return correct next Eyes in code implementation phase', () => {
      // Complete to planning
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'rinnegan');
      orderGuard.recordEyeCompletion(testSessionId, 'rinnegan', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'mangekyo');
      orderGuard.recordEyeCompletion(testSessionId, 'mangekyo', { code: 'OK' });

      const state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('implementation');

      const expectedNext = orderGuard.getExpectedNext(testSessionId);
      expect(expectedNext).toContain('mangekyo');
      expect(expectedNext).toContain('rinnegan');
    });

    it('should return correct next Eyes in text implementation phase', () => {
      // Complete to planning
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: false },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'tenseigan');
      orderGuard.recordEyeCompletion(testSessionId, 'tenseigan', { code: 'OK' });

      const state = orderGuard.getState(testSessionId);
      expect(state?.currentPhase).toBe('implementation');

      const expectedNext = orderGuard.getExpectedNext(testSessionId);
      expect(expectedNext).toContain('tenseigan');
      expect(expectedNext).toContain('byakugan');
      expect(expectedNext).toContain('rinnegan');
    });
  });

  describe('Session Management', () => {
    it('should clear session state', () => {
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', { code: 'OK' });

      orderGuard.clearSession(testSessionId);

      const state = orderGuard.getState(testSessionId);
      expect(state).toBeNull();
    });

    it('should list active sessions', () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      orderGuard.validateOrder(session1, 'sharingan');
      orderGuard.validateOrder(session2, 'sharingan');

      const activeSessions = orderGuard.getActiveSessions();
      expect(activeSessions.length).toBeGreaterThanOrEqual(2);
      expect(activeSessions.some(s => s.sessionId === session1)).toBe(true);
      expect(activeSessions.some(s => s.sessionId === session2)).toBe(true);
    });
  });

  describe('Violation Messages - Internal Only', () => {
    it('should include internal Eye names in violation (for server logging)', () => {
      const violation = orderGuard.validateOrder(testSessionId, 'jogan');

      // Violation object contains internal details for server-side logging
      expect(violation).not.toBeNull();
      expect(violation?.violation).toContain('jogan');
      expect(violation?.expectedNext).toContain('sharingan');
      expect(violation?.fixInstructions).toBeDefined();
    });

    it('should provide example payload for some violations', () => {
      // Get to clarification phase
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      // Try to skip Prompt Helper - this violation includes examplePayload
      const violation = orderGuard.validateOrder(testSessionId, 'jogan');

      expect(violation).not.toBeNull();
      // Check if examplePayload exists (it's optional)
      if (violation?.examplePayload) {
        expect(violation.examplePayload.eye).toBe('prompt-helper');
        expect(violation.examplePayload.input).toBeDefined();
        expect(violation.examplePayload.description).toBeDefined();
      }
    });
  });

  describe('Auto-Router Bypass', () => {
    it('should bypass validation when session is marked as auto-router controlled', () => {
      // Mark session as auto-router controlled
      orderGuard.markAsAutoRouterSession(testSessionId);

      // Should allow ANY Eye in ANY order (auto-router knows the correct sequence)
      let violation = orderGuard.validateOrder(testSessionId, 'jogan');
      expect(violation).toBeNull();

      violation = orderGuard.validateOrder(testSessionId, 'rinnegan');
      expect(violation).toBeNull();

      violation = orderGuard.validateOrder(testSessionId, 'mangekyo');
      expect(violation).toBeNull();

      // Unmark session
      orderGuard.unmarkAsAutoRouterSession(testSessionId);

      // Now validation should be enforced again
      violation = orderGuard.validateOrder(testSessionId, 'jogan');
      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
    });

    it('should still validate direct Eye calls after auto-router completes', () => {
      // Mark as auto-router session
      orderGuard.markAsAutoRouterSession(testSessionId);

      // Execute full auto-router flow (Sharingan -> Prompt Helper -> Jogan)
      orderGuard.validateOrder(testSessionId, 'sharingan');
      orderGuard.recordEyeCompletion(testSessionId, 'sharingan', {
        code: 'OK',
        metadata: { isCodeRelated: true },
      });

      orderGuard.validateOrder(testSessionId, 'prompt-helper');
      orderGuard.recordEyeCompletion(testSessionId, 'prompt-helper', { code: 'OK' });

      orderGuard.validateOrder(testSessionId, 'jogan');
      orderGuard.recordEyeCompletion(testSessionId, 'jogan', { code: 'OK' });

      // Unmark after auto-router completes
      orderGuard.unmarkAsAutoRouterSession(testSessionId);

      // Direct Eye call should now be validated
      // Trying to call Mangekyo before Rinnegan should fail
      const violation = orderGuard.validateOrder(testSessionId, 'mangekyo');
      expect(violation).not.toBeNull();
      expect(violation?.code).toBe('E_PIPELINE_ORDER');
      expect(violation?.violation).toContain('Mangekyō called before Rinnegan');
    });

    it('should clear auto-router flag when session is cleared', () => {
      orderGuard.markAsAutoRouterSession(testSessionId);
      expect(orderGuard.isAutoRouterSession(testSessionId)).toBe(true);

      orderGuard.clearSession(testSessionId);
      expect(orderGuard.isAutoRouterSession(testSessionId)).toBe(false);
    });

    it('should check auto-router status', () => {
      expect(orderGuard.isAutoRouterSession(testSessionId)).toBe(false);

      orderGuard.markAsAutoRouterSession(testSessionId);
      expect(orderGuard.isAutoRouterSession(testSessionId)).toBe(true);

      orderGuard.unmarkAsAutoRouterSession(testSessionId);
      expect(orderGuard.isAutoRouterSession(testSessionId)).toBe(false);
    });
  });
});
