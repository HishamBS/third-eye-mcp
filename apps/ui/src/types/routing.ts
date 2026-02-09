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
