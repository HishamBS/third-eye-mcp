/**
 * Routing Decision Types
 *
 * SSOT: Re-exported from @third-eye/types (packages/types/interfaces.ts)
 * Per R01: Single source of truth
 * Per R07: Strict typing throughout
 */

export type { RoutingDecisionRequest, RoutingDecision } from "@third-eye/types";

export interface RoutingDecisionResponse {
  readonly success: boolean;
  readonly data?: {
    readonly decision: import("@third-eye/types").RoutingDecision;
  };
  readonly error?: {
    readonly code: string;
    readonly detail: string;
  };
}

// ============================================================================
// Routing Modes Types (Policies & Templates)
// SSOT for routing policy and pipeline template data structures
// ============================================================================

export interface RoutingPolicy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly mandatoryEyes: readonly string[];
  readonly forbiddenEyes?: readonly string[];
  readonly minValidationEyes?: number;
  readonly securityRequired: boolean;
  readonly alwaysConfirmIntent: boolean;
  readonly customConstraints?: readonly Constraint[];
  readonly isActive: boolean;
  readonly createdAt: number;
}

export interface Constraint {
  readonly type: string;
  readonly value: unknown;
  readonly reason: string;
}

export interface PipelineTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly eyes: readonly string[];
  readonly strict: boolean;
  readonly autoTriggerPattern?: string;
  readonly createdBy?: string;
  readonly isPublic: boolean;
  readonly usageCount: number;
  readonly createdAt: number;
}

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface TemplateExecutionPlan {
  readonly templateId: string;
  readonly templateName: string;
  readonly eyeSequence: readonly string[];
  readonly strict: boolean;
  readonly reasoning: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  mandatoryEyes: string[];
  forbiddenEyes?: string[];
  minValidationEyes?: number;
  securityRequired?: boolean;
  alwaysConfirmIntent?: boolean;
  customConstraints?: Constraint[];
}

export interface UpdatePolicyRequest extends Partial<CreatePolicyRequest> {
  isActive?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  eyes: string[];
  strict?: boolean;
  autoTriggerPattern?: string;
  createdBy?: string;
  isPublic?: boolean;
}
