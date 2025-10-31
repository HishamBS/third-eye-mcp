/**
 * Order Guard - Pipeline Order Enforcement
 *
 * Enforces proper Eye execution order as specified in prompt.md
 * Returns E_PIPELINE_ORDER when illegal calls are made
 */
import type { EyeName } from '@third-eye/eyes';
export interface PipelineState {
    sessionId: string;
    currentPhase: 'initialization' | 'clarification' | 'planning' | 'implementation' | 'review' | 'completion';
    completedEyes: EyeName[];
    lastEye?: EyeName;
    isCodeRelated: boolean;
    createdAt: Date;
}
export interface OrderViolation {
    code: 'E_PIPELINE_ORDER';
    violation: string;
    expectedNext: string[];
    fixInstructions: string;
    examplePayload?: {
        eye: string;
        input: Record<string, any>;
        description: string;
    };
}
/**
 * Proper pipeline order according to prompt.md:
 *
 * For freeform tasks:
 * 1. Sharingan (ambiguity + is_code_related + questions)
 * 2. Kyuubi (with clarifications)
 * 3. Jōgan (intent confirm)
 * 4a. For CODE: Rinnegan plan → Rinnegan review loop → Mangekyō phases → Rinnegan final
 * 4b. For TEXT: Rinnegan plan (optional) → Tenseigan → Byakugan → Rinnegan final
 *
 * GOLDEN RULE #1: Violation messages are INTERNAL ONLY and NEVER exposed to agents.
 * Orchestrator wraps them in generic agent-friendly messages.
 */
export declare class OrderGuard {
    private sessions;
    private autoRouterSessions;
    /**
     * Mark session as being orchestrated by auto-router
     * Auto-router already knows the correct order, so bypass validation
     */
    markAsAutoRouterSession(sessionId: string): void;
    /**
     * Remove auto-router flag (for direct Eye calls after auto-routing completes)
     */
    unmarkAsAutoRouterSession(sessionId: string): void;
    /**
     * Check if session is being orchestrated by auto-router
     */
    isAutoRouterSession(sessionId: string): boolean;
    /**
     * Check if calling an Eye is allowed in current pipeline state
     */
    validateOrder(sessionId: string, eyeName: EyeName): OrderViolation | null;
    /**
     * Update pipeline state after successful Eye execution
     */
    recordEyeCompletion(sessionId: string, eyeName: EyeName, result: {
        code: string;
        metadata?: Record<string, unknown>;
    }): void;
    /**
     * Get current pipeline state for a session
     */
    getState(sessionId: string): PipelineState | null;
    /**
     * Get expected next Eyes for a session
     */
    getExpectedNext(sessionId: string): EyeName[];
    /**
     * Clear session state (for testing or reset)
     */
    clearSession(sessionId: string): void;
    /**
     * Get all active sessions
     */
    getActiveSessions(): PipelineState[];
}
export declare const orderGuard: OrderGuard;
//# sourceMappingURL=order-guard.d.ts.map