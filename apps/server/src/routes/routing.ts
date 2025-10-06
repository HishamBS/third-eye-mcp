import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { eyesRouting } from '@third-eye/db';
import { getRegisteredEyes, getDefaultRouting } from '@third-eye/core';
import { eq } from 'drizzle-orm';

/**
 * Routing Configuration Routes
 *
 * Manages Eye-to-Provider/Model routing mappings
 */

const app = new Hono();

// Get all routing configurations
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const routings = await db.select().from(eyesRouting).all();

    // Return routing configs with registered eyes info
    const registeredEyes = getRegisteredEyes();
    const result = registeredEyes.map(eye => {
      const routing = routings.find(r => r.eye === eye);
      if (routing) {
        return routing;
      }

      // Return default routing if not configured
      const defaults = getDefaultRouting(eye);
      return {
        eye,
        primaryProvider: defaults?.primaryProvider || null,
        primaryModel: defaults?.primaryModel || null,
        fallbackProvider: defaults?.fallbackProvider || null,
        fallbackModel: defaults?.fallbackModel || null,
      };
    });

    return c.json({ routings: result });
  } catch (error) {
    console.error('Failed to fetch routing configs:', error);
    return c.json({ error: 'Failed to fetch routing configurations' }, 500);
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
      return c.json(routing);
    }

    // Return default if not configured
    const defaults = getDefaultRouting(eye);
    if (defaults) {
      return c.json({
        eye,
        primaryProvider: defaults.primaryProvider,
        primaryModel: defaults.primaryModel,
        fallbackProvider: defaults.fallbackProvider || null,
        fallbackModel: defaults.fallbackModel || null,
      });
    }

    return c.json({ error: 'Eye not found' }, 404);
  } catch (error) {
    console.error('Failed to fetch routing:', error);
    return c.json({ error: 'Failed to fetch routing' }, 500);
  }
});

// Create or update routing configuration
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { eye, primaryProvider, primaryModel, fallbackProvider, fallbackModel } = body;

    if (!eye || !primaryProvider || !primaryModel) {
      return c.json({ error: 'Missing required fields: eye, primaryProvider, primaryModel' }, 400);
    }

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

    return c.json(updated);
  } catch (error) {
    console.error('Failed to update routing:', error);
    return c.json({ error: 'Failed to update routing' }, 500);
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

    return c.json({ success: true, message: 'Routing configuration deleted (reverted to defaults)' });
  } catch (error) {
    console.error('Failed to delete routing:', error);
    return c.json({ error: 'Failed to delete routing' }, 500);
  }
});

export default app;
