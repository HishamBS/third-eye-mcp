import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { TemplateExecutor } from '@third-eye/core';
import {
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

/**
 * Pipeline Templates Routes - Phase 3
 *
 * Manages fixed pipeline templates for Fixed Template mode
 * Templates define exact eye sequences with optional auto-trigger patterns
 */

const app = new Hono();

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Get all templates
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    const isPublicParam = c.req.query('public');
    const createdBy = c.req.query('createdBy');

    const filters: { isPublic?: boolean; createdBy?: string } = {};
    if (isPublicParam !== undefined) {
      filters.isPublic = isPublicParam === 'true';
    }
    if (createdBy) {
      filters.createdBy = createdBy;
    }

    const templates = await templateExecutor.listTemplates(Object.keys(filters).length > 0 ? filters : undefined);

    return createSuccessResponse(c, { templates });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return createInternalErrorResponse(c, 'Failed to fetch templates');
  }
});

// Get specific template
app.get('/:id', async (c) => {
  try {
    const templateId = c.req.param('id');
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    const template = await templateExecutor.getTemplate(templateId);

    if (!template) {
      return createNotFoundResponse(c, `Template '${templateId}' not found`);
    }

    return createSuccessResponse(c, { template });
  } catch (error) {
    console.error('Failed to fetch template:', error);
    return createInternalErrorResponse(c, 'Failed to fetch template');
  }
});

// Create new template
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    // Validate required fields
    if (!body.name || !body.eyes || !Array.isArray(body.eyes) || body.eyes.length === 0) {
      return createErrorResponse(c, 'name and eyes (non-empty array) are required', 400);
    }

    const template = await templateExecutor.createTemplate({
      name: body.name,
      description: body.description,
      eyes: body.eyes,
      strict: body.strict,
      autoTriggerPattern: body.autoTriggerPattern,
      createdBy: body.createdBy,
      isPublic: body.isPublic,
    });

    // Broadcast template creation via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToAll({
        type: 'template_created',
        template,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { template }, 201);
  } catch (error) {
    console.error('Failed to create template:', error);
    if (error instanceof Error) {
      return createErrorResponse(c, error.message, 400);
    }
    return createInternalErrorResponse(c, 'Failed to create template');
  }
});

// Delete template
app.delete('/:id', async (c) => {
  try {
    const templateId = c.req.param('id');
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    const deleted = await templateExecutor.deleteTemplate(templateId);

    if (!deleted) {
      return createNotFoundResponse(c, `Template '${templateId}' not found`);
    }

    // Broadcast template deletion via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcastToAll({
        type: 'template_deleted',
        templateId,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, { message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return createInternalErrorResponse(c, 'Failed to delete template');
  }
});

// Find template by auto-trigger pattern
app.post('/match', async (c) => {
  try {
    const body = await c.req.json();
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    if (!body.request || typeof body.request !== 'string') {
      return createErrorResponse(c, 'request (string) is required', 400);
    }

    const template = await templateExecutor.findTemplateByPattern(body.request);

    if (!template) {
      return createSuccessResponse(c, { template: null, matched: false });
    }

    return createSuccessResponse(c, { template, matched: true });
  } catch (error) {
    console.error('Failed to match template:', error);
    return createInternalErrorResponse(c, 'Failed to match template');
  }
});

// Execute template (get execution plan)
app.post('/:id/execute', async (c) => {
  try {
    const templateId = c.req.param('id');
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    const executionPlan = await templateExecutor.executeTemplate(templateId);

    return createSuccessResponse(c, { executionPlan });
  } catch (error) {
    console.error('Failed to execute template:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return createNotFoundResponse(c, error.message);
    }
    return createInternalErrorResponse(c, 'Failed to execute template');
  }
});

// Get template usage statistics
app.get('/:id/stats', async (c) => {
  try {
    const templateId = c.req.param('id');
    const { db } = getDb();
    const templateExecutor = new TemplateExecutor(db);

    const template = await templateExecutor.getTemplate(templateId);

    if (!template) {
      return createNotFoundResponse(c, `Template '${templateId}' not found`);
    }

    return createSuccessResponse(c, {
      templateId: template.id,
      name: template.name,
      usageCount: template.usageCount,
      isPublic: template.isPublic,
      createdAt: template.createdAt,
    });
  } catch (error) {
    console.error('Failed to fetch template stats:', error);
    return createInternalErrorResponse(c, 'Failed to fetch template stats');
  }
});

export default app;
