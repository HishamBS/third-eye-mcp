/**
 * Rate Limiter with Token Bucket Algorithm
 *
 * R01 (SSOT/DRY): Uses centralized rate limit configuration
 * R04 (Performance): Efficient token bucket with minimal memory overhead
 * R07 (Strict Typing): Fully typed rate limiter with generics
 */

import { generateId } from "@third-eye/db/utils/uuid";
import { getDb } from "@third-eye/db";
import { rateLimitTracking } from "@third-eye/db";
import { getEyeIdByName } from "@third-eye/db/utils/lookups";
import { lt } from "drizzle-orm";
import {
  RATE_LIMIT_CONFIG,
  RATE_LIMIT_EVENT_TYPE,
  RATE_LIMIT_ACTION,
  getProviderRateLimit,
  calculateRefillTokens,
} from "@third-eye/constants";

/**
 * Token Bucket State
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number;
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  action: string;
  tokensRemaining: number;
  retryAfterMs?: number;
  reason?: string;
}

/**
 * Rate Limiter Options
 */
export interface RateLimiterOptions {
  provider: string;
  eye?: string;
  tokensRequired?: number;
}

/**
 * Rate Limiter - Token Bucket Implementation
 *
 * Thread-safe rate limiter using token bucket algorithm with automatic refill.
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private db: ReturnType<typeof getDb>["db"];

  constructor() {
    this.buckets = new Map();
    const { db } = getDb();
    this.db = db;
  }

  /**
   * Check if request is allowed under rate limit
   *
   * @param options - Rate limiter options
   * @returns Rate limit result
   */
  async checkLimit(options: RateLimiterOptions): Promise<RateLimitResult> {
    const { provider, eye, tokensRequired = 1 } = options;
    const bucketKey = this.getBucketKey(provider, eye);

    // Get or create token bucket
    let bucket = this.buckets.get(bucketKey);
    if (!bucket) {
      bucket = this.initializeBucket(provider);
      this.buckets.set(bucketKey, bucket);
    }

    // Refill tokens based on time elapsed
    this.refillBucket(bucket);

    // Check if enough tokens available
    if (bucket.tokens >= tokensRequired) {
      // Consume tokens
      bucket.tokens -= tokensRequired;

      // Log successful request
      await this.logRateLimitEvent(provider, eye, tokensRequired, true);

      return {
        allowed: true,
        action: RATE_LIMIT_ACTION.ALLOW,
        tokensRemaining: bucket.tokens,
      };
    } else {
      // Not enough tokens - rate limit exceeded
      const tokensNeeded = tokensRequired - bucket.tokens;
      const retryAfterMs =
        (tokensNeeded / bucket.refillRate) * RATE_LIMIT_CONFIG.REFILL_RATE_MS;

      // Log throttled request
      await this.logRateLimitEvent(provider, eye, tokensRequired, false);

      return {
        allowed: false,
        action: RATE_LIMIT_ACTION.THROTTLE,
        tokensRemaining: bucket.tokens,
        retryAfterMs: Math.ceil(retryAfterMs),
        reason: `Rate limit exceeded for ${provider}. ${tokensNeeded} more tokens needed.`,
      };
    }
  }

  /**
   * Wait for rate limit to allow request
   *
   * Blocks execution until tokens are available.
   *
   * @param options - Rate limiter options
   * @param maxWaitMs - Maximum time to wait (default: 30 seconds)
   * @returns Rate limit result
   */
  async waitForLimit(
    options: RateLimiterOptions,
    maxWaitMs: number = 30000,
  ): Promise<RateLimitResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const result = await this.checkLimit(options);

      if (result.allowed) {
        return result;
      }

      // Wait for refill interval before checking again
      await this.sleep(result.retryAfterMs ?? RATE_LIMIT_CONFIG.REFILL_RATE_MS);
    }

    // Max wait time exceeded
    return {
      allowed: false,
      action: RATE_LIMIT_ACTION.REJECT,
      tokensRemaining: 0,
      reason: `Rate limit wait timeout exceeded (${maxWaitMs}ms)`,
    };
  }

  /**
   * Initialize a new token bucket for a provider
   *
   * @param provider - Provider type
   * @returns Initialized token bucket
   */
  private initializeBucket(provider: string): TokenBucket {
    const limits = getProviderRateLimit(provider);

    return {
      tokens: limits.burst, // Start with burst capacity
      lastRefill: Date.now(),
      maxTokens: limits.burst, // Burst capacity is max tokens
      refillRate: calculateRefillTokens(limits.rpm),
    };
  }

  /**
   * Refill bucket based on time elapsed
   *
   * @param bucket - Token bucket to refill
   */
  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsedMs = now - bucket.lastRefill;

    if (elapsedMs > 0) {
      // Calculate tokens to add
      const refillIntervals = Math.floor(
        elapsedMs / RATE_LIMIT_CONFIG.REFILL_RATE_MS,
      );
      const tokensToAdd = refillIntervals * bucket.refillRate;

      // Add tokens up to max capacity
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);

      // Update last refill time
      bucket.lastRefill = now;
    }
  }

  /**
   * Get bucket key for provider/eye combination
   *
   * @param provider - Provider type
   * @param eye - Optional eye name for per-eye limits
   * @returns Bucket key
   */
  private getBucketKey(provider: string, eye?: string): string {
    return eye ? `${provider}:${eye}` : provider;
  }

  /**
   * Log rate limit event to database
   *
   * @param provider - Provider type
   * @param eye - Optional eye name
   * @param tokens - Tokens consumed
   * @param allowed - Whether request was allowed
   */
  private async logRateLimitEvent(
    provider: string,
    eye: string | undefined,
    tokens: number,
    allowed: boolean,
  ): Promise<void> {
    const now = new Date();
    const windowStart = new Date(
      now.getTime() - (now.getTime() % RATE_LIMIT_CONFIG.WINDOW_SIZE_MS),
    );

    // Convert eye name to UUID
    let eyeId: string | null = null;
    if (eye) {
      eyeId = await getEyeIdByName(eye);
    }

    try {
      await this.db.insert(rateLimitTracking).values({
        id: generateId(),
        provider,
        eyeId: eyeId,
        windowStart,
        requestCount: 1,
        tokensConsumed: tokens,
        createdAt: now,
      });
    } catch (error) {
      // Log error but don't fail rate limiting
      console.error("Failed to log rate limit event:", error);
    }
  }

  /**
   * Clean up old rate limit tracking data
   *
   * Should be called periodically to prevent database bloat.
   */
  async cleanup(): Promise<void> {
    const threshold = new Date(
      Date.now() - RATE_LIMIT_CONFIG.CLEANUP_THRESHOLD_MS,
    );

    try {
      // Delete tracking older than threshold
      await this.db
        .delete(rateLimitTracking)
        .where(lt(rateLimitTracking.createdAt, threshold));

      console.log(
        `Rate limit tracking cleanup completed (threshold: ${threshold.toISOString()})`,
      );
    } catch (error) {
      console.error("Rate limit tracking cleanup failed:", error);
    }
  }

  /**
   * Reset rate limiter buckets
   *
   * Useful for testing or manual reset.
   */
  reset(): void {
    this.buckets.clear();
  }

  /**
   * Get current rate limit status for a provider
   *
   * @param provider - Provider type
   * @param eye - Optional eye name
   * @returns Current bucket status
   */
  getStatus(
    provider: string,
    eye?: string,
  ): {
    tokens: number;
    maxTokens: number;
    refillRate: number;
  } | null {
    const bucketKey = this.getBucketKey(provider, eye);
    const bucket = this.buckets.get(bucketKey);

    if (!bucket) {
      return null;
    }

    // Refill before returning status
    this.refillBucket(bucket);

    return {
      tokens: bucket.tokens,
      maxTokens: bucket.maxTokens,
      refillRate: bucket.refillRate,
    };
  }

  /**
   * Sleep utility for async delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton rate limiter instance
 */
let _rateLimiterInstance: RateLimiter | null = null;

/**
 * Get global rate limiter instance
 *
 * @returns Rate limiter singleton
 */
export function getRateLimiter(): RateLimiter {
  if (!_rateLimiterInstance) {
    _rateLimiterInstance = new RateLimiter();
  }
  return _rateLimiterInstance;
}

/**
 * Reset global rate limiter instance
 *
 * Useful for testing.
 */
export function resetRateLimiter(): void {
  if (_rateLimiterInstance) {
    _rateLimiterInstance.reset();
  }
  _rateLimiterInstance = null;
}
