/**
 * Provider Retry Utility with Exponential Backoff
 *
 * R01 (SSOT/DRY): Uses centralized retry configuration from @third-eye/constants
 * R04 (Performance): Efficient retry logic with proper backoff to prevent API overload
 * R05 (Security): Validates errors, does not retry on client authentication failures
 * R07 (Strict Typing): Fully typed retry logic with generics
 */
import { RETRY_CONFIG, calculateBackoffDelay, isRetryableError, categorizeRetryReason, } from '@third-eye/constants';
/**
 * Sleep utility for async delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
export async function withRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS;
    const attempts = [];
    const startTime = Date.now();
    for (let attemptNumber = 1; attemptNumber <= maxAttempts; attemptNumber++) {
        try {
            // Execute the function
            const result = await fn();
            // Success!
            const totalDurationMs = Date.now() - startTime;
            return {
                success: true,
                result,
                attempts,
                totalDurationMs,
            };
        }
        catch (error) {
            // Determine if error is retryable
            const retryable = isRetryableError(error);
            const reason = categorizeRetryReason(error);
            // Calculate backoff delay (0-indexed attempt for formula)
            const delayMs = calculateBackoffDelay(attemptNumber - 1);
            // Record attempt
            attempts.push({
                attemptNumber,
                delayMs,
                error,
                reason,
            });
            // Log attempt details
            const context = options.context || 'Provider call';
            console.warn(`[Retry] ${context} - Attempt ${attemptNumber}/${maxAttempts} failed (${reason})${retryable ? `, retrying after ${delayMs}ms` : ', non-retryable error'}`);
            // If non-retryable or last attempt, fail immediately
            if (!retryable || attemptNumber === maxAttempts) {
                if (options.onExhausted) {
                    options.onExhausted(attempts, error);
                }
                const totalDurationMs = Date.now() - startTime;
                return {
                    success: false,
                    attempts,
                    totalDurationMs,
                    finalError: error,
                };
            }
            // Invoke retry callback
            if (options.onRetry) {
                options.onRetry(attemptNumber, maxAttempts, delayMs, error);
            }
            // Wait before next attempt
            await sleep(delayMs);
        }
    }
    // Should never reach here, but TypeScript needs it
    const totalDurationMs = Date.now() - startTime;
    return {
        success: false,
        attempts,
        totalDurationMs,
        finalError: new Error('Unexpected retry logic exit'),
    };
}
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
export async function retryWithThrow(fn, options = {}) {
    const result = await withRetry(fn, options);
    if (result.success && result.result !== undefined) {
        return result.result;
    }
    // All retries exhausted, throw final error
    throw result.finalError || new Error('Retry failed without error details');
}
//# sourceMappingURL=provider-retry.js.map