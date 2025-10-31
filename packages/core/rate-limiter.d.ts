/**
 * Rate Limiter with Token Bucket Algorithm
 *
 * R01 (SSOT/DRY): Uses centralized rate limit configuration
 * R04 (Performance): Efficient token bucket with minimal memory overhead
 * R07 (Strict Typing): Fully typed rate limiter with generics
 */
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
export declare class RateLimiter {
    private buckets;
    private db;
    constructor();
    /**
     * Check if request is allowed under rate limit
     *
     * @param options - Rate limiter options
     * @returns Rate limit result
     */
    checkLimit(options: RateLimiterOptions): Promise<RateLimitResult>;
    /**
     * Wait for rate limit to allow request
     *
     * Blocks execution until tokens are available.
     *
     * @param options - Rate limiter options
     * @param maxWaitMs - Maximum time to wait (default: 30 seconds)
     * @returns Rate limit result
     */
    waitForLimit(options: RateLimiterOptions, maxWaitMs?: number): Promise<RateLimitResult>;
    /**
     * Initialize a new token bucket for a provider
     *
     * @param provider - Provider type
     * @returns Initialized token bucket
     */
    private initializeBucket;
    /**
     * Refill bucket based on time elapsed
     *
     * @param bucket - Token bucket to refill
     */
    private refillBucket;
    /**
     * Get bucket key for provider/eye combination
     *
     * @param provider - Provider type
     * @param eye - Optional eye name for per-eye limits
     * @returns Bucket key
     */
    private getBucketKey;
    /**
     * Log rate limit event to database
     *
     * @param provider - Provider type
     * @param eye - Optional eye name
     * @param tokens - Tokens consumed
     * @param allowed - Whether request was allowed
     */
    private logRateLimitEvent;
    /**
     * Clean up old rate limit tracking data
     *
     * Should be called periodically to prevent database bloat.
     */
    cleanup(): Promise<void>;
    /**
     * Reset rate limiter buckets
     *
     * Useful for testing or manual reset.
     */
    reset(): void;
    /**
     * Get current rate limit status for a provider
     *
     * @param provider - Provider type
     * @param eye - Optional eye name
     * @returns Current bucket status
     */
    getStatus(provider: string, eye?: string): {
        tokens: number;
        maxTokens: number;
        refillRate: number;
    } | null;
    /**
     * Sleep utility for async delay
     */
    private sleep;
}
/**
 * Get global rate limiter instance
 *
 * @returns Rate limiter singleton
 */
export declare function getRateLimiter(): RateLimiter;
/**
 * Reset global rate limiter instance
 *
 * Useful for testing.
 */
export declare function resetRateLimiter(): void;
//# sourceMappingURL=rate-limiter.d.ts.map