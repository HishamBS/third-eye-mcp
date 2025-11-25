import { getDb } from "../index";
import type { Database } from "bun:sqlite";
import {
  personas,
  eyes,
  pipelines,
  personaBlueprints,
  eyesRouting,
  strictnessProfiles,
  appSettings,
  mcpIntegrations,
  pipelineTemplates,
  type NewPersona,
  type NewEye,
  type NewPipeline,
  type NewPersonaBlueprint,
  type NewEyeRouting,
  type NewStrictnessProfile,
  type NewAppSetting,
  type NewMcpIntegration,
} from "../schema";
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP } from "./personas";
import { DEFAULT_INTEGRATIONS } from "./integrations";
import { DEFAULT_PIPELINES } from "./pipelines";
import { PREDEFINED_TEMPLATES } from "./templates";
import { STRICTNESS_PRESETS, type StrictnessPresetId } from "@third-eye/types";
import { DEFAULT_BLUEPRINTS } from "@third-eye/constants/blueprints-data";
import {
  DEFAULT_PRIMARY_PROVIDER,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_PROVIDER,
  DEFAULT_FALLBACK_MODEL,
} from "@third-eye/constants";
import { generateId } from "../utils/uuid";
import { SeedSubset } from "../constants";
import { readFileSync } from "fs";
import { join } from "path";

// Minimal type for workflow validation (avoids circular dependency with @third-eye/core)
interface WorkflowNode {
  id: string;
  type?: string;
  position?: { x: number; y: number };
}

interface WorkflowJson {
  nodes?: WorkflowNode[];
}

// Map eye names to UUIDs during seeding
// This will be populated by seedEyes and used by other seed functions
const EYE_NAME_TO_UUID_MAP = new Map<string, string>();

const DEFAULT_STRICTNESS: Array<Omit<NewStrictnessProfile, "createdAt">> = (
  Object.entries(STRICTNESS_PRESETS) as Array<
    [
      StrictnessPresetId,
      (typeof STRICTNESS_PRESETS)[keyof typeof STRICTNESS_PRESETS],
    ]
  >
).map(([_, preset]) => ({
  id: generateId(), // UUID
  name: preset.name,
  description: preset.description,
  ambiguityThreshold: preset.settings.ambiguityThreshold,
  citationCutoff: preset.settings.citationCutoff,
  consistencyTolerance: preset.settings.consistencyTolerance,
  mangekyoStrictness: preset.mangekyoLevel,
  isBuiltIn: true,
}));

export interface SeedDefaultsOptions {
  force?: boolean;
  subsets?: Partial<Record<SeedSubset, boolean>>;
  log?: (message: string) => void;
}

export interface SeedReport {
  [SeedSubset.EYES]: boolean;
  [SeedSubset.PERSONAS]: boolean;
  [SeedSubset.BLUEPRINTS]: boolean;
  [SeedSubset.PIPELINES]: boolean;
  [SeedSubset.ROUTING]: boolean;
  [SeedSubset.STRICTNESS]: boolean;
  [SeedSubset.APP_SETTINGS]: boolean;
  [SeedSubset.INTEGRATIONS]: boolean;
  [SeedSubset.TEMPLATES]: boolean;
}

function generatePersonaId(eyeName: string, version: number) {
  return `${eyeName}_v${version}`;
}

/**
 * Seed Eyes table from centralized blueprint data
 * All eyes are database rows (no hardcoded schemas)
 * V1: Uses UUID for all eye IDs
 */
async function seedEyes(
  db: ReturnType<typeof getDb>["db"],
  sqlite: Database,
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db.select({ id: eyes.id }).from(eyes).limit(1);
  const shouldSeed = force || existing.length === 0;

  if (!shouldSeed) {
    // Eyes already exist - populate map from database instead
    const allEyes = await db
      .select({ id: eyes.id, name: eyes.name })
      .from(eyes)
      .all();

    // Build reverse lookup: display name -> EyeId constant
    for (const eye of allEyes) {
      const matchingEyeId = Object.entries(DEFAULT_BLUEPRINTS as any).find(
        ([eyeId, blueprint]: [string, any]) =>
          blueprint.metadata.name === eye.name,
      );

      if (matchingEyeId) {
        const [eyeId] = matchingEyeId;
        EYE_NAME_TO_UUID_MAP.set(eyeId, eye.id);
      }
    }

    return false;
  }

  if (force) {
    await db.delete(eyes).run(); // Delete ALL eyes
    EYE_NAME_TO_UUID_MAP.clear();
  }

  let eyeEntries: NewEye[] = [];

  try {
    const now = new Date();
    // Construct path to SVG files (relative to workspace root)
    const svgBasePath = join(process.cwd(), "apps", "ui", "public", "eyes");

    // Validate DEFAULT_BLUEPRINTS exists and has entries
    if (!DEFAULT_BLUEPRINTS || typeof DEFAULT_BLUEPRINTS !== "object") {
      throw new Error("DEFAULT_BLUEPRINTS is not an object");
    }

    const blueprintKeys = Object.keys(DEFAULT_BLUEPRINTS);
    if (blueprintKeys.length === 0) {
      throw new Error("DEFAULT_BLUEPRINTS is empty - no blueprints to seed");
    }

    log(
      `  📋 Found ${blueprintKeys.length} blueprints: ${blueprintKeys.join(", ")}`,
    );

    eyeEntries = Object.entries(DEFAULT_BLUEPRINTS as any)
      .map(([eyeId, blueprint]: [string, any]) => {
        // Validate eyeId is not null/undefined
        if (!eyeId || typeof eyeId !== "string" || eyeId.trim() === "") {
          log(`  ✗ Invalid eyeId: ${eyeId} (type: ${typeof eyeId})`);
          throw new Error(
            `Invalid eyeId found in DEFAULT_BLUEPRINTS: ${eyeId}`,
          );
        }

        // Validate blueprint structure
        if (!blueprint || !blueprint.metadata || !blueprint.metadata.name) {
          log(`  ✗ Invalid blueprint structure for eyeId: ${eyeId}`);
          throw new Error(`Invalid blueprint structure for eyeId: ${eyeId}`);
        }

        const eyeUuid = generateId(); // Generate UUID
        EYE_NAME_TO_UUID_MAP.set(eyeId, eyeUuid);

        // Read SVG file content from public/eyes directory
        let iconSvg = "";
        try {
          const svgPath = join(svgBasePath, `${eyeId}.svg`);
          iconSvg = readFileSync(svgPath, "utf-8");
        } catch (error) {
          log(`  ⚠ Warning: Could not read SVG file for ${eyeId}: ${error}`);
          // Continue with empty SVG - will be handled by EyeIcon component placeholder
        }

        const entry: NewEye = {
          id: eyeUuid, // UUID instead of name
          name: blueprint.metadata.name, // Display name (e.g., 'Overseer', 'Jōgan')
          version: 1,
          description: blueprint.metadata.description || "",
          iconSvg: iconSvg || null, // Store full SVG content from file - database is SSOT
          inputSchemaJson: {},
          outputSchemaJson: {},
          personaId: null, // Will be set later if needed
          active: true,
          createdAt: now,
        };

        return entry;
      })
      .filter(
        (entry): entry is NewEye => entry !== null && entry !== undefined,
      );

    // Log entries before insertion
    log(`  📝 Prepared ${eyeEntries.length} eye entries for insertion`);
    eyeEntries.forEach((entry, idx) => {
      const entryLog = `${idx + 1}. ${entry.name} (id: ${entry.id})`;
      log(`    ${entryLog}`);
    });

    // Insert entries one by one to identify which one fails
    for (let i = 0; i < eyeEntries.length; i++) {
      const entry = eyeEntries[i];

      try {
        await db.insert(eyes).values([entry]).run();
        log(`  ✓ Inserted eye ${i + 1}/${eyeEntries.length}: ${entry.name}`);
      } catch (insertErr) {
        const errMsg =
          insertErr instanceof Error ? insertErr.message : String(insertErr);
        log(
          `  ✗ Failed to insert eye ${i + 1}/${eyeEntries.length}: ${entry.name}`,
        );
        log(`    Error: ${errMsg}`);
        log(`    Entry data: id=${entry.id}, name="${entry.name}"`);
        throw new Error(`Failed to insert eye ${entry.name}: ${errMsg}`);
      }
    }
    log(`  • Eyes seeded (${eyeEntries.length} eyes with UUIDs)`);

    // Verify map has all 8 entries before returning
    const expectedKeys = [
      "overseer",
      "sharingan",
      "kyuubi",
      "jogan",
      "rinnegan",
      "mangekyo",
      "tenseigan",
      "byakugan",
    ];
    const missingKeys = expectedKeys.filter(
      (id) => !EYE_NAME_TO_UUID_MAP.has(id),
    );
    if (missingKeys.length > 0) {
      const mapKeys = Array.from(EYE_NAME_TO_UUID_MAP.keys());
      const errorMsg = `EYE_NAME_TO_UUID_MAP is incomplete: missing ${missingKeys.join(", ")}. Map has ${mapKeys.length} entries: ${mapKeys.join(", ")}`;
      console.error(`[CRITICAL ERROR] ${errorMsg}`);
      throw new Error(errorMsg);
    }

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Always log to stderr for debugging
    console.error(`[ERROR] Failed to seed eyes: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(`[ERROR] Stack trace: ${error.stack}`);
    }
    // Also log entry details if available
    if (eyeEntries && eyeEntries.length > 0) {
      console.error(
        `[ERROR] First entry details:`,
        JSON.stringify(eyeEntries[0], null, 2),
      );
    }
    log(`  ✗ Failed to seed eyes: ${errorMessage}`);
    return false;
  }
}

/**
 * Seed Persona Blueprints from centralized blueprint data
 * Enables full persona editability through UI
 * V1: Uses UUID for blueprint IDs and references eye UUIDs
 */
async function seedBlueprints(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: personaBlueprints.id })
    .from(personaBlueprints)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(personaBlueprints).run(); // Delete ALL blueprints
  }

  try {
    const now = new Date();

    const blueprintEntries = Object.entries(DEFAULT_BLUEPRINTS as any)
      .map(([eyeId, blueprint]: [string, any]) => {
        const eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeId);

        if (!eyeUuid) {
          log(`  ⚠ Skipping blueprint for ${eyeId} - eye UUID not found`);
          return null;
        }

        const blueprintId = generateId();

        return {
          id: blueprintId,
          eyeId: eyeUuid,
          name: blueprint.metadata.name,
          description: blueprint.metadata.description,
          version: blueprint.metadata.version,
          capabilities: JSON.stringify(blueprint.metadata.capabilities),
          mission: blueprint.mission,
          phases: JSON.stringify(blueprint.phases),
          envelopeContract: JSON.stringify(blueprint.envelopeContract),
          reminders: JSON.stringify(blueprint.reminders || []),
          notes: blueprint.notes || null,
          createdAt: now,
          updatedAt: now,
        } as NewPersonaBlueprint;
      })
      .filter((entry): entry is NewPersonaBlueprint => entry !== null);

    await db.insert(personaBlueprints).values(blueprintEntries).run();
    log(
      `  • Blueprints seeded (${blueprintEntries.length} blueprints with UUIDs)`,
    );
    return true;
  } catch (error) {
    log(`  ✗ Failed to seed blueprints: ${error}`);
    return false;
  }
}

/**
 * Seed Personas from DEFAULT_PERSONAS with capabilities from blueprints
 * Personas are fully populated with structured data (not just placeholders)
 * V1: Uses UUID for persona IDs and references eye UUIDs
 */
async function seedPersonas(
  db: ReturnType<typeof getDb>["db"],
  sqlite: Database,
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db.select({ id: personas.id }).from(personas).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(personas).run(); // Delete ALL personas
  }

  try {
    const now = new Date();

    const resolvedEntries = DEFAULT_PERSONAS.map((persona) => {
      const eyeName = persona.eye;
      let eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeName);

      if (!eyeUuid) {
        const availableKeys = Array.from(EYE_NAME_TO_UUID_MAP.keys());
        log(`  ⚠ Skipping persona for ${eyeName} - eye UUID not found in map`);
        return null;
      }

      const blueprint = (DEFAULT_BLUEPRINTS as any)[persona.eye];

      return {
        id: generateId(),
        eyeId: eyeUuid,
        name: persona.name,
        version: persona.version,

        metadataJson: JSON.stringify({
          eyeId: eyeUuid,
          name: persona.name,
          description: persona.description,
          version: String(persona.version),
          capabilities: blueprint?.metadata.capabilities || [],
        }),

        mission: persona.mission,
        guidanceJson: blueprint?.phases.guidance
          ? JSON.stringify(blueprint.phases.guidance)
          : null,
        validationJson: blueprint?.phases.validation
          ? JSON.stringify(blueprint.phases.validation)
          : null,

        envelopeJson: JSON.stringify(
          blueprint?.envelopeContract || {
            requiredKeys: ["tag", "ok", "code", "data", "ui", "next"],
            requiredDataKeys: [],
            requiredUiKeys: ["title", "summary", "details", "icon", "color"],
          },
        ),

        remindersJson: JSON.stringify(blueprint?.reminders || []),
        notes: blueprint?.notes || null,

        llmConfigJson: JSON.stringify({
          temperature: 0.7,
          top_p: 0.9,
          response_format: "json_object",
          max_tokens: 4096,
        }),

        active: true,
        createdAt: now,
      } as NewPersona;
    });

    const entries = resolvedEntries.filter(
      (entry): entry is NewPersona => entry !== null,
    );

    log(
      `  ✓ Created ${entries.length} personas (expected ${DEFAULT_PERSONAS.length})`,
    );

    // Deduplicate personas by eyeId + version before inserting
    // This prevents multiple "Version 2 (active)" entries
    const uniqueEntries = entries.reduce((acc, entry) => {
      const key = `${entry.eyeId}-${entry.version}`;
      if (!acc.has(key)) {
        acc.set(key, entry);
      }
      return acc;
    }, new Map<string, NewPersona>());

    const deduplicatedEntries = Array.from(uniqueEntries.values());

    if (deduplicatedEntries.length < entries.length) {
      log(
        `  ⚠ Removed ${entries.length - deduplicatedEntries.length} duplicate persona entries`,
      );
    }

    await db.insert(personas).values(deduplicatedEntries).run();

    // Set active personas (by eyeId)
    for (const entry of deduplicatedEntries) {
      await db
        .update(personas)
        .set({ active: false })
        .where(eq(personas.eyeId, entry.eyeId))
        .run();
      await db
        .update(personas)
        .set({ active: true })
        .where(eq(personas.id, entry.id))
        .run();
    }

    log(`  • Personas seeded (${deduplicatedEntries.length} personas with UUIDs)`);
    return true;
  } catch (error) {
    log(`  ✗ Failed to seed personas: ${error}`);
    return false;
  }
}

/**
 * Seed routing configuration for all eyes
 * V1: Uses UUID for routing IDs and references eye UUIDs
 */
async function seedRouting(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: eyesRouting.id })
    .from(eyesRouting)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(eyesRouting).run();
  }

  const now = new Date();
  const routingEntries = DEFAULT_PERSONAS.map((persona) => {
    // persona.eye is already an EyeId constant (e.g., 'jogan', 'mangekyo') - use directly
    const eyeName = persona.eye;
    const eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeName);

    if (!eyeUuid) {
      log(`  ⚠ Skipping routing for ${eyeName} - eye UUID not found`);
      return null;
    }

    // System defaults for seeding (can be overridden by app_settings)
    // These are minimal defaults - actual runtime uses getDefaultRouting() helper
    // Per R01/R13: Import from SSOT, no hardcoded string literals
    return {
      id: generateId(),
      eyeId: eyeUuid,
      primaryProvider: DEFAULT_PRIMARY_PROVIDER,
      primaryModel: DEFAULT_PRIMARY_MODEL,
      fallbackProvider: DEFAULT_FALLBACK_PROVIDER,
      fallbackModel: DEFAULT_FALLBACK_MODEL,
      createdAt: now,
    } as NewEyeRouting;
  }).filter((entry): entry is NewEyeRouting => entry !== null);

  await db.insert(eyesRouting).values(routingEntries).run();

  log(`  • Routing seeded (${routingEntries.length} routes with UUIDs)`);
  return true;
}

async function seedStrictness(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: strictnessProfiles.id })
    .from(strictnessProfiles)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db
      .delete(strictnessProfiles)
      .where(
        inArray(
          strictnessProfiles.id,
          DEFAULT_STRICTNESS.map((profile) => profile.id),
        ),
      )
      .run();
  }

  const now = new Date();

  await db
    .insert(strictnessProfiles)
    .values(
      DEFAULT_STRICTNESS.map((profile) => ({ ...profile, createdAt: now })),
    )
    .run();

  log("  • Strictness profiles seeded");
  return true;
}

/**
 * Seed app settings
 * V1: Uses UUID for setting IDs
 */
async function seedAppSettings(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ key: appSettings.key })
    .from(appSettings)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db
      .delete(appSettings)
      .where(
        inArray(appSettings.key, [
          "theme",
          "auto_open_new_session",
          "telemetry_enabled",
        ]),
      )
      .run();
  }

  const now = new Date();
  const settingsWithUuid: NewAppSetting[] = [
    {
      id: generateId(),
      key: "theme",
      value: JSON.stringify({ name: "overseer", darkMode: true }),
      createdAt: now,
    },
    {
      id: generateId(),
      key: "auto_open_new_session",
      value: JSON.stringify(true),
      createdAt: now,
    },
    {
      id: generateId(),
      key: "telemetry_enabled",
      value: JSON.stringify(false),
      createdAt: now,
    },
  ];

  await db.insert(appSettings).values(settingsWithUuid).run();

  log("  • App settings seeded with UUIDs");
  return true;
}

async function seedIntegrations(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: mcpIntegrations.id })
    .from(mcpIntegrations)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db
      .delete(mcpIntegrations)
      .where(
        inArray(
          mcpIntegrations.slug,
          DEFAULT_INTEGRATIONS.map((integration) => integration.slug),
        ),
      )
      .run();
  }

  const now = new Date();

  for (const integration of DEFAULT_INTEGRATIONS) {
    const existing = await db
      .select({ id: mcpIntegrations.id })
      .from(mcpIntegrations)
      .where(eq(mcpIntegrations.slug, integration.slug))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(mcpIntegrations)
        .set({
          name: integration.name,
          logoUrl: integration.logoUrl,
          description: integration.description,
          status: integration.status,
          platforms: integration.platforms,
          configType: integration.configType,
          configFiles: integration.configFiles,
          configTemplate: integration.configTemplate,
          setupSteps: integration.setupSteps,
          docsUrl: integration.docsUrl,
          enabled: integration.enabled,
          displayOrder: integration.displayOrder,
          updatedAt: now,
        })
        .where(eq(mcpIntegrations.id, existing[0].id))
        .run();
      continue;
    }

    const newRecord: NewMcpIntegration = {
      id: generateId(),
      name: integration.name,
      slug: integration.slug,
      logoUrl: integration.logoUrl,
      description: integration.description,
      status: integration.status,
      platforms: integration.platforms,
      configType: integration.configType,
      configFiles: integration.configFiles,
      configTemplate: integration.configTemplate,
      setupSteps: integration.setupSteps,
      docsUrl: integration.docsUrl,
      enabled: integration.enabled ?? true,
      displayOrder: integration.displayOrder ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(mcpIntegrations).values(newRecord).run();
  }

  log("  • Integrations seeded");
  return true;
}

/**
 * Seed Default Pipelines from centralized pipelines data
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * V1: Pipelines already use UUIDs from DEFAULT_PIPELINES
 */
async function seedPipelines(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(pipelines).run(); // Delete ALL pipelines
  }

  const now = new Date();
  // DEFAULT_PIPELINES already includes UUIDs in their id fields
  // CRITICAL: Store workflowJson as-is without transformation
  // Position must be at top level of nodes, type must be 'eyeNode'
  // Explicitly stringify workflowJson to match pattern in seedPersonas (per R01: SSOT)
  const pipelineEntries: NewPipeline[] = DEFAULT_PIPELINES.map((pipeline) => {
    // Validate structure before storing
    const workflow = pipeline.workflowJson as WorkflowJson;
    if (workflow?.nodes) {
      for (const node of workflow.nodes) {
        if (
          !node.position ||
          typeof node.position.x !== "number" ||
          typeof node.position.y !== "number"
        ) {
          throw new Error(
            `Invalid node position in pipeline ${pipeline.id}: node ${node.id} missing or invalid position`,
          );
        }
        // Validate node type against all valid ReactFlow node types
        const VALID_NODE_TYPES = [
          "eyeNode",
          "switch",
          "switchNode",
          "if",
          "loop_over_items",
          "terminal",
          "terminalNode",
          "user_input",
          "userInputNode",
          "annotationNode",
        ] as const;

        if (!VALID_NODE_TYPES.includes(node.type as any)) {
          throw new Error(
            `Invalid node type in pipeline ${pipeline.id}: node ${node.id} has type ${node.type}, expected one of: ${VALID_NODE_TYPES.join(", ")}`,
          );
        }
      }
    }
    return {
      ...pipeline,
      // Drizzle's text({ mode: 'json' }) automatically handles JSON serialization
      // No manual stringify needed (was causing double-stringification bug)
      workflowJson: pipeline.workflowJson,
      active: true,
      createdAt: now,
    };
  });

  await db.insert(pipelines).values(pipelineEntries).run();
  log(`  • Pipelines seeded (${pipelineEntries.length} pipelines with UUIDs)`);
  return true;
}

/**
 * REPAIR_PLAN A7.2: Seed predefined pipeline templates
 * 5 built-in templates for common use cases
 */
async function seedTemplates(
  db: ReturnType<typeof getDb>["db"],
  log: (message: string) => void,
  force: boolean,
): Promise<boolean> {
  const existing = await db
    .select({ id: pipelineTemplates.id })
    .from(pipelineTemplates)
    .limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(pipelineTemplates).run(); // Delete ALL templates
  }

  await db.insert(pipelineTemplates).values(PREDEFINED_TEMPLATES).run();
  log(
    `  • Templates seeded (${PREDEFINED_TEMPLATES.length} predefined templates)`,
  );
  return true;
}

/**
 * Seed all defaults - complete data-driven initialization
 *
 * ORDER MATTERS:
 * 1. Eyes first (other entities reference eyes)
 * 2. Blueprints (persona details)
 * 3. Personas (full structured data)
 * 4. Pipelines (workflow configurations)
 * 5. Routing, strictness, settings, integrations
 */
export async function seedDefaults(
  options: SeedDefaultsOptions = {},
): Promise<SeedReport> {
  const { db, sqlite } = getDb();
  const log = options.log ?? ((message: string) => console.log(message));
  const force = options.force ?? false;

  const subsets = {
    [SeedSubset.EYES]: true,
    [SeedSubset.PERSONAS]: true,
    [SeedSubset.BLUEPRINTS]: true,
    [SeedSubset.PIPELINES]: true,
    [SeedSubset.ROUTING]: true,
    [SeedSubset.STRICTNESS]: true,
    [SeedSubset.APP_SETTINGS]: true,
    [SeedSubset.INTEGRATIONS]: true,
    [SeedSubset.TEMPLATES]: true,
    ...(options.subsets ?? {}),
  };

  const report: SeedReport = {
    [SeedSubset.EYES]: false,
    [SeedSubset.PERSONAS]: false,
    [SeedSubset.BLUEPRINTS]: false,
    [SeedSubset.PIPELINES]: false,
    [SeedSubset.ROUTING]: false,
    [SeedSubset.STRICTNESS]: false,
    [SeedSubset.APP_SETTINGS]: false,
    [SeedSubset.INTEGRATIONS]: false,
    [SeedSubset.TEMPLATES]: false,
  };

  // Wrap entire seeding in try/catch with proper error handling
  // CRITICAL FIX: Prevents partial seed failures from corrupting database state
  // Per R08: Error handling ensures consistent database state on failure
  // Note: SQLite BEGIN IMMEDIATE is used by seed functions internally where needed
  try {
    // Clear UUID map before seeding to prevent stale data
    if (force) {
      EYE_NAME_TO_UUID_MAP.clear();
    }

    // Seed in dependency order
    if (subsets[SeedSubset.EYES]) {
      report[SeedSubset.EYES] = await seedEyes(db, sqlite, log, force);
    }

    if (subsets[SeedSubset.BLUEPRINTS]) {
      report[SeedSubset.BLUEPRINTS] = await seedBlueprints(db, log, force);
    }

    if (subsets[SeedSubset.PERSONAS]) {
      report[SeedSubset.PERSONAS] = await seedPersonas(db, sqlite, log, force);
    }

    if (subsets[SeedSubset.PIPELINES]) {
      report[SeedSubset.PIPELINES] = await seedPipelines(db, log, force);
    }

    if (subsets[SeedSubset.ROUTING]) {
      report[SeedSubset.ROUTING] = await seedRouting(db, log, force);
    }

    if (subsets[SeedSubset.STRICTNESS]) {
      report[SeedSubset.STRICTNESS] = await seedStrictness(db, log, force);
    }

    if (subsets[SeedSubset.APP_SETTINGS]) {
      report[SeedSubset.APP_SETTINGS] = await seedAppSettings(db, log, force);
    }

    if (subsets[SeedSubset.INTEGRATIONS]) {
      report[SeedSubset.INTEGRATIONS] = await seedIntegrations(db, log, force);
    }

    if (subsets[SeedSubset.TEMPLATES]) {
      report[SeedSubset.TEMPLATES] = await seedTemplates(db, log, force);
    }

    return report;
  } catch (error) {
    // CRITICAL FIX: Clear UUID map on error to prevent corruption
    // Seed functions using SQLite transactions will auto-rollback on error
    EYE_NAME_TO_UUID_MAP.clear();
    log(`  ✗ Seed failed, rolling back and clearing UUID map: ${error}`);
    throw error; // Re-throw to propagate error
  }
}

export { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP, DEFAULT_INTEGRATIONS };
