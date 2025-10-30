/**
 * Pipeline Execution API - DAG-based async execution endpoints
 *
 * Routes:
 * - POST /api/pipeline-execution/execute - Start DAG pipeline execution
 * - POST /api/pipeline-execution/pause/:runId - Pause running pipeline
 * - POST /api/pipeline-execution/resume/:runId - Resume paused pipeline
 * - GET /api/pipeline-execution/status/:runId - Get execution status
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelines, pipelineQueue, executionSteps } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';
import { PipelineExecutionEngine } from '@third-eye/core/pipeline-execution-engine';
import { autoRouter } from '@third-eye/core/auto-router';
import { PipelineDagSchema } from '@third-eye/types/dist/pipeline';
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

// In-memory registry of active pipeline executions
const activeExecutions = new Map<string, PipelineExecutionEngine>();

// Zod schemas for validation
const executePipelineSchema = z.object({
  pipelineId: z.string().min(1),
  sessionId: z.string().optional(),
  input: z.any(),
});

const resumePipelineSchema = z.object({
  userInput: z.any().optional(),
});

/**
 * POST /api/pipeline-execution/execute - Start DAG pipeline execution
 *
 * Async execution: creates queue entry, starts execution in background
 */
app.post('/execute', async (c) => {
  try {
    const { db } = getDb();
    const body = await c.req.json();

    // Validate request body
    const validation = executePipelineSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        createErrorResponse('INVALID_REQUEST', 'Invalid request body', validation.error.errors),
        400
      );
    }

    const { pipelineId, sessionId, input } = validation.data;

    // Load pipeline from database
    const pipeline = await db.query.pipelines.findFirst({
      where: eq(pipelines.id, pipelineId),
    });

    if (!pipeline) {
      return c.json(
        createErrorResponse('PIPELINE_NOT_FOUND', `Pipeline not found: ${pipelineId}`),
        404
      );
    }

    // Parse and validate pipeline DAG
    const dagValidation = PipelineDagSchema.safeParse(pipeline.workflowJson);
    if (!dagValidation.success) {
      return c.json(
        createErrorResponse('INVALID_PIPELINE_DAG', 'Pipeline workflow is invalid', dagValidation.error.errors),
        400
      );
    }

    const dag = dagValidation.data;

    // Generate run ID
    const runId = nanoid();
    const actualSessionId = sessionId || nanoid();

    // Intelligent routing: analyze task to determine optimal Eye sequence
    let recommendedEyes: string[] | undefined;
    try {
      // Extract text input for analysis
      const inputText = typeof input === 'string' ? input : JSON.stringify(input);

      console.log(`[PipelineExecution] Analyzing task for intelligent routing...`);
      const routingDecision = await autoRouter.analyzeTask(inputText, actualSessionId);

      recommendedEyes = routingDecision.recommendedFlow;
      console.log(`[PipelineExecution] Routing analysis complete:`, {
        complexity: routingDecision.complexity,
        taskType: routingDecision.taskType,
        recommendedEyes: recommendedEyes,
        reasoning: routingDecision.reasoning
      });
    } catch (error) {
      console.warn(`[PipelineExecution] AutoRouter analysis failed, falling back to full pipeline:`, error);
      // Continue with full pipeline execution if routing fails
      recommendedEyes = undefined;
    }

    // Create queue entry
    const now = new Date();
    await db.insert(pipelineQueue).values({
      id: nanoid(),
      runId,
      pipelineId,
      sessionId: actualSessionId,
      status: 'pending',
      inputJson: input,
      createdAt: now,
    });

    // Start execution in background (async, non-blocking)
    const engine = new PipelineExecutionEngine();
    activeExecutions.set(runId, engine);

    // Execute pipeline with intelligent routing (don't await - let it run in background)
    engine.execute(
      {
        runId,
        pipelineId,
        sessionId: actualSessionId,
        input,
        recommendedEyes, // Pass routing hint for graph pruning
      },
      dag
    ).then(async () => {
      // Execution completed successfully
      await db.update(pipelineQueue)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(pipelineQueue.runId, runId));

      activeExecutions.delete(runId);
    }).catch(async (error) => {
      // Execution failed
      await db.update(pipelineQueue)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        })
        .where(eq(pipelineQueue.runId, runId));

      activeExecutions.delete(runId);
      console.error(`Pipeline execution failed for runId ${runId}:`, error);
    });

    // Update queue to running status
    await db.update(pipelineQueue)
      .set({
        status: 'running',
        startedAt: new Date(),
      })
      .where(eq(pipelineQueue.runId, runId));

    return c.json(
      createSuccessResponse({
        runId,
        sessionId: actualSessionId,
        status: 'running',
        message: 'Pipeline execution started',
      }),
      202 // Accepted
    );
  } catch (error) {
    console.error('Execute pipeline error:', error);
    return c.json(
      createInternalErrorResponse(error instanceof Error ? error.message : 'Unknown error'),
      500
    );
  }
});

/**
 * POST /api/pipeline-execution/pause/:runId - Pause running pipeline
 */
app.post('/pause/:runId', async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param('runId');

    // Check if execution is active
    const engine = activeExecutions.get(runId);
    if (!engine) {
      return c.json(
        createErrorResponse('EXECUTION_NOT_FOUND', `No active execution found for runId: ${runId}`),
        404
      );
    }

    // Pause execution
    await engine.pause();

    // Update database status
    await db.update(pipelineQueue)
      .set({ status: 'paused' })
      .where(eq(pipelineQueue.runId, runId));

    return c.json(
      createSuccessResponse({
        runId,
        status: 'paused',
        message: 'Pipeline execution paused',
      })
    );
  } catch (error) {
    console.error('Pause pipeline error:', error);
    return c.json(
      createInternalErrorResponse(error instanceof Error ? error.message : 'Unknown error'),
      500
    );
  }
});

/**
 * POST /api/pipeline-execution/resume/:runId - Resume paused pipeline
 */
app.post('/resume/:runId', async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param('runId');
    const body = await c.req.json().catch(() => ({}));

    // Validate request body
    const validation = resumePipelineSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        createErrorResponse('INVALID_REQUEST', 'Invalid request body', validation.error.errors),
        400
      );
    }

    const { userInput } = validation.data;

    // Check if execution is active
    const engine = activeExecutions.get(runId);
    if (!engine) {
      return c.json(
        createErrorResponse('EXECUTION_NOT_FOUND', `No active execution found for runId: ${runId}`),
        404
      );
    }

    // Resume execution
    await engine.resume(userInput);

    // Update database status
    await db.update(pipelineQueue)
      .set({ status: 'running' })
      .where(eq(pipelineQueue.runId, runId));

    return c.json(
      createSuccessResponse({
        runId,
        status: 'running',
        message: 'Pipeline execution resumed',
      })
    );
  } catch (error) {
    console.error('Resume pipeline error:', error);
    return c.json(
      createInternalErrorResponse(error instanceof Error ? error.message : 'Unknown error'),
      500
    );
  }
});

/**
 * GET /api/pipeline-execution/status/:runId - Get execution status
 */
app.get('/status/:runId', async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param('runId');

    // Get queue entry
    const queueItem = await db.query.pipelineQueue.findFirst({
      where: eq(pipelineQueue.runId, runId),
    });

    if (!queueItem) {
      return c.json(
        createErrorResponse('EXECUTION_NOT_FOUND', `Execution not found for runId: ${runId}`),
        404
      );
    }

    // Get execution steps
    const steps = await db.query.executionSteps.findMany({
      where: eq(executionSteps.runId, runId),
      orderBy: [desc(executionSteps.createdAt)],
    });

    // Get current execution state if still running
    const engine = activeExecutions.get(runId);
    const currentState = engine ? engine.getState() : null;

    return c.json(
      createSuccessResponse({
        runId,
        status: queueItem.status,
        finalVerdict: queueItem.finalVerdict,
        errorMessage: queueItem.errorMessage,
        createdAt: queueItem.createdAt,
        startedAt: queueItem.startedAt,
        completedAt: queueItem.completedAt,
        steps,
        currentState,
      })
    );
  } catch (error) {
    console.error('Get execution status error:', error);
    return c.json(
      createInternalErrorResponse(error instanceof Error ? error.message : 'Unknown error'),
      500
    );
  }
});

export default app;
