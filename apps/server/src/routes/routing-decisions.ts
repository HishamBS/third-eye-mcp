/**
 * Routing Decisions API - Phase 4
 *
 * Provides routing decision data for Dynamic Route Visualizer and Live Routing Panel
 * Per R07: Strict typing, no 'any'
 * Per R13: Centralized API logic
 */

import { Hono } from "hono";
import type { Database } from "better-sqlite3";
import { getDb } from "@third-eye/db";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";

const app = new Hono();

/**
 * Routing decision response type
 */
interface RoutingDecision {
  readonly id: string;
  readonly sessionId: string;
  readonly requestAnalysis: {
    readonly requestType: string;
    readonly contentDomain: string;
    readonly complexity: string;
    readonly capabilitiesNeeded: readonly string[];
  };
  readonly selectedEyes: readonly string[];
  readonly reasoning: string;
  readonly executionMode: "sequential" | "parallel";
  readonly createdAt: number;
}

/**
 * Parse routing decision row from database
 */
function parseRoutingDecision(row: {
  id: string;
  session_id: string;
  request_analysis: string;
  selected_eyes: string;
  reasoning: string;
  execution_mode: string;
  created_at: number;
}): RoutingDecision {
  return {
    id: row.id,
    sessionId: row.session_id,
    requestAnalysis: JSON.parse(row.request_analysis),
    selectedEyes: JSON.parse(row.selected_eyes),
    reasoning: row.reasoning,
    executionMode: row.execution_mode as "sequential" | "parallel",
    createdAt: row.created_at,
  };
}

/**
 * GET /api/routing-decisions
 * List routing decisions with optional filters
 */
app.get("/", async (c) => {
  try {
    const { db, sqlite } = getDb();

    // Parse query params
    const limit = Number.parseInt(c.req.query("limit") || "10", 10);
    const offset = Number.parseInt(c.req.query("offset") || "0", 10);
    const sort = c.req.query("sort") || "desc"; // desc = most recent first

    // Validate params
    if (limit < 1 || limit > 100) {
      return c.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INVALID_LIMIT,
            detail: "Limit must be between 1 and 100",
          },
        },
        400,
      );
    }

    // Query routing decisions
    const query = `
      SELECT
        id, session_id, request_analysis, selected_eyes,
        reasoning, execution_mode, created_at
      FROM routing_decisions
      ORDER BY created_at ${sort === "asc" ? "ASC" : "DESC"}
      LIMIT ? OFFSET ?
    `;

    const rows = sqlite.prepare(query).all(limit, offset) as Array<{
      id: string;
      session_id: string;
      request_analysis: string;
      selected_eyes: string;
      reasoning: string;
      execution_mode: string;
      created_at: number;
    }>;

    const decisions = rows.map(parseRoutingDecision);

    // Get total count
    const countRow = sqlite
      .prepare("SELECT COUNT(*) as count FROM routing_decisions")
      .get() as { count: number };
    const total = countRow.count;

    return c.json({
      success: true,
      data: {
        decisions,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + decisions.length < total,
        },
      },
    });
  } catch (error) {
    console.error("[routing-decisions] List error:", error);
    return c.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          detail:
            error instanceof Error
              ? error.message
              : "Failed to list routing decisions",
        },
      },
      500,
    );
  }
});

/**
 * GET /api/routing-decisions/session/:sessionId
 * Get routing decision for a specific session
 */
app.get("/session/:sessionId", async (c) => {
  try {
    const { db, sqlite } = getDb();
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.MISSING_SESSION_ID,
            detail: "Session ID is required",
          },
        },
        400,
      );
    }

    const query = `
      SELECT
        id, session_id, request_analysis, selected_eyes,
        reasoning, execution_mode, created_at
      FROM routing_decisions
      WHERE session_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const row = sqlite.prepare(query).get(sessionId) as
      | {
          id: string;
          session_id: string;
          request_analysis: string;
          selected_eyes: string;
          reasoning: string;
          execution_mode: string;
          created_at: number;
        }
      | undefined;

    if (!row) {
      return c.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            detail: `No routing decision found for session ${sessionId}`,
          },
        },
        404,
      );
    }

    const decision = parseRoutingDecision(row);

    return c.json({
      success: true,
      data: {
        decision,
      },
    });
  } catch (error) {
    console.error("[routing-decisions] Get by session error:", error);
    return c.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          detail:
            error instanceof Error
              ? error.message
              : "Failed to get routing decision",
        },
      },
      500,
    );
  }
});

/**
 * GET /api/routing-decisions/:id
 * Get specific routing decision by ID
 */
app.get("/:id", async (c) => {
  try {
    const { db, sqlite } = getDb();
    const id = c.req.param("id");

    if (!id) {
      return c.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.MISSING_ID,
            detail: "Routing decision ID is required",
          },
        },
        400,
      );
    }

    const query = `
      SELECT
        id, session_id, request_analysis, selected_eyes,
        reasoning, execution_mode, created_at
      FROM routing_decisions
      WHERE id = ?
    `;

    const row = sqlite.prepare(query).get(id) as
      | {
          id: string;
          session_id: string;
          request_analysis: string;
          selected_eyes: string;
          reasoning: string;
          execution_mode: string;
          created_at: number;
        }
      | undefined;

    if (!row) {
      return c.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            detail: `Routing decision ${id} not found`,
          },
        },
        404,
      );
    }

    const decision = parseRoutingDecision(row);

    return c.json({
      success: true,
      data: {
        decision,
      },
    });
  } catch (error) {
    console.error("[routing-decisions] Get error:", error);
    return c.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          detail:
            error instanceof Error
              ? error.message
              : "Failed to get routing decision",
        },
      },
      500,
    );
  }
});

export default app;
