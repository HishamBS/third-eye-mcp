import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { appSettings } from '@third-eye/db';
import { eq } from 'drizzle-orm';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const settings = await db.select().from(appSettings).all();

    const settingsMap: Record<string, any> = {};
    settings.forEach(s => {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch {
        settingsMap[s.key] = s.value;
      }
    });

    return createSuccessResponse(c, settingsMap);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return createInternalErrorResponse(c, 'Failed to fetch settings');
  }
});

app.get('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const { db } = getDb();

    const setting = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .get();

    if (!setting) {
      return createErrorResponse(c, 'Setting not found', 404);
    }

    let value;
    try {
      value = JSON.parse(setting.value);
    } catch {
      value = setting.value;
    }

    return createSuccessResponse(c, { key, value });
  } catch (error) {
    console.error('Failed to fetch setting:', error);
    return createInternalErrorResponse(c, 'Failed to fetch setting');
  }
});

app.put('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { value } = body;

    if (value === undefined) {
      return createErrorResponse(c, 'Missing required field: value', 400);
    }

    const { db } = getDb();

    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .get();

    if (existing) {
      await db
        .update(appSettings)
        .set({ value: valueStr })
        .where(eq(appSettings.key, key))
        .run();
    } else {
      await db.insert(appSettings).values({ key, value: valueStr }).run();
    }

    const updated = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, key))
      .get();

    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'app_settings_updated',
        key,
        value,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { key, value });
  } catch (error) {
    console.error('Failed to update setting:', error);
    return createInternalErrorResponse(c, 'Failed to update setting');
  }
});

app.delete('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const { db } = getDb();

    await db.delete(appSettings).where(eq(appSettings.key, key)).run();

    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'app_settings_deleted',
        key,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { message: 'Setting deleted' });
  } catch (error) {
    console.error('Failed to delete setting:', error);
    return createInternalErrorResponse(c, 'Failed to delete setting');
  }
});

export default app;
