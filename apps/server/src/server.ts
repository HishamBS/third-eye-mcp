import { serve } from 'bun';
import { spawn } from 'child_process';
import app from './index';
import { createWebSocketHandler, wsManager } from './websocket';
import { getConfig } from '@third-eye/config';

/**
 * Third Eye MCP Server
 *
 * Bun server with HTTP + WebSocket support
 */

const config = getConfig();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 7070;
const HOST = process.env.HOST || '127.0.0.1';

// Create WebSocket handler
const wsHandler = createWebSocketHandler();

// Start server with WebSocket support
const server = serve({
  port: PORT,
  hostname: HOST,
  fetch(req, server) {
    // Try WebSocket upgrade first
    const wsResponse = wsHandler.fetch(req, server);
    if (wsResponse) {
      return wsResponse;
    }

    // Fall back to regular HTTP handling
    return app.fetch(req);
  },
  websocket: wsHandler.websocket,
});

// Cleanup interval for stale connections
setInterval(() => {
  wsManager.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

console.log(`🚀 Third Eye MCP Server running at http://${HOST}:${PORT}`);
console.log(`📡 WebSocket endpoint: ws://${HOST}:${PORT}/ws/monitor?sessionId=<id>`);

// Auto-open portal in browser if configured
if (config.ui.autoOpen) {
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
  }, 1500); // Wait 1.5s for UI server to be ready
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.stop();
  process.exit(0);
});

export default server;