/**
 * Capability Progress Tracking
 *
 * Tracks which capabilities have been completed in a session pipeline
 * and manages progression through the capability-driven route
 */
import type { EyeId, EyeCapability } from '@third-eye/constants';
export interface CapabilityProgress {
    sessionId: string;
    completedCapabilities: EyeCapability[];
    currentCapability: EyeCapability | null;
    pendingCapabilities: EyeCapability[];
    isCodeRelated: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface CapabilityAssignment {
    capability: EyeCapability;
    eyeId: EyeId;
    stage: 'guidance' | 'validation';
}
/**
 * Capability Progress Manager
 */
export declare class CapabilityProgressManager {
    private progressMap;
    /**
     * Initialize capability progress for a session
     */
    initializeProgress(sessionId: string, isCodeRelated: boolean): void;
    /**
     * Mark a capability as completed
     */
    completeCapability(sessionId: string, capability: EyeCapability): void;
    /**
     * Set pending capabilities for a session
     */
    setPendingCapabilities(sessionId: string, capabilities: EyeCapability[]): void;
    /**
     * Get capability progress for a session
     */
    getProgress(sessionId: string): CapabilityProgress | undefined;
    /**
     * Get current capability
     */
    getCurrentCapability(sessionId: string): EyeCapability | null;
    /**
     * Check if a capability is completed
     */
    isCapabilityCompleted(sessionId: string, capability: EyeCapability): boolean;
    /**
     * Get next pending capability
     */
    getNextCapability(sessionId: string): EyeCapability | null;
    /**
     * Get assignment for a capability
     */
    getCapabilityAssignment(capability: EyeCapability): CapabilityAssignment | null;
    /**
     * Serialize progress for storage
     */
    serializeProgress(sessionId: string): string;
    /**
     * Load progress from serialized data
     */
    loadProgress(sessionId: string, data: string): void;
    /**
     * Clear progress for a session
     */
    clearProgress(sessionId: string): void;
}
export declare const capabilityProgress: CapabilityProgressManager;
//# sourceMappingURL=capability-progress.d.ts.map