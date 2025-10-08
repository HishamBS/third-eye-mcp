import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { strictnessProfiles } from '@third-eye/db';
import { eq, desc } from 'drizzle-orm';
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
const createStrictnessProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ambiguityThreshold: z.number().min(0).max(100).optional(),
  citationCutoff: z.number().min(0).max(100).optional(),
  consistencyTolerance: z.number().min(0).max(100).optional(),
  mangekyoStrictness: z.enum(['lenient', 'standard', 'strict']).optional(),
});

const updateStrictnessProfileSchema = z.object({
  description: z.string().optional(),
  ambiguityThreshold: z.number().min(0).max(100).optional(),
  citationCutoff: z.number().min(0).max(100).optional(),
  consistencyTolerance: z.number().min(0).max(100).optional(),
  mangekyoStrictness: z.enum(['lenient', 'standard', 'strict']).optional(),
});

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

    return createSuccessResponse(c, profiles);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch strictness profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      return createErrorResponse(c, { title: 'Profile Not Found', status: 404, detail: 'The requested strictness profile could not be found' });
    }

    return createSuccessResponse(c, profile[0]);
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to fetch profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * POST /api/strictness - Create new profile
 */
app.post('/', validateBodyWithEnvelope(createStrictnessProfileSchema), async (c) => {
  try {
    const {
      name,
      description,
      ambiguityThreshold,
      citationCutoff,
      consistencyTolerance,
      mangekyoStrictness,
    } = c.get('validatedBody');

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

    return createSuccessResponse(c, {
      id,
      message: 'Strictness profile created successfully',
    }, { status: 201 });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * PUT /api/strictness/:id - Update profile
 */
app.put('/:id', validateBodyWithEnvelope(updateStrictnessProfileSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const body = c.get('validatedBody');

    const { db } = getDb();

    const existing = await db
      .select()
      .from(strictnessProfiles)
      .where(eq(strictnessProfiles.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return createErrorResponse(c, { title: 'Profile Not Found', status: 404, detail: 'The requested strictness profile could not be found' });
    }

    // Don't allow editing built-in profiles
    if (existing[0].isBuiltIn) {
      return createErrorResponse(c, { title: 'Cannot Edit Built-in Profile', status: 403, detail: 'Built-in strictness profiles cannot be modified' });
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

    return createSuccessResponse(c, { message: 'Profile updated successfully' });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      return createErrorResponse(c, { title: 'Profile Not Found', status: 404, detail: 'The requested strictness profile could not be found' });
    }

    // Don't allow deleting built-in profiles
    if (existing[0].isBuiltIn) {
      return createErrorResponse(c, { title: 'Cannot Delete Built-in Profile', status: 403, detail: 'Built-in strictness profiles cannot be deleted' });
    }

    await db.delete(strictnessProfiles).where(eq(strictnessProfiles.id, id)).run();

    return createSuccessResponse(c, { message: 'Profile deleted successfully' });
  } catch (error) {
    return createInternalErrorResponse(c, `Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

export default app;
