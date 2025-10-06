import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { prompts } from '@third-eye/db';
import { eq, desc, and } from 'drizzle-orm';

const app = new Hono();

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

    return c.json(filtered);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch prompts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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
      return c.json({ error: 'Prompt not found' }, 404);
    }

    return c.json(prompt[0]);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json(versions);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch prompt versions: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/prompts - Create new prompt
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, content, variables, category, tags } = body;

    if (!name || !content || !category) {
      return c.json(
        { error: 'Missing required fields: name, content, category' },
        400
      );
    }

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

    return c.json(
      { id, version: nextVersion, message: 'Prompt created successfully' },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: `Failed to create prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * PUT /api/prompts/:id - Update prompt (creates new version)
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const { db } = getDb();

    const existing = await db
      .select()
      .from(prompts)
      .where(eq(prompts.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return c.json({ error: 'Prompt not found' }, 404);
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

    return c.json({
      id: newId,
      version: nextVersion,
      message: 'Prompt updated (new version created)',
    });
  } catch (error) {
    return c.json(
      {
        error: `Failed to update prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/prompts/:id/activate - Activate specific version
 */
app.post('/:id/activate', async (c) => {
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
      return c.json({ error: 'Prompt not found' }, 404);
    }

    const targetPrompt = prompt[0];

    // Deactivate all versions of this prompt
    await db
      .update(prompts)
      .set({ active: false })
      .where(eq(prompts.name, targetPrompt.name))
      .run();

    // Activate target version
    await db
      .update(prompts)
      .set({ active: true })
      .where(eq(prompts.id, id))
      .run();

    return c.json({ message: `Prompt version ${targetPrompt.version} activated` });
  } catch (error) {
    return c.json(
      {
        error: `Failed to activate prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json({ message: 'Prompt deactivated' });
  } catch (error) {
    return c.json(
      {
        error: `Failed to delete prompt: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json({ categories });
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
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

    return c.json({ tags: Array.from(tagsSet) });
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch tags: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

export default app;
