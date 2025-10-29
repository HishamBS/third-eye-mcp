import { db, personaBlueprints } from '@third-eye/db';
import { BLUEPRINT_REGISTRY } from './index';
import type { NewPersonaBlueprint } from '@third-eye/db/schema';

/**
 * Seed persona blueprints from TypeScript registry to database
 * This is called on first run to populate the database
 */
export async function seedBlueprintsFromRegistry() {
  const { getDb } = await import('@third-eye/db');
  const { db } = getDb();
  
  const now = new Date();

  for (const [eyeId, blueprint] of Object.entries(BLUEPRINT_REGISTRY)) {
    try {
      const newBlueprint: NewPersonaBlueprint = {
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
      };

      // Insert or update
      await db
        .insert(personaBlueprints)
        .values(newBlueprint)
        .onConflictDoUpdate({
          target: personaBlueprints.eyeId,
          set: {
            name: newBlueprint.name,
            description: newBlueprint.description,
            version: newBlueprint.version,
            capabilities: newBlueprint.capabilities,
            mission: newBlueprint.mission,
            phases: newBlueprint.phases,
            envelopeContract: newBlueprint.envelopeContract,
            reminders: newBlueprint.reminders,
            notes: newBlueprint.notes,
            updatedAt: now,
          },
        });

      console.log(`✅ Seeded blueprint for ${eyeId}`);
    } catch (error) {
      console.error(`❌ Failed to seed blueprint for ${eyeId}:`, error);
    }
  }
}

export async function syncBlueprintsToCode() {
  const { getDb } = await import('@third-eye/db');
  const { db } = getDb();
  
  const blueprints = await db.select().from(personaBlueprints);
  
  // Generate TypeScript files from database
  const fs = await import('fs/promises');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputDir = path.resolve(__dirname, '../../generated/blueprints');
  
  await fs.mkdir(outputDir, { recursive: true });
  
  for (const blueprint of blueprints) {
    const tsContent = `// Auto-generated from database - DO NOT EDIT MANUALLY
// Edit via UI at /personas

export const ${blueprint.eyeId.toUpperCase()}_BLUEPRINT = ${JSON.stringify({
      metadata: {
        eyeId: blueprint.eyeId,
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        capabilities: JSON.parse(blueprint.capabilities),
      },
      mission: blueprint.mission,
      phases: JSON.parse(blueprint.phases),
      envelopeContract: JSON.parse(blueprint.envelopeContract),
      reminders: JSON.parse(blueprint.reminders || '[]'),
      notes: blueprint.notes || undefined,
    }, null, 2)};
`;
    
    await fs.writeFile(
      path.join(outputDir, `${blueprint.eyeId}.blueprint.ts`),
      tsContent
    );
  }
  
  console.log(`✅ Synced ${blueprints.length} blueprints to TypeScript files`);
}

