import { getDb } from '../index';
import {
  personas,
  eyesRouting,
  strictnessProfiles,
  appSettings,
  mcpIntegrations,
  type NewPersona,
  type NewEyeRouting,
  type NewStrictnessProfile,
  type NewAppSetting,
  type NewMcpIntegration,
} from '../schema';
import { eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Database } from 'bun:sqlite';
import { DEFAULT_PERSONAS, DEFAULT_PERSONA_MAP } from './personas';
import { DEFAULT_INTEGRATIONS } from './integrations';
import {
  STRICTNESS_PRESETS,
  type StrictnessPresetId,
} from '@third-eye/types';

const DEFAULT_ROUTING: NewEyeRouting[] = DEFAULT_PERSONAS.map((persona) => ({
  eye: persona.eye,
  primaryProvider: 'groq',
  primaryModel: 'llama-3.3-70b-versatile',
  fallbackProvider: 'openrouter',
  fallbackModel: 'anthropic/claude-3.5-sonnet',
}));

const DEFAULT_STRICTNESS: Array<Omit<NewStrictnessProfile, 'createdAt'>> = (
  Object.entries(STRICTNESS_PRESETS) as Array<[
    StrictnessPresetId,
    typeof STRICTNESS_PRESETS[keyof typeof STRICTNESS_PRESETS]
  ]>
).map(([id, preset]) => ({
  id,
  name: preset.name,
  description: preset.description,
  ambiguityThreshold: preset.settings.ambiguityThreshold,
  citationCutoff: preset.settings.citationCutoff,
  consistencyTolerance: preset.settings.consistencyTolerance,
  mangekyoStrictness: preset.mangekyoLevel,
  isBuiltIn: true,
}));

const DEFAULT_APP_SETTINGS: NewAppSetting[] = [
  { key: 'theme', value: JSON.stringify({ name: 'overseer', darkMode: true }) },
  { key: 'auto_open_new_session', value: JSON.stringify(true) },
  { key: 'telemetry_enabled', value: JSON.stringify(false) },
];

export interface SeedDefaultsOptions {
  force?: boolean;
  subsets?: Partial<Record<'personas' | 'routing' | 'strictness' | 'appSettings' | 'integrations', boolean>>;
  log?: (message: string) => void;
}

export interface SeedReport {
  personas: boolean;
  routing: boolean;
  strictness: boolean;
  appSettings: boolean;
  integrations: boolean;
}

function generatePersonaId(eyeName: string, version: number) {
  return `${eyeName}_v${version}`;
}

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

  const tableInfo = sqlite.query('PRAGMA table_info(personas)').all() as Array<{ name: string }>;
  const hasNameColumn = tableInfo.some((column) => column.name === 'name');
  if (!hasNameColumn) {
    sqlite.exec('ALTER TABLE personas ADD COLUMN name TEXT');
  }

  if (force) {
    await db.delete(personas).where(inArray(personas.eye, DEFAULT_PERSONAS.map((p) => p.eye))).run();
  }

  const now = new Date();
  const entries: NewPersona[] = DEFAULT_PERSONAS.map((persona) => ({
    id: generatePersonaId(persona.eye, persona.version),
    eye: persona.eye,
    name: persona.name,
    version: persona.version,
    content: persona.content,
    active: true,
    createdAt: now,
  }));

  await db.insert(personas).values(entries).run();

  // Ensure defaults are the active versions for each eye
  for (const persona of DEFAULT_PERSONAS) {
    const personaId = generatePersonaId(persona.eye, persona.version);
    await db.update(personas).set({ active: false }).where(eq(personas.eye, persona.eye)).run();
    await db.update(personas).set({ active: true }).where(eq(personas.id, personaId)).run();
  }

  log('  • Personas seeded');
  return true;
}

async function seedRouting(
  db: ReturnType<typeof getDb>['db'],
  log: (message: string) => void,
  force: boolean
): Promise<boolean> {
  const existing = await db.select({ eye: eyesRouting.eye }).from(eyesRouting).limit(1);
  const shouldSeed = force || existing.length === 0;
  if (!shouldSeed) {
    return false;
  }

  if (force) {
    await db.delete(eyesRouting).where(inArray(eyesRouting.eye, DEFAULT_ROUTING.map((r) => r.eye))).run();
  }

  await db.insert(eyesRouting).values(DEFAULT_ROUTING).run();

  log('  • Routing seeded');
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
    await db.delete(appSettings).where(inArray(appSettings.key, DEFAULT_APP_SETTINGS.map((setting) => setting.key))).run();
  }

  await db.insert(appSettings).values(DEFAULT_APP_SETTINGS).run();

  log('  • App settings seeded');
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
      .where(inArray(mcpIntegrations.slug as any, DEFAULT_INTEGRATIONS.map((integration) => integration.slug)))
      .run();
  }

  const now = new Date();

  for (const integration of DEFAULT_INTEGRATIONS) {
    const existing = await db
      .select({ id: mcpIntegrations.id })
      .from(mcpIntegrations)
      .where(eq(mcpIntegrations.slug as any, integration.slug))
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
      id: nanoid(),
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

export async function seedDefaults(options: SeedDefaultsOptions = {}): Promise<SeedReport> {
  const { db, sqlite } = getDb();
  const log = options.log ?? ((message: string) => console.log(message));
  const force = options.force ?? false;
  const subsets = {
    personas: true,
    routing: true,
    strictness: true,
    appSettings: true,
    integrations: true,
    ...(options.subsets ?? {}),
  };

  const report: SeedReport = {
    personas: false,
    routing: false,
    strictness: false,
    appSettings: false,
    integrations: false,
  };

  if (subsets.personas) {
    report.personas = await seedPersonas(db, sqlite, log, force);
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
