import { Hono } from "hono";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";
import { getWorkflowGuidance } from "@third-eye/core/guidance";
import type { EyeResponse } from "@third-eye/eyes";
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";

const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Zod schemas for validation
const guidanceRequestSchema = z.object({
  task_description: z.string().min(1),
  current_state: z.string().optional(),
  last_eye_response: z.unknown().optional(),
  session_id: z.string().min(1),
});

const delegateRequestSchema = z.object({
  eye_response: z.unknown(),
});

/**
 * POST /api/guidance - Get intelligent workflow guidance
 *
 * This is the "Smart MCP" meta-tool that makes Third Eye a must-use server.
 * It analyzes the current task and workflow state to recommend the optimal next Eye.
 */
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validated = guidanceRequestSchema.parse(body);
    const { task_description, current_state, last_eye_response, session_id } = validated;

    const guidance = getWorkflowGuidance({
      taskDescription: task_description,
      currentState: current_state,
      lastEyeResponse: last_eye_response as EyeResponse | undefined,
      sessionId: session_id,
    });

    return createSuccessResponse(c, {
      ok: true,
      guidance,
      meta: {
        timestamp: new Date().toISOString(),
        sessionId: session_id,
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
    return createInternalErrorResponse(
      c,
      `Failed to generate guidance: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

/**
 * POST /api/guidance/delegate - Check if delegation is needed
 *
 * Given an Eye response, determines if automatic delegation to another Eye is recommended
 */
app.post("/delegate", async (c) => {
  try {
    const body = await c.req.json();
    const validated = delegateRequestSchema.parse(body);
    const { eye_response } = validated;

    const { shouldDelegate } = await import("@third-eye/core/guidance");
    const delegation = shouldDelegate(eye_response as EyeResponse);

    return createSuccessResponse(c, {
      ok: true,
      ...delegation,
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
    return createInternalErrorResponse(
      c,
      `Failed to check delegation: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

export default app;
