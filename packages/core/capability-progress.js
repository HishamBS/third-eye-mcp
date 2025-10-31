/**
 * Capability Progress Tracking
 *
 * Tracks which capabilities have been completed in a session pipeline
 * and manages progression through the capability-driven route
 */
/**
 * Capability Progress Manager
 */
export class CapabilityProgressManager {
    progressMap = new Map();
    /**
     * Initialize capability progress for a session
     */
    initializeProgress(sessionId, isCodeRelated) {
        this.progressMap.set(sessionId, {
            sessionId,
            completedCapabilities: [],
            currentCapability: null,
            pendingCapabilities: [],
            isCodeRelated,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    /**
     * Mark a capability as completed
     */
    completeCapability(sessionId, capability) {
        const progress = this.progressMap.get(sessionId);
        if (!progress)
            return;
        if (!progress.completedCapabilities.includes(capability)) {
            progress.completedCapabilities.push(capability);
        }
        // Remove from pending if present
        progress.pendingCapabilities = progress.pendingCapabilities.filter(c => c !== capability);
        // Update current capability
        progress.currentCapability = progress.pendingCapabilities[0] || null;
        progress.updatedAt = new Date();
        this.progressMap.set(sessionId, progress);
    }
    /**
     * Set pending capabilities for a session
     */
    setPendingCapabilities(sessionId, capabilities) {
        const progress = this.progressMap.get(sessionId);
        if (!progress)
            return;
        progress.pendingCapabilities = capabilities.filter(cap => !progress.completedCapabilities.includes(cap));
        // Set current capability
        progress.currentCapability = progress.pendingCapabilities[0] || null;
        progress.updatedAt = new Date();
        this.progressMap.set(sessionId, progress);
    }
    /**
     * Get capability progress for a session
     */
    getProgress(sessionId) {
        return this.progressMap.get(sessionId);
    }
    /**
     * Get current capability
     */
    getCurrentCapability(sessionId) {
        const progress = this.progressMap.get(sessionId);
        return progress?.currentCapability || null;
    }
    /**
     * Check if a capability is completed
     */
    isCapabilityCompleted(sessionId, capability) {
        const progress = this.progressMap.get(sessionId);
        if (!progress)
            return false;
        return progress.completedCapabilities.includes(capability);
    }
    /**
     * Get next pending capability
     */
    getNextCapability(sessionId) {
        const progress = this.progressMap.get(sessionId);
        if (!progress)
            return null;
        return progress.currentCapability || progress.pendingCapabilities[0] || null;
    }
    /**
     * Get assignment for a capability
     */
    getCapabilityAssignment(capability) {
        // This will be implemented by looking up which eye provides this capability
        // For now, return null as we need to integrate with capability router
        return null;
    }
    /**
     * Serialize progress for storage
     */
    serializeProgress(sessionId) {
        const progress = this.progressMap.get(sessionId);
        if (!progress)
            return '';
        return JSON.stringify({
            completedCapabilities: progress.completedCapabilities,
            currentCapability: progress.currentCapability,
            pendingCapabilities: progress.pendingCapabilities,
            isCodeRelated: progress.isCodeRelated,
            updatedAt: progress.updatedAt.toISOString(),
        });
    }
    /**
     * Load progress from serialized data
     */
    loadProgress(sessionId, data) {
        try {
            const parsed = JSON.parse(data);
            const existing = this.progressMap.get(sessionId);
            if (existing) {
                existing.completedCapabilities = parsed.completedCapabilities || [];
                existing.currentCapability = parsed.currentCapability || null;
                existing.pendingCapabilities = parsed.pendingCapabilities || [];
                existing.isCodeRelated = parsed.isCodeRelated || false;
                existing.updatedAt = new Date(parsed.updatedAt || Date.now());
                this.progressMap.set(sessionId, existing);
            }
        }
        catch (error) {
            console.error('Failed to load capability progress:', error);
        }
    }
    /**
     * Clear progress for a session
     */
    clearProgress(sessionId) {
        this.progressMap.delete(sessionId);
    }
}
// Export singleton instance
export const capabilityProgress = new CapabilityProgressManager();
//# sourceMappingURL=capability-progress.js.map