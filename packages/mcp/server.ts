import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { autoRouter } from "@third-eye/core";
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
  checkConfirmationStatus?: string;
  checkClarificationStatus?: string;
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
      checkConfirmationStatus: {
        type: "string",
        description:
          "Poll for human confirmation status. Pass the confirmationId received from a previous 'awaiting_confirmation' response. Returns current status (pending/confirmed/rejected). Human must confirm via the Third Eye portal UI.",
      },
      checkClarificationStatus: {
        type: "string",
        description:
          "Poll for human clarification response. Pass the clarificationId received from a previous 'awaiting_clarification' response. Returns current status and answers if human has responded. Human must answer via the Third Eye portal UI.",
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
        // Check server readiness - return meaningful error if not ready
        if (!serverReadinessState.ready) {
          const health = getServerHealthStatus();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "error",
                    code: "E_SERVER_NOT_READY",
                    verdict: "ERROR",
                    summary: `Third Eye MCP server is not fully initialized: ${health.message}`,
                    details: {
                      healthy: health.healthy,
                      message: health.message,
                      ...(health.details
                        ? { diagnostics: health.details }
                        : {}),
                      recommendation:
                        "Run 'third-eye-mcp up' to initialize the server, then retry your request.",
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

        // Phase 2-B: Poll for human confirmation status (human-in-the-loop)
        // Agent cannot self-confirm - must wait for human to confirm via UI
        const checkConfirmationStatus =
          typeof toolArgs.checkConfirmationStatus === "string"
            ? toolArgs.checkConfirmationStatus
            : undefined;

        if (checkConfirmationStatus) {
          const { IntentConfirmationManager } = await import("@third-eye/core");
          const { getDb } = await import("@third-eye/db");
          const { sqlite } = getDb();
          const confirmationManager = new IntentConfirmationManager(sqlite);

          // Get current status (read-only - no submission)
          const confirmation = confirmationManager.getConfirmation(
            checkConfirmationStatus,
          );

          if (!confirmation) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "error",
                      code: "E_CONFIRMATION_NOT_FOUND",
                      verdict: "ERROR",
                      summary: `Confirmation ${checkConfirmationStatus} not found.`,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // Return current status based on human's response (or lack thereof)
          if (confirmation.status === "pending") {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "awaiting_confirmation",
                      code: "STILL_PENDING",
                      verdict: "PAUSED",
                      summary:
                        "Still waiting for human confirmation. Please ask the user to check the Third Eye portal.",
                      metadata: {
                        sessionId: confirmation.sessionId,
                        confirmationId: confirmation.id,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${confirmation.sessionId}`,
                      },
                      data: {
                        confirmationPrompt: confirmation.confirmationPrompt,
                        intentAnalysis: confirmation.intentAnalysis,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          if (confirmation.status === "rejected") {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "rejected",
                      code: "E_INTENT_REJECTED",
                      verdict: "REJECTED",
                      summary:
                        "Human rejected this intent. Do not proceed with the task.",
                      metadata: {
                        sessionId: confirmation.sessionId,
                        confirmationId: confirmation.id,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${confirmation.sessionId}`,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // Status is "confirmed" - human approved
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "success",
                    code: "INTENT_CONFIRMED",
                    verdict: "APPROVED",
                    summary:
                      "Human confirmed the intent. You may proceed with the task.",
                    metadata: {
                      sessionId: confirmation.sessionId,
                      confirmationId: confirmation.id,
                      portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${confirmation.sessionId}`,
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // Phase 2-B: Poll for human clarification response (human-in-the-loop)
        // Agent cannot self-answer - must wait for human to answer via UI
        // Use session ID to poll (clarification IDs follow pattern clar_{sessionId}_{field})
        const checkClarificationStatus =
          typeof toolArgs.checkClarificationStatus === "string"
            ? toolArgs.checkClarificationStatus
            : undefined;

        if (checkClarificationStatus) {
          const { getPendingClarifications, getResolvedFacts } =
            await import("@third-eye/eyes");

          // Check pending clarifications for this session
          const pendingClarifications = await getPendingClarifications(
            checkClarificationStatus,
          );

          if (pendingClarifications.length > 0) {
            // Still waiting for human to answer
            const questions = pendingClarifications.map(
              (c: { field: string; question: string }) => ({
                field: c.field,
                question: c.question,
              }),
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "awaiting_clarification",
                      code: "STILL_PENDING",
                      verdict: "PAUSED",
                      summary:
                        "Still waiting for human to answer clarification questions. Please ask the user to check the Third Eye portal.",
                      metadata: {
                        sessionId: checkClarificationStatus,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${checkClarificationStatus}`,
                        pendingCount: pendingClarifications.length,
                      },
                      data: {
                        questions,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // No pending = all answered. Get resolved facts.
          const resolvedFacts = await getResolvedFacts(
            checkClarificationStatus,
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "success",
                    code: "CLARIFICATION_ANSWERED",
                    verdict: "PROCEED",
                    summary:
                      "Human answered all clarification questions. You may proceed with the task using these answers.",
                    metadata: {
                      sessionId: checkClarificationStatus,
                      portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${checkClarificationStatus}`,
                    },
                    data: {
                      resolvedFacts,
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

          // Phase 2-B: Check for intent confirmation pause (from auto-router paused state)
          if (result.paused && result.pauseReason === "confirmation") {
            const lastResult = result.results[result.results.length - 1] as
              | Record<string, unknown>
              | undefined;

            const confirmationPrompt =
              typeof lastResult?.data === "object" &&
              lastResult.data !== null &&
              "confirmationPrompt" in lastResult.data
                ? String(
                    (lastResult.data as Record<string, unknown>)
                      .confirmationPrompt,
                  )
                : "Please confirm your intent to proceed with this task.";

            const intentAnalysis =
              typeof lastResult?.data === "object" &&
              lastResult.data !== null &&
              "intentAnalysis" in lastResult.data
                ? ((lastResult.data as Record<string, unknown>)
                    .intentAnalysis as Record<string, unknown>)
                : {};

            // Create confirmation request
            const { IntentConfirmationManager } =
              await import("@third-eye/core");
            const { getDb } = await import("@third-eye/db");
            const { sqlite } = getDb();
            const confirmationManager = new IntentConfirmationManager(sqlite);

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
                      code: "AWAIT_CONFIRMATION",
                      verdict: "PAUSED",
                      summary:
                        "Intent confirmation required before proceeding. Please ask the user to confirm in the Third Eye portal.",
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
                        instruction:
                          "Use checkConfirmationStatus with this confirmationId to poll for human response.",
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // Fallback: Check finalResult code directly (legacy path for NEED_CONFIRMATION or AWAIT_CONFIRMATION)
          if (
            finalResult &&
            (finalResult.code === "NEED_CONFIRMATION" ||
              finalResult.code === "AWAIT_CONFIRMATION")
          ) {
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
            const { IntentConfirmationManager } =
              await import("@third-eye/core");
            const { getDb } = await import("@third-eye/db");
            const { sqlite } = getDb();
            const confirmationManager = new IntentConfirmationManager(sqlite);

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

          // Phase 2-B: Check for clarification pause
          // Fix: Check for paused pipeline first (from auto-router)
          if (result.paused && result.pauseReason === "clarification") {
            // Pipeline was paused by auto-router, get questions from last result
            const lastResult = result.results[result.results.length - 1] as
              | Record<string, unknown>
              | undefined;
            const rawQuestions =
              typeof lastResult?.data === "object" &&
              lastResult.data !== null &&
              "questions" in lastResult.data
                ? ((lastResult.data as Record<string, unknown>)
                    .questions as Array<{
                    id?: string;
                    text?: string;
                    field?: string;
                    question?: string;
                  }>)
                : [];

            // Map questions supporting both {id, text} and {field, question} formats
            const questions = rawQuestions.map((q) => ({
              field: q.field || q.id || "unknown",
              question: q.question || q.text || "No question provided",
            }));

            // Store clarification request
            if (questions.length > 0) {
              const { addClarificationRequest } =
                await import("@third-eye/eyes");
              await addClarificationRequest(result.sessionId, questions);
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "awaiting_clarification",
                      code: "NEED_CLARIFICATION",
                      verdict: "PAUSED",
                      summary:
                        "Clarification required before proceeding. Please ask the user to answer questions in the Third Eye portal.",
                      metadata: {
                        sessionId: result.sessionId,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
                        stepsExecuted: result.results.length,
                      },
                      data: {
                        questions,
                        clarificationId: result.sessionId,
                        instruction:
                          "Use checkClarificationStatus with this sessionId to poll for human responses.",
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }

          // Fallback: Check finalResult code directly (legacy path)
          if (finalResult && finalResult.code === "NEED_CLARIFICATION") {
            const rawQuestions =
              typeof finalResult.data === "object" &&
              finalResult.data !== null &&
              "questions" in finalResult.data
                ? ((finalResult.data as Record<string, unknown>)
                    .questions as Array<{
                    id?: string;
                    text?: string;
                    field?: string;
                    question?: string;
                  }>)
                : [];

            // Map questions supporting both {id, text} and {field, question} formats
            const questions = rawQuestions.map((q) => ({
              field: q.field || q.id || "unknown",
              question: q.question || q.text || "No question provided",
            }));

            // Store clarification request
            if (questions.length > 0) {
              const { addClarificationRequest } =
                await import("@third-eye/eyes");
              await addClarificationRequest(result.sessionId, questions);
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "awaiting_clarification",
                      code: "NEED_CLARIFICATION",
                      verdict: "PAUSED",
                      summary:
                        "Clarification required before proceeding. Please ask the user to answer questions in the Third Eye portal.",
                      metadata: {
                        sessionId: result.sessionId,
                        portalUrl: `http://127.0.0.1:3300/monitor?sessionId=${result.sessionId}`,
                        stepsExecuted: result.results.length,
                      },
                      data: {
                        questions,
                        instruction:
                          "Use checkClarificationStatus with sessionId to poll for human responses.",
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

// Track server readiness state for graceful degradation
let serverReadinessState: {
  ready: boolean;
  error?: string;
  details?: Record<string, number>;
} = {
  ready: false,
};

/**
 * Validate server can process requests by checking database and required tables
 * Returns detailed status instead of just ok/error for better diagnostics
 */
async function validateServerReadiness(): Promise<{
  ok: boolean;
  error?: string;
  details?: { eyes: number; personas: number; pipelines: number };
}> {
  try {
    const { getDb, eyes, personas, pipelines } = await import("@third-eye/db");
    const { count } = await import("drizzle-orm");
    const { db } = getDb();

    // Verify critical tables have data
    const eyeCount = await db.select({ value: count() }).from(eyes).get();
    const personaCount = await db
      .select({ value: count() })
      .from(personas)
      .get();
    const pipelineCount = await db
      .select({ value: count() })
      .from(pipelines)
      .get();

    const details = {
      eyes: eyeCount?.value ?? 0,
      personas: personaCount?.value ?? 0,
      pipelines: pipelineCount?.value ?? 0,
    };

    const missingItems: string[] = [];
    if (details.eyes === 0) missingItems.push("eyes");
    if (details.personas === 0) missingItems.push("personas");
    if (details.pipelines === 0) missingItems.push("pipelines");

    if (missingItems.length > 0) {
      return {
        ok: false,
        error: `Missing data in: ${missingItems.join(", ")} - database may need seeding`,
        details,
      };
    }

    return { ok: true, details };
  } catch (error) {
    return {
      ok: false,
      error: `Database validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get current server health status for agents
 */
function getServerHealthStatus(): {
  healthy: boolean;
  message: string;
  details?: Record<string, unknown>;
} {
  if (serverReadinessState.ready) {
    return {
      healthy: true,
      message: "Server is ready to process requests",
      details: serverReadinessState.details,
    };
  }
  return {
    healthy: false,
    message: serverReadinessState.error || "Server not ready",
    details: serverReadinessState.details,
  };
}

/**
 * Start MCP server with stdio transport
 * Uses graceful degradation - server starts even if DB validation fails
 * Agents receive meaningful error messages instead of silent timeout
 */
export async function startMCPServer() {
  // Set up graceful shutdown handlers
  const shutdown = () => {
    console.error("\n[MCP Server] Shutting down gracefully...");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Handle uncaught errors - log but try to continue
  process.on("uncaughtException", (error) => {
    console.error("[MCP Server] Uncaught exception:", error.message);
    // Don't exit - try to keep serving agents with degraded functionality
    serverReadinessState = {
      ready: false,
      error: `Uncaught exception: ${error.message}`,
    };
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[MCP Server] Unhandled rejection:", reason);
    // Don't exit - try to keep serving agents with degraded functionality
    serverReadinessState = {
      ready: false,
      error: `Unhandled rejection: ${String(reason)}`,
    };
  });

  console.error("[MCP Server] Initializing...");

  // Track initialization state for better error messages
  let dbInitialized = false;
  let seedingCompleted = false;

  // Seed database with defaults (eyes, personas, pipelines, routing, etc.)
  // This ensures MCP server works with fresh or in-memory databases
  try {
    const { seedDefaults } = await import("@third-eye/db/defaults");
    const { getDb } = await import("@third-eye/db");

    // Initialize database (creates tables if needed)
    try {
      const { db } = getDb();
      dbInitialized = true;
      console.error("[MCP Server] Database initialized");
    } catch (dbError) {
      const errorMsg =
        dbError instanceof Error ? dbError.message : String(dbError);
      console.error(
        "[MCP Server] WARNING: Database initialization failed:",
        errorMsg,
      );
      serverReadinessState = {
        ready: false,
        error: `Database initialization failed: ${errorMsg}. Run 'third-eye-mcp up' to initialize.`,
      };
      // Continue anyway - server will report this error to agents
    }

    // Seed defaults silently (only logs if verbose)
    if (dbInitialized) {
      try {
        await seedDefaults({
          log: () => {}, // Silent seeding for MCP server
        });
        seedingCompleted = true;
        console.error("[MCP Server] Database seeded");
      } catch (error) {
        // Log error but don't fail startup (database might already be seeded)
        console.error(
          "[MCP Server] Seeding warning:",
          error instanceof Error ? error.message : String(error),
        );
        // Seeding might have partially succeeded - continue to validation
      }
    }

    // Validate server is ready to process requests
    const validation = await validateServerReadiness();
    if (validation.ok) {
      serverReadinessState = {
        ready: true,
        details: validation.details,
      };
      console.error("[MCP Server] Validation passed - server fully ready");
    } else {
      console.error(`[MCP Server] WARNING: ${validation.error}`);
      console.error(
        "[MCP Server] Server will start in degraded mode - agents will receive error messages",
      );
      serverReadinessState = {
        ready: false,
        error: validation.error,
        details: validation.details,
      };
      // Continue anyway - agents will get meaningful error messages
    }
  } catch (importError) {
    const errorMsg =
      importError instanceof Error ? importError.message : String(importError);
    console.error(
      "[MCP Server] WARNING: Failed to import database modules:",
      errorMsg,
    );
    serverReadinessState = {
      ready: false,
      error: `Failed to initialize: ${errorMsg}. Ensure @third-eye/db is properly installed.`,
    };
    // Continue anyway - agents will get meaningful error messages
  }

  const server = createMCPServer();
  const transport = new StdioServerTransport();

  // Connect to transport - this is blocking by design for stdio
  await server.connect(transport);

  // Log startup status
  if (serverReadinessState.ready) {
    console.error("Third Eye MCP Server running on stdio");
    console.error("Ready for agent connections");
    console.error(`Public tool: ${MCP_TOOL_NAME} (single entry point)`);
    console.error(
      "Golden Rule #1: Agents call only third_eye_overseer - Eyes are internal",
    );
  } else {
    console.error("Third Eye MCP Server running on stdio (DEGRADED MODE)");
    console.error(`Status: ${serverReadinessState.error}`);
    console.error("Agents will receive error messages explaining the issue");
    console.error("Run 'third-eye-mcp up' to fully initialize the server");
  }
}
