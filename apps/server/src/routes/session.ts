import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { sessions, runs, pipelineEvents } from '@third-eye/db';
import { getConfig } from '@third-eye/config';
import { eq, desc, count, sql, or, gte } from 'drizzle-orm';
import { validateBody, schemas, rateLimit } from '../middleware/validation';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

/**
 * Session Management Routes
 *
 * Handles session creation, retrieval, and run history
 */

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Apply rate limiting
app.use('*', rateLimit({ maxRequests: 200 })); // Higher limit for session ops

// Schemas for validation
const createSessionSchema = z.object({
  config: z.any().optional()
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'failed'])
});

const addContextSchema = z.object({
  source: z.enum(['user', 'eye']),
  key: z.string().min(1),
  value: z.any()
});

const validateClarificationSchema = z.object({
  answer: z.string().min(1)
});

// Create new session
app.post('/', async (c) => {
  try {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch (e) {
      // Empty body is ok
    }
    const { config: sessionConfig } = body;

    const sessionId = nanoid(12);
    const { db } = getDb();
    const config = getConfig();

    const newSession = {
      id: sessionId,
      agentName: sessionConfig?.agentName || 'Unknown Agent',
      model: sessionConfig?.model || null,
      displayName: sessionConfig?.displayName || sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: sessionConfig || null,
    };

    await db.insert(sessions).values(newSession).run();

    const inserted = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    // Generate portal URL
    const portalUrl = `http://${config.server.host}:${config.ui.port}/monitor?sessionId=${sessionId}`;

    // Broadcast session creation via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'session_created',
        sessionId,
        session: inserted,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, {
      sessionId,
      portalUrl,
      session: inserted,
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return createInternalErrorResponse(c, 'Failed to create session');
  }
});

// Open browser for a session (called by MCP server when agent connects)
app.post('/open', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Missing required field: sessionId'
      });
    }

    const { db } = getDb();
    const config = getConfig();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Generate portal URL - use /session/:id for better UX (has session selector + theme preserved)
    const portalUrl = `http://${config.server.host}:${config.ui.port}/session/${sessionId}`;

    // Open browser if configured
    if (config.ui.autoOpen) {
      try {
        const { spawn } = await import('child_process');
        const command = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(command, [portalUrl], { detached: true, stdio: 'ignore' });
        console.log(`🧿 Browser opened for session ${sessionId}: ${portalUrl}`);
      } catch (e) {
        console.warn('Failed to auto-open browser:', e);
      }
    }

    return createSuccessResponse(c, {
      sessionId,
      portalUrl,
      opened: config.ui.autoOpen,
    });
  } catch (error) {
    console.error('Failed to open session:', error);
    return createInternalErrorResponse(c, 'Failed to open session');
  }
});

// Get active sessions (sessions with activity in last 10 minutes)
// NOTE: This route MUST come before /:id to avoid treating 'active' as a session ID
app.get('/active', async (c) => {
  try {
    const { db } = getDb();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Get sessions that are either:
    // 1. Status is 'active'
    // 2. Have recent events (within 10 minutes)
    const activeSessions = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        agentName: sessions.agentName,
        model: sessions.model,
        displayName: sessions.displayName,
        createdAt: sessions.createdAt,
        configJson: sessions.configJson,
      })
      .from(sessions)
      .where(or(
        eq(sessions.status, 'active'),
        gte(sessions.createdAt, tenMinutesAgo)
      ))
      .orderBy(desc(sessions.createdAt))
      .limit(20)
      .all();

    // Enrich with event counts and metadata
    const enrichedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const eventCount = await db
          .select({ count: count() })
          .from(pipelineEvents)
          .where(eq(pipelineEvents.sessionId, session.id))
          .get();

        const lastEvent = await db
          .select()
          .from(pipelineEvents)
          .where(eq(pipelineEvents.sessionId, session.id))
          .orderBy(desc(pipelineEvents.createdAt))
          .limit(1)
          .get();

        const config = typeof session.configJson === 'string'
          ? JSON.parse(session.configJson)
          : session.configJson || {};

        return {
          sessionId: session.id,
          status: session.status,
          createdAt: session.createdAt,
          eventCount: eventCount?.count || 0,
          lastActivity: lastEvent?.createdAt || session.createdAt,
          agentName: session.agentName || config.agentName || 'Unknown Agent',
          model: session.model || config.model || 'Unknown Model',
          displayName: session.displayName || config.displayName || session.id,
        };
      })
    );

    return createSuccessResponse(c, {
      sessions: enrichedSessions,
      total: enrichedSessions.length,
    });
  } catch (error) {
    console.error('Failed to fetch active sessions:', error);
    return createInternalErrorResponse(c, 'Failed to fetch active sessions');
  }
});

// Get all sessions
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const includeStats = c.req.query('stats') === 'true';

    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    let stats = null;
    if (includeStats) {
      const totalRuns = await db
        .select({ count: count() })
        .from(runs)
        .get();

      const runsWithLatency = await db
        .select({
          latencyMs: runs.latencyMs,
          outputJson: runs.outputJson,
        })
        .from(runs)
        .all();

      const validRuns = runsWithLatency.filter(r => r.latencyMs != null && r.latencyMs > 0);
      const avgLatency = validRuns.length > 0
        ? Math.round(validRuns.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / validRuns.length)
        : 0;

      const successfulRuns = runsWithLatency.filter(r => {
        try {
          const output = typeof r.outputJson === 'string' ? JSON.parse(r.outputJson) : r.outputJson;
          return output?.ok === true || output?.code?.startsWith('OK_');
        } catch {
          return false;
        }
      });

      const successRate = totalRuns?.count > 0
        ? Math.round((successfulRuns.length / totalRuns.count) * 100)
        : 0;

      stats = {
        totalSessions: allSessions.length,
        totalRuns: totalRuns?.count || 0,
        successRate,
        avgLatency,
      };
    }

    return createSuccessResponse(c, {
      sessions: allSessions,
      stats,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return createInternalErrorResponse(c, 'Failed to fetch sessions');
  }
});

// Get session by ID
// NOTE: This route MUST come after /active and other specific routes
app.get('/:id', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    return createSuccessResponse(c, session);
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return createInternalErrorResponse(c, 'Failed to fetch session');
  }
});

// Get all sessions
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const includeStats = c.req.query('stats') === 'true';

    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    let stats = null;
    if (includeStats) {
      const totalRuns = await db
        .select({ count: count() })
        .from(runs)
        .get();

      const runsWithLatency = await db
        .select({
          latencyMs: runs.latencyMs,
          outputJson: runs.outputJson,
        })
        .from(runs)
        .all();

      const validRuns = runsWithLatency.filter(r => r.latencyMs != null && r.latencyMs > 0);
      const avgLatency = validRuns.length > 0
        ? Math.round(validRuns.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / validRuns.length)
        : 0;

      const successfulRuns = runsWithLatency.filter(r => {
        try {
          const output = typeof r.outputJson === 'string' ? JSON.parse(r.outputJson) : r.outputJson;
          return output?.ok === true || output?.code?.startsWith('OK_');
        } catch {
          return false;
        }
      });

      const successRate = totalRuns?.count > 0
        ? Math.round((successfulRuns.length / totalRuns.count) * 100)
        : 0;

      stats = {
        totalSessions: allSessions.length,
        totalRuns: totalRuns?.count || 0,
        successRate,
        avgLatency,
      };
    }

    return createSuccessResponse(c, {
      sessions: allSessions,
      stats,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return createInternalErrorResponse(c, 'Failed to fetch sessions');
  }
});

// Get runs for a session (paginated timeline)
app.get('/:id/runs', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return createSuccessResponse(c, {
      sessionId,
      runs: sessionRuns,
      limit,
      offset,
      total: sessionRuns.length,
    });
  } catch (error) {
    console.error('Failed to fetch session runs:', error);
    return createInternalErrorResponse(c, 'Failed to fetch session runs');
  }
});

// Get pipeline events for a session
app.get('/:id/events', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    const limit = parseInt(c.req.query('limit') || '500');
    const offset = parseInt(c.req.query('offset') || '0');

    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .orderBy(pipelineEvents.createdAt)
      .limit(limit)
      .offset(offset)
      .all();

    return createSuccessResponse(c, events);
  } catch (error) {
    console.error('Failed to fetch pipeline events:', error);
    return createInternalErrorResponse(c, 'Failed to fetch pipeline events');
  }
});

// Get session summary with event count and unique eyes
app.get('/:id/summary', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    const eventCount = await db
      .select({ count: count() })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .get();

    const uniqueEyes = await db
      .select({ eye: pipelineEvents.eye })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .groupBy(pipelineEvents.eye)
      .all();

    return createSuccessResponse(c, {
      sessionId,
      status: session.status,
      eventCount: eventCount?.count || 0,
      eyes: uniqueEyes.map(e => e.eye).filter(Boolean),
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch session summary:', error);
    return createInternalErrorResponse(c, 'Failed to fetch session summary');
  }
});

// Update session status
app.patch('/:id/status', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    if (!status || !['active', 'completed', 'failed'].includes(status)) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid status. Must be: active, completed, or failed'
      });
    }

    const { db } = getDb();

    await db
      .update(sessions)
      .set({ status })
      .where(eq(sessions.id, sessionId))
      .run();

    const updated = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!updated) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Broadcast status change
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'session_status_updated',
        sessionId,
        status,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, updated);
  } catch (error) {
    console.error('Failed to update session status:', error);
    return createInternalErrorResponse(c, 'Failed to update session status');
  }
});

// Kill switch: Cancel all pending Eyes in session
app.post('/:id/kill', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Check if already killed
    if (session.status === 'killed') {
      return createErrorResponse(c, {
        title: 'Invalid Operation',
        status: 400,
        detail: 'Session already killed'
      });
    }

    // Get list of pending/running Eyes from runs table
    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .all();

    // Find runs that might still be in progress (no output or recent)
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const potentiallyActiveRuns = sessionRuns.filter((run) => {
      const runTime = new Date(run.createdAt).getTime();
      return runTime > fiveMinutesAgo;
    });

    const stoppedEyes = potentiallyActiveRuns.map((run) => run.eye);

    // Update session status to 'killed'
    await db
      .update(sessions)
      .set({ status: 'killed' })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast kill signal via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'session_killed',
        sessionId,
        stoppedEyes,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    console.log(`🛑 Session ${sessionId} killed. Stopped ${stoppedEyes.length} Eyes: ${stoppedEyes.join(', ')}`);

    return createSuccessResponse(c, {
      sessionId,
      status: 'killed',
      stoppedEyes,
      message: `Killed session and stopped ${stoppedEyes.length} Eye(s)`,
    });
  } catch (error) {
    console.error('Failed to kill session:', error);
    return createInternalErrorResponse(c, 'Failed to kill session');
  }
});

// Rerun specific Eye for Kill Switch validation
app.post('/:id/rerun/:eye', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const eyeName = c.req.param('eye');
    const { input } = await c.req.json();

    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Import orchestrator
    const { EyeOrchestrator } = await import('@third-eye/core');
    const orchestrator = new EyeOrchestrator();

    // Run Eye with provided input
    const result = await orchestrator.runEye(eyeName, input, sessionId);

    // Broadcast rerun event via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'eye_rerun',
        sessionId,
        eye: eyeName,
        result,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    console.log(`🔄 Reran ${eyeName} for session ${sessionId}`);

    return createSuccessResponse(c, result);
  } catch (error) {
    console.error('Failed to rerun Eye:', error);
    return createInternalErrorResponse(c, 'Failed to rerun Eye');
  }
});

// Get session context (for SessionMemoryPanel)
app.get('/:id/context', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to fetch session context:', error);
    return createInternalErrorResponse(c, 'Failed to fetch session context');
  }
});

// Add context item
app.post('/:id/context', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json();
    const { source, key, value } = body;

    if (!source || !key || value === undefined) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Missing required fields: source, key, value'
      });
    }

    if (!['user', 'eye'].includes(source)) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid source. Must be: user or eye'
      });
    }

    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Parse existing context
    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    // Add new context item
    context[key] = {
      value,
      source,
      addedAt: new Date().toISOString(),
    };

    // Update session
    await db
      .update(sessions)
      .set({ configJson: context })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast context update
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'context_updated',
        sessionId,
        key,
        value,
        source,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to add context:', error);
    return createInternalErrorResponse(c, 'Failed to add context');
  }
});

// Remove context item
app.delete('/:id/context/:key', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const key = c.req.param('key');
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Parse existing context
    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    // Remove context item
    delete context[key];

    // Update session
    await db
      .update(sessions)
      .set({ configJson: context })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast context update
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToSession(sessionId, {
        type: 'context_removed',
        sessionId,
        key,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to remove context:', error);
    return createInternalErrorResponse(c, 'Failed to remove context');
  }
});

// Export session data in multiple formats
app.get('/:id/export', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const format = c.req.query('format') || 'json';

    if (!['json', 'md', 'csv'].includes(format)) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid format. Must be: json, md, or csv'
      });
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Get runs
    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(runs.createdAt)
      .all();

    // Get events
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .orderBy(pipelineEvents.createdAt)
      .all();

    if (format === 'json') {
      // JSON export: Full session data
      const exportData = {
        session: {
          id: session.id,
          status: session.status,
          createdAt: session.createdAt,
          config: session.configJson,
        },
        runs: sessionRuns,
        events,
        exportedAt: new Date().toISOString(),
      };

      c.header('Content-Type', 'application/json');
      c.header('Content-Disposition', `attachment; filename="session-${sessionId}.json"`);
      return c.json(exportData);
    }

    if (format === 'md') {
      // Markdown export: Human-readable timeline
      let markdown = `# Session ${sessionId}\n\n`;
      markdown += `**Status:** ${session.status}\n`;
      markdown += `**Created:** ${new Date(session.createdAt).toISOString()}\n\n`;

      markdown += `## Timeline\n\n`;
      for (const event of events) {
        const timestamp = new Date(event.createdAt).toISOString();
        markdown += `### ${event.eye || 'System'} - ${event.code}\n`;
        markdown += `**Time:** ${timestamp}\n\n`;
        if (event.md) {
          markdown += `${event.md}\n\n`;
        }
        markdown += `---\n\n`;
      }

      markdown += `## Runs Summary\n\n`;
      for (const run of sessionRuns) {
        markdown += `### ${run.eye}\n`;
        markdown += `- **Model:** ${run.model || 'N/A'}\n`;
        markdown += `- **Latency:** ${run.latencyMs || 'N/A'}ms\n`;
        markdown += `- **Tokens In:** ${run.tokensIn || 0}\n`;
        markdown += `- **Tokens Out:** ${run.tokensOut || 0}\n\n`;

        const output = typeof run.outputJson === 'string'
          ? JSON.parse(run.outputJson)
          : run.outputJson;

        if (output?.summary) {
          markdown += `**Summary:** ${output.summary}\n\n`;
        }

        markdown += `---\n\n`;
      }

      c.header('Content-Type', 'text/markdown');
      c.header('Content-Disposition', `attachment; filename="session-${sessionId}.md"`);
      return c.text(markdown);
    }

    if (format === 'csv') {
      // CSV export: Metrics only
      let csv = 'eye,model,latency_ms,tokens_in,tokens_out,verdict,created_at\n';

      for (const run of sessionRuns) {
        const output = typeof run.outputJson === 'string'
          ? JSON.parse(run.outputJson)
          : run.outputJson;

        const verdict = output?.verdict || 'UNKNOWN';

        csv += `${run.eye},${run.model || 'N/A'},${run.latencyMs || 0},${run.tokensIn || 0},${run.tokensOut || 0},${verdict},${new Date(run.createdAt).toISOString()}\n`;
      }

      c.header('Content-Type', 'text/csv');
      c.header('Content-Disposition', `attachment; filename="session-${sessionId}.csv"`);
      return c.text(csv);
    }

    return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid format'
      });
  } catch (error) {
    console.error('Failed to export session:', error);
    return createInternalErrorResponse(c, 'Failed to export session');
  }
});

// Validate clarification answer using Jogan
app.post('/:id/clarifications/:clarificationId/validate', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const clarificationId = c.req.param('clarificationId');
    const body = await c.req.json();
    const { answer } = body;

    if (!answer) {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Missing required field: answer'
      });
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: 'Session Not Found',
        status: 404,
        detail: 'Session not found'
      });
    }

    // Parse session context
    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    const clarifications = context.clarifications || {};
    const existingClarification = clarifications[clarificationId];

    if (!existingClarification) {
      return createErrorResponse(c, {
        title: 'Clarification Not Found',
        status: 404,
        detail: 'Clarification not found'
      });
    }

    // Validate answer coherence using basic rules
    // In production, this would call Jogan Eye for semantic validation
    let valid = true;
    let reason: string | undefined;
    let suggestion: string | undefined;

    // Check answer length
    if (answer.trim().length < 3) {
      valid = false;
      reason = 'Answer too short';
      suggestion = 'Please provide more detail (at least 3 characters)';
    }

    // Check for contradictions with previous clarifications
    if (valid) {
      const previousAnswers = Object.values(clarifications)
        .filter((c: any) => c.answer)
        .map((c: any) => c.answer.toLowerCase());

      const answerLower = answer.toLowerCase();

      // Simple contradiction detection
      if (previousAnswers.some((prev: string) =>
        (prev.includes('yes') && answerLower.includes('no')) ||
        (prev.includes('no') && answerLower.includes('yes'))
      )) {
        valid = false;
        reason = 'Answer contradicts previous clarification';
        suggestion = 'Please review your previous answers for consistency';
      }
    }

    // Check against session context for contradictions
    if (valid && context.userIntent) {
      const userIntent = context.userIntent.toLowerCase();
      const answerLower = answer.toLowerCase();

      // Check if answer contradicts stated user intent
      if (userIntent.includes('build') && answerLower.includes('delete')) {
        valid = false;
        reason = 'Answer contradicts stated intent';
        suggestion = 'Your answer seems to contradict your original intent to build something';
      }
    }

    return createSuccessResponse(c, {
      valid,
      reason,
      suggestion,
      clarificationId,
      answer,
    });
  } catch (error) {
    console.error('Failed to validate clarification:', error);
    return createInternalErrorResponse(c, 'Failed to validate clarification');
  }
});

// Bulk delete sessions (cleanup old test sessions)
app.delete('/bulk', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionIds, olderThan } = body;

    const { db } = getDb();

    let deletedCount = 0;

    if (sessionIds && Array.isArray(sessionIds)) {
      // Delete specific sessions by ID
      for (const id of sessionIds) {
        try {
          // Delete related records first
          await db.delete(pipelineEvents).where(eq(pipelineEvents.sessionId, id)).run();
          await db.delete(runs).where(eq(runs.sessionId, id)).run();
          // Delete session last
          await db.delete(sessions).where(eq(sessions.id, id)).run();
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete session ${id}:`, err);
          // Continue with next session
        }
      }
    } else if (olderThan) {
      // Delete sessions older than specified date
      const cutoffDate = new Date(olderThan);

      const oldSessions = await db
        .select()
        .from(sessions)
        .where(sql`${sessions.createdAt} < ${cutoffDate}`)
        .all();

      for (const session of oldSessions) {
        await db.delete(sessions).where(eq(sessions.id, session.id)).run();
        await db.delete(runs).where(eq(runs.sessionId, session.id)).run();
        await db.delete(pipelineEvents).where(eq(pipelineEvents.sessionId, session.id)).run();
        deletedCount++;
      }
    } else {
      return createErrorResponse(c, {
        title: 'Validation Error',
        status: 400,
        detail: 'Provide either sessionIds (array) or olderThan (ISO date string)'
      });
    }

    return createSuccessResponse(c, {
      deleted: deletedCount,
      message: `Deleted ${deletedCount} session(s) and associated data`
    });
  } catch (error) {
    console.error('Failed to bulk delete sessions:', error);
    return createInternalErrorResponse(c, 'Failed to bulk delete sessions');
  }
});

export default app;
