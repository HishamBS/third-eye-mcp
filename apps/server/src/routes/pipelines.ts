import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelines, pipelineRuns } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Zod schemas for validation
const createPipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  workflow: z.any(),
  category: z.string().optional(),
});

const updatePipelineSchema = z.object({
  description: z.string().optional(),
  workflow: z.any().optional(),
  category: z.string().optional(),
});

const executePipelineSchema = z.object({
  session_id: z.string().min(1),
  input: z.any(),
});

const executePipelineV2Schema = z.object({
  input: z.any(),
  sessionId: z.string().optional(),
});

/**
 * GET /api/pipelines - Get all pipelines
 */
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const category = c.req.query('category');

    let query = db.select().from(pipelines).where(eq(pipelines.active, true));
    const allPipelines = await query.orderBy(desc(pipelines.createdAt)).all();

    if (category) {
      return createSuccessResponse(c, allPipelines.filter((p) => p.category === category));
    }

    return createSuccessResponse(c, allPipelines);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/pipelines/:id - Get specific pipeline
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, { title: 'Pipeline Not Found', status: 404, detail: 'The requested pipeline could not be found' });
    }

    return createSuccessResponse(c, pipeline[0]);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/pipelines/name/:name/versions - Get all versions
 */
app.get('/name/:name/versions', async (c) => {
  try {
    const name = c.req.param('name');
    const { db } = getDb();

    const versions = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.name, name))
      .orderBy(desc(pipelines.version))
      .all();

    return createSuccessResponse(c, versions);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch pipeline versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/pipelines - Create new pipeline
 */
app.post('/', validateBodyWithEnvelope(createPipelineSchema), async (c) => {
  try {
    const { name, description, workflow, category } = c.get('validatedBody');

    const { db } = getDb();

    // Check if pipeline with this name exists
    const existing = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.name, name))
      .orderBy(desc(pipelines.version))
      .limit(1)
      .all();

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const id = nanoid();
    const now = new Date();

    // Deactivate previous versions
    if (existing.length > 0) {
      await db
        .update(pipelines)
        .set({ active: false })
        .where(eq(pipelines.name, name))
        .run();
    }

    // Insert new version
    await db
      .insert(pipelines)
      .values({
        id,
        name,
        version: nextVersion,
        description,
        workflowJson: workflow,
        category: category || 'custom',
        active: true,
        createdAt: now,
      })
      .run();

    return createSuccessResponse(c, { id, version: nextVersion, message: 'Pipeline created successfully' }, { status: 201 });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * PUT /api/pipelines/:id - Update pipeline (creates new version)
 */
app.put('/:id', validateBodyWithEnvelope(updatePipelineSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.get('validatedBody');

    const { db } = getDb();

    const existing = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return createErrorResponse(c, { title: 'Pipeline Not Found', status: 404, detail: 'The requested pipeline could not be found' });
    }

    const currentPipeline = existing[0];

    // Deactivate all versions
    await db
      .update(pipelines)
      .set({ active: false })
      .where(eq(pipelines.name, currentPipeline.name))
      .run();

    // Create new version
    const newId = nanoid();
    const nextVersion = currentPipeline.version + 1;

    await db
      .insert(pipelines)
      .values({
        id: newId,
        name: currentPipeline.name,
        version: nextVersion,
        description: body.description || currentPipeline.description,
        workflowJson: body.workflow || currentPipeline.workflowJson,
        category: body.category || currentPipeline.category,
        active: true,
        createdAt: new Date(),
      })
      .run();

    return createSuccessResponse(c, {
      id: newId,
      version: nextVersion,
      message: 'Pipeline updated (new version created)',
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to update pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/pipelines/:id/activate - Activate specific version
 */
app.post('/:id/activate', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, { title: 'Pipeline Not Found', status: 404, detail: 'The requested pipeline could not be found' });
    }

    const targetPipeline = pipeline[0];

    // Deactivate all versions
    await db
      .update(pipelines)
      .set({ active: false })
      .where(eq(pipelines.name, targetPipeline.name))
      .run();

    // Activate target
    await db
      .update(pipelines)
      .set({ active: true })
      .where(eq(pipelines.id, id))
      .run();

    return createSuccessResponse(c, { message: `Pipeline version ${targetPipeline.version} activated` });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to activate pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * DELETE /api/pipelines/:id - Soft delete pipeline
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    await db
      .update(pipelines)
      .set({ active: false })
      .where(eq(pipelines.id, id))
      .run();

    return createSuccessResponse(c, { message: 'Pipeline deactivated' });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to delete pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/pipelines/:id/execute - Initialize pipeline execution
 *
 * Note: This endpoint creates a pipeline run record in the database but does not execute
 * the pipeline workflow. Actual pipeline execution is delegated to the MCP client/agent
 * which reads the workflow from the database and executes each step by calling the
 * appropriate Eye endpoints. This design allows for:
 * 1. Client-driven execution (agent controls the flow)
 * 2. Conditional branching based on Eye responses
 * 3. User interaction steps (approval gates)
 * 4. Real-time monitoring via WebSocket events
 *
 * Future enhancement: Implement server-side async pipeline engine with worker queues.
 */
app.post('/:id/execute', validateBodyWithEnvelope(executePipelineSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const { session_id, input } = c.get('validatedBody');

    const { db } = getDb();

    // Get pipeline
    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, { title: 'Pipeline Not Found', status: 404, detail: 'The requested pipeline could not be found' });
    }

    // Create pipeline run record for tracking
    const runId = nanoid();
    await db
      .insert(pipelineRuns)
      .values({
        id: runId,
        pipelineId: id,
        sessionId: session_id,
        status: 'pending',
        currentStep: 0,
        stateJson: { input, startTime: new Date().toISOString(), workflow: pipeline[0].workflowJson },
        createdAt: new Date(),
      })
      .run();

    // Return run info for client-side execution
    return createSuccessResponse(c, {
      runId,
      pipelineId: id,
      sessionId: session_id,
      workflow: pipeline[0].workflowJson,
      status: 'pending',
      message: 'Pipeline run created. Execute workflow steps via Eye endpoints.',
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to execute pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/pipelines/:id/runs - Get execution history
 */
app.get('/:id/runs', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const runs = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.pipelineId, id))
      .orderBy(desc(pipelineRuns.createdAt))
      .all();

    return createSuccessResponse(c, runs);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch pipeline runs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default app;
