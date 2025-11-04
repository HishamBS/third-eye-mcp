import { getDb } from '../index';
import {
  personas,
  eyes,
  pipelines,
  personaBlueprints,
  eyesRouting,
  strictnessProfiles,
  appSettings,
  mcpIntegrations,
  type NewPersona,
  type NewEye,
  type NewPipeline,
  type NewPersonaBlueprint,
  type NewEyeRouting,
  type NewStrictnessProfile,
  type NewAppSetting,
  type NewMcpIntegration,
} from '../schema';
import { eq, inArray } from 'drizzle-orm';
import type { Database } from 'bun:sqlite';
import { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP } from './personas';
import { DEFAULT_INTEGRATIONS } from './integrations';
import { DEFAULT_PIPELINES } from './pipelines';
import {
  STRICTNESS_PRESETS,
  type StrictnessPresetId,
} from '@third-eye/types';
import { DEFAULT_BLUEPRINTS } from '@third-eye/constants/blueprints-data';
import { generateId } from '../utils/uuid';

// Map eye names to UUIDs during seeding
// This will be populated by seedEyes and used by other seed functions
const EYE_NAME_TO_UUID_MAP = new Map<string, string>();

const DEFAULT_STRICTNESS: Array<Omit<NewStrictnessProfile, 'createdAt'>> = (
  Object.entries(STRICTNESS_PRESETS) as Array<[
    StrictnessPresetId,
    typeof STRICTNESS_PRESETS[keyof typeof STRICTNESS_PRESETS]
  ]>
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
  subsets?: Partial<Record<'eyes' | 'personas' | 'blueprints' | 'pipelines' | 'routing' | 'strictness' | 'appSettings' | 'integrations', boolean>>;
  log?: (message: string) => void;
}

export interface SeedReport {
  eyes: boolean;
  personas: boolean;
  blueprints: boolean;
  pipelines: boolean;
  routing: boolean;
  strictness: boolean;
  appSettings: boolean;
  integrations: boolean;
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
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: eyes.id }).from(eyes).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(eyes).run(); // Delete ALL eyes
    EYE_NAME_TO_UUID_MAP.clear();
  }

  try {
    const now = new Date();
    const eyeEntries: NewEye[] = Object.entries(DEFAULT_BLUEPRINTS as any).map(([_eyeName, blueprint]: [string, any]) => {
      const eyeUuid = generateId(); // Generate UUID
      const eyeName = blueprint.metadata.name.toLowerCase();
      EYE_NAME_TO_UUID_MAP.set(eyeName, eyeUuid); // Store mapping
      
      return {
        id: eyeUuid, // UUID instead of name
        name: blueprint.metadata.name,
        version: 1,
        description: blueprint.metadata.description,
        iconSvg: '',
        inputSchemaJson: {},
        outputSchemaJson: {},
        personaId: null, // Will be set later if needed
        active: true,
        createdAt: now,
      };
    });

    await db.insert(eyes).values(eyeEntries).run();
    log(`  • Eyes seeded (${eyeEntries.length} eyes with UUIDs)`);
    return true;
  } catch (error) {
    log(`  ✗ Failed to seed eyes: ${error}`);
    return false;
  }
}

/**
 * Seed Persona Blueprints from centralized blueprint data
 * Enables full persona editability through UI
 * V1: Uses UUID for blueprint IDs and references eye UUIDs
 */
async function seedBlueprints(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: personaBlueprints.id }).from(personaBlueprints).limit(1);
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
      .map(([_eyeName, blueprint]: [string, any]) => {
        const eyeName = blueprint.metadata.name.toLowerCase();
        const eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeName);
        
        if (!eyeUuid) {
          log(`  ⚠ Skipping blueprint for ${eyeName} - eye UUID not found`);
          return null;
        }

        return {
          id: generateId(),
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
    log(`  • Blueprints seeded (${blueprintEntries.length} blueprints with UUIDs)`);
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
  db: ReturnType<typeof getDb>['db'],
  sqlite: Database,
  log: (message: string) => void,
  force: boolean
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

    const entries = DEFAULT_PERSONAS
      .map((persona) => {
        const eyeName = persona.eye.toLowerCase();
        const eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeName);
        
        if (!eyeUuid) {
          log(`  ⚠ Skipping persona for ${eyeName} - eye UUID not found`);
          return null;
        }

        const blueprint = (DEFAULT_BLUEPRINTS as any)[persona.eye];
        
        return {
          id: generateId(),
          eyeId: eyeUuid,
          name: persona.name,
          version: persona.version,

          metadata_json: JSON.stringify({
            eyeId: eyeUuid,
            name: persona.name,
            description: persona.description,
            version: String(persona.version),
            capabilities: blueprint?.metadata.capabilities || [],
          }),

          mission: persona.mission,
          guidance_json: blueprint?.phases.guidance ? JSON.stringify(blueprint.phases.guidance) : null,
          validation_json: blueprint?.phases.validation ? JSON.stringify(blueprint.phases.validation) : null,

          envelope_json: JSON.stringify(blueprint?.envelopeContract || {
            requiredKeys: ['tag', 'ok', 'code', 'data', 'ui', 'next'],
            requiredDataKeys: [],
            requiredUiKeys: ['title', 'summary', 'details', 'icon', 'color'],
          }),

          reminders_json: JSON.stringify(blueprint?.reminders || []),
          notes: blueprint?.notes || null,

          llm_config_json: JSON.stringify({
            temperature: 0.7,
            top_p: 0.9,
            response_format: 'json_object',
            max_tokens: 4096,
          }),

          active: true,
          createdAt: now,
        } as NewPersona;
      })
      .filter((entry): entry is NewPersona => entry !== null);

    await db.insert(personas).values(entries).run();

    // Set active personas (by eyeId)
    for (const entry of entries) {
      await db.update(personas).set({ active: false }).where(eq(personas.eyeId, entry.eyeId)).run();
      await db.update(personas).set({ active: true }).where(eq(personas.id, entry.id)).run();
    }

    log(`  • Personas seeded (${entries.length} personas with UUIDs)`);
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
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: eyesRouting.id }).from(eyesRouting).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(eyesRouting).run();
  }

  const now = new Date();
  const routingEntries = DEFAULT_PERSONAS
    .map((persona) => {
      const eyeName = persona.eye.toLowerCase();
      const eyeUuid = EYE_NAME_TO_UUID_MAP.get(eyeName);
      
      if (!eyeUuid) {
        log(`  ⚠ Skipping routing for ${eyeName} - eye UUID not found`);
        return null;
      }

      return {
        id: generateId(),
        eyeId: eyeUuid,
        primaryProvider: 'groq',
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'openrouter',
        fallbackModel: 'anthropic/claude-3.5-sonnet',
        createdAt: now,
      } as NewEyeRouting;
    })
    .filter((entry): entry is NewEyeRouting => entry !== null);

  await db.insert(eyesRouting).values(routingEntries).run();

  log(`  • Routing seeded (${routingEntries.length} routes with UUIDs)`);
  return true;
}

async function seedStrictness(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: strictnessProfiles.id }).from(strictnessProfiles).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db
      .delete(strictnessProfiles)
      .where(inArray(strictnessProfiles.id, DEFAULT_STRICTNESS.map((profile) => profile.id)))
      .run();
  }

  const now = new Date();

  await db
    .insert(strictnessProfiles)
    .values(DEFAULT_STRICTNESS.map((profile) => ({ ...profile, createdAt: now })))
    .run();

  log('  • Strictness profiles seeded');
  return true;
}

/**
 * Seed app settings
 * V1: Uses UUID for setting IDs
 */
async function seedAppSettings(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ key: appSettings.key }).from(appSettings).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(appSettings).where(inArray(appSettings.key, ['theme', 'auto_open_new_session', 'telemetry_enabled'])).run();
  }

  const now = new Date();
  const settingsWithUuid: NewAppSetting[] = [
    { id: generateId(), key: 'theme', value: JSON.stringify({ name: 'overseer', darkMode: true }), createdAt: now },
    { id: generateId(), key: 'auto_open_new_session', value: JSON.stringify(true), createdAt: now },
    { id: generateId(), key: 'telemetry_enabled', value: JSON.stringify(false), createdAt: now },
  ];

  await db.insert(appSettings).values(settingsWithUuid).run();

  log('  • App settings seeded with UUIDs');
  return true;
}

async function seedIntegrations(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: mcpIntegrations.id }).from(mcpIntegrations).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db
      .delete(mcpIntegrations)
      .where(inArray(mcpIntegrations.slug, DEFAULT_INTEGRATIONS.map((integration) => integration.slug)))
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

  log('  • Integrations seeded');
  return true;
}

/**
 * Seed Default Pipelines from centralized pipelines data
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * V1: Pipelines already use UUIDs from DEFAULT_PIPELINES
 */
async function seedPipelines(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ id: pipelines.id }).from(pipelines).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(pipelines).run(); // Delete ALL pipelines
  }

  const now = new Date();
  // DEFAULT_PIPELINES already includes UUIDs in their id fields
  const pipelineEntries: NewPipeline[] = DEFAULT_PIPELINES.map((pipeline) => ({
    ...pipeline,
    active: true,
    createdAt: now,
  }));

  await db.insert(pipelines).values(pipelineEntries).run();
  log(`  • Pipelines seeded (${pipelineEntries.length} pipelines with UUIDs)`);
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
export async function seedDefaults(options: SeedDefaultsOptions = {}): Promise<SeedReport> {
  const { db, sqlite } = getDb();
  const log = options.log ?? ((message: string) => console.log(message));
  const force = options.force ?? false;
  
  
  const subsets = {
    eyes: true,
    personas: true,
    blueprints: true,
    pipelines: true,
    routing: true,
    strictness: true,
    appSettings: true,
    integrations: true,
    ...(options.subsets ?? {}),
  };

  const report: SeedReport = {
    eyes: false,
    personas: false,
    blueprints: false,
    pipelines: false,
    routing: false,
    strictness: false,
    appSettings: false,
    integrations: false,
  };

  // Seed in dependency order
  if (subsets.eyes) {
    report.eyes = await seedEyes(db, log, force);
  }

  if (subsets.blueprints) {
    report.blueprints = await seedBlueprints(db, log, force);
  }

  if (subsets.personas) {
    report.personas = await seedPersonas(db, sqlite, log, force);
  }

  if (subsets.pipelines) {
    report.pipelines = await seedPipelines(db, log, force);
  }

  if (subsets.routing) {
    report.routing = await seedRouting(db, log, force);
  }

  if (subsets.strictness) {
    report.strictness = await seedStrictness(db, log, force);
  }

  if (subsets.appSettings) {
    report.appSettings = await seedAppSettings(db, log, force);
  }

  if (subsets.integrations) {
    report.integrations = await seedIntegrations(db, log, force);
  }

  return report;
}

export { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP, DEFAULT_INTEGRATIONS };
