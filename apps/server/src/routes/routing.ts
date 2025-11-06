import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { eyesRouting, eyes } from '@third-eye/db';
import { getEyeIdByName, getEyeNameById } from '@third-eye/db/utils/lookups';
import { generateId } from '@third-eye/db/utils/uuid';
import { eq } from 'drizzle-orm';
import { schemas } from '../middleware/validation';
import { getDefaultRouting } from '../lib/defaults';
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

    // Fetch all active eyes from database (unified source of truth)
    const allEyes = await db
      .select({ id: eyes.id, name: eyes.name })
      .from(eyes)
      .where(eq(eyes.active, true))
      .all();

    const result = await Promise.all(allEyes.map(async (eye) => {
      // Find routing by eyeId (UUID)
      const routing = routings.find(r => r.eyeId === eye.id);
      if (routing) {
        return { ...routing, eye: eye.name }; // Return with eye name for frontend
      }

      // Return default routing if not configured
      const defaultRouting = await getDefaultRouting();
      return {
        eye: eye.name,
        eyeId: eye.id,
        ...defaultRouting,
      };
    }));

    return createSuccessResponse(c, { routings: result });
  } catch (error) {
    console.error('Failed to fetch routing configs:', error);
    return createInternalErrorResponse(c, 'Failed to fetch routing configurations');
  }
});

// Get routing for specific Eye
app.get('/:eye', async (c) => {
  try {
    const eyeName = c.req.param('eye');
    const { db } = getDb();

    // Look up eye UUID by name
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createNotFoundResponse(c, `Eye '${eyeName}' not found`);
    }

    const routing = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eyeId, eyeId))
      .get();

    if (routing) {
      return createSuccessResponse(c, { ...routing, eye: eyeName });
    }

    // Return default if not configured
    const defaultRouting = await getDefaultRouting();
    return createSuccessResponse(c, {
      eye: eyeName,
      eyeId,
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
    // Eye name is already normalized to lowercase by validation middleware
    const { eye, primaryProvider, primaryModel, fallbackProvider, fallbackModel } = c.get('validatedBody');

    const { db } = getDb();

    // Look up eye UUID by name
    const eyeId = await getEyeIdByName(eye);
    if (!eyeId) {
      return createNotFoundResponse(c, `Eye '${eye}' not found`);
    }

    // Check if routing exists
    const existing = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eyeId, eyeId))
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
        .where(eq(eyesRouting.eyeId, eyeId))
        .run();
    } else {
      // Insert new
      await db.insert(eyesRouting).values({
        id: generateId(),
        eyeId,
        primaryProvider,
        primaryModel,
        fallbackProvider: fallbackProvider || null,
        fallbackModel: fallbackModel || null,
        createdAt: new Date(),
      }).run();
    }

    const updated = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eyeId, eyeId))
      .get();

    // Broadcast routing change via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToAll({
        type: 'routing_updated',
        eye,
        routing: { ...updated, eye }, // Include eye name for frontend
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { ...updated, eye });
  } catch (error) {
    console.error('Failed to update routing:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        requestBody: c.req.raw instanceof Request ? 'N/A' : c.req.raw,
      });
    }
    return createInternalErrorResponse(c, 'Failed to update routing');
  }
});

// Delete routing configuration (revert to defaults)
app.delete('/:eye', async (c) => {
  try {
    const eyeName = c.req.param('eye');
    const { db } = getDb();

    // Look up eye UUID by name
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createNotFoundResponse(c, `Eye '${eyeName}' not found`);
    }

    await db.delete(eyesRouting).where(eq(eyesRouting.eyeId, eyeId)).run();

    // Broadcast routing change via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToAll({
        type: 'routing_deleted',
        eye: eyeName,
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
