import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { prompts } from '@third-eye/db';
import { eq, desc, and } from 'drizzle-orm';
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

// Zod schemas for validation
const createPromptSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  variables: z.any().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

const updatePromptSchema = z.object({
  content: z.string().min(1).optional(),
  variables: z.any().optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * GET /api/prompts - Get all prompts with optional filtering
 */
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const category = c.req.query('category');
    const tag = c.req.query('tag');

    let query = db.select().from(prompts).where(eq(prompts.active, true));

    const allPrompts = await query.orderBy(desc(prompts.createdAt)).all();

    // Filter by category if provided
    let filtered = allPrompts;
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filter by tag if provided
    if (tag && filtered.length > 0) {
      filtered = filtered.filter((p) => {
        const tags = p.tags as string[] | null;
        return tags?.includes(tag);
      });
    }

    return createSuccessResponse(c, filtered);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/prompts/:id - Get specific prompt
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const prompt = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1)
      .all();

    if (prompt.length === 0) {
      return createErrorResponse(c, { title: 'Prompt Not Found', status: 404, detail: 'The requested prompt could not be found' });
    }

    return createSuccessResponse(c, prompt[0]);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/prompts/name/:name/versions - Get all versions of a prompt
 */
app.get('/name/:name/versions', async (c) => {
  try {
    const name = c.req.param('name');
    const { db } = getDb();

    const versions = await db
      .select()
      .from(prompts)
      .where(eq(prompts.name, name))
      .orderBy(desc(prompts.version))
      .all();

    return createSuccessResponse(c, versions);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch prompt versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/prompts - Create new prompt
 */
app.post('/', validateBodyWithEnvelope(createPromptSchema), async (c) => {
  try {
    const { name, content, variables, category, tags } = c.get('validatedBody');

    const { db } = getDb();

    // Check if prompt with this name already exists
    const existing = await db
      .select()
      .from(prompts)
      .where(eq(prompts.name, name))
      .orderBy(desc(prompts.version))
      .limit(1)
      .all();

    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const id = nanoid();
    const now = new Date();

    // Deactivate previous versions
    if (existing.length > 0) {
      await db
        .update(prompts)
        .set({ active: false })
        .where(eq(prompts.name, name))
        .run();
    }

    // Insert new version
    await db
      .insert(prompts)
      .values({
        id,
        name,
        version: nextVersion,
        content,
        variablesJson: variables || null,
        category,
        tags: tags || null,
        active: true,
        createdAt: now,
      })
      .run();

    return createSuccessResponse(c, {
      id,
      version: nextVersion,
      message: 'Prompt created successfully',
    }, { status: 201 });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to create prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * PUT /api/prompts/:id - Update prompt (creates new version)
 */
app.put('/:id', validateBodyWithEnvelope(updatePromptSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.get('validatedBody');

    const { db } = getDb();

    const existing = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return createErrorResponse(c, { title: 'Prompt Not Found', status: 404, detail: 'The requested prompt could not be found' });
    }

    const currentPrompt = existing[0];

    // Deactivate all versions of this prompt
    await db
      .update(prompts)
      .set({ active: false })
      .where(eq(prompts.name, currentPrompt.name))
      .run();

    // Create new version with updates
    const newId = nanoid();
    const nextVersion = currentPrompt.version + 1;

    await db
      .insert(prompts)
      .values({
        id: newId,
        name: currentPrompt.name,
        version: nextVersion,
        content: body.content || currentPrompt.content,
        variablesJson: body.variables !== undefined ? body.variables : currentPrompt.variablesJson,
        category: body.category || currentPrompt.category,
        tags: body.tags !== undefined ? body.tags : currentPrompt.tags,
        active: true,
        createdAt: new Date(),
      })
      .run();

    return createSuccessResponse(c, {
      id: newId,
      version: nextVersion,
      message: 'Prompt updated (new version created)',
    });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * DELETE /api/prompts/:id - Soft delete prompt
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    await db
      .update(prompts)
      .set({ active: false })
      .where(eq(prompts.id, id))
      .run();

    return createSuccessResponse(c, { message: 'Prompt deactivated' });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to delete prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/prompts/categories - Get all unique categories
 */
app.get('/meta/categories', async (c) => {
  try {
    const { db } = getDb();

    const allPrompts = await db
      .select()
      .from(prompts)
      .where(eq(prompts.active, true))
      .all();

    const categories = [...new Set(allPrompts.map((p) => p.category))];

    return createSuccessResponse(c, { categories });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * GET /api/prompts/tags - Get all unique tags
 */
app.get('/meta/tags', async (c) => {
  try {
    const { db } = getDb();

    const allPrompts = await db
      .select()
      .from(prompts)
      .where(eq(prompts.active, true))
      .all();

    const tagsSet = new Set<string>();
    allPrompts.forEach((p) => {
      const tags = p.tags as string[] | null;
      if (tags) {
        tags.forEach((tag) => tagsSet.add(tag));
      }
    });

    return createSuccessResponse(c, { tags: Array.from(tagsSet) });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/prompts/:id/activate - Activate/deactivate prompt
 */
app.post('/:id/activate', async (c) => {
  try {
    const id = c.req.param('id');
    const { active } = await c.req.json();

    const { db } = getDb();

    const existingPrompt = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1)
      .all();

    if (existingPrompt.length === 0) {
      return createErrorResponse(c, { title: 'Prompt Not Found', status: 404, detail: 'The requested prompt could not be found' });
    }

    await db
      .update(prompts)
      .set({ active: active ?? true })
      .where(eq(prompts.id, id))
      .run();

    return createSuccessResponse(c, { id, active: active ?? true, message: 'Prompt activation updated' });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to update prompt activation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default app;
