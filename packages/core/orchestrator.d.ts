import { type EyeName, type BaseEnvelope } from '@third-eye/eyes';
/**
 * Eye Orchestrator
 *
 * Core orchestration engine for routing Eyes to providers and managing execution
 */
export declare class EyeOrchestrator {
    private db;
    constructor();
    /**
     * Run an Eye with AI-powered analysis
     *
     * 100% professional AI-based orchestration:
     * 1) Resolve Eye implementation (from @third-eye/eyes package)
     * 2) Load routing configuration (provider + model)
     * 3) Call LLM with Eye's persona as system prompt
     * 4) Parse and validate response envelope
     * 5) Persist run with metrics; return envelope
     */
    runEye(eyeName: string, input: string, sessionId?: string): Promise<BaseEnvelope>;
    /**
     * Run complete pipeline (all Eyes in sequence)
     */
    runPipeline(input: string, eyeNames: EyeName[], sessionId?: string): Promise<BaseEnvelope[]>;
    /**
     * Get routing configuration for an Eye
     */
    private getEyeRouting;
    /**
     * Get provider API key
     */
    private getProviderKey;
    /**
     * Create order violation envelope
     */
    private createOrderViolationEnvelope;
    /**
     * Create error envelope
     */
    private createErrorEnvelope;
    /**
     * Persist run to database
     */
    private persistRun;
    /**
     * Create a new session
     */
    createSession(config?: any): Promise<{
        sessionId: string;
        portalUrl: string;
    }>;
    /**
     * Get session runs with pagination
     */
    getSessionRuns(sessionId: string, limit?: number, offset?: number): Promise<any>;
}
//# sourceMappingURL=orchestrator.d.ts.map