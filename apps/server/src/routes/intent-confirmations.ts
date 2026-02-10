import { Hono } from "hono";
import {
  ApiErrorCode,
  ApiErrorTitle,
  ApiErrorMessage,
} from "@third-eye/constants";
import { getDb } from "@third-eye/db";
import { IntentConfirmationManager } from "@third-eye/core";
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";

/**
 * REPAIR_PLAN A9: Intent Confirmations API Routes
 *
 * REST API for creating/fetching/submitting intent confirmations
 * Enables UI to interact with intent confirmation system
 */

const app = new Hono();

// Apply middleware
app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// GET /api/intent-confirmations/:id
// Get specific intent confirmation
app.get("/:id", async (c) => {
  try {
    const confirmationId = c.req.param("id");
    const { sqlite } = getDb();
    const manager = new IntentConfirmationManager(sqlite);

    const confirmation = await manager.getConfirmation(confirmationId);

    if (!confirmation) {
      return createNotFoundResponse(
        c,
        `Intent confirmation ${confirmationId} not found`,
      );
    }

    return createSuccessResponse(c, { confirmation });
  } catch (error) {
    console.error("Failed to fetch intent confirmation:", error);
    return createInternalErrorResponse(
      c,
      "Failed to fetch intent confirmation",
    );
  }
});

// GET /api/intent-confirmations/session/:sessionId
// Get all intent confirmations for a session
app.get("/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const { sqlite } = getDb();

    const query = `
      SELECT id, session_id, intent_analysis, confirmation_prompt,
             response, user_identity, status, created_at, responded_at
      FROM intent_confirmations
      WHERE session_id = ?
      ORDER BY created_at DESC
    `;

    const rows = sqlite.prepare(query).all(sessionId) as Array<{
      id: string;
      session_id: string;
      intent_analysis: string | null;
      confirmation_prompt: string;
      response: string | null;
      user_identity: string | null;
      status: string;
      created_at: number;
      responded_at: number | null;
    }>;

    const confirmations = rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      intentAnalysis: row.intent_analysis
        ? JSON.parse(row.intent_analysis)
        : null,
      confirmationPrompt: row.confirmation_prompt,
      response: row.response,
      userIdentity: row.user_identity,
      status: row.status,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
    }));

    return createSuccessResponse(c, { confirmations });
  } catch (error) {
    console.error("Failed to fetch session intent confirmations:", error);
    return createInternalErrorResponse(
      c,
      "Failed to fetch session intent confirmations",
    );
  }
});

// POST /api/intent-confirmations/:id/submit
// Submit human response to intent confirmation
// Expects: { confirmed: boolean, response?: string, userIdentity?: string }
app.post("/:id/submit", async (c) => {
  try {
    const confirmationId = c.req.param("id");
    const body = await c.req.json();

    if (typeof body.confirmed !== "boolean") {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail:
          "confirmed (boolean) is required. Optional: response (string), userIdentity (string)",
      });
    }

    const { sqlite } = getDb();
    const manager = new IntentConfirmationManager(sqlite);

    const confirmationResponse = {
      confirmed: body.confirmed,
      response: typeof body.response === "string" ? body.response : "",
      source: "human" as const,
      userIdentity:
        typeof body.userIdentity === "string" ? body.userIdentity : undefined,
    };

    await manager.submitConfirmation(confirmationId, confirmationResponse);

    return createSuccessResponse(c, {
      message: "Intent confirmation submitted successfully",
      confirmationId,
    });
  } catch (error) {
    console.error("Failed to submit intent confirmation:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return createNotFoundResponse(c, error.message);
    }
    return createInternalErrorResponse(
      c,
      "Failed to submit intent confirmation",
    );
  }
});

// GET /api/intent-confirmations/pending
// Get all pending intent confirmations
app.get("/pending", async (c) => {
  try {
    const { sqlite } = getDb();

    const query = `
      SELECT id, session_id, confirmation_prompt, status, created_at
      FROM intent_confirmations
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;

    const rows = sqlite.prepare(query).all() as Array<{
      id: string;
      session_id: string;
      confirmation_prompt: string;
      status: string;
      created_at: number;
    }>;

    const confirmations = rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      confirmationPrompt: row.confirmation_prompt,
      status: row.status,
      createdAt: row.created_at,
    }));

    return createSuccessResponse(c, { confirmations });
  } catch (error) {
    console.error("Failed to fetch pending intent confirmations:", error);
    return createInternalErrorResponse(
      c,
      "Failed to fetch pending intent confirmations",
    );
  }
});

export default app;
