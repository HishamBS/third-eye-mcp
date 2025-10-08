import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import {
  providerKeys,
  eyesRouting,
  personas,
  sessions,
  runs,
  mcpIntegrations
} from '@third-eye/db/schema';
import { eq, desc } from 'drizzle-orm';
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

// Schemas for validation
const updateEyeRoutingSchema = z.object({
  primaryProvider: z.string().optional(),
  primaryModel: z.string().optional(),
  fallbackProvider: z.string().optional(),
  fallbackModel: z.string().optional()
});

// Get all tables with their data
app.get('/tables', async (c) => {
  const { db } = getDb();

  try {
    const [
      providerKeysData,
      eyesRoutingData,
      personasData,
      sessionsData,
      runsData,
      mcpIntegrationsData
    ] = await Promise.all([
      db.select().from(providerKeys),
      db.select().from(eyesRouting),
      db.select().from(personas).orderBy(personas.eye, desc(personas.version)),
      db.select().from(sessions).orderBy(desc(sessions.createdAt)).limit(100),
      db.select().from(runs).orderBy(desc(runs.createdAt)).limit(1000),
      db.select().from(mcpIntegrations).orderBy(mcpIntegrations.displayOrder)
    ]);

    return createSuccessResponse(c, {
      tables: {
        provider_keys: {
          name: 'Provider Keys',
          data: providerKeysData.map(row => ({
            ...row,
            keyValue: row.keyValue ? '***' + row.keyValue.slice(-4) : null // Mask keys for security
          })),
          editable: false,
          schema: [
            { name: 'provider', type: 'text', primary: true },
            { name: 'keyValue', type: 'text' },
            { name: 'baseUrl', type: 'text' },
            { name: 'createdAt', type: 'timestamp' }
          ]
        },
        eyes_routing: {
          name: 'Eyes Routing',
          data: eyesRoutingData,
          editable: true,
          schema: [
            { name: 'eye', type: 'text', primary: true },
            { name: 'primaryProvider', type: 'text' },
            { name: 'primaryModel', type: 'text' },
            { name: 'fallbackProvider', type: 'text' },
            { name: 'fallbackModel', type: 'text' }
          ]
        },
        personas: {
          name: 'Personas',
          data: personasData,
          editable: false,
          schema: [
            { name: 'eye', type: 'text' },
            { name: 'version', type: 'integer' },
            { name: 'content', type: 'text' },
            { name: 'active', type: 'boolean' },
            { name: 'createdAt', type: 'timestamp' }
          ]
        },
        mcp_integrations: {
          name: 'MCP Integrations',
          data: mcpIntegrationsData,
          editable: false,
          schema: [
            { name: 'id', type: 'text', primary: true },
            { name: 'name', type: 'text' },
            { name: 'slug', type: 'text' },
            { name: 'status', type: 'text' },
            { name: 'platforms', type: 'text' },
            { name: 'configType', type: 'text' },
            { name: 'enabled', type: 'boolean' },
            { name: 'displayOrder', type: 'integer' }
          ]
        },
        sessions: {
          name: 'Sessions',
          data: sessionsData,
          editable: false,
          schema: [
            { name: 'id', type: 'text', primary: true },
            { name: 'createdAt', type: 'timestamp' },
            { name: 'status', type: 'text' },
            { name: 'agentName', type: 'text' },
            { name: 'model', type: 'text' }
          ]
        },
        runs: {
          name: 'Runs',
          data: runsData,
          editable: false,
          schema: [
            { name: 'id', type: 'text', primary: true },
            { name: 'sessionId', type: 'text' },
            { name: 'eye', type: 'text' },
            { name: 'provider', type: 'text' },
            { name: 'model', type: 'text' },
            { name: 'tokensIn', type: 'integer' },
            { name: 'tokensOut', type: 'integer' },
            { name: 'latencyMs', type: 'integer' },
            { name: 'createdAt', type: 'timestamp' }
          ]
        }
      }
    });
  } catch (error) {
    console.error('Database tables error:', error);
    return createInternalErrorResponse(c, 'Failed to fetch tables');
  }
});

// Update eyes routing
app.put('/eyes-routing/:eye', async (c) => {
  const { db } = getDb();
  const eye = c.req.param('eye');
  const data = await c.req.json();

  try {
    await db
      .insert(eyesRouting)
      .values({ eye, ...data })
      .onConflictDoUpdate({
        target: eyesRouting.eye,
        set: data
      });

    return createSuccessResponse(c, { success: true });
  } catch (error) {
    console.error('Update eyes routing error:', error);
    return createInternalErrorResponse(c, 'Failed to update routing');
  }
});

// Delete eyes routing
app.delete('/eyes-routing/:eye', async (c) => {
  const { db } = getDb();
  const eye = c.req.param('eye');

  try {
    await db.delete(eyesRouting).where(eq(eyesRouting.eye, eye));
    return createSuccessResponse(c, { success: true });
  } catch (error) {
    console.error('Delete eyes routing error:', error);
    return createInternalErrorResponse(c, 'Failed to delete routing');
  }
});

// Get table schema information
app.get('/schema', async (c) => {
  return createSuccessResponse(c, {
    tables: [
      'provider_keys',
      'eyes_routing',
      'personas',
      'mcp_integrations',
      'sessions',
      'runs'
    ]
  });
});

export default app;