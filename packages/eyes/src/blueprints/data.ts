/**
 * Re-export blueprint data from constants package
 * 
 * This file maintains backwards compatibility for existing imports.
 * The actual blueprint data has been moved to @third-eye/constants/blueprints-data
 * to break the circular dependency: db → eyes → db
 * 
 * Now: db → constants ← eyes (constants has no dependencies)
 */

export { DEFAULT_BLUEPRINTS, getPersonaBlueprint } from '@third-eye/constants/blueprints-data';

