/**
 * Dynamic Capability Loader
 *
 * Queries the database for eyes and personas to build a dynamic capability registry.
 * This registry is used by the LLM router to make intelligent routing decisions.
 */
import type { getDb } from '@third-eye/db';
export interface CapabilityRegistry {
    [eyeId: string]: {
        capabilities: string[];
        stage: string;
        description: string;
        active: boolean;
    };
}
export interface DynamicRouteDecision {
    pipelineRoute: string[];
    reasoning: string;
    userNeeds: string[];
    eyesSelected: Array<{
        eyeId: string;
        capabilities: string[];
        reason: string;
    }>;
}
/**
 * Load dynamic capabilities from the database
 */
export declare function loadDynamicCapabilities(db: ReturnType<typeof getDb>['db']): Promise<CapabilityRegistry>;
export declare function buildRouterPersona(registry: CapabilityRegistry): string;
/**
 * Extract user needs from input using simple heuristics
 * In a real implementation, this could use an LLM for better extraction
 */
export declare function extractUserNeeds(input: string): string[];
//# sourceMappingURL=capability-loader.d.ts.map