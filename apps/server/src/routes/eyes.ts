import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelineEvents, eyesCustom, eyesRouting } from '@third-eye/db';
import { EyeOrchestrator } from '@third-eye/core';
import { ALL_EYES, getAllEyeNames } from '@third-eye/eyes';
import { eq, desc } from 'drizzle-orm';
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

/**
 * POST /eyes/overseer/navigator
 * Entry point for all sessions. Provides pipeline overview and contract.
 */
app.post('/overseer/navigator', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const input = body.context?.description || body.input || 'Provide pipeline overview';

    const response = await orchestrator.runEye('overseer', input, sessionId);
    await logPipelineEvent(sessionId, 'overseer', response);

    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process navigator request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/sharingan/clarify
 * Ambiguity detection and code classification.
 */
app.post('/sharingan/clarify', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const prompt = body.payload?.prompt || body.prompt;

    if (!prompt) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'prompt field is required' });
    }

    const response = await orchestrator.runEye('sharingan', prompt, sessionId);
    await logPipelineEvent(sessionId, 'sharingan', response);

    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process clarify request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/helper/rewrite_prompt
 * Prompt restructuring into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format.
 */
app.post('/helper/rewrite_prompt', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const prompt = body.payload?.prompt || body.prompt;

    if (!prompt) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'prompt field is required' });
    }

    const input = body.payload?.clarifications
      ? `${prompt}\n\nClarifications: ${JSON.stringify(body.payload.clarifications)}`
      : prompt;

    const response = await orchestrator.runEye('helper', input, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process rewrite_prompt request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/jogan/confirm_intent
 * Intent confirmation by checking required prompt sections.
 */
app.post('/jogan/confirm_intent', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const prompt = body.payload?.prompt || body.prompt;

    if (!prompt) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'prompt field is required' });
    }

    const response = await orchestrator.runEye('jogan', prompt, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process confirm_intent request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/rinnegan/plan_requirements
 * Emit plan schema and example.
 */
app.post('/rinnegan/plan_requirements', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const task = body.payload?.task || body.task || 'General task planning';

    const response = await orchestrator.runEye('rinnegan_requirements', task, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process plan_requirements request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/rinnegan/plan_review
 * Review submitted plan against required sections and file impact table.
 */
app.post('/rinnegan/plan_review', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const plan = body.payload?.plan || body.plan;

    if (!plan) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'plan field is required' });
    }

    const response = await orchestrator.runEye('rinnegan_review', plan, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process plan_review request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/rinnegan/final_approval
 * Final approval gate checking all phases.
 */
app.post('/rinnegan/final_approval', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();

    const input = JSON.stringify({
      plan: body.payload?.plan || body.plan,
      scaffold: body.payload?.scaffold || body.scaffold,
      implementation: body.payload?.implementation || body.implementation,
      tests: body.payload?.tests || body.tests,
      docs: body.payload?.docs || body.docs,
    });

    const response = await orchestrator.runEye('rinnegan_approval', input, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process final_approval request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/mangekyo/review_scaffold
 * Scaffold review - validates file structure plan.
 */
app.post('/mangekyo/review_scaffold', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const scaffold = body.payload?.scaffold || body.scaffold;

    if (!scaffold) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'scaffold field is required' });
    }

    const response = await orchestrator.runEye('mangekyo_scaffold', scaffold, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process review_scaffold request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/mangekyo/review_impl
 * Implementation review - validates diffs and reasoning.
 */
app.post('/mangekyo/review_impl', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();

    const input = JSON.stringify({
      diffs: body.payload?.diffs || body.diffs,
      reasoning: body.payload?.reasoning || body.reasoning,
    });

    const response = await orchestrator.runEye('mangekyo_impl', input, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process review_impl request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/mangekyo/review_tests
 * Test review - validates coverage against thresholds.
 */
app.post('/mangekyo/review_tests', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();

    const input = JSON.stringify({
      tests: body.payload?.tests || body.tests,
      coverage: body.payload?.coverage || body.coverage,
    });

    const response = await orchestrator.runEye('mangekyo_tests', input, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process review_tests request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/mangekyo/review_docs
 * Documentation review - validates docs updates.
 */
app.post('/mangekyo/review_docs', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const docs = body.payload?.docs || body.docs;

    if (!docs) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'docs field is required' });
    }

    const response = await orchestrator.runEye('mangekyo_docs', docs, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process review_docs request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/tenseigan/validate_claims
 * Citation validation for factual claims.
 */
app.post('/tenseigan/validate_claims', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();

    const input = JSON.stringify({
      content: body.payload?.content || body.content,
      sources: body.payload?.sources || body.sources,
    });

    const response = await orchestrator.runEye('tenseigan', input, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process validate_claims request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /eyes/byakugan/consistency_check
 * Consistency and contradiction detection.
 */
app.post('/byakugan/consistency_check', async (c) => {
  try {
    const body = await c.req.json();
    const sessionId = body.context?.session_id || body.sessionId || nanoid();
    const content = body.payload?.content || body.content;

    if (!content) {
      return createErrorResponse(c, { title: 'Missing Required Field', status: 400, detail: 'content field is required' });
    }

    const response = await orchestrator.runEye('byakugan', content, sessionId);
    return createSuccessResponse(c, response);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to process consistency_check request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /eyes/registry - Get all built-in Eyes from registry
 */
app.get('/registry', async (c) => {
  const eyeNames = getAllEyeNames();
  return createSuccessResponse(c,
    eyeNames.map((eyeName) => {
      const eye = ALL_EYES[eyeName];
      return {
        id: eyeName,
        name: eye.name,
        version: eye.version,
        description: eye.description,
        source: 'built-in',
        personaTemplate: eye.getPersona(),
      };
    })
  );
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
  // Get built-in Eyes from ALL_EYES
  const eyeNames = getAllEyeNames();
  const builtInEyes = eyeNames.map((eyeName) => {
    const eye = ALL_EYES[eyeName];
    return {
      id: eyeName,
      name: eye.name,
      version: eye.version,
      description: eye.description,
      source: 'built-in' as const,
      personaTemplate: eye.getPersona(),
    };
  });

  // Get custom Eyes from database
  const { db } = getDb();
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
