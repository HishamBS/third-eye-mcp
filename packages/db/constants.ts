/**
 * Database seeding constants - SSOT for seed subset names
 * NO STRING LITERALS - All values must be frozen constants
 */

export const SeedSubset = Object.freeze({
  EYES: "eyes",
  PERSONAS: "personas",
  BLUEPRINTS: "blueprints",
  PIPELINES: "pipelines",
  ROUTING: "routing",
  STRICTNESS: "strictness",
  APP_SETTINGS: "appSettings",
  INTEGRATIONS: "integrations",
  TEMPLATES: "templates",
} as const);

export type SeedSubset = (typeof SeedSubset)[keyof typeof SeedSubset];

export const ALL_SEED_SUBSETS = Object.freeze(Object.values(SeedSubset));
