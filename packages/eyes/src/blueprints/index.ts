/**
 * Blueprint Index
 *
 * Exports centralized blueprint data from single source of truth
 * Database is SSOT - no fallback to hardcoded defaults at runtime
 * DEFAULT_BLUEPRINTS is only used during seeding
 */

export * from "./data";

// Re-export for backwards compatibility (seeding only)
import type { PersonaBlueprint } from "@third-eye/constants/blueprints-data";
import { getPersonaBlueprint as getPersonaBlueprintFromDefaults } from "./data";

/**
 * Load persona blueprint from database (SSOT)
 * Database is the single source of truth - no fallback to hardcoded defaults
 */
export async function loadPersonaBlueprintFromDb(
  eyeId: string,
): Promise<PersonaBlueprint | null> {
  try {
    // Dynamic imports to avoid circular dependency during build
    // Using string concatenation to make import path opaque to TypeScript
    const dbModule = await import(("@third-eye/" + "db") as any);
    const schemaModule = await import(("@third-eye/" + "db/schema") as any);
    const ormModule = await import("drizzle-orm");
    const { getDb } = dbModule;
    const { personaBlueprints, eyes } = schemaModule;
    const { eq } = ormModule;

    const { db } = getDb();

    // Join with eyes table to get the slug (SSOT for eye identification)
    const result = await db
      .select({
        blueprint: personaBlueprints,
        eyeSlug: eyes.slug,
      })
      .from(personaBlueprints)
      .innerJoin(eyes, eq(personaBlueprints.eyeId, eyes.id))
      .where(eq(personaBlueprints.eyeId, eyeId))
      .get();

    if (!result) {
      return null;
    }

    const { blueprint, eyeSlug } = result;

    if (!blueprint) {
      return null;
    }

    // Reconstruct PersonaBlueprint from database fields
    const phases: PersonaBlueprint["phases"] = {};

    // Parse phases from JSON
    let phasesData: Record<string, unknown> = {};
    if (typeof blueprint.phases === "string") {
      try {
        phasesData = JSON.parse(blueprint.phases);
      } catch (e) {
        console.error(
          `[BlueprintLoader] Failed to parse phases for ${eyeId}:`,
          e,
        );
      }
    } else if (
      typeof blueprint.phases === "object" &&
      blueprint.phases !== null
    ) {
      phasesData = blueprint.phases as Record<string, unknown>;
    }

    if (phasesData.guidance) {
      (phases as any).guidance =
        phasesData.guidance as PersonaBlueprint["phases"]["guidance"];
    }
    if (phasesData.validation) {
      (phases as any).validation =
        phasesData.validation as PersonaBlueprint["phases"]["validation"];
    }

    // Parse capabilities
    let capabilities: string[] = [];
    if (typeof blueprint.capabilities === "string") {
      try {
        capabilities = JSON.parse(blueprint.capabilities);
      } catch (e) {
        console.error(
          `[BlueprintLoader] Failed to parse capabilities for ${eyeId}:`,
          e,
        );
      }
    } else if (Array.isArray(blueprint.capabilities)) {
      capabilities = blueprint.capabilities;
    }

    // Parse envelope contract
    let envelopeContract: PersonaBlueprint["envelopeContract"] = {
      requiredKeys: [],
      requiredDataKeys: [],
      requiredUiKeys: [],
    };
    if (typeof blueprint.envelopeContract === "string") {
      try {
        envelopeContract = JSON.parse(blueprint.envelopeContract);
      } catch (e) {
        console.error(
          `[BlueprintLoader] Failed to parse envelope contract for ${eyeId}:`,
          e,
        );
      }
    } else if (
      typeof blueprint.envelopeContract === "object" &&
      blueprint.envelopeContract !== null
    ) {
      envelopeContract =
        blueprint.envelopeContract as PersonaBlueprint["envelopeContract"];
    }

    // Parse reminders
    let reminders: string[] = [];
    if (blueprint.reminders) {
      if (typeof blueprint.reminders === "string") {
        try {
          reminders = JSON.parse(blueprint.reminders);
        } catch (e) {
          console.error(
            `[BlueprintLoader] Failed to parse reminders for ${eyeId}:`,
            e,
          );
        }
      } else if (Array.isArray(blueprint.reminders)) {
        reminders = blueprint.reminders;
      }
    }

    const personaBlueprint: PersonaBlueprint = {
      metadata: {
        eyeId: eyeSlug as any, // Slug is SSOT for eye identification (e.g., 'overseer', 'sharingan')
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        capabilities: capabilities as any, // Type assertion needed
      },
      mission: blueprint.mission,
      phases,
      envelopeContract,
      reminders,
      notes: blueprint.notes || undefined,
    };

    return personaBlueprint;
  } catch (error) {
    console.error(
      `[BlueprintLoader] Failed to load blueprint from database for ${eyeId}:`,
      error,
    );
    return null;
  }
}

/**
 * Get persona blueprint - queries database only (SSOT)
 * This is the main function used by orchestrator and other components
 *
 * Per SSOT: No fallback to hardcoded defaults. Database is the single source of truth.
 * If blueprint not found, returns null. Seeding should happen before runtime.
 */
export async function getPersonaBlueprint(
  eyeId: string,
): Promise<PersonaBlueprint | null> {
  // Database is SSOT - no fallback
  return await loadPersonaBlueprintFromDb(eyeId);
}

/**
 * Synchronous version for backwards compatibility (seeding only)
 * Only reads from DEFAULT_BLUEPRINTS (used during seeding, not at runtime)
 *
 * WARNING: This function should only be used during database seeding.
 * For runtime, use getPersonaBlueprint() which queries the database.
 */
export function getPersonaBlueprintSync(
  eyeId: string,
): PersonaBlueprint | null {
  // Only used during seeding - database is SSOT for runtime
  return getPersonaBlueprintFromDefaults(eyeId);
}
