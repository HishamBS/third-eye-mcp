import { Hono } from 'hono';
import { getWorkflowGuidance } from '@third-eye/core/guidance';

const app = new Hono();

/**
 * POST /api/guidance - Get intelligent workflow guidance
 *
 * This is the "Smart MCP" meta-tool that makes Third Eye a must-use server.
 * It analyzes the current task and workflow state to recommend the optimal next Eye.
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();

    const { task_description, current_state, last_eye_response, session_id } = body;

    if (!task_description || !session_id) {
      return c.json(
        { error: 'Missing required fields: task_description, session_id' },
        400
      );
    }

    const guidance = getWorkflowGuidance({
      taskDescription: task_description,
      currentState: current_state,
      lastEyeResponse: last_eye_response,
      sessionId: session_id,
    });

    return c.json({
      ok: true,
      guidance,
      meta: {
        timestamp: new Date().toISOString(),
        sessionId: session_id,
      },
    });
  } catch (error) {
    return c.json(
      {
        error: `Failed to generate guidance: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/guidance/delegate - Check if delegation is needed
 *
 * Given an Eye response, determines if automatic delegation to another Eye is recommended
 */
app.post('/delegate', async (c) => {
  try {
    const body = await c.req.json();
    const { eye_response } = body;

    if (!eye_response) {
      return c.json({ error: 'Missing required field: eye_response' }, 400);
    }

    const { shouldDelegate } = await import('@third-eye/core/guidance');
    const delegation = shouldDelegate(eye_response);

    return c.json({
      ok: true,
      ...delegation,
    });
  } catch (error) {
    return c.json(
      {
        error: `Failed to check delegation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

export default app;
