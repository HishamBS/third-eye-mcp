/**
 * Conversation Events API Routes - Phase 5
 *
 * Endpoints for fetching conversation timeline data (narrative monitoring).
 *
 * Routes:
 * - GET /conversation-events/session/:sessionId - Get timeline for specific session
 * - GET /conversation-events/recent - Get recent events across all sessions
 * - GET /conversation-events/session/:sessionId/type/:eventType - Get events by type
 *
 * Per R01: SSOT for response envelope pattern
 * Per R07: Strict typing, no 'any'
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDb } from "@third-eye/db";
import {
  ConversationTracker,
  type ConversationEventType,
} from "@third-eye/core/conversation-tracker";
import {
  createSuccessResponse,
  createErrorResponse,
  ERROR_TYPES,
} from "../middleware/response";
import {
  CONVERSATION_EVENT_TYPES,
  isConversationEventType,
} from "@third-eye/constants";

const app = new Hono();

/**
 * Query parameter schema for recent events
 */
const RecentEventsQuerySchema = z.object({
  limit: z.string().optional().default("50").transform(Number),
});

/**
 * GET /conversation-events/session/:sessionId
 *
 * Get conversation timeline for a specific session
 */
app.get("/session/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
      return createErrorResponse(c, {
        type: ERROR_TYPES.VALIDATION_ERROR,
        title: "Validation Error",
        status: 400,
        detail: "Session ID is required",
      });
    }

    const { sqlite } = getDb();
    const tracker = new ConversationTracker(sqlite);
    const events = tracker.getConversationTimeline(sessionId);

    return createSuccessResponse(c, {
      sessionId,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching conversation timeline:", error);
    return createErrorResponse(c, {
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: "Internal Server Error",
      status: 500,
      detail:
        error instanceof Error
          ? error.message
          : "Failed to fetch conversation timeline",
    });
  }
});

/**
 * GET /conversation-events/recent
 *
 * Get recent conversation events across all sessions
 */
app.get("/recent", zValidator("query", RecentEventsQuerySchema), async (c) => {
  try {
    const { limit } = c.req.valid("query");

    const { sqlite } = getDb();
    const tracker = new ConversationTracker(sqlite);
    const events = tracker.getRecentEvents(limit);

    return createSuccessResponse(c, { events, count: events.length, limit });
  } catch (error) {
    console.error("Error fetching recent conversation events:", error);
    return createErrorResponse(c, {
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: "Internal Server Error",
      status: 500,
      detail:
        error instanceof Error
          ? error.message
          : "Failed to fetch recent events",
    });
  }
});

/**
 * GET /conversation-events/session/:sessionId/type/:eventType
 *
 * Get conversation events of a specific type for a session
 */
app.get("/session/:sessionId/type/:eventType", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const eventType = c.req.param("eventType");

    if (!sessionId) {
      return createErrorResponse(c, {
        type: ERROR_TYPES.VALIDATION_ERROR,
        title: "Validation Error",
        status: 400,
        detail: "Session ID is required",
      });
    }

    if (!eventType) {
      return createErrorResponse(c, {
        type: ERROR_TYPES.VALIDATION_ERROR,
        title: "Validation Error",
        status: 400,
        detail: "Event type is required",
      });
    }

    // Validate event type against SSOT constants
    if (!isConversationEventType(eventType)) {
      return createErrorResponse(c, {
        type: ERROR_TYPES.VALIDATION_ERROR,
        title: "Invalid Event Type",
        status: 400,
        detail: `Invalid event type '${eventType}'. Must be one of: ${Object.values(CONVERSATION_EVENT_TYPES).join(", ")}`,
      });
    }

    const { sqlite } = getDb();
    const tracker = new ConversationTracker(sqlite);
    const events = tracker.getEventsByType(
      sessionId,
      eventType as ConversationEventType,
    );

    return createSuccessResponse(c, {
      sessionId,
      eventType,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching conversation events by type:", error);
    return createErrorResponse(c, {
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: "Internal Server Error",
      status: 500,
      detail:
        error instanceof Error
          ? error.message
          : "Failed to fetch events by type",
    });
  }
});

export default app;
