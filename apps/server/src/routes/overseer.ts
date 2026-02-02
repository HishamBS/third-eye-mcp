import { Hono } from "hono";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";
import { autoRouter } from "@third-eye/core";
import { getDb, sessions, runs, pipelineEvents } from "@third-eye/db";
import { eq, desc, count } from "drizzle-orm";
import { schemas } from "../middleware/validation";
import {
  createSuccessResponse,
  createErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";

const app = new Hono();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

app.post("/run", async (c) => {
  try {
    const body = await c.req.json();
    const validated = schemas.mcpRun.parse(body);
    const {
      sessionId: providedSessionId,
      task,
      strictness,
      context,
    } = validated;

    if (!task) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_REQUEST,
        code: ApiErrorCode.INVALID_REQUEST,
        status: 400,
        detail:
          'The request body must include a non-empty "task" string for auto-routing.',
      });
    }

    const strictnessOptions = isPlainObject(strictness)
      ? strictness
      : undefined;
    const contextOptions = isPlainObject(context) ? context : undefined;

    const routing = await autoRouter.analyzeTask(
      task,
      undefined,
      providedSessionId,
      {
        strictness: strictnessOptions,
        context: contextOptions,
      },
    );

    const result = await autoRouter.executeFlow(task, routing, undefined, {
      strictness: strictnessOptions,
      context: contextOptions,
    });

    return createSuccessResponse(c, {
      sessionId: result.sessionId,
      completed: result.completed,
      results: result.results,
      routing: {
        recommendedEye: routing.recommendedFlow[0] ?? null,
        flow: routing.recommendedFlow,
        taskType: routing.taskType,
        reasoning: routing.reasoning,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
      });
    }
    return createErrorResponse(c, {
      title: ApiErrorTitle.OVERSEER_EXECUTION_ERROR,
      code: ApiErrorCode.OVERSEER_EXECUTION_FAILED,
      status: 500,
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/status", async (c) => {
  const sessionId = c.req.query("sessionId");

  if (!sessionId) {
    return createErrorResponse(c, {
      title: ApiErrorTitle.MISSING_SESSION_ID,
      code: ApiErrorCode.MISSING_SESSION_ID,
      status: 400,
      detail: "sessionId query parameter is required",
    });
  }

  try {
    const { db } = getDb();

    // Get session data
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: `No session found with ID: ${sessionId}`,
      });
    }

    // Get run count for this session
    const runCount = await db
      .select({ count: count() })
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .get();

    // Get pipeline event count
    const eventCount = await db
      .select({ count: count() })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .get();

    // Get most recent run
    const latestRun = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(1)
      .get();

    return createSuccessResponse(c, {
      sessionId,
      status: session.status,
      createdAt: session.createdAt,
      agentName: session.agentName,
      model: session.model,
      displayName: session.displayName,
      progress: {
        totalRuns: runCount?.count ?? 0,
        totalEvents: eventCount?.count ?? 0,
        latestRunId: latestRun?.id ?? null,
        latestRunEyeId: latestRun?.eyeId ?? null,
        latestRunCreatedAt: latestRun?.createdAt ?? null,
      },
    });
  } catch (error) {
    return createErrorResponse(c, {
      title: ApiErrorTitle.INTERNAL_ERROR,
      code: ApiErrorCode.INTERNAL_ERROR,
      status: 500,
      detail: error instanceof Error ? error.message : "Failed to fetch session status",
    });
  }
});

export default app;
