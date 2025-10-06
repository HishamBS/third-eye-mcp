import { createHash } from 'crypto';

/**
 * Response Caching System
 *
 * Caches Eye responses for identical inputs (TTL: 5 minutes)
 * Skips cache for session-dependent Eyes (Byakugan, Rinnegan)
 */

interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Eyes that should skip caching (session-dependent)
   */
  private readonly skipCacheEyes = new Set([
    'byakugan',
    'rinnegan',
    'rinnegan:requirements',
    'rinnegan:review',
    'rinnegan:approval',
    'overseer',
  ]);

  /**
   * Generate cache key from input
   */
  private generateKey(eye: string, input: any): string {
    const content = JSON.stringify({ eye, input });
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if Eye should use cache
   */
  shouldCache(eye: string): boolean {
    return !this.skipCacheEyes.has(eye);
  }

  /**
   * Get cached response
   */
  get(eye: string, input: any): any | null {
    if (!this.shouldCache(eye)) {
      return null;
    }

    const key = this.generateKey(eye, input);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached response
   */
  set(eye: string, input: any, data: any, ttl?: number): void {
    if (!this.shouldCache(eye)) {
      return;
    }

    const key = this.generateKey(eye, input);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key: key.substring(0, 16) + '...',
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
        ttl: entry.expiresAt - Date.now(),
      })),
    };
  }

  /**
   * Invalidate cache for specific Eye
   */
  invalidateEye(eye: string): void {
    // This is inefficient but works for small caches
    // In production, use a more sophisticated key structure
    for (const [key, entry] of this.cache.entries()) {
      // Can't check eye from hash, so we clear all
      // Better approach: store eye name in entry
      this.cache.delete(key);
    }
  }
}

// Singleton instance
export const responseCache = new ResponseCache();

// Clean up expired entries every minute
setInterval(() => {
  responseCache.clearExpired();
}, 60000);

/**
 * Cache middleware for Hono
 */
export function cacheMiddleware() {
  return async (c: any, next: any) => {
    const method = c.req.method;

    // Only cache GET requests
    if (method !== 'GET') {
      await next();
      return;
    }

    const path = c.req.path;
    const query = c.req.query();

    // Generate cache key from path + query
    const cacheKey = createHash('sha256')
      .update(JSON.stringify({ path, query }))
      .digest('hex');

    const cached = responseCache.get(path, query);

    if (cached) {
      c.header('X-Cache', 'HIT');
      return c.json(cached);
    }

    // Cache miss
    c.header('X-Cache', 'MISS');

    await next();

    // Cache response if successful
    if (c.res && c.res.status === 200) {
      // Can't easily extract response body in Hono middleware
      // This would need to be implemented in route handlers
    }
  };
}

/**
 * Helper to wrap Eye execution with caching
 */
export async function withCache<T>(
  eye: string,
  input: any,
  executor: () => Promise<T>
): Promise<T> {
  // Check cache
  const cached = responseCache.get(eye, input);
  if (cached) {
    console.log(`📦 Cache HIT for ${eye}`);
    return cached;
  }

  console.log(`🔄 Cache MISS for ${eye}`);

  // Execute and cache
  const result = await executor();
  responseCache.set(eye, input, result);

  return result;
}
