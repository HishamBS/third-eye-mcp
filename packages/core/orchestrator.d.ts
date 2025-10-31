import type { ProviderType } from '@third-eye/providers';
import { type EyeName, type EyeResponse } from '@third-eye/eyes';
interface SessionBootstrapConfig {
    agentName?: string;
    model?: string | null;
    displayName?: string | null;
    [key: string]: unknown;
}
interface EyeRunProviderOverride {
    provider: ProviderType;
    model: string;
    label?: string;
}
interface EyeRunOptions {
    providerOverride?: EyeRunProviderOverride;
    temperature?: number;
    maxTokens?: number;
}
/**
 * Eye Orchestrator
 *
 * Core orchestration engine for routing Eyes to providers and managing execution
 */
export declare class EyeOrchestrator {
    private readonly db;
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
    runEye(eyeName: string, input: string, sessionId?: string, options?: EyeRunOptions): Promise<EyeResponse>;
    /**
     * Run complete pipeline (all Eyes in sequence)
     */
    runPipeline(input: string, eyeNames: EyeName[], sessionId?: string): Promise<EyeResponse[]>;
    /**
     * Get routing configuration for an Eye
     */
    private getEyeRouting;
    /**
     * Get provider API key
     */
    private getProviderCredentials;
    /**
     * Create order violation envelope
     * GOLDEN RULE #1: Never expose Eye names to agents - wrap in generic message
     */
    private createOrderViolationEnvelope;
    /**
     * Get Eye icon for UI display
     */
    private getEyeIcon;
    /**
     * Create error envelope
     */
    private createErrorEnvelope;
    private resolveProviderType;
    /**
     * Persist run to database
     */
    private persistRun;
    /**
     * Fetch active persona from database (single source of truth)
     */
    private getActivePersona;
    /**
     * Create a new session
     */
    createSession(config?: SessionBootstrapConfig): Promise<{
        sessionId: string;
        portalUrl: string;
    }>;
    /**
     * Get session runs with pagination
     */
    getSessionRuns(sessionId: string, limit?: number, offset?: number): Promise<{
        id: string;
        sessionId: string;
        eye: string;
        provider: string;
        model: string;
        inputMd: string;
        outputJson: unknown;
        tokensIn: number | null;
        tokensOut: number | null;
        latencyMs: number | null;
        createdAt: Date;
    }[]>;
}
export {};
//# sourceMappingURL=orchestrator.d.ts.map