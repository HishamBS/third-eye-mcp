import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { eyesRouting } from '@third-eye/db';
import { getAllEyeNames } from '@third-eye/eyes';
import { eq } from 'drizzle-orm';
import { schemas } from '../middleware/validation';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

/**
 * Routing Configuration Routes
 *
 * Manages Eye-to-Provider/Model routing mappings
 */

const app = new Hono();

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Get all routing configurations
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const routings = await db.select().from(eyesRouting).all();

    // Return routing configs with registered eyes info
    const eyeNames = getAllEyeNames();
    const defaultRouting = {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.3-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    };

    const result = eyeNames.map(eye => {
      const routing = routings.find(r => r.eye === eye);
      if (routing) {
        return routing;
      }

      // Return default routing if not configured
      return {
        eye,
        ...defaultRouting,
      };
    });

    return createSuccessResponse(c, { routings: result });
  } catch (error) {
    console.error('Failed to fetch routing configs:', error);
    return createInternalErrorResponse(c, 'Failed to fetch routing configurations');
  }
});

// Get routing for specific Eye
app.get('/:eye', async (c) => {
  try {
    const eye = c.req.param('eye');
    const { db } = getDb();

    const routing = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eye))
      .get();

    if (routing) {
      return createSuccessResponse(c, routing);
    }

    // Return default if not configured
    return createSuccessResponse(c, {
      eye,
      ...defaultRouting,
    });
  } catch (error) {
    console.error('Failed to fetch routing:', error);
    return createInternalErrorResponse(c, 'Failed to fetch routing');
  }
});

// Create or update routing configuration
app.post('/', validateBodyWithEnvelope(schemas.routingCreate), async (c) => {
  try {
    const { eye, primaryProvider, primaryModel, fallbackProvider, fallbackModel } = c.get('validatedBody');

    const { db } = getDb();

    // Check if routing exists
    const existing = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eye))
      .get();

    if (existing) {
      // Update existing
      await db
        .update(eyesRouting)
        .set({
          primaryProvider,
          primaryModel,
          fallbackProvider: fallbackProvider || null,
          fallbackModel: fallbackModel || null,
        })
        .where(eq(eyesRouting.eye, eye))
        .run();
    } else {
      // Insert new
      await db.insert(eyesRouting).values({
        eye,
        primaryProvider,
        primaryModel,
        fallbackProvider: fallbackProvider || null,
        fallbackModel: fallbackModel || null,
      }).run();
    }

    const updated = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eye))
      .get();

    // Broadcast routing change via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'routing_updated',
        eye,
        routing: updated,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, updated);
  } catch (error) {
    console.error('Failed to update routing:', error);
    return createInternalErrorResponse(c, 'Failed to update routing');
  }
});

// Delete routing configuration (revert to defaults)
app.delete('/:eye', async (c) => {
  try {
    const eye = c.req.param('eye');
    const { db } = getDb();

    await db.delete(eyesRouting).where(eq(eyesRouting.eye, eye)).run();

    // Broadcast routing change via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'routing_deleted',
        eye,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { message: 'Routing configuration deleted (reverted to defaults)' });
  } catch (error) {
    console.error('Failed to delete routing:', error);
    return createInternalErrorResponse(c, 'Failed to delete routing');
  }
});

export default app;
