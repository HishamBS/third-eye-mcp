import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelines, pipelineRuns } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';

const app = new Hono();

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
      return c.json(allPipelines.filter((p) => p.category === category));
    }

    return c.json(allPipelines);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch pipelines: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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
      return c.json({ error: 'Pipeline not found' }, 404);
    }

    return c.json(pipeline[0]);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json(versions);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch pipeline versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/pipelines - Create new pipeline
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, description, workflow, category } = body;

    if (!name || !description || !workflow) {
      return c.json(
        { error: 'Missing required fields: name, description, workflow' },
        400
      );
    }

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

    return c.json(
      { id, version: nextVersion, message: 'Pipeline created successfully' },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: `Failed to create pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * PUT /api/pipelines/:id - Update pipeline (creates new version)
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const { db } = getDb();

    const existing = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return c.json({ error: 'Pipeline not found' }, 404);
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

    return c.json({
      id: newId,
      version: nextVersion,
      message: 'Pipeline updated (new version created)',
    });
  } catch (error) {
    return c.json(
      {
        error: `Failed to update pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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
      return c.json({ error: 'Pipeline not found' }, 404);
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

    return c.json({ message: `Pipeline version ${targetPipeline.version} activated` });
  } catch (error) {
    return c.json(
      {
        error: `Failed to activate pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json({ message: 'Pipeline deactivated' });
  } catch (error) {
    return c.json(
      {
        error: `Failed to delete pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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
app.post('/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { session_id, input } = body;

    if (!session_id || !input) {
      return c.json({ error: 'Missing required fields: session_id, input' }, 400);
    }

    const { db } = getDb();

    // Get pipeline
    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return c.json({ error: 'Pipeline not found' }, 404);
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
    return c.json({
      runId,
      pipelineId: id,
      sessionId: session_id,
      workflow: pipeline[0].workflowJson,
      status: 'pending',
      message: 'Pipeline run created. Execute workflow steps via Eye endpoints.',
    });
  } catch (error) {
    return c.json(
      {
        error: `Failed to execute pipeline: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json(runs);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch pipeline runs: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/pipelines/:id/execute - Execute pipeline with input
 */
app.post('/:id/execute', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { input, sessionId } = body;

    if (!input) {
      return c.json({ error: 'Missing required field: input' }, 400);
    }

    const { db } = getDb();

    // Get pipeline definition
    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .get();

    if (!pipeline) {
      return c.json({ error: 'Pipeline not found' }, 404);
    }

    // Parse workflow (steps)
    const workflow = typeof pipeline.workflow === 'string'
      ? JSON.parse(pipeline.workflow)
      : pipeline.workflow;

    // Create pipeline executor
    const { PipelineExecutor } = await import('../lib/pipelineExecutor');
    const executor = new PipelineExecutor();

    // Execute pipeline
    const result = await executor.execute(
      {
        id: pipeline.id,
        name: pipeline.name,
        description: pipeline.description,
        steps: workflow,
      },
      input,
      sessionId
    );

    // Save run to database
    const runId = nanoid();
    await db
      .insert(pipelineRuns)
      .values({
        id: runId,
        pipelineId: id,
        inputJson: input,
        outputJson: result.combinedOutput,
        status: result.success ? 'success' : 'failed',
        createdAt: new Date(),
      })
      .run();

    return c.json({
      runId,
      result,
    });
  } catch (error) {
    console.error('Pipeline execution failed:', error);
    return c.json({
      error: `Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

export default app;
