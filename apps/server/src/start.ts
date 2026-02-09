#!/usr/bin/env bun

/**
 * Third Eye MCP Server Startup
 *
 * Starts the HTTP + WebSocket server
 */

import { serve } from "bun";
import app from "./index";
import { createWebSocketHandler } from "./websocket";
import { getConfig } from "@third-eye/config";
import { loadProviderKeysIntoConfig } from "@third-eye/core/load-provider-keys";
import { TOOL_NAME, DATA_DIRECTORY, PROVIDERS } from "@third-eye/types";

const config = getConfig();
const PORT = config.server.port;
const HOST = config.server.host;
const warnOnUnsafeBind = (host: string) => {
  if (!config.security.bindWarning) {
    return;
  }
  if (host === "0.0.0.0" || host === "::") {
    console.warn(
      "\n[Security] WARNING: Third Eye MCP is binding to a public interface.",
    );
    console.warn("   This exposes the server to your local network.");
    console.warn(
      "   Set MCP_HOST=127.0.0.1 to keep the instance local-first.\n",
    );
  }
};

warnOnUnsafeBind(HOST);

// Database seeding is handled by CLI before server starts
// No duplicate seeding needed here - follows SSOT principle

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
    if (url.pathname.startsWith("/ws/")) {
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
[Server] Third-Eye MCP -- READY
  MCP tool: ${TOOL_NAME}
  Server: http://${HOST}:${PORT}
  UI:     http://${HOST}:${config.ui.port}
  DB:     ~/${DATA_DIRECTORY}/mcp.db
  Providers: ${PROVIDERS.join(", ")}  (health: green)
  Agent Primer: http://${HOST}:${PORT}/mcp/quickstart
`);
console.log(`[WS] WebSocket: ws://${HOST}:${PORT}/ws/monitor?sessionId=<id>`);
console.log(`[Health] Test: curl http://${HOST}:${PORT}/ping`);
console.log(
  `\n[Server] Browser will auto-open when an MCP agent creates a session`,
);
