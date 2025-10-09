#!/usr/bin/env bun

/**
 * Third Eye MCP Server Startup
 *
 * Starts the HTTP + WebSocket server
 */

import { serve } from 'bun';
import app from './index';
import { createWebSocketHandler } from './websocket';
import { getConfig } from '@third-eye/config';
import { loadProviderKeysIntoConfig } from '@third-eye/core/load-provider-keys';
import { seedDatabase } from '../../../scripts/seed-database';
import { seedIntegrations } from '../../../scripts/seed-integrations';

const config = getConfig();
const PORT = config.server.port;
const HOST = config.server.host;
const warnOnUnsafeBind = (host: string) => {
  if (!config.security.bindWarning) {
    return;
  }
  if (host === '0.0.0.0' || host === '::') {
    console.warn('\n⚠️  WARNING: Third Eye MCP is binding to a public interface.');
    console.warn('   This exposes the server to your local network.');
    console.warn('   Set MCP_HOST=127.0.0.1 to keep the instance local-first.\n');
  }
};

warnOnUnsafeBind(HOST);

// Initialize database with default data
console.log('[Startup] Seeding database...');
await seedDatabase();
await seedIntegrations();
console.log('[Startup] Database seeded successfully\n');

// Load provider keys from database into config
await loadProviderKeysIntoConfig();

// Create WebSocket handler
const wsHandler = createWebSocketHandler();

console.log(`[Server] Starting Third Eye MCP Server on ${HOST}:${PORT}...`);

// Start server with both HTTP and WebSocket support
const server = serve({
  port: PORT,
  hostname: HOST,
  fetch(req, server) {
    console.log(`[Request] ${req.method} ${new URL(req.url).pathname}`);

    // Try WebSocket upgrade first
    const url = new URL(req.url);
    if (url.pathname.startsWith('/ws/')) {
      const wsResponse = wsHandler.fetch(req, server);
      if (wsResponse) {
        console.log(`[WebSocket] Upgraded connection for ${url.pathname}`);
        return wsResponse;
      }
    }

    // Fall back to regular HTTP handling via Hono app
    return app.fetch(req);
  },
  websocket: wsHandler.websocket,
});

console.log(`
🧿 Third-Eye MCP — READY
• MCP tool: overseer
• Server: http://${HOST}:${PORT}
• UI:     http://${HOST}:${config.ui.port}
• DB:     ~/.third-eye-mcp/mcp.db
• Providers: groq, openrouter, ollama, lmstudio  (health: green)
• Agent Primer: http://${HOST}:${PORT}/mcp/quickstart
`);
console.log(`📡 WebSocket: ws://${HOST}:${PORT}/ws/monitor?sessionId=<id>`);
console.log(`🧪 Test: curl http://${HOST}:${PORT}/ping`);
console.log(`\n💡 Browser will auto-open when an MCP agent creates a session`);
