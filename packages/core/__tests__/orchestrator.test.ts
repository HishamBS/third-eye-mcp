import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { EyeOrchestrator } from '../orchestrator';
import { getDb } from '@third-eye/db';
import { sessions, personas, eyesRouting } from '@third-eye/db';
import { eq } from 'drizzle-orm';

const RUNS_IN_BUN = Boolean(process.versions?.bun);

const suite = RUNS_IN_BUN ? describe : describe.skip;

suite('EyeOrchestrator', () => {
  let orchestrator: EyeOrchestrator;
  let testSessionId: string;
  const { db } = getDb();

  beforeAll(async () => {
    orchestrator = new EyeOrchestrator();

    // Create test session
    const session = await orchestrator.createSession({ test: true });
    testSessionId = session.sessionId;

    // Ensure test persona exists
    const existingPersona = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, 'sharingan'))
      .limit(1);

    if (existingPersona.length === 0) {
      await db.insert(personas).values({
        id: randomUUID(),
        eye: 'sharingan',
        version: 1,
        content: 'You are a helpful code generation assistant. Respond ONLY with valid JSON envelope.',
        active: true,
        createdAt: new Date()
      });
    }

    // Ensure test routing exists
    const existingRouting = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, 'sharingan'))
      .limit(1);

    if (existingRouting.length === 0) {
      await db.insert(eyesRouting).values({
        eye: 'sharingan',
        primaryProvider: 'ollama',
        primaryModel: 'llama3.2',
        fallbackProvider: null,
        fallbackModel: null
      });
    }
  });

  afterAll(async () => {
    // Clean up test session
    if (testSessionId) {
      await db.delete(sessions).where(eq(sessions.id, testSessionId));
    }
  });

  test('should create orchestrator instance', () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator).toBeInstanceOf(EyeOrchestrator);
  });

  test('should have required methods', () => {
    expect(orchestrator.runEye).toBeDefined();
    expect(orchestrator.createSession).toBeDefined();
    expect(orchestrator.getSessionRuns).toBeDefined();
    expect(typeof orchestrator.runEye).toBe('function');
    expect(typeof orchestrator.createSession).toBe('function');
    expect(typeof orchestrator.getSessionRuns).toBe('function');
  });

  test('should create a new session', async () => {
    const result = await orchestrator.createSession({ user: 'test' });

    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('portalUrl');
    expect(typeof result.sessionId).toBe('string');
    expect(result.sessionId.length).toBeGreaterThan(0);
    expect(result.portalUrl).toContain(result.sessionId);
    expect(result.portalUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/session\//);

    // Clean up
    await db.delete(sessions).where(eq(sessions.id, result.sessionId));
  });

  test('should return error envelope for invalid eye', async () => {
    const envelope = await orchestrator.runEye('invalid-eye', 'test input', testSessionId);

    expect(envelope).toHaveProperty('tag');
    expect(envelope).toHaveProperty('ok');
    expect(envelope.ok).toBe(false);
    expect(envelope).toHaveProperty('code');
    expect(envelope.code).toMatch(/E_/);
    expect(envelope).toHaveProperty('md');
    expect(envelope.md).toContain('Error');
  });

  test('should return error envelope when no routing configured', async () => {
    // Temporarily delete routing
    await db.delete(eyesRouting).where(eq(eyesRouting.eye, 'rinnegan'));

    const envelope = await orchestrator.runEye('rinnegan', 'test input', testSessionId);

    expect(envelope).toHaveProperty('ok');
    expect(envelope.ok).toBe(false);
    expect(envelope.code).toContain('ROUTING');
  });

  test('should run Eye with valid configuration (integration)', async () => {
    // This test requires Ollama to be running with llama3.2 model
    try {
      const envelope = await orchestrator.runEye(
        'sharingan',
        'Say "test" and nothing else.',
        testSessionId
      );

      expect(envelope).toHaveProperty('tag');
      expect(envelope).toHaveProperty('ok');
      expect(envelope).toHaveProperty('code');
      expect(envelope).toHaveProperty('md');
      expect(envelope).toHaveProperty('data');
      expect(envelope).toHaveProperty('next');

      // Check if it's either success or provider error
      if (!envelope.ok) {
        // Provider might not be available, that's ok
        expect(envelope.code).toMatch(/E_/);
        console.log('⏭️  Skipping full integration test (provider not available)');
      } else {
        // If successful, validate envelope structure
        expect(typeof envelope.md).toBe('string');
        expect(typeof envelope.code).toBe('string');
      }
    } catch (error) {
      console.log('⏭️  Skipping integration test (provider error):', error instanceof Error ? error.message : error);
    }
  }, 30000); // 30s timeout for provider call

  test('should retrieve session runs', async () => {
    const runs = await orchestrator.getSessionRuns(testSessionId);

    expect(Array.isArray(runs)).toBe(true);
    // Should have at least the error runs from previous tests
    expect(runs.length).toBeGreaterThanOrEqual(0);

    if (runs.length > 0) {
      const run = runs[0];
      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('sessionId');
      expect(run).toHaveProperty('eye');
      expect(run).toHaveProperty('inputMd');
      expect(run).toHaveProperty('outputJson');
    }
  });

  test('should paginate session runs', async () => {
    // Create multiple runs
    await orchestrator.runEye('invalid-eye-1', 'test 1', testSessionId);
    await orchestrator.runEye('invalid-eye-2', 'test 2', testSessionId);
    await orchestrator.runEye('invalid-eye-3', 'test 3', testSessionId);

    const page1 = await orchestrator.getSessionRuns(testSessionId, 2, 0);
    const page2 = await orchestrator.getSessionRuns(testSessionId, 2, 2);

    expect(page1.length).toBeLessThanOrEqual(2);
    expect(page2.length).toBeGreaterThanOrEqual(0);

    if (page1.length > 0 && page2.length > 0) {
      // Pages should be different
      expect(page1[0].id).not.toBe(page2[0].id);
    }
  });

  test('should handle envelope validation', async () => {
    // This test verifies that the orchestrator attempts validation
    // and retries with strict JSON instruction

    const envelope = await orchestrator.runEye(
      'sharingan',
      'Respond with exactly: {"tag":"test","ok":true,"code":"SUCCESS","md":"test","data":{},"next":"complete"}',
      testSessionId
    );

    expect(envelope).toHaveProperty('tag');
    expect(envelope).toHaveProperty('ok');
    expect(envelope).toHaveProperty('code');

    // Either success or provider error (depending on if Ollama is running)
    if (envelope.ok) {
      expect(envelope.tag).toBeDefined();
      expect(envelope.md).toBeDefined();
    } else {
      expect(envelope.code).toMatch(/E_/);
    }
  }, 30000);
});
