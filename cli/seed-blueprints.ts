/**
 * CLI Blueprint Seeding
 * 
 * Seeds persona blueprints into the database from the TypeScript registry.
 * Can be called from CLI without cross-package TypeScript compilation issues.
 */

export async function seedBlueprintsCLI(): Promise<boolean> {
  try {
    // Dynamic imports avoid TypeScript compilation issues
    const [{ getDb }, { personaBlueprints }, { count }, { BLUEPRINT_REGISTRY }] = await Promise.all([
      import('@third-eye/db'),
      import('@third-eye/db/schema'),
      import('drizzle-orm'),
      import('@third-eye/eyes'),
    ]);

    const { db } = getDb();

    // Check if blueprints already exist
    const existingCount = await db
      .select({ value: count() })
      .from(personaBlueprints)
      .limit(1);

    if (existingCount[0]?.value && existingCount[0].value > 0) {
      return false; // Already seeded
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
      }
    }

    return seeded > 0;
  } catch (error) {
    console.error(`   ✗ Failed to seed blueprints: ${error}`);
    return false;
  }
}

