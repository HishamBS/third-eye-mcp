/**
 * Blueprint Seeding Utility
 * 
 * Seeds persona blueprints into the database from the TypeScript registry.
 * This is separate from packages/db/defaults to avoid cross-package TypeScript import issues.
 */

import { getDb } from '@third-eye/db';
import { personaBlueprints } from '@third-eye/db/schema';
import { BLUEPRINT_REGISTRY } from '@third-eye/eyes';
import { count } from 'drizzle-orm';

export async function seedBlueprints(force = false): Promise<boolean> {
  const { db } = getDb();
  
  try {
    // Check if blueprints already exist
    const existingCount = await db
      .select({ value: count() })
      .from(personaBlueprints)
      .limit(1);
    
    if (existingCount[0]?.value && existingCount[0].value > 0 && !force) {
      console.log('   ✓ Blueprints already seeded');
      return false;
    }

    // Seed from TypeScript registry
    const now = new Date();
    let seeded = 0;
    
    for (const [eyeId, blueprint] of Object.entries(BLUEPRINT_REGISTRY)) {
      try {
        await db
          .insert(personaBlueprints)
          .values({
            eyeId,
            name: blueprint.metadata.name,
            description: blueprint.metadata.description,
            version: blueprint.metadata.version,
            capabilities: JSON.stringify(blueprint.metadata.capabilities),
            mission: blueprint.mission,
            phases: JSON.stringify(blueprint.phases),
            envelopeContract: JSON.stringify(blueprint.envelopeContract),
            reminders: JSON.stringify(blueprint.reminders),
            notes: blueprint.notes || null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
        
        seeded++;
      } catch (error) {
        // Ignore duplicates
        console.debug(`Skip duplicate blueprint: ${eyeId}`);
      }
    }
    
    console.log(`   ✓ Seeded ${seeded} blueprints`);
    return true;
  } catch (error) {
    console.error(`   ✗ Failed to seed blueprints: ${error}`);
    return false;
  }
}

