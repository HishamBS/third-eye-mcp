#!/usr/bin/env bun

/**
 * Database Seeding Script
 *
 * Seeds the database with:
 * - Default personas for all Eyes (from registry)
 * - Default routing configurations
 * - Sample API keys (if provided via env)
 */

import { getDb } from '../packages/db';
import { personas, eyesRouting, appSettings, strictnessProfiles } from '../packages/db';
import { ALL_EYES, getAllEyeNames } from '../packages/eyes';
import { eq, and } from 'drizzle-orm';

/**
 * Generate a persona ID from eye name and version
 * Format: {eyeName}_v{version}
 * This creates a stable, predictable ID for each persona version
 */
function generatePersonaId(eyeName: string, version: number): string {
  return `${eyeName}_v${version}`;
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const { db } = getDb();

  // 1. Seed Personas from ALL_EYES
  console.log('📝 Seeding personas from ALL_EYES...');
  const eyeNames = getAllEyeNames();

  for (const eyeName of eyeNames) {
    const eye = ALL_EYES[eyeName];

    // Check if persona already exists
    const existing = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eyeName), eq(personas.active, true)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${eyeName}: Active persona already exists (version ${existing[0].version})`);
      continue;
    }

    // Create version 1 using Eye's getPersona() method
    await db.insert(personas).values({
      id: generatePersonaId(eyeName, 1),
      eye: eyeName,
      version: 1,
      content: eye.getPersona(),
      active: true,
      createdAt: new Date(),
    });

    console.log(`  ✅ ${eyeName}: Created version 1 (active) from Eye class`);
  }

  // 2. Seed Routing Configurations
  console.log('\n🔀 Seeding default routing configurations...');

  // Default routing: Groq (fast) primary, OpenRouter (Claude) fallback
  const defaultRouting = {
    primaryProvider: 'groq',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackProvider: 'openrouter',
    fallbackModel: 'anthropic/claude-3.5-sonnet',
  };

  for (const eyeName of eyeNames) {
    const existingRouting = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eyeName))
      .limit(1);

    if (existingRouting.length > 0) {
      console.log(`  ✓ ${eyeName}: Routing already configured (${existingRouting[0].primaryProvider}/${existingRouting[0].primaryModel})`);
      continue;
    }

    await db.insert(eyesRouting).values({
      eye: eyeName,
      primaryProvider: defaultRouting.primaryProvider,
      primaryModel: defaultRouting.primaryModel,
      fallbackProvider: defaultRouting.fallbackProvider,
      fallbackModel: defaultRouting.fallbackModel,
    });

    console.log(`  ✅ ${eyeName}: Created routing (${defaultRouting.primaryProvider}/${defaultRouting.primaryModel})`);
  }

  // 3. Seed Strictness Profiles
  console.log('\n⚖️  Seeding strictness profiles...');

  const builtInProfiles = [
    {
      id: 'casual',
      name: 'Casual',
      description: 'Relaxed validation for quick iterations',
      ambiguityThreshold: 50, // Allow more ambiguity (sharingan)
      citationCutoff: 60, // Lower evidence requirement (tenseigan)
      consistencyTolerance: 80, // More forgiving consistency checks (byakugan)
      mangekyoStrictness: 'lenient',
      isBuiltIn: true,
      createdAt: new Date(),
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Balanced validation for production work',
      ambiguityThreshold: 30, // Standard ambiguity detection
      citationCutoff: 70, // Standard evidence requirement
      consistencyTolerance: 85, // Standard consistency checks
      mangekyoStrictness: 'standard',
      isBuiltIn: true,
      createdAt: new Date(),
    },
    {
      id: 'security',
      name: 'Security',
      description: 'Strict validation for high-assurance systems',
      ambiguityThreshold: 10, // Very sensitive to ambiguity
      citationCutoff: 95, // High evidence requirement
      consistencyTolerance: 95, // Strict consistency checks
      mangekyoStrictness: 'strict',
      isBuiltIn: true,
      createdAt: new Date(),
    },
  ];

  for (const profile of builtInProfiles) {
    const existing = await db
      .select()
      .from(strictnessProfiles)
      .where(eq(strictnessProfiles.name, profile.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${profile.name}: Already exists`);
      continue;
    }

    await db.insert(strictnessProfiles).values(profile);
    console.log(`  ✅ ${profile.name}: Created (mangekyo: ${profile.mangekyoStrictness})`);
  }

  // 4. Seed App Settings
  console.log('\n⚙️  Seeding app settings...');

  const defaultSettings = [
    { key: 'theme', value: JSON.stringify({ name: 'overseer', darkMode: true }) },
    { key: 'auto_open_new_session', value: JSON.stringify(true) },
    { key: 'telemetry_enabled', value: JSON.stringify(false) },
  ];

  for (const setting of defaultSettings) {
    const existing = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, setting.key))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${setting.key}: Already set`);
      continue;
    }

    await db.insert(appSettings).values(setting);
    console.log(`  ✅ ${setting.key}: Set to ${setting.value}`);
  }

  console.log('\n✨ Database seeding complete!\n');
  console.log('Summary:');
  console.log(`  - ${eyeNames.length} Eyes configured with personas (from ALL_EYES)`);
  console.log(`  - ${eyeNames.length} default routing configurations`);
  console.log(`  - ${builtInProfiles.length} strictness profiles (Casual, Enterprise, Security)`);
  console.log(`  - ${defaultSettings.length} app settings initialized`);
  console.log('\n💡 Run "bun run apps/server/src/start.ts" to start the server');
}

// Run seeding
if (import.meta.main) {
  seedDatabase()
    .then(() => {
      console.log('\n🎉 Seeding successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
