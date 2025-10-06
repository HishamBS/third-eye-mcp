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
import { EYES_REGISTRY, getRegisteredEyes, getDefaultRouting } from '../packages/core';
import { eq, and } from 'drizzle-orm';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...\n');

  const { db } = getDb();

  // 1. Seed Personas from Registry
  console.log('📝 Seeding personas from registry...');
  const eyes = getRegisteredEyes();

  for (const eye of eyes) {
    const eyeTool = EYES_REGISTRY[eye];

    // Check if persona already exists
    const existing = await db
      .select()
      .from(personas)
      .where(and(eq(personas.eye, eye), eq(personas.active, true)))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ✓ ${eye}: Active persona already exists (version ${existing[0].version})`);
      continue;
    }

    // Create version 1 with default template
    await db.insert(personas).values({
      eye,
      version: 1,
      content: eyeTool.personaTemplate,
      active: true,
      createdAt: new Date(),
    });

    console.log(`  ✅ ${eye}: Created version 1 (active) from template`);
  }

  // 2. Seed Routing Configurations
  console.log('\n🔀 Seeding default routing configurations...');

  for (const eye of eyes) {
    const existingRouting = await db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eye))
      .limit(1);

    if (existingRouting.length > 0) {
      console.log(`  ✓ ${eye}: Routing already configured (${existingRouting[0].primaryProvider}/${existingRouting[0].primaryModel})`);
      continue;
    }

    const defaults = getDefaultRouting(eye);
    if (!defaults) {
      console.log(`  ⚠️  ${eye}: No default routing defined in registry`);
      continue;
    }

    await db.insert(eyesRouting).values({
      eye,
      primaryProvider: defaults.primaryProvider,
      primaryModel: defaults.primaryModel,
      fallbackProvider: defaults.fallbackProvider || null,
      fallbackModel: defaults.fallbackModel || null,
    });

    console.log(`  ✅ ${eye}: Created routing (${defaults.primaryProvider}/${defaults.primaryModel})`);
    if (defaults.fallbackProvider) {
      console.log(`      Fallback: ${defaults.fallbackProvider}/${defaults.fallbackModel}`);
    }
  }

  // 3. Seed Strictness Profiles
  console.log('\n⚖️  Seeding strictness profiles...');

  const builtInProfiles = [
    {
      name: 'Casual',
      sharinganMinScore: 50,
      rinneganRequireTests: false,
      tenseiganMinConfidence: 0.6,
      byakuganAllowPartial: true,
      mangekyoStrictness: 'lenient',
      joganRequireEvidence: false,
      overseerMinApprovals: 3,
      custom: false,
      createdAt: new Date(),
    },
    {
      name: 'Enterprise',
      sharinganMinScore: 30,
      rinneganRequireTests: true,
      tenseiganMinConfidence: 0.8,
      byakuganAllowPartial: false,
      mangekyoStrictness: 'standard',
      joganRequireEvidence: true,
      overseerMinApprovals: 5,
      custom: false,
      createdAt: new Date(),
    },
    {
      name: 'Security',
      sharinganMinScore: 10,
      rinneganRequireTests: true,
      tenseiganMinConfidence: 0.95,
      byakuganAllowPartial: false,
      mangekyoStrictness: 'strict',
      joganRequireEvidence: true,
      overseerMinApprovals: 6,
      custom: false,
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
  console.log(`  - ${eyes.length} Eyes configured with personas`);
  console.log(`  - ${eyes.length} default routing configurations`);
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
