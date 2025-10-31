/**
 * Provider Retry Utility with Exponential Backoff
 *
 * R01 (SSOT/DRY): Uses centralized retry configuration from @third-eye/constants
 * R04 (Performance): Efficient retry logic with proper backoff to prevent API overload
 * R05 (Security): Validates errors, does not retry on client authentication failures
 * R07 (Strict Typing): Fully typed retry logic with generics
 */
/**
 * Retry attempt metadata for logging and analytics
 */
export interface RetryAttempt {
    attemptNumber: number;
    delayMs: number;
    error: unknown;
    reason: string;
}
/**
 * Retry execution result
 */
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    attempts: RetryAttempt[];
    totalDurationMs: number;
    finalError?: unknown;
}
/**
 * Options for retry execution
 */
export interface RetryOptions {
    /** Context label for logging (e.g., "Groq API call for Sharingan Eye") */
    context?: string;
    /** Callback invoked before each retry attempt */
    onRetry?: (attempt: number, maxAttempts: number, delayMs: number, error: unknown) => void;
    /** Callback invoked when all retries exhausted */
    onExhausted?: (attempts: RetryAttempt[], finalError: unknown) => void;
    /** Maximum number of attempts (overrides RETRY_CONFIG default) */
    maxAttempts?: number;
}
/**
 * Execute a function with exponential backoff retry logic
 *
 * @param fn - Async function to execute with retry
 * @param options - Retry configuration options
 * @returns RetryResult with success status, result, and attempt metadata
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => provider.complete({ model, messages }),
 *   {
 *     context: 'Groq API call for Sharingan',
 *     onRetry: (attempt, max, delay, error) => {
 *       console.warn(`Retry attempt ${attempt}/${max} after ${delay}ms:`, error);
 *     },
 *   }
 * );
 *
 * if (result.success) {
 *   console.log('Success after', result.attempts.length, 'attempts');
 *   return result.result;
 * } else {
 *   console.error('All retries exhausted:', result.finalError);
 *   throw result.finalError;
 * }
 * ```
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>>;
/**
 * Simplified retry wrapper that throws on failure
 *
 * Use this when you want automatic retry but prefer exceptions over result objects.
 *
 * @param fn - Async function to execute with retry
 * @param options - Retry configuration options
 * @returns Result from successful execution
 * @throws Error from final failed attempt
 *
 * @example
 * ```typescript
 * try {
 *   const completion = await retryWithThrow(
 *     async () => provider.complete({ model, messages }),
 *     { context: 'Groq API call' }
 *   );
 *   return completion;
 * } catch (error) {
 *   console.error('Provider call failed after all retries:', error);
 *   throw error;
 * }
 * ```
 */
export declare function retryWithThrow<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
//# sourceMappingURL=provider-retry.d.ts.map