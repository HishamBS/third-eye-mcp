/**
 * Auto-Router - Intelligent Pipeline Routing
 *
 * Analyzes freeform tasks and routes them through the optimal Eye sequence
 */
import type { EyeName, BaseEnvelope } from '@third-eye/eyes';
export interface AutoRouterOptions {
    strictness?: Record<string, unknown>;
    context?: Record<string, unknown>;
}
export interface RoutingDecision {
    sessionId: string;
    taskType: 'code' | 'text' | 'analysis';
    complexity: 'simple' | 'medium' | 'complex';
    recommendedFlow: EyeName[];
    reasoning: string;
    estimatedSteps: number;
}
export interface AutoRoutingResult {
    sessionId: string;
    results: BaseEnvelope[];
    completed: boolean;
    error?: string;
}
/**
 * Intelligent router that analyzes tasks and executes optimal Eye pipelines
 */
export declare class AutoRouter {
    private _orchestrator;
    private get orchestrator();
    /**
     * Analyze a freeform task and determine optimal routing
     */
    analyzeTask(input: string, sessionId?: string, providedSessionId?: string, options?: AutoRouterOptions): Promise<RoutingDecision>;
    /**
     * Execute complete pipeline based on routing decision
     */
    executeFlow(input: string, routing?: RoutingDecision, providedSessionId?: string, options?: AutoRouterOptions): Promise<AutoRoutingResult>;
    /**
     * Get current pipeline state for session
     */
    getSessionState(sessionId: string): import("./order-guard").PipelineState | null;
    /**
     * Get expected next Eyes for session
     */
    getExpectedNext(sessionId: string): EyeName[];
    /**
     * Resume flow after clarification or intent confirmation
     */
    resumeFlow(sessionId: string, input?: string, options?: AutoRouterOptions): Promise<AutoRoutingResult>;
}
export declare const autoRouter: AutoRouter;
//# sourceMappingURL=auto-router.d.ts.map