import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { strictnessProfiles } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';

const app = new Hono();

/**
 * GET /api/strictness - Get all strictness profiles
 */
app.get('/', async (c) => {
  try {
    const { db } = getDb();

    const profiles = await db
      .select()
      .from(strictnessProfiles)
      .orderBy(desc(strictnessProfiles.isBuiltIn), desc(strictnessProfiles.createdAt))
      .all();

    return c.json(profiles);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch strictness profiles: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * GET /api/strictness/:id - Get specific profile
 */
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const profile = await db
      .select()
      .from(strictnessProfiles)
      .where(eq(strictnessProfiles.id, id))
      .limit(1)
      .all();

    if (profile.length === 0) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json(profile[0]);
  } catch (error) {
    return c.json(
      {
        error: `Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/strictness - Create new profile
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      description,
      ambiguityThreshold,
      citationCutoff,
      consistencyTolerance,
      mangekyoStrictness,
    } = body;

    if (!name) {
      return c.json({ error: 'Missing required field: name' }, 400);
    }

    const { db } = getDb();

    const id = nanoid();

    await db
      .insert(strictnessProfiles)
      .values({
        id,
        name,
        description: description || null,
        ambiguityThreshold: ambiguityThreshold || 30,
        citationCutoff: citationCutoff || 70,
        consistencyTolerance: consistencyTolerance || 80,
        mangekyoStrictness: mangekyoStrictness || 'standard',
        isBuiltIn: false,
        createdAt: new Date(),
      })
      .run();

    return c.json(
      { id, message: 'Strictness profile created successfully' },
      201
    );
  } catch (error) {
    return c.json(
      {
        error: `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * PUT /api/strictness/:id - Update profile
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const { db } = getDb();

    const existing = await db
      .select()
      .from(strictnessProfiles)
      .where(eq(strictnessProfiles.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Don't allow editing built-in profiles
    if (existing[0].isBuiltIn) {
      return c.json({ error: 'Cannot edit built-in profiles' }, 403);
    }

    await db
      .update(strictnessProfiles)
      .set({
        description: body.description !== undefined ? body.description : existing[0].description,
        ambiguityThreshold:
          body.ambiguityThreshold !== undefined
            ? body.ambiguityThreshold
            : existing[0].ambiguityThreshold,
        citationCutoff:
          body.citationCutoff !== undefined ? body.citationCutoff : existing[0].citationCutoff,
        consistencyTolerance:
          body.consistencyTolerance !== undefined
            ? body.consistencyTolerance
            : existing[0].consistencyTolerance,
        mangekyoStrictness:
          body.mangekyoStrictness !== undefined
            ? body.mangekyoStrictness
            : existing[0].mangekyoStrictness,
      })
      .where(eq(strictnessProfiles.id, id))
      .run();

    return c.json({ message: 'Profile updated successfully' });
  } catch (error) {
    return c.json(
      {
        error: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * DELETE /api/strictness/:id - Delete profile
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { db } = getDb();

    const existing = await db
      .select()
      .from(strictnessProfiles)
      .where(eq(strictnessProfiles.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Don't allow deleting built-in profiles
    if (existing[0].isBuiltIn) {
      return c.json({ error: 'Cannot delete built-in profiles' }, 403);
    }

    await db.delete(strictnessProfiles).where(eq(strictnessProfiles.id, id)).run();

    return c.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    return c.json(
      {
        error: `Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

export default app;
