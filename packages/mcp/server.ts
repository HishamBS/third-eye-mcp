import { Server } from "@modelcontextprotocol/sdk/server";
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
  icons?: Array<Record<string, unknown>>;
  raw?: Record<string, unknown>;
}

interface HandshakeContext {
  capabilities?: Record<string, unknown>;
  meta?: Record<string, unknown>;
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

// MCP Protocol types for request handling
interface MCPInitializeParams {
  clientInfo?: Record<string, unknown>;
  clientCapabilities?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

interface MCPToolArguments {
  task?: string;
  sessionId?: string;
  strictness?: Record<string, unknown>;
  context?: Record<string, unknown>;
  confirmationId?: string;
  confirmationResponse?: string;
}

function buildSessionMetadata(): Record<string, unknown> {
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
const SAFETY_DISABLED = process.env.THIRD_EYE_DISABLE_SAFETY === "true";

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

function detectInjectionOrAbuse(task: unknown): {
  unsafe: boolean;
  reason?: string;
} {
  if (typeof task !== "string") {
    return { unsafe: true, reason: "Invalid task payload (expected string)." };
  }

  const normalized = task.trim();
  if (!normalized) {
    return { unsafe: true, reason: "Empty task payload." };
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        unsafe: true,
        reason: "Potential prompt-injection attempt detected.",
      };
    }
  }

  for (const pattern of DISALLOWED_CONTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        unsafe: true,
        reason: "Disallowed or harmful content detected.",
      };
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
        description:
          "Natural-language description of the user's goal, draft, or material to validate. Send the full request verbatim.",
      },
      context: {
        type: "object",
        additionalProperties: true,
        description:
          "Optional metadata (files, repository info, telemetry, prior conversation). Overseer uses it to enrich routing.",
      },
      strictness: {
        type: "object",
        additionalProperties: true,
        description:
          "Optional gates (ambiguity threshold, citation cutoff, consistency tolerance, mangekyoStrictness). Defaults map to Enterprise strictness.",
      },
      confirmationId: {
        type: "string",
        description:
          "Phase 2-B: Confirmation ID if resuming from intent confirmation pause.",
      },
      confirmationResponse: {
        type: "string",
        description:
          "Phase 2-B: 'confirmed' or 'rejected' - response to intent confirmation request.",
      },
    },
    required: ["task"],
  },
  examples: [
    {
      input: {
        task: "Refactor the payment service controller for clarity and add missing edge-case tests.",
      },
      description:
        "Code refinement task that requires full guidance + validation pipeline.",
    },
    {
      input: {
        task: "Validate this incident report for contradictions and missing follow-up actions.",
        context: {
          reportUrl: "https://intranet.example.com/incidents/2025-04-17",
        },
      },
      description:
        "Text/ops validation task that triggers evidence + consistency checks.",
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
    },
  );

  // Handle initialize request to capture client metadata
  server.setRequestHandler(
    InitializeRequestSchema,
    async (request: {
      params: {
        protocolVersion?: string;
        capabilities?: unknown;
        clientInfo?: { name?: string; version?: string };
      };
    }) => {
      const params = request.params as MCPInitializeParams;
      const { clientInfo, clientCapabilities } = params;
      const handshakeMeta = params._meta;

      // Store client metadata from MCP protocol
      if (clientInfo) {
        const name = (
          typeof clientInfo.name === "string"
            ? clientInfo.name
            : "Unknown Agent"
        ).trim();
        const version = (
          typeof clientInfo.version === "string"
            ? clientInfo.version
            : "unknown"
        ).trim();
        const title =
          typeof clientInfo.title === "string" &&
          clientInfo.title.trim().length > 0
            ? clientInfo.title.trim()
            : undefined;
        const displayName =
          title ||
          (typeof clientInfo.displayName === "string" &&
          clientInfo.displayName.trim().length > 0
            ? clientInfo.displayName.trim()
            : name);
        const icons = Array.isArray(clientInfo.icons)
          ? (clientInfo.icons as Array<Record<string, unknown>>)
          : undefined;

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
          } v${clientMetadata.version}`,
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
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [OVERSEER_TOOL],
    };
  });

  // Call tool handler
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: { params: { name: string; arguments?: unknown } }) => {
      const { name, arguments: args } = request.params;

      // Handle overseer tool - main entry point
      if (name === MCP_TOOL_NAME) {
        const toolArgs = args as MCPToolArguments;
        const task = toolArgs.task;
        if (!task) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "error",
                  code: "E_MISSING_TASK",
                  verdict: "REJECTED",
                  summary: "Task parameter is required",
                }),
              },
            ],
            isError: true,
          };
        }

        // NO rejection logic - let Overseer LLM decide everything

        // Internal parameters (not exposed in schema but can be passed)
        const providedSessionId = toolArgs.sessionId;
        const rawStrictness = toolArgs.strictness;
        const rawContext = toolArgs.context;

        const strictnessOptions = isPlainObject(rawStrictness)
          ? rawStrictness
          : undefined;
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

        const safety = SAFETY_DISABLED
          ? { unsafe: false }
          : detectInjectionOrAbuse(task);
        if (safety.unsafe) {
          console.warn(
            `[Safety] Blocked request for ${MCP_TOOL_NAME}: ${safety.reason ?? "unknown reason"}`,
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "rejected",
                    code: "E_SAFETY_BLOCKED",
                    verdict: "REJECTED",
                    summary:
                      safety.reason ??
                      "Request blocked by Third Eye safety layer.",
                    metadata: {
                      sessionId: providedSessionId ?? null,
                      portalUrl: null,
                      stepsExecuted: 0,
                    },
                    tool: MCP_TOOL_NAME,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        // Phase 2-B: Handle confirmation resume
        const confirmationId =
          typeof toolArgs.confirmationId === "string"
            ? toolArgs.confirmationId
            : undefined;
        const confirmationResponse =
          typeof toolArgs.confirmationResponse === "string"
            ? toolArgs.confirmationResponse
            : undefined;

        if (confirmationId && confirmationResponse) {
          const { IntentConfirmationManager } = await import("@third-eye/core");
          const { getDb } = await import("@third-eye/db");
          const { sqlite } = getDb();
          const confirmationManager = new IntentConfirmationManager(sqlite);

          // Submit the confirmation response
          const confirmation = await confirmationManager.submitConfirmation(
            confirmationId,
            {
              confirmed: confirmationResponse.toLowerCase() === "confirmed",
              response: confirmationResponse,
              source: "agent",
            },
          );

          // If rejected, return early with rejection status
          if (!confirmation || confirmation.status === "rejected") {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "rejected",
                      code: "E_INTENT_REJECTED",
                      verdict: "REJECTED",
                      summary: "Intent confirmation was rejected by user.",
                      metadata: {
                        sessionId: confirmation?.sessionId ?? null,
                        confirmationId,
                        portalUrl: confirmation?.sessionId
                          ? `http://127.0.0.1:3300/monitor?sessionId=${confirmation.sessionId}`
                          : null,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // If confirmed, continue with pipeline execution
          // The sessionId should be loaded from the confirmation
          const resumeSessionId = confirmation.sessionId;
          // Continue execution with the confirmed intent...
          // Note: For now, we'll return success and let the agent re-invoke with the original task
          // A full implementation would resume the exact pipeline state
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "success",
                    code: "INTENT_CONFIRMED",
                    verdict: "APPROVED",
                    summary: "Intent confirmed. You may proceed with the task.",
                    metadata: {
                      sessionId: resumeSessionId,
                      confirmationId,
                      portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${resumeSessionId}`,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        try {
          // Always execute the full pipeline (simplified - no analyze mode for agents)
          // executeFlow accepts optional string (providedSessionId?: string)
          const result = await autoRouter.executeFlow(
            task,
            undefined,
            providedSessionId,
            {
              strictness: strictnessOptions,
              context: contextOptions,
            },
          );

          // Open browser for this session on first successful tool call
          await openBrowserForSession(result.sessionId);

          const finalResult = result.results[result.results.length - 1] as
            | Record<string, unknown>
            | undefined;

          // Phase 2-B: Check for intent confirmation pause
          if (finalResult && finalResult.code === "NEED_CONFIRMATION") {
            const confirmationPrompt =
              typeof finalResult.data === "object" &&
              finalResult.data !== null &&
              "confirmationPrompt" in finalResult.data
                ? String(
                    (finalResult.data as Record<string, unknown>)
                      .confirmationPrompt,
                  )
                : "Please confirm your intent to proceed with this task.";

            const intentAnalysis =
              typeof finalResult.data === "object" &&
              finalResult.data !== null &&
              "intentAnalysis" in finalResult.data
                ? ((finalResult.data as Record<string, unknown>)
                    .intentAnalysis as Record<string, unknown>)
                : {};

            // Create confirmation request
            const { IntentConfirmationManager } = await import(
              "@third-eye/core"
            );
            const { getDb } = await import("@third-eye/db");
            const { db } = getDb();
            const confirmationManager = new IntentConfirmationManager(db);

            const confirmation = await confirmationManager.createConfirmation({
              sessionId: result.sessionId,
              intentAnalysis,
              confirmationPrompt,
            });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "awaiting_confirmation",
                      code: "NEED_CONFIRMATION",
                      verdict: "PAUSED",
                      summary:
                        "Intent confirmation required before proceeding.",
                      metadata: {
                        sessionId: result.sessionId,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
                        confirmationId: confirmation.id,
                        stepsExecuted: result.results.length,
                      },
                      data: {
                        confirmationPrompt,
                        intentAnalysis,
                        confirmationId: confirmation.id,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
          const code = (() => {
            if (result.completed) {
              return typeof finalResult?.code === "string"
                ? (finalResult.code as string)
                : "OK";
            }
            if (finalResult && typeof finalResult.code === "string") {
              return "E_EXECUTION_FAILED";
            }
            return "E_PIPELINE_FAILED";
          })();

          const verdict =
            typeof finalResult?.verdict === "string"
              ? (finalResult.verdict as string)
              : result.completed
                ? "APPROVED"
                : "REJECTED";

          let summary =
            typeof finalResult?.summary === "string"
              ? (finalResult.summary as string)
              : result.completed
                ? "Validation complete. Your content has been reviewed."
                : result.error
                  ? `third_eye_overseer could not finish the task: ${result.error}`
                  : "third_eye_overseer could not finish the task.";

          if (
            !result.completed &&
            !summary.toLowerCase().includes(MCP_TOOL_NAME)
          ) {
            summary = `${summary} \nTool: ${MCP_TOOL_NAME}`;
          }

          const metadata = {
            sessionId: result.sessionId,
            portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
            stepsExecuted: result.results.length,
          };

          // Phase 1-A6 + REPAIR_PLAN A6: Eye Invisibility - Agent NEVER sees internal Eye operations
          // Only return sanitized fields: summary, content (from md field), sessionId, portalUrl
          // Agent must NOT see: eye names, routing decisions, history, steps, or any internal structure
          const sanitizedData: Record<string, unknown> = {};

          // Extract only safe fields from finalResult
          if (finalResult && typeof finalResult === "object") {
            // md field contains the eye's markdown analysis - safe to expose
            if ("md" in finalResult && typeof finalResult.md === "string") {
              sanitizedData.content = finalResult.md;
            }
            // Some eyes may have safe top-level data fields we can expose
            // But we NEVER expose: tag, next, next_action, routing, history, eyeResults
          }

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
                    data: sanitizedData,
                    // REPAIR_PLAN A6: NO eye names, NO routing, NO internal structure
                    // Developers monitor Eyes via portal: metadata.portalUrl
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        } catch (error: unknown) {
          const errorObj =
            error instanceof Error ? error : new Error(String(error));
          const sessionIdFromError =
            typeof error === "object" &&
            error !== null &&
            "sessionId" in error &&
            typeof error.sessionId === "string"
              ? error.sessionId
              : undefined;
          const failureSessionId =
            providedSessionId ?? sessionIdFromError ?? "unknown";
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
                    summary: `third_eye_overseer encountered an error: ${errorObj.message}`,
                    metadata,
                    tool: MCP_TOOL_NAME,
                    data: {
                      message: errorObj.message,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(
        `Unknown tool: ${name}. Only '${MCP_TOOL_NAME}' is available. Individual Eyes cannot be called directly—route everything through ${MCP_TOOL_NAME}.`,
      );
    },
  );

  return server;
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer() {
  // Seed database with defaults (eyes, personas, pipelines, routing, etc.)
  // This ensures MCP server works with fresh or in-memory databases
  const { seedDefaults } = await import("@third-eye/db/defaults");
  const { getDb } = await import("@third-eye/db");

  // Initialize database (creates tables if needed)
  const { db } = getDb();

  // Seed defaults silently (only logs if verbose)
  try {
    await seedDefaults({
      log: () => {}, // Silent seeding for MCP server
    });
  } catch (error) {
    // Log error but don't fail startup (database might already be seeded)
    console.error(
      "[MCP Server] Seeding warning:",
      error instanceof Error ? error.message : String(error),
    );
  }

  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error("🧿 Third Eye MCP Server running on stdio");
  console.error("📡 Ready for agent connections");
  console.error(`🔧 Public tool: ${MCP_TOOL_NAME} (single entry point)`);
  console.error(
    "⚡ Golden Rule #1: Agents call only third_eye_overseer - Eyes are internal",
  );
}
