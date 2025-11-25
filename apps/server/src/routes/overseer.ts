import { Hono } from "hono";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";
import { autoRouter } from "@third-eye/core/auto-router";
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
        code: ApiErrorCode.INVALID_REQUEST,
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
        code: ApiErrorCode.INVALID_REQUEST,
      });
    }
    return createErrorResponse(c, {
      title: ApiErrorTitle.OVERSEER_EXECUTION_ERROR,
        code: ApiErrorCode.OVERSEER_EXECUTION_FAILED,
      status: 500,
      detail: error instanceof Error ? error.message : "Unknown error",
      code: ApiErrorCode.OVERSEER_EXECUTION_FAILED,
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

  // TODO: Implement session manager integration
  // const session = await sessionManager.getSession(sessionId);
  //
  // if (!session) {
  //   return createErrorResponse(c, {
  //     title: "Session not found",
  //     status: 404,
  //     detail: `No session found with ID: ${sessionId}`,
  //   });
  // }

  return createSuccessResponse(c, {
    sessionId,
    // TODO: Add session and pipeline progress data
    message: "Session status endpoint - implementation pending",
  });
});

export default app;
