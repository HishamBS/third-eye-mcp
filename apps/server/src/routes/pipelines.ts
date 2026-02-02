import { Hono } from "hono";
import {
  generateId,
  generatePipelineId,
  generateRunId,
} from "@third-eye/db/utils/uuid";
import { getDb } from "@third-eye/db";
import { pipelines, pipelineRuns } from "@third-eye/db";
import { eq, desc } from "drizzle-orm";
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";
import { WorkflowInterpreter, type WorkflowDefinition } from "@third-eye/core";
import {
  ApiErrorCode,
  ApiErrorTitle,
  ApiErrorMessage,
  formatErrorWithMessage,
  formatPipelineVersionActivated,
} from "@third-eye/constants";

const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Workflow schema for pipeline DAG definition
const workflowSchema = z
  .object({
    nodes: z.array(z.record(z.unknown())).optional(),
    edges: z.array(z.record(z.unknown())).optional(),
  })
  .passthrough();

// Zod schemas for validation
const createPipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  workflow: workflowSchema,
  category: z.string().optional(),
});

const updatePipelineSchema = z.object({
  description: z.string().optional(),
  workflow: workflowSchema.optional(),
  category: z.string().optional(),
});

const executePipelineSchema = z.object({
  session_id: z.string().min(1),
  input: z.union([z.string(), z.record(z.unknown())]),
});

const executePipelineV2Schema = z.object({
  input: z.union([z.string(), z.record(z.unknown())]),
  sessionId: z.string().optional(),
});

/**
 * GET /api/pipelines - Get all pipelines
 */
app.get("/", async (c) => {
  try {
    const { db } = getDb();
    const category = c.req.query("category");

    let query = db.select().from(pipelines).where(eq(pipelines.active, true));
    const allPipelines = await query.orderBy(desc(pipelines.createdAt)).all();

    if (category) {
      return createSuccessResponse(
        c,
        allPipelines.filter((p) => p.category === category),
      );
    }

    return createSuccessResponse(c, allPipelines);
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_FETCH_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * GET /api/pipelines/:id - Get specific pipeline
 */
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { db } = getDb();

    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.PIPELINE_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.PIPELINE_NOT_FOUND_DETAIL,
        code: ApiErrorCode.PIPELINE_NOT_FOUND,
      });
    }

    return createSuccessResponse(c, pipeline[0]);
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_SINGLE_FETCH_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * GET /api/pipelines/name/:name/versions - Get all versions
 */
app.get("/name/:name/versions", async (c) => {
  try {
    const name = c.req.param("name");
    const { db } = getDb();

    const versions = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.name, name))
      .orderBy(desc(pipelines.version))
      .all();

    return createSuccessResponse(c, versions);
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_VERSIONS_FETCH_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * POST /api/pipelines - Create new pipeline
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = createPipelineSchema.parse(body);
    const { name, description, workflow, category } = validated;

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

    const id = generatePipelineId();
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
        category: category || "custom",
        active: true,
        createdAt: now,
      })
      .run();

    return createSuccessResponse(
      c,
      { id, version: nextVersion, message: ApiErrorMessage.PIPELINE_CREATED },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_CREATE_FAILED_DETAIL,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * PUT /api/pipelines/:id - Update pipeline (creates new version)
 */
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const bodyRaw = await c.req.json();
    const body = updatePipelineSchema.parse(bodyRaw);

    const { db } = getDb();

    const existing = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.PIPELINE_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.PIPELINE_NOT_FOUND_DETAIL,
        code: ApiErrorCode.PIPELINE_NOT_FOUND,
      });
    }

    const currentPipeline = existing[0];

    // Deactivate all versions
    await db
      .update(pipelines)
      .set({ active: false })
      .where(eq(pipelines.name, currentPipeline.name))
      .run();

    // Create new version
    const newId = generatePipelineId();
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
      message: ApiErrorMessage.PIPELINE_UPDATED,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_UPDATE_FAILED_DETAIL,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * POST /api/pipelines/:id/activate - Activate specific version
 */
app.post("/:id/activate", async (c) => {
  try {
    const id = c.req.param("id");
    const { db } = getDb();

    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.PIPELINE_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.PIPELINE_NOT_FOUND_DETAIL,
        code: ApiErrorCode.PIPELINE_NOT_FOUND,
      });
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

    return createSuccessResponse(c, {
      message: formatPipelineVersionActivated(targetPipeline.version),
    });
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_ACTIVATE_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * DELETE /api/pipelines/:id - Soft delete pipeline
 */
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const { db } = getDb();

    await db
      .update(pipelines)
      .set({ active: false })
      .where(eq(pipelines.id, id))
      .run();

    return createSuccessResponse(c, {
      message: ApiErrorMessage.PIPELINE_DEACTIVATED,
    });
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_DELETE_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * POST /api/pipelines/:id/execute - Execute pipeline workflow
 *
 * Executes a visual pipeline workflow using the WorkflowInterpreter.
 * Handles all node types: eye, condition, switch, loop, user_input, terminal.
 * Supports conditional branching, loops, and complex routing logic.
 */
app.post("/:id/execute", async (c) => {
  try {
    const id = c.req.param("id");
    const bodyRaw = await c.req.json();
    const validated = executePipelineSchema.parse(bodyRaw);
    const { session_id, input } = validated;

    const { db } = getDb();

    // Get pipeline
    const pipeline = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.id, id))
      .limit(1)
      .all();

    if (pipeline.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.PIPELINE_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.PIPELINE_NOT_FOUND_DETAIL,
        code: ApiErrorCode.PIPELINE_NOT_FOUND,
      });
    }

    // Create pipeline run record for tracking
    const runId = generateRunId();
    await db
      .insert(pipelineRuns)
      .values({
        id: runId,
        pipelineId: id,
        sessionId: session_id,
        status: "running",
        currentStep: 0,
        stateJson: {
          input,
          startTime: new Date().toISOString(),
          workflow: pipeline[0].workflowJson,
        },
        createdAt: new Date(),
      })
      .run();

    // Execute workflow using WorkflowInterpreter
    const interpreter = new WorkflowInterpreter();
    const workflow = pipeline[0].workflowJson as WorkflowDefinition;

    // Validate workflow before execution
    const validation = WorkflowInterpreter.validate(workflow);
    if (!validation.valid) {
      await db
        .update(pipelineRuns)
        .set({
          status: "failed",
          errorMessage: `Workflow validation failed: ${validation.errors.join(", ")}`,
          completedAt: new Date(),
        })
        .where(eq(pipelineRuns.id, runId))
        .run();

      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_WORKFLOW,
        status: 400,
        detail: `Workflow validation failed: ${validation.errors.join(", ")}`,
        code: ApiErrorCode.INVALID_WORKFLOW,
      });
    }

    // Execute workflow
    // Convert string input to object if needed
    const inputObj =
      typeof input === "string" ? { text: input } : (input ?? {});
    const result = await interpreter.execute(workflow, {
      sessionId: session_id,
      input: inputObj,
    });

    // Update pipeline run with results
    await db
      .update(pipelineRuns)
      .set({
        status: result.success ? "completed" : "failed",
        currentStep: result.steps.length,
        stateJson: {
          input,
          startTime: new Date().toISOString(),
          workflow: pipeline[0].workflowJson,
          result,
        },
        errorMessage: result.error,
        completedAt: new Date(),
      })
      .where(eq(pipelineRuns.id, runId))
      .run();

    return createSuccessResponse(c, {
      runId,
      success: result.success,
      steps: result.steps,
      output: result.output,
      totalLatency: result.totalLatency,
      error: result.error,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_EXECUTE_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

/**
 * GET /api/pipelines/:id/runs - Get execution history
 */
app.get("/:id/runs", async (c) => {
  try {
    const id = c.req.param("id");
    const { db } = getDb();

    const runs = await db
      .select()
      .from(pipelineRuns)
      .where(eq(pipelineRuns.pipelineId, id))
      .orderBy(desc(pipelineRuns.createdAt))
      .all();

    return createSuccessResponse(c, runs);
  } catch (error) {
    return createInternalErrorResponse(
      c,
      formatErrorWithMessage(
        ApiErrorMessage.PIPELINE_RUNS_FETCH_FAILED,
        error instanceof Error ? error.message : ApiErrorMessage.UNKNOWN_ERROR,
      ),
    );
  }
});

export default app;
