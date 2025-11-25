import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getDb } from "@third-eye/db";
import {
  pipelineEvents,
  eyes,
  personaBlueprints,
  eyesRouting,
  personas,
} from "@third-eye/db";
import { EyeOrchestrator } from "@third-eye/core";
import { sessionManager } from "@third-eye/core/session-manager";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import type { Envelope } from "@third-eye/types";
import { getDefaultRouting } from "../lib/defaults";
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";
import { ApiErrorCode, ApiErrorTitle, ApiErrorMessage } from "@third-eye/constants";

/**
 * Eyes API Routes - Data-Driven Unified System
 *
 * ARCHITECTURE CHANGE (v1):
 * - All eyes are database rows (no distinction between seeded and custom)
 * - Eyes are seeded from blueprints/data.ts on startup
 * - No hardcoded checks or DEFAULT_PERSONA_MAP lookups
 * - Database is the single source of truth
 *
 * All Eyes route through the orchestrator which:
 * 1. Loads the persona from database
 * 2. Calls the configured LLM provider
 * 3. Returns the structured envelope response
 */

const app = new Hono();
const orchestrator = new EyeOrchestrator();

async function getActivePersonasMap(
  db: ReturnType<typeof getDb>["db"],
  eyeIds: string[],
) {
  if (eyeIds.length === 0) {
    return new Map<string, typeof personas.$inferSelect>();
  }

  const rows = await db
    .select()
    .from(personas)
    .where(inArray(personas.eyeId, eyeIds))
    .orderBy(desc(personas.version))
    .all();

  const map = new Map<string, typeof personas.$inferSelect>();
  for (const row of rows) {
    // Map by eyeId for lookup
    if (row.active) {
      map.set(row.eyeId, row);
      continue;
    }

    if (!map.has(row.eyeId)) {
      map.set(row.eyeId, row);
    }
  }

  return map;
}

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Zod schemas for validation
const eyeRequestSchema = z.object({
  context: z
    .object({
      session_id: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
  input: z.string().optional(),
  payload: z
    .object({
      prompt: z.string().optional(),
      clarifications: z.any().optional(),
      task: z.string().optional(),
      plan: z.any().optional(),
      scaffold: z.any().optional(),
      diffs: z.any().optional(),
      reasoning: z.any().optional(),
      tests: z.any().optional(),
      coverage: z.any().optional(),
      docs: z.any().optional(),
      content: z.any().optional(),
      sources: z.any().optional(),
      implementation: z.any().optional(),
    })
    .optional(),
  prompt: z.string().optional(),
  task: z.string().optional(),
  plan: z.any().optional(),
  scaffold: z.any().optional(),
  diffs: z.any().optional(),
  reasoning: z.any().optional(),
  tests: z.any().optional(),
  coverage: z.any().optional(),
  docs: z.any().optional(),
  content: z.any().optional(),
  sources: z.any().optional(),
  implementation: z.any().optional(),
});

const createCustomEyeSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  inputSchema: z.any(),
  outputSchema: z.any(),
  personaId: z.string().optional(),
  defaultRouting: z.any().optional(),
});

const eyeTestSchema = z.object({
  input: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  task: z.string().min(1).optional(),
  sessionId: z.string().optional(),
});

// Helper to log pipeline events
async function logPipelineEvent(
  sessionId: string,
  eyeId: string,
  response: Envelope,
) {
  try {
    const { db } = getDb();
    await db
      .insert(pipelineEvents)
      .values({
        id: nanoid(),
        sessionId,
        eyeId,
        type: "eye_call",
        code: response.code,
        md: response.md,
        dataJson: response.data,
        nextAction: response.next,
        createdAt: new Date(),
      })
      .run();

    // Broadcast to WebSocket
    try {
      const { wsManager } = await import("../websocket");
      wsManager.broadcastToSession(sessionId, {
        type: "pipeline_event",
        sessionId,
        data: {
          eyeId,
          ...response,
        },
        timestamp: Date.now(),
      });
    } catch (e) {
      console.debug("WebSocket broadcast skipped:", e);
    }
  } catch (error) {
    console.error("Failed to log pipeline event:", error);
  }
}

// NOTE: Direct Eye POST routes removed - all execution goes through /api/mcp/run (Golden Rule #1)

/**
 * POST /eyes/:id/test - Execute a single Eye for playground validation
 */
app.post("/:id/test", async (c) => {
  const eyeId = c.req.param("id");

  try {
    const body = await c.req.json();
    const parsed = eyeTestSchema.parse(body);
    const candidateInput = parsed.input || parsed.prompt || parsed.task;

    if (!candidateInput || candidateInput.trim().length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_INPUT,
        status: 400,
        detail: 'Provide a non-empty string in "input", "prompt", or "task".',
        code: ApiErrorCode.EMPTY_INPUT,
      });
    }

    let sessionId = parsed.sessionId ?? null;
    if (sessionId) {
      const existing = await sessionManager.getSession(sessionId);
      if (!existing) {
        sessionId = null;
      }
    }

    if (!sessionId) {
      const session = await sessionManager.createSession({
        agentName: "Playground Tester",
        metadata: {
          entryTool: eyeId,
          source: "playground",
        },
      });
      sessionId = session.id;
    }

    if (!sessionId) {
      return createInternalErrorResponse(
        c,
        "Failed to create playground session for Eye execution",
      );
    }

    const result = await orchestrator.runEye(
      eyeId,
      candidateInput.trim(),
      sessionId,
    );
    await logPipelineEvent(sessionId, eyeId, result as Envelope);

    return createSuccessResponse(c, {
      sessionId,
      result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((issue) => issue.message).join("; "),
        code: ApiErrorCode.INVALID_PAYLOAD,
      });
    }

    console.error("[Eyes API] Failed to execute Eye:", error);
    return createInternalErrorResponse(
      c,
      error instanceof Error ? error.message : "Failed to execute Eye",
    );
  }
});

/**
 * GET /eyes/all - Get ALL Eyes from unified database table
 * NO hardcoded checks, NO DEFAULT_PERSONA_MAP, NO built-in vs custom distinction
 * Database is the only source of truth
 * Phase 4: Returns capability_tags from eyes table for CapabilityMatrix component
 */
app.get("/all", async (c) => {
  const { db } = getDb();

  const allEyes = await db
    .select()
    .from(eyes)
    .where(eq(eyes.active, true))
    .orderBy(desc(eyes.createdAt))
    .all();

  // Map eyes to response format with capability_tags
  const eyeData = allEyes.map((eye) => {
    // Parse capability_tags from JSON column (Phase 1-A1)
    const capabilityTags =
      typeof eye.capabilityTags === "string"
        ? JSON.parse(eye.capabilityTags)
        : eye.capabilityTags || [];

    return {
      id: eye.id,
      name: eye.name, // Display name (e.g., 'Overseer', 'Jōgan')
      version: eye.version,
      description: eye.description,
      capabilityTags, // Phase 4: For CapabilityMatrix
      inputSchema: eye.inputSchemaJson,
      outputSchema: eye.outputSchemaJson,
      personaId: eye.personaId,
      iconSvg: eye.iconSvg,
      active: eye.active,
      createdAt: eye.createdAt,
    };
  });

  return createSuccessResponse(c, eyeData);
});

/**
 * GET /eyes/:name/icon - Get icon SVG for an Eye by name
 * Used by EyeIcon component to fetch custom SVG icons
 */
app.get("/:name/icon", async (c) => {
  const eyeName = c.req.param("name");

  try {
    const { db } = getDb();

    // Find eye by name (case-insensitive, match active eyes first)
    const eye = await db
      .select()
      .from(eyes)
      .where(sql`LOWER(${eyes.name}) = LOWER(${eyeName})`)
      .orderBy(desc(eyes.active), desc(eyes.createdAt))
      .get();

    if (!eye || !eye.iconSvg) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EYE_ICON_NOT_FOUND,
        code: ApiErrorCode.EYE_ICON_NOT_FOUND,
        status: 404,
        detail: `Icon for eye ${eyeName} not found`,
      });
    }

    return createSuccessResponse(c, {
      iconSvg: eye.iconSvg,
    });
  } catch (error) {
    return createInternalErrorResponse(
      c,
      `Failed to fetch eye icon: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

/**
 * GET /eyes/:id - Get specific Eye by ID from unified database table
 * NO hardcoded checks, database is the only source of truth
 */
app.get("/:id", async (c) => {
  const eyeId = c.req.param("id");

  try {
    const { db } = getDb();

    const eye = await db.select().from(eyes).where(eq(eyes.id, eyeId)).get();

    if (!eye) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EYE_NOT_FOUND,
        code: ApiErrorCode.EYE_NOT_FOUND,
        status: 404,
        detail: `Eye ${eyeId} not found`,
      });
    }

    // Fetch blueprint for capabilities
    const blueprint = await db
      .select()
      .from(personaBlueprints)
      .where(eq(personaBlueprints.eyeId, eyeId))
      .get();

    return createSuccessResponse(c, {
      id: eye.id,
      name: eye.name,
      version: eye.version,
      description: eye.description,
      capabilities: blueprint
        ? JSON.parse(blueprint.capabilities as string)
        : [],
      inputSchema: eye.inputSchemaJson,
      outputSchema: eye.outputSchemaJson,
      personaId: eye.personaId,
      iconSvg: eye.iconSvg,
      createdAt: eye.createdAt,
    });
  } catch (error) {
    return createInternalErrorResponse(
      c,
      `Failed to fetch Eye: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

/**
 * GET /eyes/:id/personas - Get all persona versions for specific Eye
 */
app.get("/:id/personas", async (c) => {
  const eyeId = c.req.param("id");

  try {
    const { db } = getDb();
    const eyePersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.eyeId, eyeId))
      .orderBy(desc(personas.version))
      .all();

    const active = eyePersonas.find((p) => p.active);

    return createSuccessResponse(c, {
      eye: eyeId,
      versions: eyePersonas,
      activeVersion: active?.version || null,
    });
  } catch (error) {
    return createInternalErrorResponse(c, "Failed to fetch Eye personas");
  }
});

/**
 * PATCH /eyes/:id/name - Update Eye display name
 * SSOT: Updates eyes.description directly (database is single source of truth)
 */
app.patch("/:id/name", async (c) => {
  try {
    const eyeId = c.req.param("id");
    const body = await c.req.json();
    const { displayName } = body;

    if (
      !displayName ||
      typeof displayName !== "string" ||
      displayName.trim().length === 0
    ) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: "Display name is required",
      });
    }

    const { db } = getDb();

    // Check if Eye exists
    const existing = await db
      .select()
      .from(eyes)
      .where(eq(eyes.id, eyeId))
      .get();

    if (!existing) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EYE_NOT_FOUND,
        code: ApiErrorCode.EYE_NOT_FOUND,
        status: 404,
        detail: `Eye with id ${eyeId} not found`,
      });
    }

    // Update description field in eyes table (SSOT)
    await db
      .update(eyes)
      .set({
        description: displayName.trim(),
      })
      .where(eq(eyes.id, eyeId))
      .run();

    return createSuccessResponse(c, {
      eye: eyeId,
      displayName: displayName.trim(),
      message: "Eye display name updated successfully",
    });
  } catch (error) {
    console.error("[Eyes API] Failed to update Eye name:", error);
    return createInternalErrorResponse(c, "Failed to update Eye name");
  }
});

/**
 * POST /eyes/custom - Create new Eye
 * Unified endpoint - all eyes use same creation flow (seeded on first run, user-created after)
 */
app.post("/custom", async (c) => {
  try {
    const body = await c.req.json();
    const validatedBody = createCustomEyeSchema.parse(body);
    const {
      name,
      description,
      inputSchema,
      outputSchema,
      personaId,
      defaultRouting,
    } = validatedBody;
      console.log("[Eye] Creating with data:", {
        name,
        description,
        hasInputSchema: !!inputSchema,
        hasOutputSchema: !!outputSchema,
      });

      const { db } = getDb();

      // Check if Eye with this name already exists
      const existing = await db
        .select()
        .from(eyes)
        .where(eq(eyes.name, name))
        .orderBy(desc(eyes.version))
        .limit(1)
        .all();

      const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

      const id = nanoid();
      const now = new Date();

      // Deactivate previous versions
      if (existing.length > 0) {
        await db
          .update(eyes)
          .set({ active: false })
          .where(eq(eyes.name, name))
          .run();
      }

      // Insert new version
      await db
        .insert(eyes)
        .values({
          id,
          name,
          version: nextVersion,
          description,
          inputSchemaJson: inputSchema,
          outputSchemaJson: outputSchema,
          personaId: personaId || null,
          iconSvg: "",
          active: true,
          createdAt: now,
        })
        .run();

      // Auto-create routing entry if it doesn't exist
      const existingRouting = await db
        .select()
        .from(eyesRouting)
        .where(eq(eyesRouting.eyeId, id))
        .get();

      if (!existingRouting) {
        const defaultRoutingData = await getDefaultRouting();

        await db
          .insert(eyesRouting)
          .values({
            id: nanoid(),
            eyeId: id,
            primaryProvider: defaultRoutingData.primaryProvider,
            primaryModel: defaultRoutingData.primaryModel,
            fallbackProvider: defaultRoutingData.fallbackProvider,
            fallbackModel: defaultRoutingData.fallbackModel,
            createdAt: now,
          })
          .run();
        console.log(`[Eye] Auto-created routing for ${name}`);
      }

      // Auto-create persona blueprint if it doesn't exist
      const existingBlueprint = await db
        .select()
        .from(personaBlueprints)
        .where(eq(personaBlueprints.eyeId, id))
        .get();

      if (!existingBlueprint) {
        // Create minimal blueprint with basic structure
        const minimalBlueprint = {
          eyeId: id,
          name: name,
          description: description,
          version: String(nextVersion),
          capabilities: JSON.stringify([]), // Empty capabilities array - user can add later
          mission: `Mission for ${name}: ${description}`,
          phases: JSON.stringify({
            guidance: null,
            validation: null,
          }),
          envelopeContract: JSON.stringify({
            requiredKeys: ["tag", "ok", "code", "data", "ui", "next"],
            requiredDataKeys: [],
            requiredUiKeys: ["title", "summary", "details", "icon", "color"],
          }),
          reminders: JSON.stringify([]),
          notes: null,
          createdAt: now,
          updatedAt: now,
        };

        await db
          .insert(personaBlueprints)
          .values({
            id: nanoid(),
            ...minimalBlueprint,
          })
          .run();
        console.log(`[Eye] Auto-created persona blueprint for ${name}`);
      }

    console.log("[Eye] Successfully created:", {
      id,
      name,
      version: nextVersion,
    });
    return createSuccessResponse(
      c,
      { id, version: nextVersion, message: "Eye created successfully" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
      });
    }
    console.error("[Eye] Creation failed:", error);
    return createInternalErrorResponse(
      c,
      `Failed to create eye: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

/**
 * PUT /eyes/custom/:id - Update existing Eye
 * Unified endpoint - all eyes use same update flow
 */
app.put("/custom/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const body = await c.req.json();
    const validatedBody = createCustomEyeSchema.parse(body);
    const {
      name,
      description,
      inputSchema,
      outputSchema,
      personaId,
      defaultRouting,
    } = validatedBody;

    const { db } = getDb();

    // Check if Eye exists
    const existing = await db
      .select()
      .from(eyes)
      .where(eq(eyes.id, id))
      .limit(1)
      .all();

    if (existing.length === 0) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.EYE_NOT_FOUND,
        code: ApiErrorCode.EYE_NOT_FOUND,
        status: 404,
        detail: `Eye with id ${id} not found`,
      });
    }

    // Update the Eye
    await db
      .update(eyes)
      .set({
        description,
        inputSchemaJson: inputSchema,
        outputSchemaJson: outputSchema,
        personaId: personaId || null,
        iconSvg: "",
      })
      .where(eq(eyes.id, id))
      .run();

    return createSuccessResponse(c, {
      id,
      message: "Custom Eye updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.VALIDATION_ERROR,
        code: ApiErrorCode.VALIDATION_ERROR,
        status: 400,
        detail: error.issues.map((i) => i.message).join("; "),
      });
    }
    return createInternalErrorResponse(
      c,
      `Failed to update eye: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

/**
 * DELETE /eyes/custom/:id - Delete (deactivate) Eye
 * Unified endpoint - all eyes use same deletion flow
 */
app.delete("/custom/:id", async (c) => {
  const id = c.req.param("id");

  const { db } = getDb();

  const existing = await db
    .select()
    .from(eyes)
    .where(eq(eyes.id, id))
    .limit(1)
    .all();

  if (existing.length === 0) {
    return createErrorResponse(c, {
      title: ApiErrorTitle.EYE_NOT_FOUND,
        code: ApiErrorCode.EYE_NOT_FOUND,
      status: 404,
      detail: `Eye with id ${id} not found`,
    });
  }

  await db.update(eyes).set({ active: false }).where(eq(eyes.id, id)).run();

  return createSuccessResponse(c, { message: "Eye deleted successfully" });
});

/**
 * POST /eyes/custom/:id/test - Test an Eye with sample input
 * Unified endpoint - all eyes use same test flow
 */
app.post("/custom/:id/test", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const testInput = body.input || body.testInput;

  if (!testInput) {
    return createErrorResponse(c, {
      title: ApiErrorTitle.MISSING_INPUT,
        code: ApiErrorCode.MISSING_INPUT,
      status: 400,
      detail: "testInput field is required",
    });
  }

  const { db } = getDb();

  const eye = await db
    .select()
    .from(eyes)
    .where(eq(eyes.id, id))
    .limit(1)
    .all();

  if (eye.length === 0) {
    return createErrorResponse(c, {
      title: ApiErrorTitle.EYE_NOT_FOUND,
        code: ApiErrorCode.EYE_NOT_FOUND,
      status: 404,
      detail: `Eye with id ${id} not found`,
    });
  }

  const eyeData = eye[0];
  const sessionId = nanoid();

  try {
    const response = await orchestrator.runEye(
      eyeData.name,
      testInput,
      sessionId,
    );
    return createSuccessResponse(c, {
      eyeName: eyeData.name,
      testInput,
      response,
    });
  } catch (error) {
    return createInternalErrorResponse(
      c,
      `Test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
});

export default app;
