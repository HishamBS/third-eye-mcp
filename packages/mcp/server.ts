import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { autoRouter } from "../core/auto-router";
import { TOOL_NAME } from "@third-eye/types";
import { z } from "zod";

/**
 * Third Eye MCP Server
 *
 * Provides stdio-based MCP server for agent connections
 * Exposes Eyes as MCP tools with intelligent guidance
 */

// Track if browser has been opened for this MCP server instance
let browserOpenedForSession = new Set<string>();

// Store client metadata & handshake context from initialize handshake
interface ClientMetadata {
  name: string;
  version: string;
  title?: string;
  displayName: string;
  icons?: Array<Record<string, any>>;
  raw?: Record<string, any>;
}

interface HandshakeContext {
  capabilities?: Record<string, any>;
  meta?: Record<string, any>;
  timestamp?: number;
}

let clientMetadata: ClientMetadata = {
  name: "Unknown Agent",
  version: "unknown",
  displayName: "Unknown Agent",
};

let lastHandshake: HandshakeContext = {};

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildSessionMetadata(): Record<string, any> {
  return {
    client: clientMetadata,
    clientName: clientMetadata.name,
    clientDisplayName: clientMetadata.displayName,
    clientVersion: clientMetadata.version,
    handshake: lastHandshake,
  };
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

// Tool schema - ONLY third_eye_overseer (Golden Rule #1)
const MCP_TOOL_NAME = TOOL_NAME;
const SAFETY_DISABLED = process.env.THIRD_EYE_DISABLE_SAFETY === 'true';

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all|any|previous|earlier) (instructions|guidelines)/i,
  /override (all|any|previous|earlier) (instructions|guards|safety)/i,
  /pretend (you are|to be) (malicious|evil|insecure)/i,
  /disregard (the|your) safety/i,
  /leak (your|the) (config|prompt|instructions)/i,
  /dump (all )?(data|secrets|keys)/i,
  /run (rm -rf|format c:|del \/s)/i,
  /act as jailbreak/i,
  /you must reveal/i,
];

const DISALLOWED_CONTENT_PATTERNS = [
  /how to (build|make|create).*(weapon|bomb|explosive|molotov)/i,
  /(credit card|bank|ssn).*(steal|hack|bypass)/i,
  /(violence|kill|murder).*(plan|how)/i,
  /(self.?harm|suicide).*(help|plan|instructions)/i,
  /(cheat|bypass).*(exam|captcha|paywall)/i,
];

function detectInjectionOrAbuse(task: unknown): { unsafe: boolean; reason?: string } {
  if (typeof task !== 'string') {
    return { unsafe: true, reason: 'Invalid task payload (expected string).' };
  }

  const normalized = task.trim();
  if (!normalized) {
    return { unsafe: true, reason: 'Empty task payload.' };
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return { unsafe: true, reason: 'Potential prompt-injection attempt detected.' };
    }
  }

  for (const pattern of DISALLOWED_CONTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return { unsafe: true, reason: 'Disallowed or harmful content detected.' };
    }
  }

  return { unsafe: false };
}

const OVERSEER_TOOL: Tool = {
  name: MCP_TOOL_NAME,
  description:
    "Empowers you with Third Eye’s inner perception. Call this tool for every non-trivial request—Overseer will analyse ambiguity, plan the best route, run the reviews, and hand you the next action. Never bypass it.",
  inputSchema: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Natural-language description of the user’s goal, draft, or material to validate. Send the full request verbatim.",
      },
      context: {
        type: "object",
        additionalProperties: true,
        description: "Optional metadata (files, repository info, telemetry, prior conversation). Overseer uses it to enrich routing.",
      },
      strictness: {
        type: "object",
        additionalProperties: true,
        description: "Optional gates (ambiguity threshold, citation cutoff, consistency tolerance, mangekyoStrictness). Defaults map to Enterprise strictness.",
      },
    },
    required: ["task"],
  },
  examples: [
    {
      input: {
        task: "Refactor the payment service controller for clarity and add missing edge-case tests.",
      },
      description: "Code refinement task that requires full guidance + validation pipeline.",
    },
    {
      input: {
        task: "Validate this incident report for contradictions and missing follow-up actions.",
        context: {
          reportUrl: "https://intranet.example.com/incidents/2025-04-17",
        },
      },
      description: "Text/ops validation task that triggers evidence + consistency checks.",
    },
  ],
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
    const { clientInfo, clientCapabilities } = request.params as any;
    const handshakeMeta = (request.params as any)?._meta;

    // Store client metadata from MCP protocol
    if (clientInfo) {
      const name = (clientInfo.name || "Unknown Agent").trim();
      const version = (clientInfo.version || "unknown").trim();
      const title =
        typeof clientInfo.title === "string" && clientInfo.title.trim().length > 0
          ? clientInfo.title.trim()
          : undefined;
      const displayName =
        title ||
        (typeof clientInfo.displayName === "string" && clientInfo.displayName.trim().length > 0
          ? clientInfo.displayName.trim()
          : name);
      const icons = Array.isArray(clientInfo.icons) ? clientInfo.icons : undefined;

      clientMetadata = {
        name,
        version,
        title,
        displayName,
        icons,
        raw: clientInfo,
      };

      lastHandshake = {
        capabilities: clientCapabilities,
        meta: handshakeMeta,
        timestamp: Date.now(),
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
    if (name === MCP_TOOL_NAME) {
      const task = (args as any).task;

      // NO rejection logic - let Overseer LLM decide everything

      // Internal parameters (not exposed in schema but can be passed)
      const providedSessionId = (args as any).sessionId;
      const rawStrictness = (args as any).strictness;
      const rawContext = (args as any).context;

      const strictnessOptions = isPlainObject(rawStrictness) ? rawStrictness : undefined;
      const contextOptions: PlainObject | undefined = (() => {
        if (!rawContext) {
          return { mcpClient: buildSessionMetadata() };
        }

        if (isPlainObject(rawContext)) {
          return {
            ...rawContext,
            mcpClient: buildSessionMetadata(),
          };
        }

        return { mcpClient: buildSessionMetadata() };
      })();

      const safety = SAFETY_DISABLED ? { unsafe: false } : detectInjectionOrAbuse(task);
      if (safety.unsafe) {
        console.warn(`[Safety] Blocked request for ${MCP_TOOL_NAME}: ${safety.reason ?? 'unknown reason'}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "rejected",
                  code: "E_SAFETY_BLOCKED",
                  verdict: "REJECTED",
                  summary: safety.reason ?? 'Request blocked by Third Eye safety layer.',
                  metadata: {
                    sessionId: providedSessionId ?? null,
                    portalUrl: null,
                    stepsExecuted: 0,
                  },
                  tool: MCP_TOOL_NAME,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      try {
        // Always execute the full pipeline (simplified - no analyze mode for agents)
        const result = await autoRouter.executeFlow(task, undefined, providedSessionId, {
          strictness: strictnessOptions,
          context: contextOptions,
        });

        // Open browser for this session on first successful tool call
        await openBrowserForSession(result.sessionId);

        const finalResult = result.results[result.results.length - 1] as Record<string, unknown> | undefined;
        const code = (() => {
          if (result.completed) {
            return typeof finalResult?.code === 'string' ? (finalResult.code as string) : 'OK';
          }
          if (finalResult && typeof finalResult.code === 'string') {
            return 'E_EXECUTION_FAILED';
          }
          return 'E_PIPELINE_FAILED';
        })();

        const verdict = typeof finalResult?.verdict === 'string'
          ? (finalResult.verdict as string)
          : result.completed
            ? 'APPROVED'
            : 'REJECTED';

        let summary = typeof finalResult?.summary === 'string'
          ? (finalResult.summary as string)
          : result.completed
            ? 'Validation complete. Your content has been reviewed.'
            : result.error
              ? `third_eye_overseer could not finish the task: ${result.error}`
              : 'third_eye_overseer could not finish the task.';

        if (!result.completed && !summary.toLowerCase().includes(MCP_TOOL_NAME)) {
          summary = `${summary} \nTool: ${MCP_TOOL_NAME}`;
        }

        const metadata = {
          sessionId: result.sessionId,
          portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
          stepsExecuted: result.results.length,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "success",
                  code,
                  verdict,
                  summary,
                  metadata,
                  data: finalResult,
                  history: result.results,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        const failureSessionId = providedSessionId ?? (typeof error?.sessionId === 'string' ? error.sessionId : undefined) ?? 'unknown';
        const metadata = {
          sessionId: failureSessionId,
          portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${failureSessionId}`,
          stepsExecuted: 0,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "error",
                  code: "ERROR",
                  verdict: "REJECTED",
                  summary: `third_eye_overseer encountered an error: ${error.message}`,
                  metadata,
                  tool: MCP_TOOL_NAME,
                  data: {
                    message: error.message,
                  },
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
      `Unknown tool: ${name}. Only '${MCP_TOOL_NAME}' is available. Individual Eyes cannot be called directly—route everything through ${MCP_TOOL_NAME}.`
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
  console.error(
    `🔧 Public tool: ${MCP_TOOL_NAME} (single entry point)`
  );
  console.error(
    "⚡ Golden Rule #1: Agents call only third_eye_overseer - Eyes are internal"
  );
}
