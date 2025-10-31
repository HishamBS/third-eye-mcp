/**
 * Rate Limiter with Token Bucket Algorithm
 *
 * R01 (SSOT/DRY): Uses centralized rate limit configuration
 * R04 (Performance): Efficient token bucket with minimal memory overhead
 * R07 (Strict Typing): Fully typed rate limiter with generics
 */
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { rateLimitTracking } from '@third-eye/db';
import { lt } from 'drizzle-orm';
import { RATE_LIMIT_CONFIG, RATE_LIMIT_ACTION, getProviderRateLimit, calculateRefillTokens, } from '@third-eye/constants';
/**
 * Rate Limiter - Token Bucket Implementation
 *
 * Thread-safe rate limiter using token bucket algorithm with automatic refill.
 */
export class RateLimiter {
    buckets;
    db;
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
    async checkLimit(options) {
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
        }
        else {
            // Not enough tokens - rate limit exceeded
            const tokensNeeded = tokensRequired - bucket.tokens;
            const retryAfterMs = (tokensNeeded / bucket.refillRate) * RATE_LIMIT_CONFIG.REFILL_RATE_MS;
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
    async waitForLimit(options, maxWaitMs = 30000) {
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
    initializeBucket(provider) {
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
    refillBucket(bucket) {
        const now = Date.now();
        const elapsedMs = now - bucket.lastRefill;
        if (elapsedMs > 0) {
            // Calculate tokens to add
            const refillIntervals = Math.floor(elapsedMs / RATE_LIMIT_CONFIG.REFILL_RATE_MS);
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
    getBucketKey(provider, eye) {
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
    async logRateLimitEvent(provider, eye, tokens, allowed) {
        const now = new Date();
        const windowStart = new Date(now.getTime() - (now.getTime() % RATE_LIMIT_CONFIG.WINDOW_SIZE_MS));
        try {
            await this.db.insert(rateLimitTracking).values({
                id: nanoid(),
                provider,
                eye: eye ?? null,
                windowStart,
                requestCount: 1,
                tokensConsumed: tokens,
                createdAt: now,
            });
        }
        catch (error) {
            // Log error but don't fail rate limiting
            console.error('Failed to log rate limit event:', error);
        }
    }
    /**
     * Clean up old rate limit tracking data
     *
     * Should be called periodically to prevent database bloat.
     */
    async cleanup() {
        const threshold = new Date(Date.now() - RATE_LIMIT_CONFIG.CLEANUP_THRESHOLD_MS);
        try {
            // Delete tracking older than threshold
            await this.db
                .delete(rateLimitTracking)
                .where(lt(rateLimitTracking.createdAt, threshold));
            console.log(`Rate limit tracking cleanup completed (threshold: ${threshold.toISOString()})`);
        }
        catch (error) {
            console.error('Rate limit tracking cleanup failed:', error);
        }
    }
    /**
     * Reset rate limiter buckets
     *
     * Useful for testing or manual reset.
     */
    reset() {
        this.buckets.clear();
    }
    /**
     * Get current rate limit status for a provider
     *
     * @param provider - Provider type
     * @param eye - Optional eye name
     * @returns Current bucket status
     */
    getStatus(provider, eye) {
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
/**
 * Singleton rate limiter instance
 */
let _rateLimiterInstance = null;
/**
 * Get global rate limiter instance
 *
 * @returns Rate limiter singleton
 */
export function getRateLimiter() {
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
export function resetRateLimiter() {
    if (_rateLimiterInstance) {
        _rateLimiterInstance.reset();
    }
    _rateLimiterInstance = null;
}
//# sourceMappingURL=rate-limiter.js.map