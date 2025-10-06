import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { personas, personaVersions } from '@third-eye/db';
import { getRegisteredEyes, getEyeTool } from '@third-eye/core';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Personas Management Routes
 *
 * Handles persona versioning, activation, and content management
 */

const app = new Hono();

// Get all personas for all Eyes
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const allPersonas = await db
      .select()
      .from(personas)
      .orderBy(desc(personas.createdAt))
      .all();

    // Group by eye
    const grouped = allPersonas.reduce((acc, p) => {
      if (!acc[p.eye]) acc[p.eye] = [];
      acc[p.eye].push(p);
      return acc;
    }, {} as Record<string, typeof allPersonas>);

    return c.json({ personas: grouped });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return c.json({ error: 'Failed to fetch personas' }, 500);
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
      const eyeTool = getEyeTool(eye);
      if (eyeTool) {
        return c.json({
          eye,
          versions: [],
          activeVersion: null,
          defaultTemplate: eyeTool.personaTemplate,
        });
      }
      return c.json({ error: 'Eye not found' }, 404);
    }

    const active = eyePersonas.find(p => p.active);

    return c.json({
      eye,
      versions: eyePersonas,
      activeVersion: active?.version || null,
    });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    return c.json({ error: 'Failed to fetch personas' }, 500);
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
      return c.json(active);
    }

    // Return default persona template
    const eyeTool = getEyeTool(eye);
    if (eyeTool) {
      return c.json({
        eye,
        version: 0,
        content: eyeTool.personaTemplate,
        active: false,
        createdAt: new Date(),
        isDefault: true,
      });
    }

    return c.json({ error: 'Eye not found' }, 404);
  } catch (error) {
    console.error('Failed to fetch active persona:', error);
    return c.json({ error: 'Failed to fetch active persona' }, 500);
  }
});

// Create new persona version (staged, not active)
app.post('/:eye', async (c) => {
  try {
    const eye = c.req.param('eye');
    const body = await c.req.json();
    const { content } = body;

    if (!content) {
      return c.json({ error: 'Missing required field: content' }, 400);
    }

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

    return c.json({
      success: true,
      message: `Persona version ${newVersion} created (staged, not active)`,
      persona: inserted,
    });
  } catch (error) {
    console.error('Failed to create persona:', error);
    return c.json({ error: 'Failed to create persona' }, 500);
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
      return c.json({ error: 'Persona version not found' }, 404);
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

    return c.json({
      success: true,
      message: `Persona version ${version} activated for ${eye}`,
      persona: activated,
    });
  } catch (error) {
    console.error('Failed to activate persona:', error);
    return c.json({ error: 'Failed to activate persona' }, 500);
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
      return c.json({ error: 'Persona version not found' }, 404);
    }

    if (targetPersona.active) {
      return c.json({ error: 'Cannot delete active persona version' }, 400);
    }

    await db
      .delete(personas)
      .where(and(eq(personas.eye, eye), eq(personas.version, version)))
      .run();

    return c.json({
      success: true,
      message: `Persona version ${version} deleted`,
    });
  } catch (error) {
    console.error('Failed to delete persona:', error);
    return c.json({ error: 'Failed to delete persona' }, 500);
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

    return c.json({ versions });
  } catch (error) {
    console.error('Failed to get persona versions:', error);
    return c.json({ error: 'Failed to get persona versions' }, 500);
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
      return c.json({ error: 'Persona not found' }, 404);
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

    return c.json({ version: newVersion });
  } catch (error) {
    console.error('Failed to create persona version:', error);
    return c.json({ error: 'Failed to create persona version' }, 500);
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
      return c.json({ error: 'Version not found' }, 404);
    }

    if (version.personaId !== personaId) {
      return c.json({ error: 'Version does not belong to this persona' }, 400);
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

    return c.json({
      success: true,
      message: `Restored to version ${version.versionNumber}`,
    });
  } catch (error) {
    console.error('Failed to restore persona version:', error);
    return c.json({ error: 'Failed to restore persona version' }, 500);
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
      return c.json({ error: 'One or both versions not found' }, 404);
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

    return c.json({ diff });
  } catch (error) {
    console.error('Failed to generate diff:', error);
    return c.json({ error: 'Failed to generate diff' }, 500);
  }
});

export default app;
