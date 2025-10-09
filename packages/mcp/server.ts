import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { EyeOrchestrator } from "@third-eye/core";
import { autoRouter } from "../core/auto-router";
import { sessionManager } from "../core/session-manager";
import { z } from "zod";

/**
 * Third Eye MCP Server
 *
 * Provides stdio-based MCP server for agent connections
 * Exposes Eyes as MCP tools with intelligent guidance
 */

const orchestrator = new EyeOrchestrator();

// Track if browser has been opened for this MCP server instance
let browserOpenedForSession = new Set<string>();

// Store client metadata from initialize handshake
let clientMetadata: {
  name: string;
  version: string;
  displayName?: string;
} = {
  name: "Unknown Agent",
  version: "unknown",
};

/**
 * Get or create session - reuses existing session within 30 minutes
 * Uses client metadata captured from MCP initialize handshake
 */
async function getOrCreateSession(agentModel?: string): Promise<string> {
  try {
    const agentName = clientMetadata.displayName || clientMetadata.name;

    // Check for existing active session from the same agent within last 30 minutes
    const sessions = await sessionManager.getActiveSessions();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find matching session
    const existingSession = sessions.find(
      (session) =>
        session.agentName === agentName &&
        session.status === "active" &&
        new Date(session.lastActivity) > thirtyMinutesAgo
    );

    if (existingSession) {
      // Reuse existing session - update last activity
      await sessionManager.updateSession(existingSession.id, {});
      console.error(
        `♻️  Reusing session: ${existingSession.id} for agent: ${agentName}`
      );
      return existingSession.id;
    }

    // Create new session with captured client metadata
    const newSession = await sessionManager.createSession({
      agentName,
      model: agentModel,
      displayName: `${agentName} Session`,
      metadata: {
        clientName: clientMetadata.name,
        clientVersion: clientMetadata.version,
        clientDisplayName: clientMetadata.displayName,
      },
    });
    console.error(
      `✨ Created new session: ${newSession.id} for agent: ${agentName}`
    );
    return newSession.id;
  } catch (error) {
    console.error("Failed to get or create session:", error);
    // Fallback to generating a simple session ID
    return `session_${Date.now()}`;
  }
}

/**
 * Open browser for a session (first tool call only)
 */
async function openBrowserForSession(sessionId: string) {
  if (browserOpenedForSession.has(sessionId)) {
    return; // Already opened
  }

  try {
    const config = await import("@third-eye/config").then((m) => m.getConfig());
    const API_URL = `http://${config.server.host}:${config.server.port}`;

    const response = await fetch(`${API_URL}/api/session/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });

    if (response.ok) {
      browserOpenedForSession.add(sessionId);
      console.error(`🧿 Browser opened for session: ${sessionId}`);
    }
  } catch (error) {
    console.error("Failed to open browser:", error);
  }
}

// Tool schema - ONLY overseer (Golden Rule #1)
const OVERSEER_TOOL: Tool = {
  name: "oversee",
  description:
    "Third Eye MCP overseer helps AI agents understand what humans really want. Send vague requests and get clarifying questions, or send completed work for validation. We guide, discourage, enforce citations, and gatekeep quality - we never generate content ourselves.",
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Describe what you want to accomplish",
      },
    },
    required: ["task"],
  },
};

/**
 * Create and configure MCP server
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: "third-eye-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle initialize request to capture client metadata
  server.setRequestHandler(InitializeRequestSchema, async (request) => {
    const { clientInfo } = request.params;

    // Store client metadata from MCP protocol
    if (clientInfo) {
      clientMetadata = {
        name: clientInfo.name,
        version: clientInfo.version,
        displayName: (clientInfo as any).displayName || clientInfo.name,
      };

      console.error(
        `🤝 MCP Client connected: ${
          clientMetadata.displayName || clientMetadata.name
        } v${clientMetadata.version}`
      );
    }

    // Return server capabilities
    return {
      protocolVersion: "2025-03-26",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "third-eye-mcp",
        version: "1.0.0",
      },
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [OVERSEER_TOOL],
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle overseer tool - main entry point
    if (name === "oversee") {
      const task = (args as any).task;

      // NO rejection logic - let Overseer LLM decide everything

      // Internal parameters (not exposed in schema but can be passed)
      const operation = (args as any).operation || "execute";
      const providedSessionId = (args as any).sessionId;
      const config = (args as any).config || {};

      // Get or create session (reuses existing session from same agent)
      // agentModel can be passed in config or detected later
      const agentModel = config.model;
      const sessionId =
        providedSessionId || (await getOrCreateSession(agentModel));

      // Open browser for this session on first tool call
      await openBrowserForSession(sessionId);

      try {
        // Always execute the full pipeline (simplified - no analyze mode for agents)
        const result = await autoRouter.executeFlow(task, undefined, sessionId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "success",
                  sessionId: result.sessionId,
                  verdict: result.completed ? "APPROVED" : "REJECTED",
                  summary: result.completed
                    ? `Validation complete. Your content has been reviewed.`
                    : `Review incomplete: ${result.error}`,
                  stepsExecuted: result.results.length,
                  finalResult: result.results[result.results.length - 1],
                  portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "error",
                  sessionId: sessionId,
                  verdict: "REJECTED",
                  summary: "Task execution failed",
                  error: error.message,
                  portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${sessionId}`,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(
      `Unknown tool: ${name}. Only 'oversee' is available. Individual Eyes cannot be called directly - all requests go through the overseer.`
    );
  });

  return server;
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("🧿 Third Eye MCP Server running on stdio");
  console.error("📡 Ready for agent connections");
  console.error("🔧 Public tool: overseer (single entry point)");
  console.error(
    "⚡ Golden Rule #1: Agents call only overseer - Eyes are internal"
  );
}
