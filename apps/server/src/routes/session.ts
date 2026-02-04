import { Hono } from "hono";
import { generateSessionId } from "@third-eye/db/utils/uuid";
import { getDb } from "@third-eye/db";
import {
  sessions,
  runs,
  pipelineEvents,
  clarifications,
  intentConfirmations,
} from "@third-eye/db";
import { getConfig } from "@third-eye/config";
import { eq, desc, count, sql, or, gte, and } from "drizzle-orm";
import { validateBody, schemas, rateLimit } from "../middleware/validation";
import { getEyeNameById, getEyeIdByName } from "@third-eye/db/utils/lookups";
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";
import {
  ApiErrorCode,
  ApiErrorTitle,
  ApiErrorMessage,
  SESSION_STATUS_ACTIVE,
  SESSION_STATUS_COMPLETED,
  SESSION_STATUS_FAILED,
  SESSION_STATUS_KILLED,
  VALID_SESSION_STATUSES,
  CONTEXT_SOURCE_USER,
  CONTEXT_SOURCE_EYE,
  VALID_CONTEXT_SOURCES,
  EXPORT_FORMAT_JSON,
  EXPORT_FORMAT_MD,
  EXPORT_FORMAT_CSV,
  VALID_EXPORT_FORMATS,
  DEFAULT_AGENT_NAME,
  DEFAULT_MODEL_NAME,
  DEFAULT_EYE_NAME,
  DEFAULT_SYSTEM_ENTITY_NAME,
  DEFAULT_VERDICT_STATUS,
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_OFFSET,
  DEFAULT_RUNS_PAGINATION_LIMIT,
  DEFAULT_EVENTS_PAGINATION_LIMIT,
  WS_EVENT_SESSION_CREATED,
  WS_EVENT_SESSION_STATUS_UPDATED,
  WS_EVENT_SESSION_KILLED,
  WS_EVENT_EYE_RERUN,
  WS_EVENT_CONTEXT_UPDATED,
  WS_EVENT_CONTEXT_REMOVED,
  DISPLAY_NOT_AVAILABLE,
  SUCCESS_CODE_PREFIX,
  QUERY_PARAM_TRUE_VALUE,
  CSV_EXPORT_HEADER,
  VALIDATION_AFFIRMATIVE_KEYWORD,
  VALIDATION_NEGATIVE_KEYWORD,
  VALIDATION_INTENT_BUILD_KEYWORD,
  VALIDATION_INTENT_DELETE_KEYWORD,
  formatBrowserOpenedLog,
  formatSessionKilledLog,
  formatEyeRerunLog,
  formatSessionDeleteFailedLog,
  formatSessionKilledMessage,
  formatSessionsDeletedMessage,
  buildMonitorPortalUrl,
  buildSessionPortalUrl,
  formatDisplayNameWithVersion,
  formatJsonExportFilename,
  formatMarkdownExportFilename,
  formatCsvExportFilename,
  formatMarkdownSessionHeader,
  formatMarkdownEventTitle,
  formatMarkdownRunHeader,
  formatCsvRow,
  formatMissingFieldDetail,
  formatAnswerTooShortSuggestion,
  LOG_WS_BROADCAST_SKIPPED,
  LOG_SESSION_CREATE_FAILED,
  LOG_SESSION_OPEN_FAILED,
  LOG_BROWSER_OPEN_FAILED,
  LOG_ACTIVE_SESSIONS_FETCH_FAILED,
  LOG_SESSIONS_FETCH_FAILED,
  LOG_SESSION_FETCH_FAILED,
  LOG_SESSION_RUNS_FETCH_FAILED,
  LOG_PIPELINE_EVENTS_FETCH_FAILED,
  LOG_SESSION_SUMMARY_FETCH_FAILED,
  LOG_SESSION_STATUS_UPDATE_FAILED,
  LOG_SESSION_KILL_FAILED,
  LOG_EYE_RERUN_FAILED,
  LOG_SESSION_CONTEXT_FETCH_FAILED,
  LOG_CONTEXT_ADD_FAILED,
  LOG_CONTEXT_REMOVE_FAILED,
  LOG_SESSION_EXPORT_FAILED,
  LOG_CLARIFICATION_VALIDATION_FAILED,
  LOG_CLARIFICATIONS_FETCH_FAILED,
  LOG_INTENT_CONFIRMATIONS_FETCH_FAILED,
  LOG_ROUTING_FETCH_FAILED,
  LOG_BULK_DELETE_FAILED,
} from "@third-eye/constants";

/**
 * Session Management Routes
 *
 * Handles session creation, retrieval, and run history
 */

interface Clarification {
  question: string;
  answer?: string;
  [key: string]: unknown;
}

/**
 * Session Config Interface - represents the configJson structure
 * Per R07: Strict typing for session configuration
 */
interface SessionConfigMetadata {
  client?: {
    displayName?: string;
    title?: string;
    name?: string;
    version?: string;
  };
  clientDisplayName?: string;
  clientName?: string;
  clientVersion?: string;
  model?: string;
}

interface SessionConfigRouting {
  flow?: string[];
  recommendedFlow?: string[];
  taskType?: string;
  reasoning?: string;
  recommendedEye?: string;
}

/**
 * Run Output Interface - represents the outputJson structure from runs table
 */
interface RunOutput {
  summary?: string;
  verdict?: string;
  [key: string]: unknown;
}

interface SessionConfig {
  agentName?: string;
  displayName?: string;
  model?: string;
  metadata?: SessionConfigMetadata;
  summary?: string;
  verdict?: string;
  flow?: string;
  recommendedFlow?: string;
  taskType?: string;
  reasoning?: string;
  recommendedEye?: string;
  routing?: SessionConfigRouting;
  clarifications?: Record<string, Clarification>;
  userIntent?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Safely parse JSON with fallback to default value
 * Prevents crashes from malformed JSON in database
 */
function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr || typeof jsonStr !== "string") {
    return fallback;
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse session configJson safely - used throughout session routes
 */
function parseSessionConfig(
  configJson: string | unknown | null | undefined,
): SessionConfig {
  if (!configJson) return {};
  if (typeof configJson === "object" && configJson !== null) {
    return configJson as SessionConfig;
  }
  if (typeof configJson === "string") {
    return safeJsonParse<SessionConfig>(configJson, {});
  }
  return {};
}

const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Apply rate limiting
app.use("*", rateLimit({ maxRequests: 200 })); // Higher limit for session ops

// Schemas for validation
const createSessionSchema = z.object({
  config: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(VALID_SESSION_STATUSES),
});

const addContextSchema = z.object({
  source: z.enum(VALID_CONTEXT_SOURCES),
  key: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.record(z.unknown()),
    z.array(z.unknown()),
  ]),
});

const validateClarificationSchema = z.object({
  answer: z.string().min(1),
});

// Create new session
app.post("/", async (c) => {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await c.req.json();
    } catch (e) {
      // Empty body is ok
    }
    const sessionConfig = body.config as Record<string, unknown> | undefined;

    const sessionId = generateSessionId();
    const { db } = getDb();
    const config = getConfig();

    const newSession = {
      id: sessionId,
      agentName:
        (typeof sessionConfig?.agentName === "string"
          ? sessionConfig.agentName
          : undefined) || DEFAULT_AGENT_NAME,
      model:
        (typeof sessionConfig?.model === "string"
          ? sessionConfig.model
          : null) || null,
      displayName:
        (typeof sessionConfig?.displayName === "string"
          ? sessionConfig.displayName
          : undefined) || sessionId,
      createdAt: new Date(),
      status: SESSION_STATUS_ACTIVE,
      configJson: sessionConfig || null,
    };

    await db.insert(sessions).values(newSession).run();

    const inserted = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    // Generate portal URL
    const portalUrl = buildMonitorPortalUrl(
      config.server.host,
      config.ui.port,
      sessionId,
    );

    // Broadcast session creation via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcast({
        type: WS_EVENT_SESSION_CREATED,
        sessionId,
        data: { session: inserted },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    return createSuccessResponse(c, {
      sessionId,
      portalUrl,
      session: inserted,
    });
  } catch (error) {
    console.error(LOG_SESSION_CREATE_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_CREATE_FAILED,
    );
  }
});

// Open browser for a session (called by MCP server when agent connects)
app.post("/open", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: formatMissingFieldDetail("sessionId"),
      });
    }

    const { db } = getDb();
    const config = getConfig();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Generate portal URL - use /session/:id for better UX (has session selector + theme preserved)
    const portalUrl = buildSessionPortalUrl(
      config.server.host,
      config.ui.port,
      sessionId,
    );

    // Open browser if configured
    if (config.ui.autoOpen) {
      try {
        const { spawn } = await import("child_process");
        const command =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        spawn(command, [portalUrl], { detached: true, stdio: "ignore" });
        console.log(formatBrowserOpenedLog(sessionId, portalUrl));
      } catch (e) {
        console.warn(LOG_BROWSER_OPEN_FAILED, e);
      }
    }

    return createSuccessResponse(c, {
      sessionId,
      portalUrl,
      opened: config.ui.autoOpen,
    });
  } catch (error) {
    console.error(LOG_SESSION_OPEN_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.SESSION_OPEN_FAILED);
  }
});

// Get active sessions (sessions with activity in last 10 minutes)
// NOTE: This route MUST come before /:id to avoid treating 'active' as a session ID
app.get("/active", async (c) => {
  try {
    const { db } = getDb();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    // Get sessions that are either:
    // 1. Status is 'active'
    // 2. Have recent events (within 10 minutes)
    const activeSessions = await db
      .select({
        id: sessions.id,
        status: sessions.status,
        agentName: sessions.agentName,
        model: sessions.model,
        displayName: sessions.displayName,
        createdAt: sessions.createdAt,
        configJson: sessions.configJson,
      })
      .from(sessions)
      .where(
        or(
          eq(sessions.status, SESSION_STATUS_ACTIVE),
          gte(sessions.createdAt, tenMinutesAgo),
        ),
      )
      .orderBy(desc(sessions.createdAt))
      .limit(20)
      .all();

    // Enrich with event counts and metadata
    const enrichedSessions = await Promise.all(
      activeSessions.map(async (session) => {
        const eventCount = await db
          .select({ count: count() })
          .from(pipelineEvents)
          .where(eq(pipelineEvents.sessionId, session.id))
          .get();

        const lastEvent = await db
          .select()
          .from(pipelineEvents)
          .where(eq(pipelineEvents.sessionId, session.id))
          .orderBy(desc(pipelineEvents.createdAt))
          .limit(1)
          .get();

        const config = parseSessionConfig(session.configJson);

        const metadata = config.metadata || {};
        const clientInfo = metadata.client || {};
        const clientDisplay =
          metadata.clientDisplayName ||
          clientInfo.displayName ||
          clientInfo.title ||
          metadata.clientName ||
          clientInfo.name;
        const clientVersion = metadata.clientVersion || clientInfo.version;

        const agentName =
          session.agentName ||
          config.agentName ||
          clientDisplay ||
          DEFAULT_AGENT_NAME;

        const displayBase =
          session.displayName ||
          config.displayName ||
          clientDisplay ||
          agentName ||
          session.id;

        const displayName =
          clientVersion &&
          typeof displayBase === "string" &&
          typeof clientVersion === "string" &&
          clientVersion.trim().length > 0 &&
          !displayBase.includes(clientVersion)
            ? formatDisplayNameWithVersion(displayBase, clientVersion)
            : displayBase;

        return {
          sessionId: session.id,
          status: session.status,
          createdAt: session.createdAt,
          eventCount: eventCount?.count || 0,
          lastActivity: lastEvent?.createdAt || session.createdAt,
          agentName,
          model:
            session.model ||
            config.model ||
            metadata.model ||
            DEFAULT_MODEL_NAME,
          displayName,
        };
      }),
    );

    return createSuccessResponse(c, {
      sessions: enrichedSessions,
      total: enrichedSessions.length,
    });
  } catch (error) {
    console.error(LOG_ACTIVE_SESSIONS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.ACTIVE_SESSIONS_FETCH_FAILED,
    );
  }
});

// Get all sessions
app.get("/", async (c) => {
  try {
    const { db } = getDb();
    const limit = parseInt(
      c.req.query("limit") || DEFAULT_PAGINATION_LIMIT.toString(),
    );
    const offset = parseInt(
      c.req.query("offset") || DEFAULT_PAGINATION_OFFSET.toString(),
    );
    const includeStats = c.req.query("stats") === QUERY_PARAM_TRUE_VALUE;

    const allSessions = await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    let stats = null;
    if (includeStats) {
      const totalRuns = await db.select({ count: count() }).from(runs).get();

      const runsWithLatency = await db
        .select({
          latencyMs: runs.latencyMs,
          outputJson: runs.outputJson,
        })
        .from(runs)
        .all();

      const validRuns = runsWithLatency.filter(
        (r) => r.latencyMs != null && r.latencyMs > 0,
      );
      const avgLatency =
        validRuns.length > 0
          ? Math.round(
              validRuns.reduce((sum, r) => sum + (r.latencyMs || 0), 0) /
                validRuns.length,
            )
          : 0;

      const successfulRuns = runsWithLatency.filter((r) => {
        try {
          const output =
            typeof r.outputJson === "string"
              ? JSON.parse(r.outputJson)
              : r.outputJson;
          return (
            output?.ok === true || output?.code?.startsWith(SUCCESS_CODE_PREFIX)
          );
        } catch {
          return false;
        }
      });

      const totalRunCount = totalRuns?.count ?? 0;
      const successRate =
        totalRunCount > 0
          ? Math.round((successfulRuns.length / totalRunCount) * 100)
          : 0;

      stats = {
        totalSessions: allSessions.length,
        totalRuns: totalRuns?.count || 0,
        successRate,
        avgLatency,
      };
    }

    return createSuccessResponse(c, {
      sessions: allSessions,
      stats,
      limit,
      offset,
    });
  } catch (error) {
    console.error(LOG_SESSIONS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSIONS_FETCH_FAILED,
    );
  }
});

// Get session by ID
// NOTE: This route MUST come after /active and other specific routes
app.get("/:id", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    return createSuccessResponse(c, session);
  } catch (error) {
    console.error(LOG_SESSION_FETCH_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.SESSION_FETCH_FAILED);
  }
});

// Get runs for a session (paginated timeline)
app.get("/:id/runs", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const limit = parseInt(
      c.req.query("limit") || DEFAULT_RUNS_PAGINATION_LIMIT.toString(),
    );
    const offset = parseInt(
      c.req.query("offset") || DEFAULT_PAGINATION_OFFSET.toString(),
    );

    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // Return runs array directly (frontend expects flat array, not wrapped)
    return createSuccessResponse(c, sessionRuns);
  } catch (error) {
    console.error(LOG_SESSION_RUNS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_RUNS_FETCH_FAILED,
    );
  }
});

// Get pipeline events for a session
app.get("/:id/events", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const limit = parseInt(
      c.req.query("limit") || DEFAULT_EVENTS_PAGINATION_LIMIT.toString(),
    );
    const offset = parseInt(
      c.req.query("offset") || DEFAULT_PAGINATION_OFFSET.toString(),
    );

    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .orderBy(pipelineEvents.createdAt)
      .limit(limit)
      .offset(offset)
      .all();

    return createSuccessResponse(c, events);
  } catch (error) {
    console.error(LOG_PIPELINE_EVENTS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.PIPELINE_EVENTS_FETCH_FAILED,
    );
  }
});

// Get session summary with event count and unique eyes
app.get("/:id/summary", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const eventCount = await db
      .select({ count: count() })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .get();

    const uniqueEyeIds = await db
      .select({ eyeId: pipelineEvents.eyeId })
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .groupBy(pipelineEvents.eyeId)
      .all();

    // Convert eyeIds to eye names (filter out null eyeIds)
    const eyeNames = await Promise.all(
      uniqueEyeIds
        .filter((e) => e.eyeId !== null)
        .map(async (e) => await getEyeNameById(e.eyeId as string)),
    );

    return createSuccessResponse(c, {
      sessionId,
      status: session.status,
      eventCount: eventCount?.count || 0,
      eyes: eyeNames.filter(Boolean) as string[],
      createdAt: session.createdAt,
    });
  } catch (error) {
    console.error(LOG_SESSION_SUMMARY_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_SUMMARY_FETCH_FAILED,
    );
  }
});

// Update session status
app.patch("/:id/status", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;

    if (
      !status ||
      ![
        SESSION_STATUS_ACTIVE,
        SESSION_STATUS_COMPLETED,
        SESSION_STATUS_FAILED,
      ].includes(status)
    ) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.VALIDATION_INVALID_STATUS,
      });
    }

    const { db } = getDb();

    await db
      .update(sessions)
      .set({ status })
      .where(eq(sessions.id, sessionId))
      .run();

    const updated = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!updated) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Broadcast status change
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: WS_EVENT_SESSION_STATUS_UPDATED,
        sessionId,
        data: { status },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    return createSuccessResponse(c, updated);
  } catch (error) {
    console.error(LOG_SESSION_STATUS_UPDATE_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_STATUS_UPDATE_FAILED,
    );
  }
});

// Kill switch: Cancel all pending Eyes in session
app.post("/:id/kill", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Check if already killed
    if (session.status === SESSION_STATUS_KILLED) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_OPERATION,
        code: ApiErrorCode.INVALID_OPERATION,
        status: 400,
        detail: ApiErrorMessage.SESSION_ALREADY_KILLED,
      });
    }

    // Get list of pending/running Eyes from runs table
    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .all();

    // Find runs that might still be in progress (no output or recent)
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    const potentiallyActiveRuns = sessionRuns.filter((run) => {
      const runTime = new Date(run.createdAt).getTime();
      return runTime > fiveMinutesAgo;
    });

    // Convert eyeIds to eye names for display
    const stoppedEyeIds = potentiallyActiveRuns.map((run) => run.eyeId);
    const stoppedEyes = await Promise.all(
      stoppedEyeIds.map(async (eyeId) => await getEyeNameById(eyeId)),
    ).then((names) => names.filter(Boolean) as string[]);

    // Update session status to 'killed'
    await db
      .update(sessions)
      .set({ status: SESSION_STATUS_KILLED })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast kill signal via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: WS_EVENT_SESSION_KILLED,
        sessionId,
        data: { stoppedEyes },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    console.log(
      formatSessionKilledLog(sessionId, stoppedEyes.length, stoppedEyes),
    );

    return createSuccessResponse(c, {
      sessionId,
      status: SESSION_STATUS_KILLED,
      stoppedEyes,
      message: formatSessionKilledMessage(stoppedEyes.length),
    });
  } catch (error) {
    console.error(LOG_SESSION_KILL_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.SESSION_KILL_FAILED);
  }
});

// Rerun specific Eye for Kill Switch validation
app.post("/:id/rerun/:eye", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const eyeName = c.req.param("eye");
    const { input } = await c.req.json();

    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Import orchestrator
    const { EyeOrchestrator } = await import("@third-eye/core");
    const orchestrator = new EyeOrchestrator();

    // Run Eye with provided input
    const result = await orchestrator.runEye(eyeName, input, sessionId);

    // Broadcast rerun event via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: WS_EVENT_EYE_RERUN,
        sessionId,
        data: { eye: eyeName, result },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    console.log(formatEyeRerunLog(eyeName, sessionId));

    return createSuccessResponse(c, result);
  } catch (error) {
    console.error(LOG_EYE_RERUN_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.EYE_RERUN_FAILED);
  }
});

// Get session context (for SessionMemoryPanel)
app.get("/:id/context", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const context = parseSessionConfig(session.configJson);

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error(LOG_SESSION_CONTEXT_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_CONTEXT_FETCH_FAILED,
    );
  }
});

// Add context item
app.post("/:id/context", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const body = await c.req.json();
    const { source, key, value } = body;

    if (!source || !key || value === undefined) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.VALIDATION_MISSING_CONTEXT_FIELDS,
      });
    }

    if (![CONTEXT_SOURCE_USER, CONTEXT_SOURCE_EYE].includes(source)) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.VALIDATION_INVALID_SOURCE,
      });
    }

    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Parse existing context safely
    const context = parseSessionConfig(session.configJson);

    // Add new context item
    context[key] = {
      value,
      source,
      addedAt: new Date().toISOString(),
    };

    // Update session
    await db
      .update(sessions)
      .set({ configJson: context })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast context update
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: WS_EVENT_CONTEXT_UPDATED,
        sessionId,
        data: { key, value, source },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error(LOG_CONTEXT_ADD_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.CONTEXT_ADD_FAILED);
  }
});

// Remove context item
app.delete("/:id/context/:key", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const key = c.req.param("key");
    const { db } = getDb();

    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Parse existing context safely
    const context = parseSessionConfig(session.configJson);

    // Remove context item
    delete context[key];

    // Update session
    await db
      .update(sessions)
      .set({ configJson: context })
      .where(eq(sessions.id, sessionId))
      .run();

    // Broadcast context update
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: WS_EVENT_CONTEXT_REMOVED,
        sessionId,
        data: { key },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug(LOG_WS_BROADCAST_SKIPPED, e);
    }

    return createSuccessResponse(c, {
      sessionId,
      context,
    });
  } catch (error) {
    console.error(LOG_CONTEXT_REMOVE_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.CONTEXT_REMOVE_FAILED,
    );
  }
});

// Export session data in multiple formats
app.get("/:id/export", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const format = (c.req.query("format") || EXPORT_FORMAT_JSON) as
      | typeof EXPORT_FORMAT_JSON
      | typeof EXPORT_FORMAT_MD
      | typeof EXPORT_FORMAT_CSV;

    if (
      ![EXPORT_FORMAT_JSON, EXPORT_FORMAT_MD, EXPORT_FORMAT_CSV].includes(
        format,
      )
    ) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.VALIDATION_INVALID_EXPORT_FORMAT,
      });
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Get runs
    const sessionRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(runs.createdAt)
      .all();

    // Get events
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .orderBy(pipelineEvents.createdAt)
      .all();

    if (format === EXPORT_FORMAT_JSON) {
      // JSON export: Full session data
      const exportData = {
        session: {
          id: session.id,
          status: session.status,
          createdAt: session.createdAt,
          config: session.configJson,
        },
        runs: sessionRuns,
        events,
        exportedAt: new Date().toISOString(),
      };

      c.header("Content-Type", "application/json");
      c.header("Content-Disposition", formatJsonExportFilename(sessionId));
      return c.json(exportData);
    }

    if (format === EXPORT_FORMAT_MD) {
      // Markdown export: Human-readable timeline
      let markdown = formatMarkdownSessionHeader(sessionId);
      markdown += `**Status:** ${session.status}\n`;
      markdown += `**Created:** ${new Date(session.createdAt).toISOString()}\n\n`;

      markdown += `## Timeline\n\n`;
      for (const event of events) {
        const timestamp = new Date(event.createdAt).toISOString();
        const eyeName = event.eyeId ? await getEyeNameById(event.eyeId) : null;
        markdown += formatMarkdownEventTitle(eyeName, event.code ?? "");
        markdown += `**Time:** ${timestamp}\n\n`;
        if (event.md) {
          markdown += `${event.md}\n\n`;
        }
        markdown += `---\n\n`;
      }

      markdown += `## Runs Summary\n\n`;
      for (const run of sessionRuns) {
        const eyeName = run.eyeId ? await getEyeNameById(run.eyeId) : null;
        markdown += formatMarkdownRunHeader(eyeName);
        markdown += `- **Model:** ${run.model || DISPLAY_NOT_AVAILABLE}\n`;
        markdown += `- **Latency:** ${run.latencyMs || DISPLAY_NOT_AVAILABLE}ms\n`;
        markdown += `- **Tokens In:** ${run.tokensIn || 0}\n`;
        markdown += `- **Tokens Out:** ${run.tokensOut || 0}\n\n`;

        const output = safeJsonParse<RunOutput>(
          typeof run.outputJson === "string" ? run.outputJson : null,
          (run.outputJson as RunOutput) || {},
        );

        if (output.summary) {
          markdown += `**Summary:** ${output.summary}\n\n`;
        }

        markdown += `---\n\n`;
      }

      c.header("Content-Type", "text/markdown");
      c.header("Content-Disposition", formatMarkdownExportFilename(sessionId));
      return c.text(markdown);
    }

    if (format === EXPORT_FORMAT_CSV) {
      // CSV export: Metrics only
      let csv = CSV_EXPORT_HEADER;

      for (const run of sessionRuns) {
        const output = safeJsonParse<RunOutput>(
          typeof run.outputJson === "string" ? run.outputJson : null,
          (run.outputJson as RunOutput) || {},
        );

        const verdict = output.verdict || DEFAULT_VERDICT_STATUS;
        const eyeName = await getEyeNameById(run.eyeId);

        csv += formatCsvRow(
          eyeName,
          run.model,
          run.latencyMs,
          run.tokensIn,
          run.tokensOut,
          verdict,
          run.createdAt,
        );
      }

      c.header("Content-Type", "text/csv");
      c.header("Content-Disposition", formatCsvExportFilename(sessionId));
      return c.text(csv);
    }

    return createErrorResponse(c, {
      title: ApiErrorTitle.VALIDATION_ERROR,
      code: ApiErrorCode.VALIDATION_ERROR,
      status: 400,
      detail: ApiErrorMessage.INVALID_FORMAT_DETAIL,
    });
  } catch (error) {
    console.error(LOG_SESSION_EXPORT_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSION_EXPORT_FAILED,
    );
  }
});

// Validate clarification answer using Jogan
app.post("/:id/clarifications/:clarificationId/validate", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const clarificationId = c.req.param("clarificationId");
    const body = await c.req.json();
    const { answer } = body;

    if (!answer) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: formatMissingFieldDetail("answer"),
      });
    }

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Parse session context
    const context = parseSessionConfig(session.configJson);

    const clarifications = context.clarifications || {};
    const existingClarification = clarifications[clarificationId];

    if (!existingClarification) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.CLARIFICATION_NOT_FOUND,
        code: ApiErrorCode.CLARIFICATION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.CLARIFICATION_NOT_FOUND_DETAIL,
      });
    }

    // Validate answer coherence using basic rules
    // In production, this would call Jogan Eye for semantic validation
    let valid = true;
    let reason: string | undefined;
    let suggestion: string | undefined;

    // Check answer length
    if (answer.trim().length < 3) {
      valid = false;
      reason = ApiErrorMessage.VALIDATION_ANSWER_TOO_SHORT_REASON;
      suggestion = formatAnswerTooShortSuggestion(3);
    }

    // Check for contradictions with previous clarifications
    if (valid) {
      const previousAnswers = Object.values(
        clarifications as Record<string, Clarification>,
      )
        .filter(
          (c): c is Clarification & { answer: string } =>
            typeof c.answer === "string",
        )
        .map((c) => c.answer.toLowerCase());

      const answerLower = answer.toLowerCase();

      // Simple contradiction detection
      if (
        previousAnswers.some(
          (prev: string) =>
            (prev.includes(VALIDATION_AFFIRMATIVE_KEYWORD) &&
              answerLower.includes(VALIDATION_NEGATIVE_KEYWORD)) ||
            (prev.includes(VALIDATION_NEGATIVE_KEYWORD) &&
              answerLower.includes(VALIDATION_AFFIRMATIVE_KEYWORD)),
        )
      ) {
        valid = false;
        reason = ApiErrorMessage.VALIDATION_CONTRADICTION_REASON;
        suggestion = ApiErrorMessage.VALIDATION_CONTRADICTION_SUGGESTION;
      }
    }

    // Check against session context for contradictions
    if (valid && typeof context.userIntent === "string") {
      const userIntent = context.userIntent.toLowerCase();
      const answerLower = answer.toLowerCase();

      // Check if answer contradicts stated user intent
      if (
        userIntent.includes(VALIDATION_INTENT_BUILD_KEYWORD) &&
        answerLower.includes(VALIDATION_INTENT_DELETE_KEYWORD)
      ) {
        valid = false;
        reason = ApiErrorMessage.VALIDATION_INTENT_CONTRADICTION_REASON;
        suggestion =
          ApiErrorMessage.VALIDATION_INTENT_CONTRADICTION_BUILD_SUGGESTION;
      }
    }

    // If valid, log the human answer as a conversation event
    if (valid) {
      try {
        // Import ConversationTracker for logging
        const { ConversationTracker } = await import("@third-eye/core");
        const { sqlite } = getDb();
        const conversationTracker = new ConversationTracker(sqlite);

        // Log human message with the answer
        conversationTracker.logHumanMessage(
          sessionId,
          `Clarification answered: ${existingClarification.question}\n\nAnswer: ${answer}`,
          {
            clarificationId,
            field: existingClarification.field || "unknown",
            question: existingClarification.question,
            answer,
          },
        );

        // Broadcast clarification answered event via WebSocket
        const { wsManager } = await import("../websocket");
        wsManager.broadcastToSession(sessionId, {
          type: "clarification_answered",
          sessionId,
          data: {
            clarificationId,
            question: existingClarification.question,
            answer,
          },
          timestamp: Date.now(),
        });
      } catch (e) {
        // Log but don't fail the request if conversation tracking fails
        console.debug("Failed to log clarification answer:", e);
      }
    }

    return createSuccessResponse(c, {
      valid,
      reason,
      suggestion,
      clarificationId,
      answer,
    });
  } catch (error) {
    console.error(LOG_CLARIFICATION_VALIDATION_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.CLARIFICATION_VALIDATION_FAILED,
    );
  }
});

// Get clarifications for a session
app.get("/:sessionId/clarifications", async (c) => {
  try {
    const { sessionId } = c.req.param();
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const results = await db
      .select()
      .from(clarifications)
      .where(eq(clarifications.sessionId, sessionId))
      .all();

    return createSuccessResponse(c, results);
  } catch (error) {
    console.error(LOG_CLARIFICATIONS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.CLARIFICATIONS_FETCH_FAILED,
    );
  }
});

// Get intent confirmations for a session
app.get("/:sessionId/intent-confirmations", async (c) => {
  try {
    const { sessionId } = c.req.param();
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    const result = await db
      .select()
      .from(intentConfirmations)
      .where(eq(intentConfirmations.sessionId, sessionId))
      .limit(1)
      .get();

    return createSuccessResponse(c, result || null);
  } catch (error) {
    console.error(LOG_INTENT_CONFIRMATIONS_FETCH_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.INTENT_CONFIRMATIONS_FETCH_FAILED,
    );
  }
});

// Get routing decision for a session
app.get("/:id/routing", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Try to extract routing from session context first (safely)
    const context = parseSessionConfig(session.configJson);

    // Check if routing is stored in context (from overseer/mcp routes)
    if (context.routing && typeof context.routing === "object") {
      const routing = context.routing;
      return createSuccessResponse(c, {
        routing: {
          flow: Array.isArray(routing.flow)
            ? routing.flow
            : routing.recommendedFlow || [],
          taskType: routing.taskType,
          reasoning: routing.reasoning,
          recommendedEye:
            routing.recommendedEye ||
            (Array.isArray(routing.flow) ? routing.flow[0] : null),
        },
      });
    }

    // Fallback: Look for first Overseer event in pipeline events
    const overseerEyeId = await getEyeIdByName("overseer");
    const overseerEvent = overseerEyeId
      ? await db
          .select()
          .from(pipelineEvents)
          .where(
            and(
              eq(pipelineEvents.sessionId, sessionId),
              eq(pipelineEvents.eyeId, overseerEyeId),
            ),
          )
          .orderBy(pipelineEvents.createdAt)
          .limit(1)
          .get()
      : null;

    if (
      overseerEvent &&
      overseerEvent.dataJson &&
      typeof overseerEvent.dataJson === "object"
    ) {
      const data = overseerEvent.dataJson as Record<string, unknown>;
      if (data.routing && typeof data.routing === "object") {
        const routing = data.routing as Record<string, unknown>;
        return createSuccessResponse(c, {
          routing: {
            flow: Array.isArray(routing.flow) ? routing.flow : [],
            taskType:
              typeof routing.taskType === "string"
                ? routing.taskType
                : undefined,
            reasoning:
              typeof routing.reasoning === "string"
                ? routing.reasoning
                : undefined,
            recommendedEye:
              typeof routing.recommendedEye === "string"
                ? routing.recommendedEye
                : null,
          },
        });
      }
    }

    // No routing found - return null
    return createSuccessResponse(c, {
      routing: null,
    });
  } catch (error) {
    console.error(LOG_ROUTING_FETCH_FAILED, error);
    return createInternalErrorResponse(c, ApiErrorMessage.ROUTING_FETCH_FAILED);
  }
});

// Get pipeline state for a session (pause/resume status)
app.get("/:id/pipeline-state", async (c) => {
  try {
    const sessionId = c.req.param("id");
    const { db } = getDb();

    // Verify session exists
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

    if (!session) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.SESSION_NOT_FOUND,
        code: ApiErrorCode.SESSION_NOT_FOUND,
        status: 404,
        detail: ApiErrorMessage.SESSION_NOT_FOUND_DETAIL,
      });
    }

    // Get context for pipeline state
    const context = parseSessionConfig(session.configJson);

    // Extract pipeline state from context
    const pipelineState = {
      status: context.pipelineStatus || session.status || "unknown",
      pauseReason: context.pauseReason || null,
      currentEye: context.currentEye || null,
      resumeToken: context.resumeToken || null,
      awaitingClarification: context.awaitingClarification || false,
      awaitingConfirmation: context.awaitingConfirmation || false,
      completedEyes: context.completedEyes || [],
      pendingEyes: context.pendingEyes || [],
    };

    // Check for pending clarifications
    const pendingClarifications = await db
      .select()
      .from(clarifications)
      .where(
        and(
          eq(clarifications.sessionId, sessionId),
          sql`${clarifications.answer} IS NULL`,
        ),
      )
      .all();

    if (pendingClarifications.length > 0) {
      pipelineState.awaitingClarification = true;
      pipelineState.status = "awaiting_clarification";
    }

    // Check for pending intent confirmations
    const pendingConfirmation = await db
      .select()
      .from(intentConfirmations)
      .where(
        and(
          eq(intentConfirmations.sessionId, sessionId),
          sql`${intentConfirmations.response} IS NULL`,
        ),
      )
      .limit(1)
      .get();

    if (pendingConfirmation) {
      pipelineState.awaitingConfirmation = true;
      pipelineState.status = "awaiting_confirmation";
    }

    return createSuccessResponse(c, pipelineState);
  } catch (error) {
    console.error("Failed to fetch pipeline state:", error);
    return createInternalErrorResponse(c, "Failed to fetch pipeline state");
  }
});

// Bulk delete sessions (cleanup old test sessions)
app.delete("/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const { sessionIds, olderThan } = body;

    const { db } = getDb();

    let deletedCount = 0;

    if (sessionIds && Array.isArray(sessionIds)) {
      // Delete specific sessions by ID
      for (const id of sessionIds) {
        try {
          // Delete related records first
          await db
            .delete(pipelineEvents)
            .where(eq(pipelineEvents.sessionId, id))
            .run();
          await db.delete(runs).where(eq(runs.sessionId, id)).run();
          // Delete session last
          await db.delete(sessions).where(eq(sessions.id, id)).run();
          deletedCount++;
        } catch (err) {
          console.error(formatSessionDeleteFailedLog(id), err);
          // Continue with next session
        }
      }
    } else if (olderThan) {
      // Delete sessions older than specified date
      const cutoffDate = new Date(olderThan);

      const oldSessions = await db
        .select()
        .from(sessions)
        .where(sql`${sessions.createdAt} < ${cutoffDate}`)
        .all();

      for (const session of oldSessions) {
        await db.delete(sessions).where(eq(sessions.id, session.id)).run();
        await db.delete(runs).where(eq(runs.sessionId, session.id)).run();
        await db
          .delete(pipelineEvents)
          .where(eq(pipelineEvents.sessionId, session.id))
          .run();
        deletedCount++;
      }
    } else {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: ApiErrorMessage.VALIDATION_BULK_DELETE_PARAMS,
      });
    }

    return createSuccessResponse(c, {
      deleted: deletedCount,
      message: formatSessionsDeletedMessage(deletedCount),
    });
  } catch (error) {
    console.error(LOG_BULK_DELETE_FAILED, error);
    return createInternalErrorResponse(
      c,
      ApiErrorMessage.SESSIONS_BULK_DELETE_FAILED,
    );
  }
});

export default app;
