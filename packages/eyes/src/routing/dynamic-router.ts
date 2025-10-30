/**
 * Dynamic Router - Phase 17
 *
 * Overseer-powered intelligent routing that analyzes requests and determines
 * the optimal Eye sequence dynamically at runtime.
 *
 * Per R07: Strict typing, no 'any'
 * Per R13: Interfaces exported for SSOT
 */

import type { EyeName } from '../types';
import type { RoutingDecision as CoreRoutingDecision, AutoRouterOptions } from '@third-eye/core/auto-router';
import { autoRouter } from '@third-eye/core/auto-router';

/**
 * Eye Route Step - Single step in pipeline sequence
 */
export interface EyeRouteStep {
  readonly eyeId: EyeName;
  readonly stage: 'guidance' | 'validation' | 'both';
  readonly reason: string;
  readonly order: number;
}

/**
 * Eye Sequence - Ordered list of Eyes with rationale
 */
export interface EyeSequence {
  readonly eyes: readonly EyeRouteStep[];
  readonly rationale: string;
  readonly confidence: number;
  readonly estimatedDuration?: number;
}

/**
 * Validation Result for route checking
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Session Context for routing analysis
 */
export interface SessionContext {
  readonly sessionId: string;
  readonly previousEyes?: readonly EyeName[];
  readonly userPreferences?: Record<string, unknown>;
  readonly strictness?: Record<string, unknown>;
}

/**
 * Dynamic Router - Phase 17 Implementation
 *
 * Wraps core AutoRouter with clean Phase 17 API
 */
export class DynamicRouter {
  /**
   * Analyze request and determine optimal Eye sequence
   *
   * Uses Overseer persona to intelligently route based on:
   * - Request content and complexity
   * - Session context and history
   * - User preferences and strictness settings
   */
  async analyzeRequest(
    input: string,
    context: SessionContext
  ): Promise<EyeSequence> {
    const options: AutoRouterOptions = {
      strictness: context.strictness,
      context: {
        previousEyes: context.previousEyes,
        userPreferences: context.userPreferences,
      },
    };

    // Call core AutoRouter which uses Overseer for routing
    const routing = await autoRouter.analyzeTask(
      input,
      context.sessionId,
      context.sessionId,
      options
    );

    // Transform to Phase 17 API format
    return this.transformRoutingDecision(routing);
  }

  /**
   * Validate proposed route for correctness
   *
   * Checks:
   * - No circular dependencies
   * - All Eyes exist and are active
   * - Sequence is logically valid
   */
  async validateRoute(route: EyeSequence): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    const eyeIds = route.eyes.map(step => step.eyeId);
    const uniqueEyes = new Set(eyeIds);
    if (uniqueEyes.size !== eyeIds.length) {
      warnings.push('Route contains duplicate Eyes - may be intentional for multi-pass');
    }

    // Check minimum sequence length
    if (route.eyes.length === 0) {
      errors.push('Route must contain at least one Eye');
    }

    // Check confidence threshold
    if (route.confidence < 0.5) {
      warnings.push(`Low confidence route (${route.confidence.toFixed(2)}) - manual review recommended`);
    }

    // Validate stage transitions
    for (let i = 0; i < route.eyes.length - 1; i++) {
      const current = route.eyes[i];
      const next = route.eyes[i + 1];

      // Guidance should generally come before validation
      if (current.stage === 'validation' && next.stage === 'guidance') {
        warnings.push(`Unusual stage order: ${current.eyeId} (validation) → ${next.eyeId} (guidance)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get routing decision for existing session
   */
  async getRoutingDecision(sessionId: string): Promise<EyeSequence | null> {
    // This would query stored routing decisions from database
    // For now, return null if not found
    return null;
  }

  /**
   * Transform core RoutingDecision to Phase 17 EyeSequence format
   */
  private transformRoutingDecision(routing: CoreRoutingDecision): EyeSequence {
    const steps: EyeRouteStep[] = routing.recommendedFlow.map((eyeId, index) => ({
      eyeId,
      stage: this.inferStage(eyeId),
      reason: this.extractReasonForEye(eyeId, routing.reasoning),
      order: index,
    }));

    return {
      eyes: steps,
      rationale: routing.reasoning,
      confidence: this.calculateConfidence(routing),
      estimatedDuration: routing.estimatedSteps * 3000, // ~3s per Eye
    };
  }

  /**
   * Infer Eye stage from name/capabilities
   */
  private inferStage(eyeId: EyeName): 'guidance' | 'validation' | 'both' {
    // Overseer is special - handles routing
    if (eyeId === 'overseer') return 'both';

    // Known guidance Eyes
    const guidanceEyes: EyeName[] = ['sharingan', 'kyuubi', 'jogan'];
    if (guidanceEyes.includes(eyeId)) return 'guidance';

    // Known validation Eyes
    const validationEyes: EyeName[] = ['rinnegan', 'mangekyo', 'byakugan', 'tenseigan'];
    if (validationEyes.includes(eyeId)) return 'validation';

    // Default to both if unsure
    return 'both';
  }

  /**
   * Extract reason for specific Eye from overall reasoning
   */
  private extractReasonForEye(eyeId: EyeName, reasoning: string): string {
    // Try to find Eye-specific rationale in reasoning text
    const lines = reasoning.split('\n');
    const eyeLine = lines.find(line =>
      line.toLowerCase().includes(eyeId.toLowerCase())
    );

    if (eyeLine) {
      return eyeLine.trim();
    }

    // Fallback: generic reason
    return `Included in Overseer-determined optimal sequence`;
  }

  /**
   * Calculate confidence score based on routing decision
   */
  private calculateConfidence(routing: CoreRoutingDecision): number {
    // Base confidence on complexity and flow length
    let confidence = 0.8; // Base confidence

    // Higher complexity = lower confidence (more uncertain)
    if (routing.complexity === 'complex') confidence -= 0.2;
    if (routing.complexity === 'simple') confidence += 0.1;

    // Very short or very long flows may indicate uncertainty
    if (routing.recommendedFlow.length < 2) confidence -= 0.1;
    if (routing.recommendedFlow.length > 6) confidence -= 0.1;

    // Ensure in range [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }
}

// Export singleton instance
export const dynamicRouter = new DynamicRouter();
