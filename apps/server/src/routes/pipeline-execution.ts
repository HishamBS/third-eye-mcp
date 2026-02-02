/**
 * Pipeline Execution API - DAG-based async execution endpoints
 *
 * Routes:
 * - POST /api/pipeline-execution/execute - Start DAG pipeline execution
 * - POST /api/pipeline-execution/pause/:runId - Pause running pipeline
 * - POST /api/pipeline-execution/resume/:runId - Resume paused pipeline
 * - GET /api/pipeline-execution/status/:runId - Get execution status
 */

import { Hono } from "hono";
import { generateId, generateRunId, generateSessionId } from "@third-eye/db/utils/uuid";
import { getDb } from "@third-eye/db";
import { pipelines, pipelineQueue, executionSteps } from "@third-eye/db";
import { eq, desc } from "drizzle-orm";
import { PipelineExecutionEngine } from "@third-eye/core/pipeline-execution-engine";
import { autoRouter } from "@third-eye/core";
// TODO: Recreate PipelineDagSchema in @third-eye/types package
// import { PipelineDagSchema } from '@third-eye/types/dist/pipeline';
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";

const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// In-memory registry of active pipeline executions
const activeExecutions = new Map<string, PipelineExecutionEngine>();

// Zod schemas for validation
const executePipelineSchema = z.object({
  pipelineId: z.string().min(1),
  sessionId: z.string().optional(),
  input: z.union([z.string(), z.record(z.unknown())]),
});

const resumePipelineSchema = z.object({
  userInput: z.union([z.string(), z.record(z.unknown())]).optional(),
});

/**
 * POST /api/pipeline-execution/execute - Start DAG pipeline execution
 *
 * Async execution: creates queue entry, starts execution in background
 */
app.post("/execute", async (c) => {
  try {
    const { db } = getDb();
    const body = await c.req.json();

    // Validate request body
    const validation = executePipelineSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.INVALID_REQUEST_BODY,
        code: ApiErrorCode.INVALID_REQUEST,
        validation: validation.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { pipelineId, sessionId, input } = validation.data;

    // Load pipeline from database
    const pipeline = await db.query.pipelines.findFirst({
      where: eq(pipelines.id, pipelineId),
    });

    if (!pipeline) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.PIPELINE_NOT_FOUND,
        status: 404,
        detail: `Pipeline not found: ${pipelineId}`,
        code: ApiErrorCode.PIPELINE_NOT_FOUND,
      });
    }

    // Parse and validate pipeline DAG
    // Basic runtime validation (full schema validation pending PipelineDagSchema recreation)
    const workflowJson = pipeline.workflowJson;

    if (!workflowJson || typeof workflowJson !== "object") {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_PIPELINE_DAG,
        status: 400,
        detail: ApiErrorMessage.WORKFLOW_JSON_MISSING,
        code: ApiErrorCode.INVALID_PIPELINE_DAG,
      });
    }

    const dag = workflowJson as any;

    // Validate required DAG structure
    if (!dag.nodes || !Array.isArray(dag.nodes)) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_PIPELINE_DAG,
        status: 400,
        detail: ApiErrorMessage.NODES_ARRAY_REQUIRED,
        code: ApiErrorCode.INVALID_PIPELINE_DAG,
      });
    }

    if (!dag.edges || !Array.isArray(dag.edges)) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_PIPELINE_DAG,
        status: 400,
        detail: ApiErrorMessage.EDGES_ARRAY_REQUIRED,
        code: ApiErrorCode.INVALID_PIPELINE_DAG,
      });
    }

    // Validate at least one node exists
    if (dag.nodes.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_PIPELINE_DAG,
        status: 400,
        detail: ApiErrorMessage.NODES_EMPTY,
        code: ApiErrorCode.INVALID_PIPELINE_DAG,
      });
    }

    // Validate all nodes have required fields
    for (const node of dag.nodes) {
      if (!node.id || !node.type) {
        return createErrorResponse(c, {
          title: ApiErrorTitle.INVALID_PIPELINE_DAG,
          status: 400,
          detail: `Pipeline DAG node missing required 'id' or 'type' field: ${JSON.stringify(node)}`,
          code: ApiErrorCode.INVALID_PIPELINE_DAG,
        });
      }
    }

    // Generate run ID
    const runId = generateRunId();
    const actualSessionId = sessionId || generateSessionId();

    // Intelligent routing: analyze task to determine optimal Eye sequence
    let recommendedEyes: string[] | undefined;
    try {
      // Extract text input for analysis
      const inputText =
        typeof input === "string" ? input : JSON.stringify(input);

      console.log(
        `[PipelineExecution] Analyzing task for intelligent routing...`,
      );
      const routingDecision = await autoRouter.analyzeTask(
        inputText,
        actualSessionId,
      );

      recommendedEyes = routingDecision.recommendedFlow;
      console.log(`[PipelineExecution] Routing analysis complete:`, {
        complexity: routingDecision.complexity,
        taskType: routingDecision.taskType,
        recommendedEyes: recommendedEyes,
        reasoning: routingDecision.reasoning,
      });
    } catch (error) {
      console.warn(
        `[PipelineExecution] AutoRouter analysis failed, falling back to full pipeline:`,
        error,
      );
      // Continue with full pipeline execution if routing fails
      recommendedEyes = undefined;
    }

    // Create queue entry
    const now = new Date();
    await db.insert(pipelineQueue).values({
      id: generateId(),
      runId,
      pipelineId,
      sessionId: actualSessionId,
      status: "pending",
      inputJson: input,
      createdAt: now,
    });

    // Start execution in background (async, non-blocking)
    const engine = new PipelineExecutionEngine();
    activeExecutions.set(runId, engine);

    // Execute pipeline with intelligent routing (don't await - let it run in background)
    engine
      .execute(
        {
          runId,
          pipelineId,
          sessionId: actualSessionId,
          input,
          recommendedEyes, // Pass routing hint for graph pruning
        },
        dag,
      )
      .then(async () => {
        // Execution completed successfully
        await db
          .update(pipelineQueue)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(pipelineQueue.runId, runId));

        activeExecutions.delete(runId);
      })
      .catch(async (error) => {
        // Execution failed
        await db
          .update(pipelineQueue)
          .set({
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          })
          .where(eq(pipelineQueue.runId, runId));

        activeExecutions.delete(runId);
        console.error(`Pipeline execution failed for runId ${runId}:`, error);
      });

    // Update queue to running status
    await db
      .update(pipelineQueue)
      .set({
        status: "running",
        startedAt: new Date(),
      })
      .where(eq(pipelineQueue.runId, runId));

    return createSuccessResponse(c, {
      runId,
      sessionId: actualSessionId,
      status: "running",
      message: "Pipeline execution started",
    }, { status: 202 });
  } catch (error) {
    console.error("Execute pipeline error:", error);
    return createInternalErrorResponse(
      c,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

/**
 * POST /api/pipeline-execution/pause/:runId - Pause running pipeline
 */
app.post("/pause/:runId", async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param("runId");

    // Check if execution is active
    const engine = activeExecutions.get(runId);
    if (!engine) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EXECUTION_NOT_FOUND,
        status: 404,
        detail: `No active execution found for runId: ${runId}`,
        code: ApiErrorCode.EXECUTION_NOT_FOUND,
      });
    }

    // Pause execution
    await engine.pause();

    // Update database status
    await db
      .update(pipelineQueue)
      .set({ status: "paused" })
      .where(eq(pipelineQueue.runId, runId));

    return createSuccessResponse(c, {
      runId,
      status: "paused",
      message: "Pipeline execution paused",
    });
  } catch (error) {
    console.error("Pause pipeline error:", error);
    return createInternalErrorResponse(
      c,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

/**
 * POST /api/pipeline-execution/resume/:runId - Resume paused pipeline
 */
app.post("/resume/:runId", async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param("runId");
    const body = await c.req.json().catch(() => ({}));

    // Validate request body
    const validation = resumePipelineSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.INVALID_REQUEST_BODY,
        code: ApiErrorCode.INVALID_REQUEST,
        validation: validation.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { userInput } = validation.data;

    // Check if execution is active
    const engine = activeExecutions.get(runId);
    if (!engine) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EXECUTION_NOT_FOUND,
        status: 404,
        detail: `No active execution found for runId: ${runId}`,
        code: ApiErrorCode.EXECUTION_NOT_FOUND,
      });
    }

    // Resume execution
    await engine.resume(userInput);

    // Update database status
    await db
      .update(pipelineQueue)
      .set({ status: "running" })
      .where(eq(pipelineQueue.runId, runId));

    return createSuccessResponse(c, {
      runId,
      status: "running",
      message: "Pipeline execution resumed",
    });
  } catch (error) {
    console.error("Resume pipeline error:", error);
    return createInternalErrorResponse(
      c,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

/**
 * GET /api/pipeline-execution/status/:runId - Get execution status
 */
app.get("/status/:runId", async (c) => {
  try {
    const { db } = getDb();
    const runId = c.req.param("runId");

    // Get queue entry
    const queueItem = await db.query.pipelineQueue.findFirst({
      where: eq(pipelineQueue.runId, runId),
    });

    if (!queueItem) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EXECUTION_NOT_FOUND,
        status: 404,
        detail: `Execution not found for runId: ${runId}`,
        code: ApiErrorCode.EXECUTION_NOT_FOUND,
      });
    }

    // Get execution steps
    const steps = await db.query.executionSteps.findMany({
      where: eq(executionSteps.runId, runId),
      orderBy: [desc(executionSteps.createdAt)],
    });

    // Get current execution state if still running
    const engine = activeExecutions.get(runId);
    const currentState = engine ? engine.getState() : null;

    return createSuccessResponse(c, {
      runId,
      status: queueItem.status,
      finalVerdict: queueItem.finalVerdict,
      errorMessage: queueItem.errorMessage,
      createdAt: queueItem.createdAt,
      startedAt: queueItem.startedAt,
      completedAt: queueItem.completedAt,
      steps,
      currentState,
    });
  } catch (error) {
    console.error("Get execution status error:", error);
    return createInternalErrorResponse(
      c,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});

export default app;
