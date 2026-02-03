import { CACHE_TTL } from "@third-eye/constants";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../index";
import { eyes, personaBlueprints, personas, pipelines } from "../schema";

/**
 * Entity Lookup Utilities - SSOT for name to UUID conversion
 *
 * V1 Standard: All entity references MUST use UUIDs
 * These utilities provide name → UUID lookups with caching for performance
 *
 * R07: Using `unknown` instead of `any` for cache values
 * R13: Using CACHE_TTL from constants instead of magic number
 */

// Cache entry interface - R07 compliant
interface CacheEntry<T = unknown> {
  value: T;
  expires: number;
}

// Cache configuration - R13 compliant
const cache = new Map<string, CacheEntry>();

function getCacheKey(prefix: string, ...args: string[]): string {
  return `${prefix}:${args.join(":")}`;
}

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T): void {
  cache.set(key, {
    value,
    expires: Date.now() + CACHE_TTL.DB_LOOKUP_CACHE_MS,
  });
}

/**
 * Normalize name by removing diacritics and special characters
 * e.g., "Mangekyō" → "mangekyo", "Jōgan" → "jogan"
 */
function normalizeEyeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, ""); // Remove combining diacritical marks
}

/**
 * Clear all cached lookups (call after database modifications)
 */
export function clearLookupCache(): void {
  cache.clear();
}

/**
 * Eye Lookups
 */

export async function getEyeIdByName(name: string): Promise<string | null> {
  const normalizedInput = normalizeEyeName(name);
  const cacheKey = getCacheKey("eye:id", normalizedInput);
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();

  // First try exact case-insensitive match
  let eye = await db
    .select({ id: eyes.id })
    .from(eyes)
    .where(sql`LOWER(${eyes.name}) = LOWER(${name})`)
    .limit(1)
    .get();

  // If not found, fetch all eyes and match with diacritic normalization
  if (!eye) {
    const allEyes = await db
      .select({ id: eyes.id, name: eyes.name })
      .from(eyes)
      .all();
    for (const e of allEyes) {
      if (normalizeEyeName(e.name) === normalizedInput) {
        eye = { id: e.id };
        break;
      }
    }
  }

  const id = eye?.id || null;
  if (id) setCache(cacheKey, id);
  return id;
}

/**
 * Get eye UUID by slug (SSOT canonical identifier)
 * Slug is the primary lookup method - e.g., 'overseer', 'sharingan'
 */
export async function getEyeIdBySlug(slug: string): Promise<string | null> {
  const cacheKey = getCacheKey("eye:id-by-slug", slug.toLowerCase());
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const eye = await db
    .select({ id: eyes.id })
    .from(eyes)
    .where(sql`LOWER(${eyes.slug}) = LOWER(${slug})`)
    .limit(1)
    .get();

  const id = eye?.id || null;
  if (id) setCache(cacheKey, id);
  return id;
}

/**
 * Get full eye record by slug (SSOT canonical identifier)
 */
export async function getEyeBySlug(
  slug: string,
): Promise<typeof eyes.$inferSelect | null> {
  const cacheKey = getCacheKey("eye:full-by-slug", slug.toLowerCase());
  const cached = getCached<typeof eyes.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const eye = await db
    .select()
    .from(eyes)
    .where(sql`LOWER(${eyes.slug}) = LOWER(${slug})`)
    .limit(1)
    .get();

  if (eye) setCache(cacheKey, eye);
  return eye || null;
}

/**
 * Get eye slug by UUID
 */
export async function getEyeSlugById(id: string): Promise<string | null> {
  const cacheKey = getCacheKey("eye:slug-by-id", id);
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const eye = await db
    .select({ slug: eyes.slug })
    .from(eyes)
    .where(eq(eyes.id, id))
    .limit(1)
    .get();

  const slug = eye?.slug || null;
  if (slug) setCache(cacheKey, slug);
  return slug;
}

export async function getEyeByName(
  name: string,
): Promise<typeof eyes.$inferSelect | null> {
  const normalizedInput = normalizeEyeName(name);
  const cacheKey = getCacheKey("eye:full", normalizedInput);
  const cached = getCached<typeof eyes.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();

  // First try exact case-insensitive match
  let eye = await db
    .select()
    .from(eyes)
    .where(sql`LOWER(${eyes.name}) = LOWER(${name})`)
    .limit(1)
    .get();

  // If not found, fetch all eyes and match with diacritic normalization
  if (!eye) {
    const allEyes = await db.select().from(eyes).all();
    for (const e of allEyes) {
      if (normalizeEyeName(e.name) === normalizedInput) {
        eye = e;
        break;
      }
    }
  }

  if (eye) setCache(cacheKey, eye);
  return eye || null;
}

export async function getEyeById(
  id: string,
): Promise<typeof eyes.$inferSelect | null> {
  const cacheKey = getCacheKey("eye:by-id", id);
  const cached = getCached<typeof eyes.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const eye = await db
    .select()
    .from(eyes)
    .where(eq(eyes.id, id))
    .limit(1)
    .get();

  if (eye) setCache(cacheKey, eye);
  return eye || null;
}

export async function getEyeNameById(id: string): Promise<string | null> {
  const cacheKey = getCacheKey("eye:name", id);
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const eye = await db
    .select({ name: eyes.name })
    .from(eyes)
    .where(eq(eyes.id, id))
    .limit(1)
    .get();

  const name = eye?.name || null;
  if (name) setCache(cacheKey, name);
  return name;
}

/**
 * Get all active eyes with their IDs
 */
export async function getAllActiveEyes(): Promise<
  Array<{ id: string; name: string }>
> {
  const cacheKey = getCacheKey("eyes", "all-active");
  const cached = getCached<Array<{ id: string; name: string }>>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const allEyes = await db
    .select({ id: eyes.id, name: eyes.name })
    .from(eyes)
    .where(eq(eyes.active, true))
    .all();

  setCache(cacheKey, allEyes);
  return allEyes;
}

/**
 * Persona Lookups
 */

export async function getPersonaIdByName(
  name: string,
  eyeId: string,
): Promise<string | null> {
  const cacheKey = getCacheKey("persona:id", eyeId, name);
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const persona = await db
    .select({ id: personas.id })
    .from(personas)
    .where(and(eq(personas.eyeId, eyeId), eq(personas.name, name)))
    .limit(1)
    .get();

  const id = persona?.id || null;
  if (id) setCache(cacheKey, id);
  return id;
}

export async function getPersonasByEyeId(
  eyeId: string,
): Promise<(typeof personas.$inferSelect)[]> {
  const cacheKey = getCacheKey("persona:by-eye", eyeId);
  const cached = getCached<(typeof personas.$inferSelect)[]>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const result = await db
    .select()
    .from(personas)
    .where(eq(personas.eyeId, eyeId))
    .all();

  setCache(cacheKey, result);
  return result;
}

/**
 * Pipeline Lookups
 */

export async function getPipelineIdByName(
  name: string,
): Promise<string | null> {
  const cacheKey = getCacheKey("pipeline:id", name.toLowerCase());
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const pipeline = await db
    .select({ id: pipelines.id })
    .from(pipelines)
    .where(eq(pipelines.name, name))
    .limit(1)
    .get();

  const id = pipeline?.id || null;
  if (id) setCache(cacheKey, id);
  return id;
}

export async function getPipelineByName(
  name: string,
): Promise<typeof pipelines.$inferSelect | null> {
  const cacheKey = getCacheKey("pipeline:full", name.toLowerCase());
  const cached = getCached<typeof pipelines.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const pipeline = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.name, name))
    .limit(1)
    .get();

  if (pipeline) setCache(cacheKey, pipeline);
  return pipeline || null;
}

export async function getPipelineById(
  id: string,
): Promise<typeof pipelines.$inferSelect | null> {
  const cacheKey = getCacheKey("pipeline:by-id", id);
  const cached = getCached<typeof pipelines.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const pipeline = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.id, id))
    .limit(1)
    .get();

  if (pipeline) setCache(cacheKey, pipeline);
  return pipeline || null;
}

/**
 * PersonaBlueprint Lookups
 */

export async function getPersonaBlueprintByEyeId(
  eyeId: string,
): Promise<typeof personaBlueprints.$inferSelect | null> {
  const cacheKey = getCacheKey("blueprint:by-eye-id", eyeId);
  const cached = getCached<typeof personaBlueprints.$inferSelect>(cacheKey);
  if (cached) return cached;

  const { db } = getDb();
  const blueprint = await db
    .select()
    .from(personaBlueprints)
    .where(eq(personaBlueprints.eyeId, eyeId))
    .limit(1)
    .get();

  if (blueprint) setCache(cacheKey, blueprint);
  return blueprint || null;
}

export async function getPersonaBlueprintByEyeName(
  eyeName: string,
): Promise<typeof personaBlueprints.$inferSelect | null> {
  // First get eye ID by name
  const eyeId = await getEyeIdByName(eyeName);
  if (!eyeId) return null;

  return getPersonaBlueprintByEyeId(eyeId);
}

/**
 * Batch Lookups for Performance
 */

export async function getEyeIdsByNames(
  names: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const { db } = getDb();

  // Check cache first
  const uncachedNames: string[] = [];
  for (const name of names) {
    const cacheKey = getCacheKey("eye:id", name.toLowerCase());
    const cached = getCached<string>(cacheKey);
    if (cached) {
      result.set(name, cached);
    } else {
      uncachedNames.push(name);
    }
  }

  // Fetch uncached names
  if (uncachedNames.length > 0) {
    const eyeResults = await db
      .select({ id: eyes.id, name: eyes.name })
      .from(eyes)
      .all();

    for (const eye of eyeResults) {
      if (names.includes(eye.name)) {
        result.set(eye.name, eye.id);
        const cacheKey = getCacheKey("eye:id", eye.name.toLowerCase());
        setCache(cacheKey, eye.id);
      }
    }
  }

  return result;
}

/**
 * Normalize eye identifier to UUID
 * Accepts either eye name or eye ID and returns the UUID
 */
export async function normalizeEyeIdentifier(
  identifier: string,
): Promise<string | null> {
  // Check if it's already a UUID (crypto.randomUUID format: 36 characters with hyphens)
  // or legacy nanoid format (21 characters)
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (UUID_REGEX.test(identifier) || identifier.length === 21) {
    // Verify it exists
    const eye = await getEyeById(identifier);
    return eye ? identifier : null;
  }

  // Treat as name and lookup UUID
  return getEyeIdByName(identifier);
}
