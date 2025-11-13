import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getDb } from "@third-eye/db";
import { personas, personaVersions } from "@third-eye/db";
import { personaBlueprints } from "@third-eye/db/schema";
// DEFAULT_PERSONA_MAP removed - all personas in database
import { EyeId } from "@third-eye/constants";
import { eq, and, desc } from "drizzle-orm";
import { getEyeIdByName, getEyeNameById } from "@third-eye/db/utils/lookups";
import { generateId } from "@third-eye/db/utils/uuid";
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";

/**
 * Personas Management Routes
 *
 * Handles persona versioning, activation, and content management
 */

const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Get all persona blueprints
app.get("/blueprints", async (c) => {
  try {
    const { db } = getDb();
    const dbBlueprints = await db.select().from(personaBlueprints);

    const blueprints = dbBlueprints.map((blueprint) => {
      const capabilities = JSON.parse(
        blueprint.capabilities as string,
      ) as string[];
      const phases = JSON.parse(blueprint.phases as string);
      const envelopeContract = JSON.parse(blueprint.envelopeContract as string);
      const reminders = JSON.parse(
        (blueprint.reminders || "[]") as string,
      ) as string[];

      return {
        id: blueprint.eyeId,
        eyeId: blueprint.eyeId as EyeId,
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        capabilities,
        metadata: {
          eyeId: blueprint.eyeId as EyeId,
          name: blueprint.name,
          description: blueprint.description,
          version: blueprint.version,
          capabilities,
        },
        mission: blueprint.mission,
        phases,
        envelopeContract,
        reminders,
        notes: blueprint.notes || undefined,
      };
    });

    return createSuccessResponse(c, blueprints);
  } catch (error) {
    console.error("Failed to fetch persona blueprints:", error);
    return createInternalErrorResponse(c, "Failed to fetch persona blueprints");
  }
});

// Get single blueprint by eyeId
app.get("/blueprints/:eyeId", async (c) => {
  try {
    const eyeId = c.req.param("eyeId");
    const { db } = getDb();

    const blueprint = await db
      .select()
      .from(personaBlueprints)
      .where(eq(personaBlueprints.eyeId, eyeId))
      .get();

    if (!blueprint) {
      return createErrorResponse(c, {
        title: "Blueprint Not Found",
        status: 404,
        detail: "Blueprint not found",
      });
    }

    const capabilities = JSON.parse(
      blueprint.capabilities as string,
    ) as string[];
    const phases = JSON.parse(blueprint.phases as string);
    const envelopeContract = JSON.parse(blueprint.envelopeContract as string);
    const reminders = JSON.parse(
      (blueprint.reminders || "[]") as string,
    ) as string[];

    const result = {
      id: blueprint.eyeId,
      eyeId: blueprint.eyeId as EyeId,
      name: blueprint.name,
      description: blueprint.description,
      version: blueprint.version,
      capabilities,
      metadata: {
        eyeId: blueprint.eyeId as EyeId,
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        capabilities,
      },
      mission: blueprint.mission,
      phases,
      envelopeContract,
      reminders,
      notes: blueprint.notes || undefined,
    };

    return createSuccessResponse(c, result);
  } catch (error) {
    console.error("Failed to fetch blueprint:", error);
    return createInternalErrorResponse(c, "Failed to fetch blueprint");
  }
});

// Update blueprint
app.put("/blueprints/:eyeId", async (c) => {
  try {
    const eyeId = c.req.param("eyeId");
    const body = await c.req.json();
    const { db } = getDb();
    const now = new Date();

    const updatedBlueprint = {
      eyeId,
      name: body.name,
      description: body.description,
      version: body.version,
      capabilities: JSON.stringify(body.capabilities),
      mission: body.mission,
      phases: JSON.stringify(body.phases),
      envelopeContract: JSON.stringify(body.envelopeContract),
      reminders: JSON.stringify(body.reminders || []),
      notes: body.notes || null,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    await db
      .insert(personaBlueprints)
      .values(updatedBlueprint)
      .onConflictDoUpdate({
        target: personaBlueprints.eyeId,
        set: updatedBlueprint,
      });

    return createSuccessResponse(c, {
      message: "Blueprint updated successfully",
    });
  } catch (error) {
    console.error("Failed to update blueprint:", error);
    return createInternalErrorResponse(c, "Failed to update blueprint");
  }
});

// Zod schemas for validation
const createPersonaSchema = z.object({
  name: z.string().min(1),
  metadataJson: z.object({
    eyeId: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.number(),
    capabilities: z.array(z.string()),
  }),
  mission: z.string().min(1),
  guidanceJson: z.record(z.unknown()).nullable().optional(),
  validationJson: z.record(z.unknown()).nullable().optional(),
  envelopeJson: z.object({
    requiredKeys: z.array(z.string()).optional(),
    requiredDataKeys: z.array(z.string()).optional(),
    requiredUiKeys: z.array(z.string()).optional(),
  }),
  remindersJson: z.array(z.string()),
  notes: z.string().nullable().optional(),
  llmConfigJson: z.object({
    temperature: z.number(),
    top_p: z.number(),
    response_format: z.string(),
    max_tokens: z.number(),
  }),
});

// Get all personas for all Eyes - returns flat array with name field
app.get("/", async (c) => {
  try {
    const { db } = getDb();
    const allPersonas = await db
      .select()
      .from(personas)
      .orderBy(desc(personas.createdAt))
      .all();

    // Ensure all personas have valid eyeId references and convert eyeId to eyeName
    // NO FALLBACKS - if eyeId is invalid, exclude persona and log error
    const personasWithNames: Array<
      typeof personas.$inferSelect & { eyeName: string }
    > = [];
    const invalidPersonas: Array<{ personaId: string; eyeId: string }> = [];

    for (const persona of allPersonas) {
      const eyeName = await getEyeNameById(persona.eyeId);

      if (!eyeName) {
        // Invalid eyeId reference - log error and exclude from response
        console.error(
          `[PERSONAS API] Persona ${persona.id} has invalid eyeId: ${persona.eyeId}. Excluding from response.`,
        );
        invalidPersonas.push({ personaId: persona.id, eyeId: persona.eyeId });
        continue;
      }

      personasWithNames.push({
        ...persona,
        eyeName, // Always set - guaranteed to be non-null
      });
    }

    // Log warning if any invalid personas found
    if (invalidPersonas.length > 0) {
      console.warn(
        `[PERSONAS API] Found ${invalidPersonas.length} persona(s) with invalid eyeId references. These were excluded from the response.`,
        invalidPersonas,
      );
    }

    return createSuccessResponse(c, personasWithNames);
  } catch (error) {
    console.error("Failed to fetch personas:", error);
    return createInternalErrorResponse(c, "Failed to fetch personas");
  }
});

// Get personas for specific Eye
app.get("/:eye", async (c) => {
  try {
    const eyeName = c.req.param("eye");
    const { db } = getDb();

    // Convert eye name to UUID
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    const eyePersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.eyeId, eyeId))
      .orderBy(desc(personas.version))
      .all();

    if (eyePersonas.length === 0) {
      // All personas should exist in database (seeded on startup)
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    const active = eyePersonas.find((p) => p.active);

    return createSuccessResponse(c, {
      eye: eyeName,
      versions: eyePersonas,
      activeVersion: active?.version || null,
    });
  } catch (error) {
    console.error("Failed to fetch personas:", error);
    return createInternalErrorResponse(c, "Failed to fetch personas");
  }
});

// Get active persona for specific Eye
app.get("/:eye/active", async (c) => {
  try {
    const eyeName = c.req.param("eye");
    const { db } = getDb();

    // Convert eye name to UUID
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    const active = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.active, true)))
      .get();

    if (active) {
      return createSuccessResponse(c, active);
    }

    // All personas should exist in database (seeded on startup)
    return createErrorResponse(c, {
      title: "Persona Not Found",
      status: 404,
      detail: `No active persona for ${eyeName}`,
    });
  } catch (error) {
    console.error("Failed to fetch active persona:", error);
    return createInternalErrorResponse(c, "Failed to fetch active persona");
  }
});

// Create new persona version (staged, not active)
app.post("/:eye", validateBodyWithEnvelope(createPersonaSchema), async (c) => {
  try {
    const eyeName = c.req.param("eye");
    const {
      name,
      metadataJson,
      mission,
      guidanceJson,
      validationJson,
      envelopeJson,
      remindersJson,
      notes,
      llmConfigJson,
    } = c.get("validatedBody");

    const { db } = getDb();

    // Convert eye name to UUID
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    // Get latest version number
    const latest = await db
      .select()
      .from(personas)
      .where(eq(personas.eyeId, eyeId))
      .orderBy(desc(personas.version))
      .get();

    const newVersion = (latest?.version || 0) + 1;

    // Generate persona ID as UUID
    const personaId = generateId();

    // Insert new persona version (inactive by default)
    const newPersona = {
      id: personaId,
      eyeId,
      name,
      version: newVersion,
      metadataJson,
      mission,
      guidanceJson,
      validationJson,
      envelopeJson,
      remindersJson,
      notes,
      llmConfigJson,
      active: false,
      createdAt: new Date(),
    };

    await db.insert(personas).values(newPersona).run();

    const inserted = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, newVersion)))
      .get();

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${newVersion} created (staged, not active)`,
      persona: inserted,
    });
  } catch (error) {
    console.error("Failed to create persona:", error);
    return createInternalErrorResponse(c, "Failed to create persona");
  }
});

// Activate a specific persona version
app.patch("/:eye/activate/:version", async (c) => {
  try {
    const eyeName = c.req.param("eye");
    const version = parseInt(c.req.param("version"));

    const { db } = getDb();

    // Convert eye name to UUID
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    // Check if version exists
    const targetPersona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, version)))
      .get();

    if (!targetPersona) {
      return createErrorResponse(c, {
        title: "Persona Version Not Found",
        status: 404,
        detail: "The requested persona version could not be found",
      });
    }

    // Deactivate all versions for this Eye
    await db
      .update(personas)
      .set({ active: false })
      .where(eq(personas.eyeId, eyeId))
      .run();

    // Activate target version
    await db
      .update(personas)
      .set({ active: true })
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, version)))
      .run();

    const activated = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, version)))
      .get();

    // Broadcast persona change via WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcast({
        type: "persona_activated",
        eye: eyeName, // Send eye name for frontend
        eyeId, // Include UUID
        version,
        persona: activated,
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${version} activated for ${eyeName}`,
      persona: activated,
    });
  } catch (error) {
    console.error("Failed to activate persona:", error);
    return createInternalErrorResponse(c, "Failed to activate persona");
  }
});

// Delete a persona version (cannot delete active version)
app.delete("/:eye/:version", async (c) => {
  try {
    const eyeName = c.req.param("eye");
    const version = parseInt(c.req.param("version"));

    const { db } = getDb();

    // Convert eye name to UUID
    const eyeId = await getEyeIdByName(eyeName);
    if (!eyeId) {
      return createErrorResponse(c, {
        title: "Eye Not Found",
        status: 404,
        detail: "The requested eye could not be found",
      });
    }

    const targetPersona = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, version)))
      .get();

    if (!targetPersona) {
      return createErrorResponse(c, {
        title: "Persona Version Not Found",
        status: 404,
        detail: "The requested persona version could not be found",
      });
    }

    if (targetPersona.active) {
      return createErrorResponse(c, {
        title: "Cannot Delete Active Version",
        status: 400,
        detail: "Cannot delete the currently active persona version",
      });
    }

    await db
      .delete(personas)
      .where(and(eq(personas.eyeId, eyeId), eq(personas.version, version)))
      .run();

    return createSuccessResponse(c, {
      success: true,
      message: `Persona version ${version} deleted`,
    });
  } catch (error) {
    console.error("Failed to delete persona:", error);
    return createInternalErrorResponse(c, "Failed to delete persona");
  }
});

// Versioning endpoints

// GET /personas/:id/versions - Get all versions of a persona
app.get("/:id/versions", async (c) => {
  try {
    const personaId = c.req.param("id");
    const { db } = getDb();

    const versions = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.personaId, personaId))
      .orderBy(desc(personaVersions.versionNumber))
      .all();

    return createSuccessResponse(c, { versions });
  } catch (error) {
    console.error("Failed to get persona versions:", error);
    return createInternalErrorResponse(c, "Failed to get persona versions");
  }
});

// POST /personas/:id/versions - Create new version (snapshot current)
app.post("/:id/versions", async (c) => {
  try {
    const personaId = c.req.param("id");
    const { db } = getDb();

    // Get current persona
    const persona = await db
      .select()
      .from(personas)
      .where(eq(personas.id, personaId))
      .get();

    if (!persona) {
      return createErrorResponse(c, {
        title: "Persona Not Found",
        status: 404,
        detail: "The requested persona could not be found",
      });
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
      createdBy: "user",
    };

    await db.insert(personaVersions).values(newVersion).run();

    return createSuccessResponse(c, { version: newVersion });
  } catch (error) {
    console.error("Failed to create persona version:", error);
    return createInternalErrorResponse(c, "Failed to create persona version");
  }
});

// POST /personas/:id/restore/:versionId - Restore to specific version
app.post("/:id/restore/:versionId", async (c) => {
  try {
    const personaId = c.req.param("id");
    const versionId = c.req.param("versionId");
    const { db } = getDb();

    // Get version
    const version = await db
      .select()
      .from(personaVersions)
      .where(eq(personaVersions.id, versionId))
      .get();

    if (!version) {
      return createErrorResponse(c, {
        title: "Version Not Found",
        status: 404,
        detail: "The requested version could not be found",
      });
    }

    if (version.personaId !== personaId) {
      return createErrorResponse(c, {
        title: "Version Mismatch",
        status: 400,
        detail: "Version does not belong to this persona",
      });
    }

    // Update persona with version data
    const settings =
      typeof version.settings === "string"
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
    console.error("Failed to restore persona version:", error);
    return createInternalErrorResponse(c, "Failed to restore persona version");
  }
});

// GET /personas/:id/diff/:v1/:v2 - Get diff between two versions
app.get("/:id/diff/:v1/:v2", async (c) => {
  try {
    const personaId = c.req.param("id");
    const v1Id = c.req.param("v1");
    const v2Id = c.req.param("v2");
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
      return createErrorResponse(c, {
        title: "Versions Not Found",
        status: 404,
        detail: "One or both versions could not be found",
      });
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
        changed:
          JSON.stringify(version1.settings) !==
          JSON.stringify(version2.settings),
      },
      versionNumbers: {
        v1: version1.versionNumber,
        v2: version2.versionNumber,
      },
    };

    return createSuccessResponse(c, { diff });
  } catch (error) {
    console.error("Failed to generate diff:", error);
    return createInternalErrorResponse(c, "Failed to generate diff");
  }
});

export default app;
