import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { sessions, runs, pipelineEvents } from '@third-eye/db';
import { getConfig } from '@third-eye/config';
import { eq, desc, count, sql } from 'drizzle-orm';
import { validateBody, schemas, rateLimit } from '../middleware/validation';

/**
 * Session Management Routes
 *
 * Handles session creation, retrieval, and run history
 */

const app = new Hono();

// Apply rate limiting
app.use('*', rateLimit({ maxRequests: 200 })); // Higher limit for session ops

// Create new session
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { config: sessionConfig } = body;

    const sessionId = nanoid(12);
    const { db } = getDb();
    const config = getConfig();

    const newSession = {
      id: sessionId,
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
    const portalUrl = `http://${config.server.host}:${config.ui.port}/session/${sessionId}`;

    // Auto-open browser if configured
    if (config.ui.autoOpen) {
      try {
        const { spawn } = await import('child_process');
        const command = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        spawn(command, [portalUrl], { detached: true, stdio: 'ignore' });
      } catch (e) {
        console.warn('Failed to auto-open browser:', e);
      }
    }

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

    return c.json({
      sessionId,
      portalUrl,
      session: inserted,
    });
  } catch (error) {
    console.error('Failed to create session:', error);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});

// Get session by ID
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
      return c.json({ error: 'Session not found' }, 404);
    }

    return c.json(session);
  } catch (error) {
    console.error('Failed to fetch session:', error);
    return c.json({ error: 'Failed to fetch session' }, 500);
  }
});

// Get all sessions
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      sessions: allSessions,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return c.json({ error: 'Failed to fetch sessions' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json({
      sessionId,
      runs: sessionRuns,
      limit,
      offset,
      total: sessionRuns.length,
    });
  } catch (error) {
    console.error('Failed to fetch session runs:', error);
    return c.json({ error: 'Failed to fetch session runs' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json(events);
  } catch (error) {
    console.error('Failed to fetch pipeline events:', error);
    return c.json({ error: 'Failed to fetch pipeline events' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json({
      sessionId,
      status: session.status,
      eventCount: eventCount?.count || 0,
      eyes: uniqueEyes.map(e => e.eye).filter(Boolean),
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch session summary:', error);
    return c.json({ error: 'Failed to fetch session summary' }, 500);
  }
});

// Update session status
app.patch('/:id/status', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    if (!status || !['active', 'completed', 'failed'].includes(status)) {
      return c.json({ error: 'Invalid status. Must be: active, completed, or failed' }, 400);
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
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json(updated);
  } catch (error) {
    console.error('Failed to update session status:', error);
    return c.json({ error: 'Failed to update session status' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
    }

    // Check if already killed
    if (session.status === 'killed') {
      return c.json({ error: 'Session already killed' }, 400);
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

    return c.json({
      sessionId,
      status: 'killed',
      stoppedEyes,
      message: `Killed session and stopped ${stoppedEyes.length} Eye(s)`,
    });
  } catch (error) {
    console.error('Failed to kill session:', error);
    return c.json({ error: 'Failed to kill session' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
    }

    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    return c.json({
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to fetch session context:', error);
    return c.json({ error: 'Failed to fetch session context' }, 500);
  }
});

// Add context item
app.post('/:id/context', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const body = await c.req.json();
    const { source, key, value } = body;

    if (!source || !key || value === undefined) {
      return c.json({
        error: 'Missing required fields',
        required: ['source', 'key', 'value'],
      }, 400);
    }

    if (!['user', 'eye'].includes(source)) {
      return c.json({ error: 'Invalid source. Must be: user or eye' }, 400);
    }

    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json({
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to add context:', error);
    return c.json({ error: 'Failed to add context' }, 500);
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
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json({
      sessionId,
      context,
    });
  } catch (error) {
    console.error('Failed to remove context:', error);
    return c.json({ error: 'Failed to remove context' }, 500);
  }
});

// Export session data in multiple formats
app.get('/:id/export', async (c) => {
  try {
    const sessionId = c.req.param('id');
    const format = c.req.query('format') || 'json';

    if (!['json', 'md', 'csv'].includes(format)) {
      return c.json({ error: 'Invalid format. Must be: json, md, or csv' }, 400);
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
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

    return c.json({ error: 'Invalid format' }, 400);
  } catch (error) {
    console.error('Failed to export session:', error);
    return c.json({ error: 'Failed to export session' }, 500);
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
      return c.json({ error: 'Missing required field: answer' }, 400);
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Parse session context
    const context = typeof session.configJson === 'string'
      ? JSON.parse(session.configJson)
      : session.configJson || {};

    const clarifications = context.clarifications || {};
    const existingClarification = clarifications[clarificationId];

    if (!existingClarification) {
      return c.json({ error: 'Clarification not found' }, 404);
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

    return c.json({
      valid,
      reason,
      suggestion,
      clarificationId,
      answer,
    });
  } catch (error) {
    console.error('Failed to validate clarification:', error);
    return c.json({ error: 'Failed to validate clarification' }, 500);
  }
});

export default app;
