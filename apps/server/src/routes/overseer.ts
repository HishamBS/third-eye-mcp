import { Hono } from 'hono';
import { autoRouter } from '@third-eye/core/auto-router';
import { schemas } from '../middleware/validation';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from '../middleware/response';

const app = new Hono();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

app.post('/run', validateBodyWithEnvelope(schemas.mcpRun), async (c) => {
  const { sessionId: providedSessionId, task, strictness, context } = c.get('validatedBody');

  if (!task) {
    return createErrorResponse(c, {
      title: 'Invalid request',
      status: 400,
      detail: 'The request body must include a non-empty "task" string for auto-routing.',
      code: 'INVALID_REQUEST',
    });
  }

  try {
    const strictnessOptions = isPlainObject(strictness) ? strictness : undefined;
    const contextOptions = isPlainObject(context) ? context : undefined;

    const routing = await autoRouter.analyzeTask(task, undefined, providedSessionId, {
      strictness: strictnessOptions,
      context: contextOptions,
    });

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
    return createErrorResponse(c, {
      title: 'Overseer execution failed',
      status: 500,
      detail: error instanceof Error ? error.message : 'Unknown error',
      code: 'E_OVERSEER_FAILED',
    });
  }
});

app.get('/status', async (c) => {
  const sessionId = c.req.query('sessionId');

  if (!sessionId) {
    return createErrorResponse(c, {
      title: 'Missing sessionId',
      status: 400,
      detail: 'sessionId query parameter is required',
    });
  }

  const session = await sessionManager.getSession(sessionId);

  if (!session) {
    return createErrorResponse(c, {
      title: 'Session not found',
      status: 404,
      detail: `No session found with ID: ${sessionId}`,
    });
  }

  return createSuccessResponse(c, {
    sessionId,
    session,
    pipeline: sessionManager.getPipelineProgress(sessionId),
  });
});

export default app;
