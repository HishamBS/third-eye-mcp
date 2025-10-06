import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelineEvents, eyesCustom, eyesRouting } from '@third-eye/db';
import { EyeOrchestrator } from '@third-eye/core';
import { EYES_REGISTRY, getAllEyeTools } from '@third-eye/core';
import { eq, desc } from 'drizzle-orm';
import type { Envelope } from '@third-eye/types';

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
        event: { eye, ...response },
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

    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process navigator request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: prompt' }, 400);
    }

    const response = await orchestrator.runEye('sharingan', prompt, sessionId);
    await logPipelineEvent(sessionId, 'sharingan', response);

    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process clarify request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: prompt' }, 400);
    }

    const input = body.payload?.clarifications
      ? `${prompt}\n\nClarifications: ${JSON.stringify(body.payload.clarifications)}`
      : prompt;

    const response = await orchestrator.runEye('helper', input, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process rewrite_prompt request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: prompt' }, 400);
    }

    const response = await orchestrator.runEye('jogan', prompt, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process confirm_intent request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process plan_requirements request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: plan' }, 400);
    }

    const response = await orchestrator.runEye('rinnegan_review', plan, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process plan_review request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process final_approval request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: scaffold' }, 400);
    }

    const response = await orchestrator.runEye('mangekyo_scaffold', scaffold, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process review_scaffold request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process review_impl request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process review_tests request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: docs' }, 400);
    }

    const response = await orchestrator.runEye('mangekyo_docs', docs, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process review_docs request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process validate_claims request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
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
      return c.json({ error: 'Missing required field: content' }, 400);
    }

    const response = await orchestrator.runEye('byakugan', content, sessionId);
    return c.json(response);
  } catch (error) {
    return c.json({
      error: `Failed to process consistency_check request: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, 500);
  }
});

/**
 * GET /eyes/registry - Get all built-in Eyes from registry
 */
app.get('/registry', async (c) => {
  const eyes = getAllEyeTools();
  return c.json(
    eyes.map((eye, index) => ({
      id: Object.keys(EYES_REGISTRY)[index],
      name: eye.name,
      version: eye.version,
      description: eye.description,
      source: 'built-in',
      personaTemplate: eye.personaTemplate,
      defaultRouting: eye.defaultRouting,
    }))
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

  return c.json(
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
  // Get built-in Eyes from registry
  const builtInEyes = getAllEyeTools().map((eye, index) => ({
    id: Object.keys(EYES_REGISTRY)[index],
    name: eye.name,
    version: eye.version,
    description: eye.description,
    source: 'built-in' as const,
    personaTemplate: eye.personaTemplate,
    defaultRouting: eye.defaultRouting,
  }));

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

  return c.json([...builtInEyes, ...customEyesFormatted]);
});

/**
 * POST /eyes/custom - Create new custom Eye
 */
app.post('/custom', async (c) => {
  const body = await c.req.json();
  const { name, description, inputSchema, outputSchema, personaId, defaultRouting } = body;

  if (!name || !description || !inputSchema || !outputSchema) {
    return c.json(
      { error: 'Missing required fields: name, description, inputSchema, outputSchema' },
      400
    );
  }

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

  return c.json({ id, version: nextVersion, message: 'Custom Eye created successfully' }, 201);
});

export default app;
