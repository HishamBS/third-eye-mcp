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

const config = getConfig();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7070;
const HOST = process.env.HOST || '127.0.0.1';

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

console.log(`✅ Third Eye MCP Server running at http://${HOST}:${PORT}`);
console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}/ws/monitor?sessionId=<id>`);
console.log(`🧪 Test with: curl http://${HOST}:${PORT}/ping`);

// Auto-open portal if configured
if (config.ui?.autoOpen) {
  const { spawn } = await import('child_process');
  const portalUrl = `http://${HOST}:${config.ui.port}`;

  setTimeout(() => {
    console.log(`\n🌐 Opening Third Eye Portal: ${portalUrl}`);
    const command = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open';
    const browserProcess = spawn(command, [portalUrl], {
      detached: true,
      stdio: 'ignore'
    });
    browserProcess.unref();
  }, 1500);
}