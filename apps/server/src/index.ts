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
import overseerRoutes from './routes/overseer';
import eyesRoutes from './routes/eyes';
import guidanceRoutes from './routes/guidance';
import promptsRoutes from './routes/prompts';
import pipelinesRoutes from './routes/pipelines';
import strictnessRoutes from './routes/strictness';
import leaderboardsRoutes from './routes/leaderboards';
import duelRoutes from './routes/duel';
import exportRoutes from './routes/export';
import integrationsRoutes from './routes/integrations';
import appSettingsRoutes from './routes/app-settings';
import databaseOpsRoutes from './routes/database-ops';
import modelsRoutes from './routes/models';

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
const defaultOrigins = new Set([
  `http://127.0.0.1:${uiPort}`,
  `http://localhost:${uiPort}`,
  `http://${config.server.host}:${config.server.port}`,
]);

const extraOrigins = Array.isArray(config.security.allowedOrigins)
  ? config.security.allowedOrigins.filter(Boolean)
  : [];

extraOrigins.forEach(origin => defaultOrigins.add(origin));

app.use('*', cors({
  origin: (origin) => {
    if (!origin) {
      return '*'; // Same-origin (curl, server-to-server)
    }

    if (origin.startsWith('mcp://')) {
      return origin; // Return the origin for MCP clients
    }

    if (defaultOrigins.has(origin)) {
      return origin; // Return the origin for allowed origins
    }

    return false; // Reject all other origins
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key', 'X-Session-Id', 'Authorization'],
  credentials: true,
}));

// API Routes
app.route('/api/database/ops', databaseOpsRoutes);
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
app.route('/api/metrics/leaderboards', leaderboardsRoutes); // Alias for /api/leaderboards
app.route('/api/duel', duelRoutes);
app.route('/api/export', exportRoutes);
app.route('/api/integrations', integrationsRoutes);
app.route('/api/app-settings', appSettingsRoutes);
app.route('/api/models', modelsRoutes);

// Eyes API Routes - Read-only endpoints enabled for UI
// Note: Direct Eye EXECUTION is blocked (violates Golden Rule #1)
// But listing/browsing Eyes for UI is allowed
app.route('/api/eyes', eyesRoutes);

// Overseer Route (Golden Rule #1 - ONLY public entry point)
app.route('/overseer', overseerRoutes);

// MCP Routes (legacy, prefer /overseer)
// NOTE: These routes expose Eye registry and agent primers for MCP clients
// Individual Eyes are NOT directly callable - only documentation/metadata is exposed
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

    return c.json({
      ok: health.status === 'healthy',
      status: health.status,
      version: health.version,
      uptime_seconds: health.uptime_seconds,
      host: health.host,
      bindAddress: health.bindAddress,
      timestamp: new Date().toISOString(),
      checks: {
        database: health.database,
        providers: health.providers,
      },
    }, statusCode);
  } catch (error) {
    return c.json({
      ok: false,
      status: 'down',
      version: process.env.npm_package_version || 'unknown',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
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
