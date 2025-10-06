import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { EyeOrchestrator } from '@third-eye/core';
import { ProviderFactory } from '@third-eye/providers';
import { getDb } from '@third-eye/db';
import { eyesRouting, personas, modelsCache } from '@third-eye/db';
import { getConfig } from '@third-eye/config';
import type { ProviderId } from '@third-eye/types';
import { eq, desc } from 'drizzle-orm';
import databaseRoutes from './routes/database';
import providerKeysRoutes from './routes/provider-keys';
import routingRoutes from './routes/routing';
import personasRoutes from './routes/personas';
import sessionRoutes from './routes/session';
import mcpRoutes from './routes/mcp';
import eyesRoutes from './routes/eyes';
import guidanceRoutes from './routes/guidance';
import promptsRoutes from './routes/prompts';
import pipelinesRoutes from './routes/pipelines';
import strictnessRoutes from './routes/strictness';
import leaderboardsRoutes from './routes/leaderboards';
import duelRoutes from './routes/duel';
import exportRoutes from './routes/export';
import integrationsRoutes from './routes/integrations';

/**
 * Third Eye MCP Bun Server
 *
 * Hono-based REST + WebSocket server for local-first AI orchestration
 */

const app = new Hono();
const orchestrator = new EyeOrchestrator();

// CORS middleware - Allow UI to communicate with server
const config = getConfig();
const uiPort = config.ui?.port || 3300;
const allowedOrigins = [
  `http://127.0.0.1:${uiPort}`,
  `http://localhost:${uiPort}`,
];

app.use('*', cors({
  origin: allowedOrigins,
  credentials: true,
}));

// API Routes
app.route('/api/database', databaseRoutes);
app.route('/api/provider-keys', providerKeysRoutes);
app.route('/api/routing', routingRoutes);
app.route('/api/personas', personasRoutes);
app.route('/api/session', sessionRoutes);
app.route('/api/guidance', guidanceRoutes);
app.route('/api/prompts', promptsRoutes);
app.route('/api/pipelines', pipelinesRoutes);
app.route('/api/strictness', strictnessRoutes);
app.route('/api/leaderboards', leaderboardsRoutes);
app.route('/api/duel', duelRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/integrations', integrationsRoutes);

// Eyes API Routes (called by MCP bridge + UI)
app.route('/eyes', eyesRoutes);
app.route('/api/eyes', eyesRoutes);

// MCP Routes
app.route('/mcp', mcpRoutes);

// Simple ping endpoint for testing routing
app.get('/ping', (c) => {
  return c.text('pong');
});

// Enhanced health check with DB and provider status
app.get('/health', async (c) => {
  const { getSystemHealth } = await import('./lib/health');

  try {
    const health = await getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 207 : 503;

    return c.json(health, statusCode);
  } catch (error) {
    return c.json({
      status: 'down',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString(),
    }, 503);
  }
});

// Models endpoint - list models for a provider
app.get('/models/:provider', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;

  try {
    const config = getConfig();
    const providerConfig = config.providers[providerId];

    if (!providerConfig) {
      return c.json({ error: `Provider ${providerId} not configured` }, 400);
    }

    const provider = ProviderFactory.create(providerId, providerConfig);
    const models = await provider.listModels();

    // Cache models in database
    const { db } = getDb();
    for (const model of models) {
      await db.insert(modelsCache).values({
        provider: providerId,
        model: model.name,
        displayName: model.name,
        family: model.family,
        capabilityJson: model.capability,
        lastSeen: new Date(),
      }).onConflictDoUpdate({
        target: [modelsCache.provider, modelsCache.model],
        set: {
          displayName: model.name,
          family: model.family,
          capabilityJson: model.capability,
          lastSeen: new Date(),
        },
      });
    }

    return c.json(models);
  } catch (error) {
    console.error(`Failed to list models for ${providerId}:`, error);
    return c.json({ error: `Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Note: Routing, Personas, Sessions, and MCP endpoints are now in dedicated route files

// WebSocket status endpoint
app.get('/ws/status', async (c) => {
  const { wsManager } = await import('./websocket');
  return c.json({
    websocket: {
      enabled: true,
      endpoint: `/ws/monitor?sessionId=<sessionId>`,
      stats: wsManager.getStats(),
    },
  });
});

export default app;