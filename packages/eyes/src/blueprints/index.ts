/**
 * Blueprint Index
 * 
 * Exports centralized blueprint data from single source of truth
 * Database is SSOT - queries database first, falls back to hardcoded defaults only if not found
 */

export * from './data';

// Re-export for backwards compatibility
import { DEFAULT_BLUEPRINTS, getPersonaBlueprint as getPersonaBlueprintFromDefaults } from './data';
import type { PersonaBlueprint } from '@third-eye/constants/blueprints-data';

export const BLUEPRINT_REGISTRY = DEFAULT_BLUEPRINTS;

/**
 * Load persona blueprint from database (SSOT)
 * Falls back to DEFAULT_BLUEPRINTS only if not found in database
 * This enables custom personas to work alongside seeded ones
 */
export async function loadPersonaBlueprintFromDb(eyeId: string): Promise<PersonaBlueprint | null> {
  try {
    // Dynamic imports to avoid circular dependency during build
    // Using string concatenation to make import path opaque to TypeScript
    const dbModule = await import('@third-eye/' + 'db' as any);
    const schemaModule = await import('@third-eye/' + 'db/schema' as any);
    const ormModule = await import('drizzle-orm');
    const { getDb } = dbModule;
    const { personaBlueprints } = schemaModule;
    const { eq } = ormModule;
    
    const { db } = getDb();
    
    const blueprint = await db
      .select()
      .from(personaBlueprints)
      .where(eq(personaBlueprints.eyeId, eyeId))
      .get();
    
    if (!blueprint) {
      return null;
    }
    
    // Reconstruct PersonaBlueprint from database fields
    const phases: PersonaBlueprint['phases'] = {};
    
    // Parse phases from JSON
    let phasesData: Record<string, unknown> = {};
    if (typeof blueprint.phases === 'string') {
      try {
        phasesData = JSON.parse(blueprint.phases);
      } catch (e) {
        console.error(`[BlueprintLoader] Failed to parse phases for ${eyeId}:`, e);
      }
    } else if (typeof blueprint.phases === 'object' && blueprint.phases !== null) {
      phasesData = blueprint.phases as Record<string, unknown>;
    }
    
    if (phasesData.guidance) {
      (phases as any).guidance = phasesData.guidance as PersonaBlueprint['phases']['guidance'];
    }
    if (phasesData.validation) {
      (phases as any).validation = phasesData.validation as PersonaBlueprint['phases']['validation'];
    }
    
    // Parse capabilities
    let capabilities: string[] = [];
    if (typeof blueprint.capabilities === 'string') {
      try {
        capabilities = JSON.parse(blueprint.capabilities);
      } catch (e) {
        console.error(`[BlueprintLoader] Failed to parse capabilities for ${eyeId}:`, e);
      }
    } else if (Array.isArray(blueprint.capabilities)) {
      capabilities = blueprint.capabilities;
    }
    
    // Parse envelope contract
    let envelopeContract: PersonaBlueprint['envelopeContract'] = {
      requiredKeys: [],
      requiredDataKeys: [],
      requiredUiKeys: [],
    };
    if (typeof blueprint.envelopeContract === 'string') {
      try {
        envelopeContract = JSON.parse(blueprint.envelopeContract);
      } catch (e) {
        console.error(`[BlueprintLoader] Failed to parse envelope contract for ${eyeId}:`, e);
      }
    } else if (typeof blueprint.envelopeContract === 'object' && blueprint.envelopeContract !== null) {
      envelopeContract = blueprint.envelopeContract as PersonaBlueprint['envelopeContract'];
    }
    
    // Parse reminders
    let reminders: string[] = [];
    if (blueprint.reminders) {
      if (typeof blueprint.reminders === 'string') {
        try {
          reminders = JSON.parse(blueprint.reminders);
        } catch (e) {
          console.error(`[BlueprintLoader] Failed to parse reminders for ${eyeId}:`, e);
        }
      } else if (Array.isArray(blueprint.reminders)) {
        reminders = blueprint.reminders;
      }
    }
    
    const personaBlueprint: PersonaBlueprint = {
      metadata: {
        eyeId: eyeId as any, // Type assertion needed due to EyeId type
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
    console.error(`[BlueprintLoader] Failed to load blueprint from database for ${eyeId}:`, error);
    return null;
  }
}

/**
 * Get persona blueprint - queries database first (SSOT), falls back to defaults
 * This is the main function used by orchestrator and other components
 */
export async function getPersonaBlueprint(eyeId: string): Promise<PersonaBlueprint | null> {
  // Try database first (SSOT)
  const dbBlueprint = await loadPersonaBlueprintFromDb(eyeId);
  if (dbBlueprint) {
    return dbBlueprint;
  }
  
  // Fallback to hardcoded defaults (for seeded eyes on first run)
  return getPersonaBlueprintFromDefaults(eyeId);
}

/**
 * Synchronous version for backwards compatibility
 * Only reads from DEFAULT_BLUEPRINTS (used during seeding)
 */
export function getPersonaBlueprintSync(eyeId: string): PersonaBlueprint | null {
  return getPersonaBlueprintFromDefaults(eyeId);
}
