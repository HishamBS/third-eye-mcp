/**
 * Routing Modes - Phase 1-A2
 *
 * Three modes for pipeline routing:
 * 1. Fully Dynamic - Overseer decides everything (current behavior)
 * 2. Constrained Dynamic - Overseer + user policies (mandatory/forbidden eyes)
 * 3. Fixed Template - User-defined exact sequence (no Overseer)
 *
 * Per R07: Strict typing, no 'any'
 * Per R13: Enums and interfaces for SSOT
 */

/**
 * Routing mode determines how pipeline sequence is determined
 */
export enum RoutingMode {
  /** Overseer analyzes request and dynamically selects optimal eyes */
  FULLY_DYNAMIC = 'fully_dynamic',

  /** Overseer routes within user-defined constraints */
  CONSTRAINED_DYNAMIC = 'constrained',

  /** User-defined exact sequence, no dynamic routing */
  FIXED_TEMPLATE = 'fixed'
}

/**
 * Routing policy for Constrained Dynamic mode
 * Constrains Overseer's routing decisions
 */
export interface RoutingPolicy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly mandatoryEyes: readonly string[];        // Always include these
  readonly forbiddenEyes?: readonly string[];       // Never use these
  readonly minValidationEyes?: number;              // Minimum validation steps
  readonly securityRequired?: boolean;              // Must include security validation
  readonly alwaysConfirmIntent?: boolean;           // Jōgan always required
  readonly customConstraints?: readonly Constraint[];
  readonly isActive: boolean;
  readonly createdAt: number;
}

/**
 * Custom constraint for routing policy
 */
export interface Constraint {
  readonly type: 'must_include' | 'must_exclude' | 'sequence_order' | 'max_eyes';
  readonly value: unknown;
  readonly reason: string;
}

/**
 * Pipeline template for Fixed mode
 * Defines exact eye sequence with no deviations
 */
export interface PipelineTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly eyes: readonly string[];                 // Exact sequence
  readonly strict: boolean;                         // No deviations allowed
  readonly autoTriggerPattern?: string;             // Regex for automatic triggering
  readonly createdBy?: string;
  readonly isPublic: boolean;
  readonly usageCount: number;
  readonly createdAt: number;
}

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Routing decision context
 */
export interface RoutingContext {
  readonly sessionId: string;
  readonly requestType: 'new_task' | 'draft_review' | 'validation_only';
  readonly mode: RoutingMode;
  readonly policyId?: string;
  readonly templateId?: string;
}
