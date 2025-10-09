import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelineEvents, eyesCustom, eyesRouting, personas } from '@third-eye/db';
import { EyeOrchestrator } from '@third-eye/core';
import { sessionManager } from '@third-eye/core/session-manager';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP } from '@third-eye/db/defaults';
import type { Envelope } from '@third-eye/types';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

/**
 * Eyes API Routes
 *
 * All Eyes now route through the orchestrator which:
 * 1. Loads the persona from database
 * 2. Calls the configured LLM provider
 * 3. Returns the structured envelope response
 *
 * This makes Eyes true LLM-powered personas instead of hardcoded algorithms.
 */

const app = new Hono();
const orchestrator = new EyeOrchestrator();

const BUILT_IN_EYE_IDS = DEFAULT_PERSONAS.map((persona) => persona.eye);

async function getActivePersonasMap(db: ReturnType<typeof getDb>['db'], eyes: string[]) {
  if (eyes.length === 0) {
    return new Map<string, typeof personas.$inferSelect>();
  }

  const rows = await db
    .select()
    .from(personas)
    .where(inArray(personas.eye, eyes))
    .orderBy(desc(personas.version))
    .all();

  const map = new Map<string, typeof personas.$inferSelect>();
  for (const row of rows) {
    if (row.active) {
      map.set(row.eye, row);
      continue;
    }

    if (!map.has(row.eye)) {
      map.set(row.eye, row);
    }
  }

  return map;
}

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Zod schemas for validation
const eyeRequestSchema = z.object({
  context: z.object({
    session_id: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
  sessionId: z.string().optional(),
  input: z.string().optional(),
  payload: z.object({
    prompt: z.string().optional(),
    clarifications: z.any().optional(),
    task: z.string().optional(),
    plan: z.any().optional(),
    scaffold: z.any().optional(),
    diffs: z.any().optional(),
    reasoning: z.any().optional(),
    tests: z.any().optional(),
    coverage: z.any().optional(),
    docs: z.any().optional(),
    content: z.any().optional(),
    sources: z.any().optional(),
    implementation: z.any().optional(),
  }).optional(),
  prompt: z.string().optional(),
  task: z.string().optional(),
  plan: z.any().optional(),
  scaffold: z.any().optional(),
  diffs: z.any().optional(),
  reasoning: z.any().optional(),
  tests: z.any().optional(),
  coverage: z.any().optional(),
  docs: z.any().optional(),
  content: z.any().optional(),
  sources: z.any().optional(),
  implementation: z.any().optional(),
});

const createCustomEyeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.any(),
  outputSchema: z.any(),
  personaId: z.string().optional(),
  defaultRouting: z.any().optional(),
});

const eyeTestSchema = z.object({
  input: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  task: z.string().min(1).optional(),
  sessionId: z.string().optional(),
});

// Helper to log pipeline events
async function logPipelineEvent(sessionId: string, eye: string, response: Envelope) {
  try {
    const { db } = getDb();
    await db.insert(pipelineEvents).values({
      id: nanoid(),
      sessionId,
      eye,
      type: 'eye_call',
      code: response.code,
      md: response.md,
      dataJson: response.data,
      nextAction: response.next,
      createdAt: new Date(),
    }).run();

    // Broadcast to WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'pipeline_event',
        sessionId,
        data: {
          eye,
          code: response.code,
          md: response.md,
          ...response,
        },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }
  } catch (error) {
    console.error('Failed to log pipeline event:', error);
  }
}

// NOTE: Direct Eye POST routes removed - all execution goes through /api/mcp/run (Golden Rule #1)

/**
 * POST /eyes/:id/test - Execute a single Eye for playground validation
 */
app.post('/:id/test', async (c) => {
  const eyeId = c.req.param('id');

  try {
    const body = await c.req.json();
    const parsed = eyeTestSchema.parse(body);
    const candidateInput = parsed.input || parsed.prompt || parsed.task;

    if (!candidateInput || candidateInput.trim().length === 0) {
      return createErrorResponse(c, {
        title: 'Invalid input',
        status: 400,
        detail: 'Provide a non-empty string in "input", "prompt", or "task".',
        code: 'E_EMPTY_INPUT',
      });
    }

    let sessionId = parsed.sessionId ?? null;
    if (sessionId) {
      const existing = await sessionManager.getSession(sessionId);
      if (!existing) {
        sessionId = null;
      }
    }

    if (!sessionId) {
      const session = await sessionManager.createSession({
        agentName: 'Playground Tester',
        metadata: {
          entryTool: eyeId,
          source: 'playground',
        },
      });
      sessionId = session.id;
    }

    if (!sessionId) {
      return createInternalErrorResponse(c, 'Failed to create playground session for Eye execution');
    }

    const result = await orchestrator.runEye(eyeId, candidateInput.trim(), sessionId);
    await logPipelineEvent(sessionId, eyeId, result as Envelope);

    return createSuccessResponse(c, {
      sessionId,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: error.issues.map((issue) => issue.message).join('; '),
        code: 'E_INVALID_PAYLOAD',
      });
    }

    console.error('[Eyes API] Failed to execute Eye:', error);
    return createInternalErrorResponse(c, error instanceof Error ? error.message : 'Failed to execute Eye');
  }
});

/**
 * GET /eyes/registry - Get all built-in Eyes from registry
 */
app.get('/registry', async (c) => {
  const { db } = getDb();
  const activePersonaMap = await getActivePersonasMap(db, BUILT_IN_EYE_IDS);

  const payload = DEFAULT_PERSONAS.map((definition) => {
    const active = activePersonaMap.get(definition.eye);
    return {
      id: definition.eye,
      name: definition.name,
      version: active?.version ?? definition.version,
      description: definition.description,
      source: 'built-in' as const,
      personaTemplate: active?.content ?? definition.content,
    };
  });

  return createSuccessResponse(c, payload);
});

/**
 * GET /eyes/custom - Get all user-created custom Eyes
 */
app.get('/custom', async (c) => {
  const { db } = getDb();
  const customEyes = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.active, true))
    .orderBy(desc(eyesCustom.createdAt))
    .all();

  return createSuccessResponse(c,
    customEyes.map((eye) => ({
      id: eye.id,
      name: eye.name,
      version: eye.version,
      description: eye.description,
      source: 'custom',
      inputSchema: eye.inputSchemaJson,
      outputSchema: eye.outputSchemaJson,
      personaId: eye.personaId,
      defaultRouting: eye.defaultRouting,
      createdAt: eye.createdAt,
    }))
  );
});

/**
 * GET /eyes/all - Get ALL Eyes (built-in + custom) - NO HARDCODING
 */
app.get('/all', async (c) => {
  const { db } = getDb();

  const activePersonaMap = await getActivePersonasMap(db, BUILT_IN_EYE_IDS);
  const builtInEyes = DEFAULT_PERSONAS.map((definition) => {
    const active = activePersonaMap.get(definition.eye);
    return {
      id: definition.eye,
      name: definition.name,
      version: active?.version ?? definition.version,
      description: definition.description,
      source: 'built-in' as const,
      personaTemplate: active?.content ?? definition.content,
    };
  });

  const customEyes = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.active, true))
    .orderBy(desc(eyesCustom.createdAt))
    .all();

  const customEyesFormatted = customEyes.map((eye) => ({
    id: eye.id,
    name: eye.name,
    version: eye.version.toString(),
    description: eye.description,
    source: 'custom' as const,
    inputSchema: eye.inputSchemaJson,
    outputSchema: eye.outputSchemaJson,
    personaId: eye.personaId,
    defaultRouting: eye.defaultRouting,
    createdAt: eye.createdAt,
  }));

  return createSuccessResponse(c, [...builtInEyes, ...customEyesFormatted]);
});

/**
 * GET /eyes/:id - Get specific Eye by ID with complete details
 */
app.get('/:id', async (c) => {
  const eyeId = c.req.param('id');

  try {
    const { db } = getDb();

    // Check if it's a built-in Eye first
    const builtInDefinition = DEFAULT_PERSONA_MAP[eyeId];
    if (builtInDefinition) {
      const activePersona = await db
        .select()
        .from(personas)
        .where(and(eq(personas.eye, eyeId), eq(personas.active, true)))
        .get();

      return createSuccessResponse(c, {
        id: eyeId,
        name: builtInDefinition.name,
        version: activePersona?.version ?? builtInDefinition.version,
        description: builtInDefinition.description,
        source: 'built-in' as const,
        personaTemplate: activePersona?.content ?? builtInDefinition.content,
      });
    }

    // Check if it's a custom Eye
    const customEye = await db
      .select()
      .from(eyesCustom)
      .where(eq(eyesCustom.id, eyeId))
      .limit(1)
      .all();

    if (customEye.length > 0) {
      const eye = customEye[0];
      return createSuccessResponse(c, {
        id: eye.id,
        name: eye.name,
        version: eye.version.toString(),
        description: eye.description,
        source: 'custom',
        inputSchema: eye.inputSchemaJson,
        outputSchema: eye.outputSchemaJson,
        personaId: eye.personaId,
        defaultRouting: eye.defaultRouting,
        createdAt: eye.createdAt,
      });
    }

    return createErrorResponse(c, {
      title: 'Eye Not Found',
      status: 404,
      detail: `Eye with id ${eyeId} not found`
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch Eye: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /eyes/:id/personas - Get all persona versions for specific Eye
 */
app.get('/:id/personas', async (c) => {
  const eyeId = c.req.param('id');

  try {
    const { db } = getDb();
    const eyePersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, eyeId))
      .orderBy(desc(personas.version))
      .all();

    const active = eyePersonas.find(p => p.active);

    return createSuccessResponse(c, {
      eye: eyeId,
      versions: eyePersonas,
      activeVersion: active?.version || null,
    });
  } catch (error) {
    return createInternalErrorResponse(c, 'Failed to fetch Eye personas');
  }
});

/**
 * PATCH /eyes/:id/name - Update Eye display name
 */
app.patch('/:id/name', async (c) => {
  try {
    const eyeId = c.req.param('id');
    const body = await c.req.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Display name is required'
      });
    }

    const { db } = getDb();
    const { eyeSettings } = await import('@third-eye/db/schema');
    const { eq } = await import('drizzle-orm');

    // Check if Eye settings exist
    const existing = await db
      .select()
      .from(eyeSettings)
      .where(eq(eyeSettings.eye, eyeId))
      .get();

    if (existing) {
      // Update existing
      await db
        .update(eyeSettings)
        .set({
          displayName: displayName.trim(),
          updatedAt: new Date(),
        })
        .where(eq(eyeSettings.eye, eyeId))
        .run();
    } else {
      // Insert new
      await db
        .insert(eyeSettings)
        .values({
          eye: eyeId,
          displayName: displayName.trim(),
          description: null,
          updatedAt: new Date(),
        })
        .run();
    }

    return createSuccessResponse(c, {
      eye: eyeId,
      displayName: displayName.trim(),
      message: 'Eye display name updated successfully',
    });
  } catch (error) {
    console.error('[Eyes API] Failed to update Eye name:', error);
    return createInternalErrorResponse(c, 'Failed to update Eye name');
  }
});

/**
 * POST /eyes/custom - Create new custom Eye
 */
app.post('/custom', validateBodyWithEnvelope(createCustomEyeSchema), async (c) => {
  try {
    const { name, description, inputSchema, outputSchema, personaId, defaultRouting } = c.get('validatedBody');
    console.log('[Custom Eye] Creating with data:', { name, description, hasInputSchema: !!inputSchema, hasOutputSchema: !!outputSchema });

    const { db } = getDb();

  // Check if Eye with this name already exists
  const existing = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.name, name))
    .orderBy(desc(eyesCustom.version))
    .limit(1)
    .all();

  const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

  const id = nanoid();
  const now = new Date();

  // Deactivate previous versions
  if (existing.length > 0) {
    await db
      .update(eyesCustom)
      .set({ active: false })
      .where(eq(eyesCustom.name, name))
      .run();
  }

  // Insert new version
  await db.insert(eyesCustom).values({
    id,
    name,
    version: nextVersion,
    description,
    inputSchemaJson: inputSchema,
    outputSchemaJson: outputSchema,
    personaId: personaId || null,
    defaultRouting: defaultRouting || null,
    active: true,
    createdAt: now,
  }).run();

    console.log('[Custom Eye] Successfully created:', { id, name, version: nextVersion });
    return createSuccessResponse(c, { id, version: nextVersion, message: 'Custom Eye created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[Custom Eye] Creation failed:', error);
    return createInternalErrorResponse(c, `Failed to create custom eye: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * PUT /eyes/custom/:id - Update existing custom Eye
 */
app.put('/custom/:id', validateBodyWithEnvelope(createCustomEyeSchema), async (c) => {
  const id = c.req.param('id');
  const { name, description, inputSchema, outputSchema, personaId, defaultRouting } = c.get('validatedBody');

  const { db } = getDb();

  // Check if Eye exists
  const existing = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.id, id))
    .limit(1)
    .all();

  if (existing.length === 0) {
    return createErrorResponse(c, {
      title: 'Eye Not Found',
      status: 404,
      detail: `Custom Eye with id ${id} not found`
    });
  }

  // Update the Eye
  await db
    .update(eyesCustom)
    .set({
      description,
      inputSchemaJson: inputSchema,
      outputSchemaJson: outputSchema,
      personaId: personaId || null,
      defaultRouting: defaultRouting || null,
    })
    .where(eq(eyesCustom.id, id))
    .run();

  return createSuccessResponse(c, { id, message: 'Custom Eye updated successfully' });
});

/**
 * DELETE /eyes/custom/:id - Delete (deactivate) custom Eye
 */
app.delete('/custom/:id', async (c) => {
  const id = c.req.param('id');

  const { db } = getDb();

  const existing = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.id, id))
    .limit(1)
    .all();

  if (existing.length === 0) {
    return createErrorResponse(c, {
      title: 'Eye Not Found',
      status: 404,
      detail: `Custom Eye with id ${id} not found`
    });
  }

  await db
    .update(eyesCustom)
    .set({ active: false })
    .where(eq(eyesCustom.id, id))
    .run();

  return createSuccessResponse(c, { message: 'Custom Eye deleted successfully' });
});

/**
 * POST /eyes/custom/:id/test - Test a custom Eye with sample input
 */
app.post('/custom/:id/test', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const testInput = body.input || body.testInput;

  if (!testInput) {
    return createErrorResponse(c, {
      title: 'Missing Input',
      status: 400,
      detail: 'testInput field is required'
    });
  }

  const { db } = getDb();

  const customEye = await db
    .select()
    .from(eyesCustom)
    .where(eq(eyesCustom.id, id))
    .limit(1)
    .all();

  if (customEye.length === 0) {
    return createErrorResponse(c, {
      title: 'Eye Not Found',
      status: 404,
      detail: `Custom Eye with id ${id} not found`
    });
  }

  const eye = customEye[0];
  const sessionId = nanoid();

  try {
    const response = await orchestrator.runEye(eye.name, testInput, sessionId);
    return createSuccessResponse(c, {
      eyeName: eye.name,
      testInput,
      response,
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default app;
