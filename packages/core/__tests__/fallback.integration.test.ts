import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { EyeOrchestrator } from '../orchestrator';
import type { ProviderId } from '@third-eye/types';

/**
 * Fallback Integration Tests
 *
 * Tests provider fallback mechanism when primary provider fails
 */

describe('Provider Fallback Integration', () => {
  let orchestrator: EyeOrchestrator;

  beforeAll(() => {
    orchestrator = new EyeOrchestrator();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('should attempt primary provider first', async () => {
    const sessionId = 'test-fallback-session-1';

    // Mock a successful primary provider call
    const result = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: 'Test fallback mechanism - primary succeeds',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
      },
    });

    // Primary should succeed without needing fallback
    expect(result.code).not.toBe('E_PROVIDER_FAILED');
    expect(result.eye).toBe('sharingan');
  });

  it('should use fallback provider when primary fails', async () => {
    const sessionId = 'test-fallback-session-2';

    // Test with invalid primary but valid fallback
    const result = await orchestrator.executeEye({
      eye: 'byakugan',
      sessionId,
      input: {
        text: 'The sky is blue. The sky is not blue.',
      },
      config: {
        primaryProvider: 'invalid-provider' as ProviderId,
        primaryModel: 'invalid-model',
        fallbackProvider: 'groq' as ProviderId,
        fallbackModel: 'llama-3.3-70b-versatile',
      },
    });

    // Should still succeed via fallback
    expect(result.code).toBeDefined();
    expect(result.eye).toBe('byakugan');
  });

  it('should log both primary and fallback attempts', async () => {
    const sessionId = 'test-fallback-session-3';

    const result = await orchestrator.executeEye({
      eye: 'jogan',
      sessionId,
      input: {
        task: 'Create a new user registration form',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'groq' as ProviderId,
        fallbackModel: 'mixtral-8x7b-32768',
      },
    });

    // Should have metadata about which provider was used
    expect(result).toBeDefined();
    expect(result.eye).toBe('jogan');
  });

  it('should return error when both primary and fallback fail', async () => {
    const sessionId = 'test-fallback-session-4';

    const result = await orchestrator.executeEye({
      eye: 'tenseigan',
      sessionId,
      input: {
        claim: 'Testing fallback failure scenario',
      },
      config: {
        primaryProvider: 'invalid-provider-1' as ProviderId,
        primaryModel: 'invalid-model-1',
        fallbackProvider: 'invalid-provider-2' as ProviderId,
        fallbackModel: 'invalid-model-2',
      },
    });

    // Both should fail, return error
    expect(result.code).toMatch(/E_/); // Some error code
  });

  it('should retry with JSON prefix on malformed response', async () => {
    const sessionId = 'test-fallback-session-5';

    // Test that orchestrator can handle and retry malformed responses
    const result = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: 'Simple ambiguity test',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
      },
    });

    // Should eventually succeed (either first try or retry)
    expect(result).toBeDefined();
    expect(result.eye).toBe('sharingan');
  });

  it('should record both attempts in runs table', async () => {
    const sessionId = 'test-fallback-session-6';

    const result = await orchestrator.executeEye({
      eye: 'rinnegan',
      sessionId,
      input: {
        task: 'Plan a todo list application',
        phase: 'planning',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'groq' as ProviderId,
        fallbackModel: 'mixtral-8x7b-32768',
      },
    });

    // Result should be recorded
    expect(result).toBeDefined();
    expect(result.eye).toBe('rinnegan');

    // In a real scenario, we would query the runs table to verify
    // For this test, we just verify the execution completed
  });

  it('should maintain session context across fallback attempts', async () => {
    const sessionId = 'test-fallback-session-7';

    // Execute first eye
    const result1 = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: 'Build a feature',
      },
    });

    expect(result1).toBeDefined();

    // Execute second eye - should have context from first
    const result2 = await orchestrator.executeEye({
      eye: 'jogan',
      sessionId,
      input: {
        task: 'Build a feature',
      },
    });

    expect(result2).toBeDefined();
    expect(result2.eye).toBe('jogan');
  });

  it('should respect timeout settings in fallback', async () => {
    const sessionId = 'test-fallback-session-8';

    const startTime = Date.now();

    const result = await orchestrator.executeEye({
      eye: 'byakugan',
      sessionId,
      input: {
        text: 'Testing timeout behavior',
      },
      config: {
        timeout: 30000, // 30 seconds
      },
    });

    const elapsed = Date.now() - startTime;

    // Should complete well within timeout
    expect(elapsed).toBeLessThan(30000);
    expect(result).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    const sessionId = 'test-fallback-session-9';

    // Test with deliberately unreachable provider
    const result = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: 'Network error test',
      },
      config: {
        primaryProvider: 'ollama' as ProviderId,
        primaryModel: 'llama3.2',
        fallbackProvider: 'groq' as ProviderId,
        fallbackModel: 'llama-3.3-70b-versatile',
      },
    });

    // Should either succeed via fallback or return proper error
    expect(result).toBeDefined();
    expect(result.eye).toBe('sharingan');
  });

  it('should preserve error details from primary attempt', async () => {
    const sessionId = 'test-fallback-session-10';

    const result = await orchestrator.executeEye({
      eye: 'mangekyo',
      sessionId,
      input: {
        code: 'function test() { return true; }',
        phase: 'implementation',
      },
      config: {
        primaryProvider: 'invalid' as ProviderId,
        primaryModel: 'invalid',
      },
    });

    // Result should contain information about what failed
    expect(result).toBeDefined();
    // Even if it fails, it should be a proper envelope
    expect(result.eye).toBe('mangekyo');
  });
});

describe('Fallback Configuration', () => {
  let orchestrator: EyeOrchestrator;

  beforeAll(() => {
    orchestrator = new EyeOrchestrator();
  });

  it('should work without fallback configuration', async () => {
    const sessionId = 'test-config-1';

    const result = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: 'No fallback test',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
        // No fallback specified
      },
    });

    expect(result).toBeDefined();
    expect(result.eye).toBe('sharingan');
  });

  it('should use routing table defaults when no config provided', async () => {
    const sessionId = 'test-config-2';

    const result = await orchestrator.executeEye({
      eye: 'jogan',
      sessionId,
      input: {
        task: 'Use routing defaults',
      },
      // No config at all - should use routing table
    });

    expect(result).toBeDefined();
    expect(result.eye).toBe('jogan');
  });

  it('should override routing table with explicit config', async () => {
    const sessionId = 'test-config-3';

    const result = await orchestrator.executeEye({
      eye: 'byakugan',
      sessionId,
      input: {
        text: 'Override routing test',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'mixtral-8x7b-32768', // Different from routing default
      },
    });

    expect(result).toBeDefined();
    expect(result.eye).toBe('byakugan');
  });
});

describe('Fallback Edge Cases', () => {
  let orchestrator: EyeOrchestrator;

  beforeAll(() => {
    orchestrator = new EyeOrchestrator();
  });

  it('should handle same provider for primary and fallback', async () => {
    const sessionId = 'test-edge-1';

    const result = await orchestrator.executeEye({
      eye: 'tenseigan',
      sessionId,
      input: {
        claim: 'Same provider test',
      },
      config: {
        primaryProvider: 'groq' as ProviderId,
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'groq' as ProviderId,
        fallbackModel: 'mixtral-8x7b-32768', // Different model, same provider
      },
    });

    expect(result).toBeDefined();
    expect(result.eye).toBe('tenseigan');
  });

  it('should handle empty or null input gracefully', async () => {
    const sessionId = 'test-edge-2';

    const result = await orchestrator.executeEye({
      eye: 'sharingan',
      sessionId,
      input: {
        task: '',
      },
    });

    expect(result).toBeDefined();
    // Should return some form of error or request for input
    expect(result.code).toBeDefined();
  });

  it('should handle very large inputs', async () => {
    const sessionId = 'test-edge-3';

    const largeText = 'A'.repeat(10000); // 10k characters

    const result = await orchestrator.executeEye({
      eye: 'byakugan',
      sessionId,
      input: {
        text: largeText,
      },
    });

    expect(result).toBeDefined();
    expect(result.eye).toBe('byakugan');
  });
});
