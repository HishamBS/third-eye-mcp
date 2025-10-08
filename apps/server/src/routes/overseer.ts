import { Hono } from 'hono';
import { autoRouter } from '@third-eye/core/auto-router';
import { EyeOrchestrator } from '@third-eye/core';
import { sessionManager } from '@third-eye/core/session-manager';
import { orderGuard } from '@third-eye/core/order-guard';
import { schemas } from '../middleware/validation';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from '../middleware/response';

const app = new Hono();
const orchestrator = new EyeOrchestrator();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

app.post('/run', validateBodyWithEnvelope(schemas.mcpRun), async (c) => {
  const { sessionId: providedSessionId, task, eye: explicitEye, input } = c.get('validatedBody');

  const sessionId = providedSessionId || `session_${Date.now()}`;

  try {
    if (task) {
      // Analyze task to get routing decision
      const routing = await autoRouter.analyzeTask(task, sessionId);
      const eyeToRun = routing.recommendedFlow[0];

      // Create session with proper config (returns SessionInfo with generated ID)
      const session = await sessionManager.createSession({
        agentName: 'MCP Client',
        displayName: task.substring(0, 50),
        metadata: {
          task,
          routing: routing.recommendedFlow,
          taskType: routing.taskType,
        },
      });

      // Update routing decision with actual session ID
      routing.sessionId = session.id;

      // Execute the full flow with routing decision
      const result = await autoRouter.executeFlow(task, routing);

      return createSuccessResponse(c, {
        sessionId: result.sessionId,
        completed: result.completed,
        results: result.results,
        routing: {
          recommendedEye: eyeToRun,
          flow: routing.recommendedFlow,
          taskType: routing.taskType,
          reasoning: routing.reasoning,
        },
      });
    } else if (explicitEye && input) {
      // Validate Eye order in pipeline
      const violation = orderGuard.validateOrder(sessionId, explicitEye);
      if (violation) {
        return createErrorResponse(c, {
          title: 'Pipeline order violation',
          status: 400,
          detail: violation.violation,
          code: 'E_PIPELINE_ORDER',
        });
      }

      // Run the Eye
      const result = await orchestrator.runEye(explicitEye, input, sessionId);

      // Record Eye completion for order tracking
      orderGuard.recordEyeCompletion(sessionId, explicitEye, result);

      return createSuccessResponse(c, {
        sessionId,
        eye: explicitEye,
        result,
      });
    } else {
      return createErrorResponse(c, {
        title: 'Invalid request',
        status: 400,
        detail: 'Either "task" (freeform) or both "eye" and "input" must be provided',
        code: 'INVALID_REQUEST',
      });
    }
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
