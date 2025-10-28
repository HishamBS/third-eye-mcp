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
export class CapabilityProgressManager {
  private progressMap = new Map<string, CapabilityProgress>();

  /**
   * Initialize capability progress for a session
   */
  initializeProgress(sessionId: string, isCodeRelated: boolean): void {
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
  completeCapability(sessionId: string, capability: EyeCapability): void {
    const progress = this.progressMap.get(sessionId);
    if (!progress) return;

    if (!progress.completedCapabilities.includes(capability)) {
      progress.completedCapabilities.push(capability);
    }

    // Remove from pending if present
    progress.pendingCapabilities = progress.pendingCapabilities.filter(
      c => c !== capability
    );

    // Update current capability
    progress.currentCapability = progress.pendingCapabilities[0] || null;

    progress.updatedAt = new Date();
    this.progressMap.set(sessionId, progress);
  }

  /**
   * Set pending capabilities for a session
   */
  setPendingCapabilities(sessionId: string, capabilities: EyeCapability[]): void {
    const progress = this.progressMap.get(sessionId);
    if (!progress) return;

    progress.pendingCapabilities = capabilities.filter(
      cap => !progress.completedCapabilities.includes(cap)
    );

    // Set current capability
    progress.currentCapability = progress.pendingCapabilities[0] || null;

    progress.updatedAt = new Date();
    this.progressMap.set(sessionId, progress);
  }

  /**
   * Get capability progress for a session
   */
  getProgress(sessionId: string): CapabilityProgress | undefined {
    return this.progressMap.get(sessionId);
  }

  /**
   * Get current capability
   */
  getCurrentCapability(sessionId: string): EyeCapability | null {
    const progress = this.progressMap.get(sessionId);
    return progress?.currentCapability || null;
  }

  /**
   * Check if a capability is completed
   */
  isCapabilityCompleted(sessionId: string, capability: EyeCapability): boolean {
    const progress = this.progressMap.get(sessionId);
    if (!progress) return false;

    return progress.completedCapabilities.includes(capability);
  }

  /**
   * Get next pending capability
   */
  getNextCapability(sessionId: string): EyeCapability | null {
    const progress = this.progressMap.get(sessionId);
    if (!progress) return null;

    return progress.currentCapability || progress.pendingCapabilities[0] || null;
  }

  /**
   * Get assignment for a capability
   */
  getCapabilityAssignment(capability: EyeCapability): CapabilityAssignment | null {
    // This will be implemented by looking up which eye provides this capability
    // For now, return null as we need to integrate with capability router
    return null;
  }

  /**
   * Serialize progress for storage
   */
  serializeProgress(sessionId: string): string {
    const progress = this.progressMap.get(sessionId);
    if (!progress) return '';

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
  loadProgress(sessionId: string, data: string): void {
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
    } catch (error) {
      console.error('Failed to load capability progress:', error);
    }
  }

  /**
   * Clear progress for a session
   */
  clearProgress(sessionId: string): void {
    this.progressMap.delete(sessionId);
  }
}

// Export singleton instance
export const capabilityProgress = new CapabilityProgressManager();

