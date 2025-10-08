import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import * as fs from 'fs';
import * as path from 'path';

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

app.post('/backup', async (c) => {
  try {
    const { dbPath } = getDb();

    if (!fs.existsSync(dbPath)) {
      return createErrorResponse(c, {
        title: 'Database Not Found',
        status: 404,
        detail: 'Database file does not exist'
      });
    }

    const dbBuffer = fs.readFileSync(dbPath);
    const filename = `third-eye-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;

    c.header('Content-Type', 'application/octet-stream');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    c.header('Content-Length', dbBuffer.length.toString());

    return c.body(dbBuffer);
  } catch (error) {
    console.error('Backup error:', error);
    return createInternalErrorResponse(c, 'Failed to create database backup');
  }
});

app.post('/restore', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || typeof file === 'string') {
      return createErrorResponse(c, {
        title: 'Invalid File',
        status: 400,
        detail: 'No database file provided'
      });
    }

    const { dbPath } = getDb();
    const backupPath = `${dbPath}.backup-${Date.now()}`;

    fs.copyFileSync(dbPath, backupPath);

    const buffer = await file.arrayBuffer();
    fs.writeFileSync(dbPath, Buffer.from(buffer));

    return createSuccessResponse(c, {
      success: true,
      message: 'Database restored successfully',
      backupPath
    });
  } catch (error) {
    console.error('Restore error:', error);
    return createInternalErrorResponse(c, 'Failed to restore database');
  }
});

app.post('/reset', async (c) => {
  try {
    const { db } = getDb();

    const tables = [
      'app_settings',
      'provider_keys',
      'models_cache',
      'eyes_routing',
      'personas',
      'sessions',
      'runs',
      'pipeline_events',
      'strictness_profiles',
      'pipelines',
      'pipeline_runs',
      'mcp_integrations',
      'evidence',
      'prompts'
    ];

    for (const table of tables) {
      try {
        await db.run(`DELETE FROM ${table}`);
      } catch (err) {
        console.warn(`Failed to clear table ${table}:`, err);
      }
    }

    return createSuccessResponse(c, {
      success: true,
      message: 'Database reset successfully',
      tablesCleared: tables.length
    });
  } catch (error) {
    console.error('Reset error:', error);
    return createInternalErrorResponse(c, 'Failed to reset database');
  }
});

export default app;
