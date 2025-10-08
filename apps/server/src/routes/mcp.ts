import { Hono } from 'hono';
import { EyeOrchestrator } from '@third-eye/core';
import { schemas, rateLimit } from '../middleware/validation';
import { validateBodyWithEnvelope } from '../middleware/response';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

/**
 * MCP Orchestration Routes
 *
 * Main entrypoint for Eye execution via MCP protocol
 */

const app = new Hono();
const orchestrator = new EyeOrchestrator();

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());
app.use('*', rateLimit());

// Run an Eye with input and session context
// GOLDEN RULE #1: ONLY task-based auto-routing allowed - NO direct Eye execution
app.post('/run', validateBodyWithEnvelope(schemas.mcpRun), async (c) => {
  try {
    const { task, sessionId: providedSessionId, context } = c.get('validatedBody');

    // Import dependencies
    const { autoRoute } = await import('../../../../mcp-bridge/src/middleware/autoRoute');
    const { orderGuard } = await import('../../../../mcp-bridge/src/middleware/orderGuard');
    const { getDb } = await import('@third-eye/db');
    const { nanoid } = await import('nanoid');
    const { db } = getDb();
    const { runs, sessions } = await import('@third-eye/db/schema');
    const { eq } = await import('drizzle-orm');

    // Auto-generate sessionId if not provided (MANDATORY for order guard)
    const sessionId = providedSessionId || nanoid();

    // Get session history and context
    let executedEyes: string[] = [];
    let sessionContext: Record<string, any> = context || {};

    if (providedSessionId) {
      // Existing session - load history
      const session = await db.select().from(sessions).where(eq(sessions.id, providedSessionId)).get();

      if (session) {
        sessionContext = {
          ...sessionContext,
          ...(typeof session.configJson === 'string' ? JSON.parse(session.configJson) : session.configJson || {}),
        };
      }

      // Get execution history
      const sessionRuns = await db
        .select()
        .from(runs)
        .where(eq(runs.sessionId, providedSessionId))
        .orderBy(runs.createdAt)
        .all();

      executedEyes = sessionRuns.map((run) => run.eye);
    } else {
      // New session - create it in database
      await db.insert(sessions).values({
        id: sessionId,
        createdAt: new Date(),
        status: 'active',
        configJson: sessionContext, // Drizzle handles JSON conversion
      });
      console.log(`📝 Created new session: ${sessionId}`);
    }

    // Auto-route to determine next Eye (ONLY routing method - no backdoors)
    const routingResult = await autoRoute({
      task,
      currentState: {
        executedEyes,
        sessionContext,
      },
    });

    const eyeToRun = routingResult.recommendedEye;

    console.log(`🔀 Auto-routed task to ${eyeToRun}: ${routingResult.reasoning}`);

    // MANDATORY Order Guard - ALWAYS enforced
    const guardResult = orderGuard(eyeToRun, { executedEyes });

    if (!guardResult.allowed) {
      console.error(`🚫 Order guard violation: ${guardResult.reason}`);
      return createErrorResponse(c, {
        title: 'Pipeline Order Violation',
        status: 400,
        detail: guardResult.reason,
        code: 'E_PIPELINE_ORDER',
      });
    }

    // Execute Eye via orchestrator (pass task as string input)
    const result = await orchestrator.runEye(eyeToRun, task, sessionId);

    return createSuccessResponse(c, result);
  } catch (error: any) {
    console.error('MCP run failed:', error);
    return createInternalErrorResponse(c, error.message || 'MCP execution failed');
  }
});

// Health check for MCP service
app.get('/health', (c) => {
  return createSuccessResponse(c, {
    service: 'third-eye-mcp',
    timestamp: new Date().toISOString(),
  });
});

// GET /mcp/tools - List all registered Eyes
// GOLDEN RULE #1: Only overseer is publicly callable - filter out individual Eyes
app.get('/tools', async (c) => {
  const { getToolsJSON } = await import('../../../../mcp-bridge/src/registry');

  const allTools = getToolsJSON();
  // Only expose overseer - individual Eyes are internal implementation details
  const publicTools = allTools.filter(tool => tool.name === 'overseer');

  return createSuccessResponse(c, {
    tools: publicTools,
    count: publicTools.length,
    _internal_note: 'Individual Eyes (sharingan, jogan, etc.) are internal - only overseer is public',
  });
});

// GET /mcp/quickstart - Agent primers and examples
app.get('/quickstart', (c) => {
  return createSuccessResponse(c, {
    quickstart: {
      workflows: {
        clarification: {
          description: 'For ambiguous user requests requiring clarification',
          sequence: ['sharingan', 'prompt-helper', 'jogan'],
          example: 'User says "make it better" → Sharingan detects ambiguity → prompt-helper rewrites → Jogan confirms',
        },
        planning: {
          description: 'For tasks requiring a detailed plan',
          sequence: ['rinnegan:requirements', 'rinnegan:review'],
          example: 'Define requirements → Generate plan → Review plan',
        },
        implementation: {
          description: 'Full code implementation workflow',
          sequence: ['rinnegan:requirements', 'rinnegan:review', 'mangekyo:scaffold', 'mangekyo:impl', 'mangekyo:tests', 'mangekyo:docs', 'rinnegan:approval'],
          example: 'Complete software development lifecycle with quality gates',
        },
        factChecking: {
          description: 'Validate text with evidence and consistency checks',
          sequence: ['tenseigan', 'byakugan'],
          example: 'Validate citations → Check for contradictions',
        },
      },
      routing: {
        sharingan: 'Works best with fast models like llama3.1-8b or gemma2-9b',
        rinnegan: 'Requires reasoning models like claude-sonnet-4 or gpt-4-turbo',
        mangekyo: 'Best with code-specialized models like claude-sonnet-4',
        tenseigan: 'Requires access to search/knowledge for fact-checking',
      },
      primers: {
        newSession: 'Start with Sharingan if user intent is unclear, or jump to Rinnegan for well-defined tasks',
        autoRouting: 'Use Overseer to automatically determine the next Eye based on current state',
      },
    },
  });
});

// GET /mcp/schemas - All Eye JSON schemas
app.get('/schemas', (c) => {
  const envelopeSchema = {
    type: 'object',
    properties: {
      eye: { type: 'string', description: 'Eye name (sharingan, jogan, etc.)' },
      code: { type: 'string', description: 'Status code (OK, NEED_CLARIFICATION, REJECT_*, etc.)' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'], description: 'Final verdict' },
      summary: { type: 'string', minLength: 1, maxLength: 500, description: 'Brief explanation' },
      details: { type: 'string', description: 'Extended explanation (optional)' },
      suggestions: { type: 'array', items: { type: 'string' }, description: 'Actionable suggestions (optional)' },
      confidence: { type: 'number', minimum: 0, maximum: 100, description: 'Confidence score 0-100 (optional)' },
      metadata: { type: 'object', description: 'Eye-specific metadata (optional)' },
    },
    required: ['eye', 'code', 'verdict', 'summary'],
  };

  const errorCodes = {
    success: ['OK', 'OK_WITH_NOTES'],
    rejection: ['REJECT_AMBIGUOUS', 'REJECT_UNSAFE', 'REJECT_INCOMPLETE', 'REJECT_INCONSISTENT', 'REJECT_NO_EVIDENCE', 'REJECT_BAD_PLAN', 'REJECT_CODE_ISSUES'],
    clarification: ['NEED_CLARIFICATION', 'NEED_MORE_CONTEXT', 'SUGGEST_ALTERNATIVE'],
    error: ['EYE_ERROR', 'EYE_TIMEOUT', 'INVALID_ENVELOPE'],
  };

  return createSuccessResponse(c, {
    envelope: envelopeSchema,
    errorCodes,
  });
});

// GET /mcp/examples/:eye - Example inputs/outputs for an Eye
app.get('/examples/:eye', (c) => {
  const eyeName = c.req.param('eye');

  const examples: Record<string, any[]> = {
    sharingan: [
      {
        input: 'make it better',
        output: { eye: 'sharingan', code: 'NEED_CLARIFICATION', verdict: 'NEEDS_INPUT', summary: 'Request is too vague', metadata: { ambiguityScore: 85, clarifyingQuestions: ['What specifically needs improvement?', 'What are your success criteria?'] } },
        description: 'Extremely vague request',
      },
      {
        input: 'Implement a user authentication system with JWT tokens, bcrypt password hashing, and email verification',
        output: { eye: 'sharingan', code: 'OK', verdict: 'APPROVED', summary: 'Request is clear and specific', metadata: { ambiguityScore: 15, clarifyingQuestions: [] } },
        description: 'Clear, specific request',
      },
    ],
    jogan: [
      {
        input: { refined_prompt_md: 'Build a REST API with CRUD operations for user management', estimated_tokens: 1500 },
        output: { eye: 'jogan', code: 'OK', verdict: 'APPROVED', summary: 'Intent confirmed: Build a user management REST API with create, read, update, delete operations' },
        description: 'Intent confirmation',
      },
    ],
    tenseigan: [
      {
        input: { draft_md: 'TypeScript is faster than JavaScript [1]. It also has better memory management [no citation].' },
        output: { eye: 'tenseigan', code: 'REJECT_NO_EVIDENCE', verdict: 'REJECTED', summary: 'Missing citations for claims', metadata: { totalClaims: 2, citedClaims: 1, citationRate: 50 } },
        description: 'Incomplete citations',
      },
    ],
  };

  const eyeExamples = examples[eyeName];

  if (!eyeExamples) {
    return createNotFoundResponse(c, `Examples for Eye: ${eyeName}`);
  }

  return createSuccessResponse(c, {
    eye: eyeName,
    examples: eyeExamples,
  });
});

export default app;