/**
 * Routing Decision Types
 *
 * Type definitions for Overseer routing decisions and path highlighting
 * Per R07: Strict typing throughout
 */

export interface RoutingDecisionRequest {
  readonly requestType: string;
  readonly contentDomain: string;
  readonly complexity: string;
  readonly capabilitiesNeeded: readonly string[];
}

export interface RoutingDecision {
  readonly id: string;
  readonly sessionId: string;
  readonly requestAnalysis: RoutingDecisionRequest;
  readonly selectedEyes: readonly string[];
  readonly reasoning: string;
  readonly executionMode: "sequential" | "parallel";
  readonly createdAt: number;
}

export interface RoutingDecisionResponse {
  readonly success: boolean;
  readonly data?: {
    readonly decision: RoutingDecision;
  };
  readonly error?: {
    readonly code: string;
    readonly detail: string;
  };
}
