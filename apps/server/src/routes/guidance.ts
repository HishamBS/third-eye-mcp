import { Hono } from 'hono';
import { getWorkflowGuidance } from '@third-eye/core/guidance';
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
const guidanceRequestSchema = z.object({
  task_description: z.string().min(1),
  current_state: z.any().optional(),
  last_eye_response: z.any().optional(),
  session_id: z.string().min(1),
});

const delegateRequestSchema = z.object({
  eye_response: z.any(),
});

/**
 * POST /api/guidance - Get intelligent workflow guidance
 *
 * This is the "Smart MCP" meta-tool that makes Third Eye a must-use server.
 * It analyzes the current task and workflow state to recommend the optimal next Eye.
 */
app.post('/', validateBodyWithEnvelope(guidanceRequestSchema), async (c) => {
  try {
    const { task_description, current_state, last_eye_response, session_id } = c.get('validatedBody');

    const guidance = getWorkflowGuidance({
      taskDescription: task_description,
      currentState: current_state,
      lastEyeResponse: last_eye_response,
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
    return createInternalErrorResponse(c, `Failed to generate guidance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/guidance/delegate - Check if delegation is needed
 *
 * Given an Eye response, determines if automatic delegation to another Eye is recommended
 */
app.post('/delegate', validateBodyWithEnvelope(delegateRequestSchema), async (c) => {
  try {
    const { eye_response } = c.get('validatedBody');

    const { shouldDelegate } = await import('@third-eye/core/guidance');
    const delegation = shouldDelegate(eye_response);

    return createSuccessResponse(c, {
      ok: true,
      ...delegation,
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to check delegation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default app;
