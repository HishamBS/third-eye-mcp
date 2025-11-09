import { Hono } from 'hono';
import { EyeOrchestrator } from '@third-eye/core';
import { schemas, rateLimit } from '../middleware/validation';
import { validateBodyWithEnvelope } from '../middleware/response';
import { TOOL_NAME } from '@third-eye/types';
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSessionConfig(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  if (isPlainObject(value)) {
    return { ...value };
  }

  return {};
}

function mergeSessionConfig(
  base: Record<string, unknown>,
  context?: Record<string, unknown>,
  strictness?: Record<string, unknown>
) {
  const merged: Record<string, unknown> = { ...base };

  if (context && isPlainObject(context)) {
    Object.assign(merged, context);
  }

  if (strictness && isPlainObject(strictness)) {
    merged.strictness = strictness;
  }

  return merged;
}

function configsEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());
app.use('*', rateLimit());

// Run an Eye with input and session context
// GOLDEN RULE #1: ONLY task-based auto-routing allowed - NO direct Eye execution
app.post('/run', validateBodyWithEnvelope(schemas.mcpRun), async (c) => {
  try {
    const { task, sessionId: providedSessionId, context, strictness } = c.get('validatedBody');

    const contextConfig = isPlainObject(context) ? context : undefined;
    const strictnessConfig = isPlainObject(strictness) ? strictness : undefined;

    let sessionConfig = mergeSessionConfig({}, contextConfig, strictnessConfig);

    // Ensure session exists before pipeline execution
    // If providedSessionId is given but doesn't exist in DB, create it
    // If no sessionId provided, auto-router will create one
    let actualSessionId = providedSessionId;

    if (providedSessionId) {
      const { getDb } = await import('@third-eye/db');
      const { sessions } = await import('@third-eye/db');
      const { eq } = await import('drizzle-orm');
      const { nanoid } = await import('nanoid');

      const { db } = getDb();
      const existingSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, providedSessionId))
        .get();

      if (!existingSession) {
        // Session doesn't exist - create it now
        console.log(`📝 Creating session on-demand: ${providedSessionId}`);
        await db.insert(sessions).values({
          id: providedSessionId,
          agentName: 'Playground',
          model: null,
          displayName: providedSessionId.slice(0, 8),
          status: 'active',
          createdAt: new Date(),
          configJson: sessionConfig,
        }).run();
      }

      if (existingSession) {
        const currentConfig = parseSessionConfig(existingSession.configJson);
        const mergedConfig = mergeSessionConfig(currentConfig, contextConfig, strictnessConfig);

        if (!configsEqual(currentConfig, mergedConfig)) {
          await db
            .update(sessions)
            .set({ configJson: mergedConfig })
            .where(eq(sessions.id, providedSessionId))
            .run();
        }

        sessionConfig = mergedConfig;
      }
    }

    // Import AutoRouter for FULL pipeline execution
    const { autoRouter } = await import('@third-eye/core/auto-router');

    console.log(`🚀 Executing full pipeline for task via AutoRouter`);

    // Execute COMPLETE pipeline via AutoRouter
    // AutoRouter will:
    // 1. Call Overseer to analyze task and determine optimal Eye sequence
    // 2. Execute each Eye in the pipeline
    // 3. Handle pauses (AWAIT_INPUT, NEED_CLARIFICATION)
    // 4. Return all results
    const result = await autoRouter.executeFlow(task, undefined, providedSessionId, {
      strictness: strictnessConfig,
      context: Object.keys(sessionConfig).length > 0 ? sessionConfig : undefined,
    });

    if (!result.completed) {
      console.error(`❌ Pipeline incomplete: ${result.error}`);
      return createErrorResponse(c, {
        title: 'Pipeline Execution Failed',
        status: 500,
        detail: result.error || 'Pipeline did not complete',
        code: 'E_PIPELINE_INCOMPLETE',
      });
    }

    // Return final result from pipeline
    const finalResult = result.results[result.results.length - 1];

    return createSuccessResponse(c, {
      sessionId: result.sessionId,
      pipelineResults: result.results,
      finalResult,
      totalSteps: result.results.length,
    });
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
// GOLDEN RULE #1: Only third_eye_overseer is publicly callable - filter out individual Eyes
app.get('/tools', async (c) => {
  const { getToolsJSON } = await import('../../../../mcp-bridge/src/registry');

  const allTools = getToolsJSON();
  // Only expose third_eye_overseer - individual Eyes are internal implementation details
  const publicTools = allTools.filter(tool => tool.name === TOOL_NAME);

  return createSuccessResponse(c, {
    tools: publicTools,
    count: publicTools.length,
    _internal_note: 'Individual Eyes (sharingan, jogan, etc.) are internal - only third_eye_overseer is public',
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
