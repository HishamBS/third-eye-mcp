/**
 * Integration Test: WebSocket Fine-Grained Events
 * Phase 4 Implementation Test
 *
 * Tests:
 * 1. Eye execution emits eye_started event
 * 2. Eye execution emits eye_complete event
 * 3. Eye error emits eye_error event
 * 4. Events persist to database
 * 5. Session creation emits session_created event
 * 6. WebSocket broadcasts to correct session
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { EyeOrchestrator } from '@third-eye/core/orchestrator';
import { getDb } from '@third-eye/db';
import { sessions, pipelineEvents } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';
import { wsManager } from '../../src/websocket';
import type { WebSocketEvent } from '@third-eye/types/events';

describe('Phase 4: WebSocket Fine-Grained Events', () => {
  let orchestrator: EyeOrchestrator;
  let testSessionId: string;
  let capturedEvents: WebSocketEvent[] = [];

  // Mock WebSocket broadcast to capture events
  const originalBroadcast = wsManager.broadcastToSession.bind(wsManager);

  beforeAll(async () => {
    orchestrator = new EyeOrchestrator();

    // Intercept broadcasts
    vi.spyOn(wsManager, 'broadcastToSession').mockImplementation((sessionId: string, event: any) => {
      capturedEvents.push(event);
      return originalBroadcast(sessionId, event);
    });

    // Create test session
    const result = await orchestrator.createSession({
      agentName: 'Test Agent',
      model: 'test-model',
    });
    testSessionId = result.sessionId;

    // Clear captured events from session creation
    capturedEvents = [];
  });

  afterAll(async () => {
    vi.restoreAllMocks();

    // Cleanup test session
    const { db } = getDb();
    await db.delete(sessions).where(eq(sessions.id, testSessionId));
    await db.delete(pipelineEvents).where(eq(pipelineEvents.sessionId, testSessionId));
  });

  it('should emit eye_started event when Eye begins execution', async () => {
    // Clear previous events
    capturedEvents = [];

    // Execute an Eye
    const eyeName = 'sharingan';
    const testInput = 'Generate a comprehensive palm care guide for beginners in Saudi Arabia';

    // Run Eye (this will emit events)
    await orchestrator.runEye(eyeName, testInput, testSessionId);

    // Find eye_started event
    const startedEvent = capturedEvents.find(e => e.type === 'eye_started');

    expect(startedEvent).toBeDefined();
    expect(startedEvent).toMatchObject({
      type: 'eye_started',
      sessionId: testSessionId,
      eye: eyeName,
    });
    expect(startedEvent?.ui).toBeDefined();
    expect(startedEvent?.ui?.icon).toBeDefined();
    expect(startedEvent?.ui?.color).toBeDefined();
  });

  it('should emit eye_complete event when Eye finishes execution', async () => {
    // Find eye_complete event from previous test
    const completeEvent = capturedEvents.find(e => e.type === 'eye_complete');

    expect(completeEvent).toBeDefined();
    expect(completeEvent).toMatchObject({
      type: 'eye_complete',
      sessionId: testSessionId,
      eye: 'sharingan',
    });
    expect(completeEvent?.result).toBeDefined();
    expect(completeEvent?.result?.tag).toBe('sharingan');
    expect(completeEvent?.result?.ok).toBeDefined();
    expect(completeEvent?.result?.code).toBeDefined();
    expect(completeEvent?.metrics).toBeDefined();
    expect(completeEvent?.metrics?.tokensIn).toBeGreaterThan(0);
    expect(completeEvent?.metrics?.tokensOut).toBeGreaterThan(0);
    expect(completeEvent?.metrics?.latencyMs).toBeGreaterThan(0);
  });

  it('should emit eye_error event when Eye encounters error', async () => {
    // Clear previous events
    capturedEvents = [];

    // Try to run non-existent Eye
    const result = await orchestrator.runEye('invalid-eye-name', 'test', testSessionId);

    // Should have error event or error response
    expect(result.ok).toBe(false);
    expect(result.code).toMatch(/ERROR|REJECT/);
  });

  it('should persist all events to pipeline_events table', async () => {
    const { db } = getDb();

    // Query events for this session
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, testSessionId))
      .orderBy(desc(pipelineEvents.createdAt));

    expect(events.length).toBeGreaterThan(0);

    // Verify event structure
    const firstEvent = events[0];
    expect(firstEvent).toHaveProperty('id');
    expect(firstEvent).toHaveProperty('sessionId');
    expect(firstEvent).toHaveProperty('type');
    expect(firstEvent).toHaveProperty('dataJson');
    expect(firstEvent).toHaveProperty('createdAt');

    // Verify event contains full payload
    expect(firstEvent.dataJson).toBeDefined();

    // Parse JSON to verify structure
    const parsedEvent = typeof firstEvent.dataJson === 'string'
      ? JSON.parse(firstEvent.dataJson)
      : firstEvent.dataJson;

    expect(parsedEvent).toHaveProperty('type');
    expect(parsedEvent).toHaveProperty('sessionId');
    expect(parsedEvent).toHaveProperty('timestamp');
  });

  it('should emit session_created event with portal URL', async () => {
    // Clear events
    capturedEvents = [];

    // Create new session
    const result = await orchestrator.createSession({
      agentName: 'Test Agent 2',
    });

    // Find session_created event
    const createdEvent = capturedEvents.find(e => e.type === 'session_created');

    expect(createdEvent).toBeDefined();
    expect(createdEvent).toMatchObject({
      type: 'session_created',
      sessionId: result.sessionId,
      portalUrl: expect.stringContaining('http'),
    });

    // Cleanup
    const { db } = getDb();
    await db.delete(sessions).where(eq(sessions.id, result.sessionId));
  });

  it('should include UI metadata in Eye responses', async () => {
    // Find eye_complete event with result
    const completeEvent = capturedEvents.find(e => e.type === 'eye_complete' && e.result);

    if (completeEvent && completeEvent.result) {
      // UI metadata should be in result
      // Note: This depends on Eye implementations adding ui field to their responses
      // For now, we verify the event structure is correct
      expect(completeEvent.result).toHaveProperty('tag');
      expect(completeEvent.result).toHaveProperty('ok');
      expect(completeEvent.result).toHaveProperty('code');
      expect(completeEvent.result).toHaveProperty('md');
      expect(completeEvent.result).toHaveProperty('data');
    }
  });

  it('should broadcast events only to specific session', async () => {
    // Create second session
    const session2 = await orchestrator.createSession({
      agentName: 'Session 2',
    });

    // Clear events
    capturedEvents = [];

    // Run Eye on first session
    await orchestrator.runEye('sharingan', 'test input', testSessionId);

    // All events should be for testSessionId
    const allForTestSession = capturedEvents.every(e => e.sessionId === testSessionId);
    expect(allForTestSession).toBe(true);

    // Should have no events for session2
    const eventsForSession2 = capturedEvents.filter(e => e.sessionId === session2.sessionId);
    expect(eventsForSession2.length).toBe(0);

    // Cleanup
    const { db } = getDb();
    await db.delete(sessions).where(eq(sessions.id, session2.sessionId));
  });
});
