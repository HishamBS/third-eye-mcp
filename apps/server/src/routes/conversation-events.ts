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

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../db';
import { ConversationTracker } from '@third-eye/core/conversation-tracker';

const app = new Hono();

/**
 * Query parameter schema for recent events
 */
const RecentEventsQuerySchema = z.object({
  limit: z.string().optional().default('50').transform(Number),
});

/**
 * GET /conversation-events/session/:sessionId
 *
 * Get conversation timeline for a specific session
 */
app.get('/session/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');

    if (!sessionId) {
      return c.json({
        success: false,
        message: 'Session ID is required',
      }, 400);
    }

    const tracker = new ConversationTracker(db);
    const events = tracker.getConversationTimeline(sessionId);

    return c.json({
      success: true,
      data: {
        sessionId,
        events,
        count: events.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation timeline:', error);
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch conversation timeline',
    }, 500);
  }
});

/**
 * GET /conversation-events/recent
 *
 * Get recent conversation events across all sessions
 */
app.get(
  '/recent',
  zValidator('query', RecentEventsQuerySchema),
  async (c) => {
    try {
      const { limit } = c.req.valid('query');

      const tracker = new ConversationTracker(db);
      const events = tracker.getRecentEvents(limit);

      return c.json({
        success: true,
        data: {
          events,
          count: events.length,
          limit,
        },
      });
    } catch (error) {
      console.error('Error fetching recent conversation events:', error);
      return c.json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch recent events',
      }, 500);
    }
  }
);

/**
 * GET /conversation-events/session/:sessionId/type/:eventType
 *
 * Get conversation events of a specific type for a session
 */
app.get('/session/:sessionId/type/:eventType', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const eventType = c.req.param('eventType');

    if (!sessionId) {
      return c.json({
        success: false,
        message: 'Session ID is required',
      }, 400);
    }

    if (!eventType) {
      return c.json({
        success: false,
        message: 'Event type is required',
      }, 400);
    }

    // Validate event type
    const validEventTypes = [
      'agent_message',
      'human_message',
      'routing_decision',
      'pause',
      'resume',
      'error',
    ];

    if (!validEventTypes.includes(eventType)) {
      return c.json({
        success: false,
        message: `Invalid event type. Must be one of: ${validEventTypes.join(', ')}`,
      }, 400);
    }

    const tracker = new ConversationTracker(db);
    const events = tracker.getEventsByType(sessionId, eventType as any);

    return c.json({
      success: true,
      data: {
        sessionId,
        eventType,
        events,
        count: events.length,
      },
    });
  } catch (error) {
    console.error('Error fetching conversation events by type:', error);
    return c.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch events by type',
    }, 500);
  }
});

export default app;
