import { describe, test, expect, beforeEach } from 'vitest';
import { getDb } from '../index';
import {
  sessions,
  runs,
  personas,
  eyesRouting,
  strictnessProfiles,
  pipelines,
  prompts,
  providerKeys,
  modelsCache,
  appSettings,
} from '../schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

describe('Database Schema - Sessions', () => {
  let db: ReturnType<typeof getDb>['db'];

  beforeEach(() => {
    const result = getDb();
    db = result.db;
  });

  test('should create a session', async () => {
    const sessionId = nanoid(12);
    const newSession = {
      id: sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: { test: 'value' },
    };

    await db.insert(sessions).values(newSession).run();

    const retrieved = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(sessionId);
    expect(retrieved?.status).toBe('active');
  });

  test('should update session status', async () => {
    const sessionId = nanoid(12);

    await db.insert(sessions).values({
      id: sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: null,
    }).run();

    await db
      .update(sessions)
      .set({ status: 'completed' })
      .where(eq(sessions.id, sessionId))
      .run();

    const updated = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    expect(updated?.status).toBe('completed');
  });

  test('should delete a session', async () => {
    const sessionId = nanoid(12);

    await db.insert(sessions).values({
      id: sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: null,
    }).run();

    await db.delete(sessions).where(eq(sessions.id, sessionId)).run();

    const deleted = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    expect(deleted).toBeUndefined();
  });
});

describe('Database Schema - Personas', () => {
  let db: ReturnType<typeof getDb>['db'];

  beforeEach(() => {
    const result = getDb();
    db = result.db;
  });

  test('should create a persona', async () => {
    const personaData = {
      eye: 'sharingan',
      version: 1,
      content: 'Test persona content',
      active: true,
      createdAt: new Date(),
    };

    await db.insert(personas).values(personaData).run();

    const retrieved = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, 'sharingan'))
      .get();

    expect(retrieved).toBeDefined();
    expect(retrieved?.version).toBe(1);
    expect(retrieved?.active).toBe(true);
  });

  test('should support multiple versions of same eye', async () => {
    await db.insert(personas).values({
      eye: 'rinnegan',
      version: 1,
      content: 'Version 1',
      active: false,
      createdAt: new Date(),
    }).run();

    await db.insert(personas).values({
      eye: 'rinnegan',
      version: 2,
      content: 'Version 2',
      active: true,
      createdAt: new Date(),
    }).run();

    const allVersions = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, 'rinnegan'))
      .all();

    expect(allVersions).toHaveLength(2);
  });

  test('should activate/deactivate personas', async () => {
    await db.insert(personas).values({
      eye: 'tenseigan',
      version: 1,
      content: 'Test',
      active: true,
      createdAt: new Date(),
    }).run();

    await db
      .update(personas)
      .set({ active: false })
      .where(eq(personas.eye, 'tenseigan'))
      .run();

    const updated = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, 'tenseigan'))
      .get();

    expect(updated?.active).toBe(false);
  });
});

describe('Database Schema - Eyes Routing', () => {
  let db: ReturnType<typeof getDb>['db'];

  beforeEach(() => {
    const result = getDb();
    db = result.db;
  });

  test('should create routing configuration', async () => {
    const routing = {
      eye: 'sharingan',
      primaryProvider: 'groq',
      primaryModel: 'llama-3.3-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    };

    await db.insert(eyesRouting).values(routing).run();

    const retrieved = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, 'sharingan'))
      .get();

    expect(retrieved).toBeDefined();
    expect(retrieved?.primaryProvider).toBe('groq');
    expect(retrieved?.fallbackProvider).toBe('openrouter');
  });

  test('should allow routing without fallback', async () => {
    const routing = {
      eye: 'byakugan',
      primaryProvider: 'ollama',
      primaryModel: 'llama3.1:8b',
      fallbackProvider: null,
      fallbackModel: null,
    };

    await db.insert(eyesRouting).values(routing).run();

    const retrieved = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, 'byakugan'))
      .get();

    expect(retrieved?.fallbackProvider).toBeNull();
    expect(retrieved?.fallbackModel).toBeNull();
  });

  test('should update routing configuration', async () => {
    await db.insert(eyesRouting).values({
      eye: 'jogan',
      primaryProvider: 'groq',
      primaryModel: 'llama-3.3-70b-versatile',
      fallbackProvider: null,
      fallbackModel: null,
    }).run();

    await db
      .update(eyesRouting)
      .set({
        fallbackProvider: 'openrouter',
        fallbackModel: 'anthropic/claude-3.5-sonnet',
      })
      .where(eq(eyesRouting.eye, 'jogan'))
      .run();

    const updated = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, 'jogan'))
      .get();

    expect(updated?.fallbackProvider).toBe('openrouter');
  });
});

describe('Database Schema - Runs', () => {
  let db: ReturnType<typeof getDb>['db'];
  let sessionId: string;

  beforeEach(async () => {
    const result = getDb();
    db = result.db;

    // Create a session first
    sessionId = nanoid(12);
    await db.insert(sessions).values({
      id: sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: null,
    }).run();
  });

  test('should create a run', async () => {
    const runId = nanoid(16);
    const runData = {
      id: runId,
      sessionId,
      eye: 'sharingan',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      inputMd: 'Test input',
      outputJson: { ok: true, code: 'OK' },
      tokensIn: 100,
      tokensOut: 200,
      latencyMs: 1500,
      createdAt: new Date(),
    };

    await db.insert(runs).values(runData).run();

    const retrieved = await db
      .select()
      .from(runs)
      .where(eq(runs.id, runId))
      .get();

    expect(retrieved).toBeDefined();
    expect(retrieved?.eye).toBe('sharingan');
    expect(retrieved?.tokensIn).toBe(100);
  });

  test('should retrieve runs by session', async () => {
    await db.insert(runs).values({
      id: nanoid(16),
      sessionId,
      eye: 'sharingan',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      inputMd: 'Test 1',
      outputJson: {},
      tokensIn: 50,
      tokensOut: 100,
      latencyMs: 1000,
      createdAt: new Date(),
    }).run();

    await db.insert(runs).values({
      id: nanoid(16),
      sessionId,
      eye: 'rinnegan',
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      inputMd: 'Test 2',
      outputJson: {},
      tokensIn: 75,
      tokensOut: 150,
      latencyMs: 2000,
      createdAt: new Date(),
    }).run();

    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .all();

    expect(sessionRuns).toHaveLength(2);
  });
});

describe('Database Schema - App Settings', () => {
  let db: ReturnType<typeof getDb>['db'];

  beforeEach(() => {
    const result = getDb();
    db = result.db;
  });

  test('should store app settings', async () => {
    await db.insert(appSettings).values({
      key: 'theme',
      value: JSON.stringify({ darkMode: true }),
    }).run();

    const retrieved = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'theme'))
      .get();

    expect(retrieved).toBeDefined();
    const parsed = JSON.parse(retrieved!.value);
    expect(parsed.darkMode).toBe(true);
  });

  test('should update app settings', async () => {
    await db.insert(appSettings).values({
      key: 'auto_open',
      value: JSON.stringify(true),
    }).run();

    await db
      .update(appSettings)
      .set({ value: JSON.stringify(false) })
      .where(eq(appSettings.key, 'auto_open'))
      .run();

    const updated = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'auto_open'))
      .get();

    expect(JSON.parse(updated!.value)).toBe(false);
  });
});
