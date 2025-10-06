#!/usr/bin/env bun
import { getDb } from '@third-eye/db';
import { personas } from '@third-eye/db';
import { ALL_EYES } from '@third-eye/eyes';

const { db } = getDb();

console.log('🎭 Seeding Eye personas...\n');

const eyeNames = Object.keys(ALL_EYES);
let seeded = 0;

for (const eyeName of eyeNames) {
  const eye = ALL_EYES[eyeName as keyof typeof ALL_EYES];

  try {
    const persona = eye.getPersona();

    await db.insert(personas).values({
      eye: eyeName,
      version: 1,
      content: persona,
      active: true,
      createdAt: new Date(),
    });

    console.log(`✅ ${eyeName}: Seeded persona (${persona.length} chars)`);
    seeded++;
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      console.log(`⏭️  ${eyeName}: Already exists, skipping`);
    } else {
      console.error(`❌ ${eyeName}: Error - ${error.message}`);
    }
  }
}

console.log(`\n✨ Seeded ${seeded} Eye personas!`);
