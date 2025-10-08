import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { personas, personaVersions } from '@third-eye/db';
import { ALL_EYES } from '@third-eye/eyes';
import { eq, and, desc } from 'drizzle-orm';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

/**
 * Personas Management Routes
 *
 * Handles persona versioning, activation, and content management
 */

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

// Zod schemas for validation
const createPersonaSchema = z.object({
  content: z.string().min(1),
});

// Get all personas for all Eyes - returns flat array with name field
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const allPersonas = await db
      .select()
      .from(personas)
      .orderBy(desc(personas.createdAt))
      .all();

    return createSuccessResponse(c, allPersonas);
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return createInternalErrorResponse(c, 'Failed to fetch personas');
  }
});

// Get personas for specific Eye
app.get('/:eye', async (c) => {
  try {
    const eye = c.req.param('eye');
    const { db } = getDb();

    const eyePersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, eye))
      .orderBy(desc(personas.version))
      .all();

    if (eyePersonas.length === 0) {
      // Return default persona template if none exist
      const eyeInstance = ALL_EYES[eye];
      if (eyeInstance) {
        return createSuccessResponse(c, {
          eye,
          versions: [],
          activeVersion: null,
          defaultTemplate: eyeInstance.getPersona(),
        });
      }
      return createErrorResponse(c, { title: 'Eye Not Found', status: 404, detail: 'The requested eye could not be found' });
    }

    const active = eyePersonas.find(p => p.active);

    return createSuccessResponse(c, {
      eye,
      versions: eyePersonas,
      activeVersion: active?.version || null,
    });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return createInternalErrorResponse(c, 'Failed to fetch personas');
  }
});

// Get active persona for specific Eye
app.get('/:eye/active', async (c) => {
  try {
    const eye = c.req.param('eye');
    const { db } = getDb();

    const active = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.active, true)))
      .get();

    if (active) {
      return createSuccessResponse(c, active);
    }

    // Return default persona template
    const eyeInstance = ALL_EYES[eye];
    if (eyeInstance) {
      return createSuccessResponse(c, {
        eye,
        version: 0,
        content: eyeInstance.getPersona(),
        active: false,
        createdAt: new Date(),
        isDefault: true,
      });
    }

    return createErrorResponse(c, { title: 'Eye Not Found', status: 404, detail: 'The requested eye could not be found' });
  } catch (error) {
    console.error('Failed to fetch active persona:', error);
    return createInternalErrorResponse(c, 'Failed to fetch active persona');
  }
});

// Create new persona version (staged, not active)
app.post('/:eye', validateBodyWithEnvelope(createPersonaSchema), async (c) => {
  try {
    const eye = c.req.param('eye');
    const { content } = c.get('validatedBody');

    const { db } = getDb();

    // Get latest version number
    const latest = await db
      .select()
      .from(personas)
      .where(eq(personas.eye, eye))
      .orderBy(desc(personas.version))
      .get();

    const newVersion = (latest?.version || 0) + 1;

    // Insert new persona version (inactive by default)
    const newPersona = {
      eye,
      version: newVersion,
      content,
      active: false,
      createdAt: new Date(),
    };

    await db.insert(personas).values(newPersona).run();

    const inserted = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, newVersion)))
      .get();

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${newVersion} created (staged, not active)`,
      persona: inserted,
    });
  } catch (error) {
    console.error('Failed to create persona:', error);
    return createInternalErrorResponse(c, 'Failed to create persona');
  }
});

// Activate a specific persona version
app.patch('/:eye/activate/:version', async (c) => {
  try {
    const eye = c.req.param('eye');
    const version = parseInt(c.req.param('version'));

    const { db } = getDb();

    // Check if version exists
    const targetPersona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .get();

    if (!targetPersona) {
      return createErrorResponse(c, { title: 'Persona Version Not Found', status: 404, detail: 'The requested persona version could not be found' });
    }

    // Deactivate all versions for this Eye
    await db
      .update(personas)
      .set({ active: false })
      .where(eq(personas.eye, eye))
      .run();

    // Activate target version
    await db
      .update(personas)
      .set({ active: true })
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .run();

    const activated = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .get();

    // Broadcast persona change via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'persona_activated',
        eye,
        version,
        persona: activated,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${version} activated for ${eye}`,
      persona: activated,
    });
  } catch (error) {
    console.error('Failed to activate persona:', error);
    return createInternalErrorResponse(c, 'Failed to activate persona');
  }
});

// Delete a persona version (cannot delete active version)
app.delete('/:eye/:version', async (c) => {
  try {
    const eye = c.req.param('eye');
    const version = parseInt(c.req.param('version'));

    const { db } = getDb();

    const targetPersona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .get();

    if (!targetPersona) {
      return createErrorResponse(c, { title: 'Persona Version Not Found', status: 404, detail: 'The requested persona version could not be found' });
    }

    if (targetPersona.active) {
      return createErrorResponse(c, { title: 'Cannot Delete Active Version', status: 400, detail: 'Cannot delete the currently active persona version' });
    }

    await db
      .delete(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .run();

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${version} deleted`,
    });
  } catch (error) {
    console.error('Failed to delete persona:', error);
    return createInternalErrorResponse(c, 'Failed to delete persona');
  }
});

// Versioning endpoints

// GET /personas/:id/versions - Get all versions of a persona
app.get('/:id/versions', async (c) => {
  try {
    const personaId = c.req.param('id');
    const { db } = getDb();

    const versions = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.personaId, personaId))
      .orderBy(desc(personaVersions.versionNumber))
      .all();

    return createSuccessResponse(c, { versions });
  } catch (error) {
    console.error('Failed to get persona versions:', error);
    return createInternalErrorResponse(c, 'Failed to get persona versions');
  }
});

// POST /personas/:id/versions - Create new version (snapshot current)
app.post('/:id/versions', async (c) => {
  try {
    const personaId = c.req.param('id');
    const { db } = getDb();

    // Get current persona
    const persona = await db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .get();

    if (!persona) {
      return createErrorResponse(c, { title: 'Persona Not Found', status: 404, detail: 'The requested persona could not be found' });
    }

    // Get latest version number
    const versions = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.personaId, personaId))
      .orderBy(desc(personaVersions.versionNumber))
      .limit(1)
      .all();

    const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;

    // Create new version snapshot
    const newVersion = {
      id: nanoid(),
      personaId: persona.id,
      versionNumber: nextVersion,
      systemPrompt: persona.systemPrompt,
      settings: {
        tone: persona.tone,
        strictness: persona.strictnessLevel,
        voice: persona.voice,
      },
      createdAt: new Date(),
      createdBy: 'user',
    };

    await db.insert(personaVersions).values(newVersion).run();

    return createSuccessResponse(c, { version: newVersion });
  } catch (error) {
    console.error('Failed to create persona version:', error);
    return createInternalErrorResponse(c, 'Failed to create persona version');
  }
});

// POST /personas/:id/restore/:versionId - Restore to specific version
app.post('/:id/restore/:versionId', async (c) => {
  try {
    const personaId = c.req.param('id');
    const versionId = c.req.param('versionId');
    const { db } = getDb();

    // Get version
    const version = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.id, versionId))
      .get();

    if (!version) {
      return createErrorResponse(c, { title: 'Version Not Found', status: 404, detail: 'The requested version could not be found' });
    }

    if (version.personaId !== personaId) {
      return createErrorResponse(c, { title: 'Version Mismatch', status: 400, detail: 'Version does not belong to this persona' });
    }

    // Update persona with version data
    const settings = typeof version.settings === 'string'
      ? JSON.parse(version.settings)
      : version.settings || {};

    await db
      .update(personas)
      .set({
        systemPrompt: version.systemPrompt,
        tone: settings.tone,
        strictnessLevel: settings.strictness,
        voice: settings.voice,
      })
      .where(eq(personas.id, personaId))
      .run();

    return createSuccessResponse(c, {
      success: true,
      message: `Restored to version ${version.versionNumber}`,
    });
  } catch (error) {
    console.error('Failed to restore persona version:', error);
    return createInternalErrorResponse(c, 'Failed to restore persona version');
  }
});

// GET /personas/:id/diff/:v1/:v2 - Get diff between two versions
app.get('/:id/diff/:v1/:v2', async (c) => {
  try {
    const personaId = c.req.param('id');
    const v1Id = c.req.param('v1');
    const v2Id = c.req.param('v2');
    const { db } = getDb();

    const version1 = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.id, v1Id))
      .get();

    const version2 = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.id, v2Id))
      .get();

    if (!version1 || !version2) {
      return createErrorResponse(c, { title: 'Versions Not Found', status: 404, detail: 'One or both versions could not be found' });
    }

    // Simple diff
    const diff = {
      systemPrompt: {
        v1: version1.systemPrompt,
        v2: version2.systemPrompt,
        changed: version1.systemPrompt !== version2.systemPrompt,
      },
      settings: {
        v1: version1.settings,
        v2: version2.settings,
        changed: JSON.stringify(version1.settings) !== JSON.stringify(version2.settings),
      },
      versionNumbers: {
        v1: version1.versionNumber,
        v2: version2.versionNumber,
      },
    };

    return createSuccessResponse(c, { diff });
  } catch (error) {
    console.error('Failed to generate diff:', error);
    return createInternalErrorResponse(c, 'Failed to generate diff');
  }
});

export default app;
