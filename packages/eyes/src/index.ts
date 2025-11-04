/**
 * Eyes Package - Dynamic Eye System
 * 
 * Replaces 8 individual eye schema files with single dynamic eye.
 * All eye metadata and blueprints stored in database, seeded on startup.
 * 
 * ARCHITECTURE CHANGE:
 * - BEFORE: 8 hardcoded eye classes (sharingan.ts, byakugan.ts, etc.)
 * - AFTER: Single DynamicEye class, data-driven from database
 */

// Base schemas and types
export * from './schemas/base';

// Dynamic Eye (replaces 8 individual eye files)
export * from './eye';

// Persona Blueprint interface
// PersonaBlueprint types are now exported from @third-eye/constants
export type { PersonaBlueprint, PersonaMetadata, PhaseSpec } from '@third-eye/constants/blueprints-data';

// Clarification management
export * from './clarification';

// Persona renderer
export * from './renderer';

// Blueprints (consolidated data)
export * from './blueprints';

// Guards
export * from './guards';

// Dynamic Eye Registry
import { createEye, DynamicEye } from './eye';
import type { BaseEye } from './schemas/base';

/**
 * Create eye registry from database-fetched eye names
 * Replaces hardcoded ALL_EYES constant
 * 
 * @example
 * const eyeNames = await fetchEyesFromDatabase();
 * const registry = createEyeRegistry(eyeNames);
 * const sharingan = registry['sharingan'];
 */
export function createEyeRegistry(eyeNames: string[]): Record<string, DynamicEye> {
  return eyeNames.reduce((registry, name) => {
    registry[name] = createEye(name);
    return registry;
  }, {} as Record<string, DynamicEye>);
}

/**
 * Get a single eye instance by name
 * For components that need validation on-demand
 */
export function getEye(name: string): BaseEye {
  return createEye(name);
}

// NOTE: Eye metadata (names, descriptions, capabilities) stored in database.
// Blueprints seeded from packages/eyes/src/blueprints/data.ts on startup.
// Routing is dynamic via Overseer LLM or pipeline orchestrator.
