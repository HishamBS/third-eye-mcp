/**
 * Routing Decisions Hooks - Phase 4
 *
 * API hooks for accessing routing decision data for DynamicRouteVisualizer and LiveRoutingPanel
 * Per R07: Strict typing, no 'any'
 * Per R13: Centralized API logic in hooks
 */

import { useState, useCallback, useEffect } from "react";
import { useAPI } from "./useAPI";

// ============================================================================
// Types
// ============================================================================

export interface RoutingDecision {
  readonly id: string;
  readonly sessionId: string;
  readonly requestAnalysis: {
    readonly requestType: string;
    readonly contentDomain: string;
    readonly complexity: string;
    readonly capabilitiesNeeded: readonly string[];
  };
  readonly selectedEyes: readonly string[];
  readonly reasoning: string;
  readonly executionMode: "sequential" | "parallel";
  readonly createdAt: number;
}

export interface RoutingDecisionsPagination {
  readonly limit: number;
  readonly offset: number;
  readonly total: number;
  readonly hasMore: boolean;
}

// ============================================================================
// Normalization
// ============================================================================

/** Ensure fields that the API may omit are always safe to iterate */
function normalizeDecision(raw: RoutingDecision): RoutingDecision {
  return {
    ...raw,
    selectedEyes: Array.isArray(raw.selectedEyes) ? raw.selectedEyes : [],
    requestAnalysis: {
      requestType: raw.requestAnalysis?.requestType ?? "unknown",
      contentDomain: raw.requestAnalysis?.contentDomain ?? "",
      complexity: raw.requestAnalysis?.complexity ?? "unknown",
      capabilitiesNeeded: Array.isArray(raw.requestAnalysis?.capabilitiesNeeded)
        ? raw.requestAnalysis.capabilitiesNeeded
        : [],
    },
  };
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * List routing decisions with pagination
 */
export function useRoutingDecisions(filters?: {
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}) {
  const api = useAPI();
  const [decisions, setDecisions] = useState<RoutingDecision[]>([]);
  const [pagination, setPagination] =
    useState<RoutingDecisionsPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecisions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.limit) params.set("limit", filters.limit.toString());
      if (filters?.offset) params.set("offset", filters.offset.toString());
      if (filters?.sort) params.set("sort", filters.sort);

      const queryString = params.toString();
      const url = `/api/routing-decisions${queryString ? `?${queryString}` : ""}`;

      // useAPI automatically unwraps the response envelope
      const data = await api.get<{
        decisions: RoutingDecision[];
        pagination: RoutingDecisionsPagination;
      }>(url);

      if (data && "decisions" in data && "pagination" in data) {
        setDecisions(data.decisions.map(normalizeDecision));
        setPagination(data.pagination);
      } else {
        throw new Error("Invalid response format from routing decisions API");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch routing decisions"),
      );
    } finally {
      setLoading(false);
    }
  }, [api, filters?.limit, filters?.offset, filters?.sort]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  return { decisions, pagination, loading, error, refetch: fetchDecisions };
}

/**
 * Get routing decision for a specific session
 */
export function useRoutingDecisionBySession(sessionId: string | null) {
  const api = useAPI();
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecision = useCallback(async () => {
    if (!sessionId) {
      setDecision(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // useAPI automatically unwraps the response envelope
      const data = await api.get<{
        decision: RoutingDecision;
      }>(`/api/routing-decisions/session/${sessionId}`);

      if (data && "decision" in data) {
        setDecision(normalizeDecision(data.decision));
      } else {
        throw new Error(`No routing decision found for session ${sessionId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch routing decision"),
      );
      setDecision(null);
    } finally {
      setLoading(false);
    }
  }, [api, sessionId]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  return { decision, loading, error, refetch: fetchDecision };
}

/**
 * Get specific routing decision by ID
 */
export function useRoutingDecision(decisionId: string | null) {
  const api = useAPI();
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDecision = useCallback(async () => {
    if (!decisionId) {
      setDecision(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // useAPI automatically unwraps the response envelope
      const data = await api.get<{
        decision: RoutingDecision;
      }>(`/api/routing-decisions/${decisionId}`);

      if (data && "decision" in data) {
        setDecision(normalizeDecision(data.decision));
      } else {
        throw new Error(`Routing decision ${decisionId} not found`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch routing decision"),
      );
      setDecision(null);
    } finally {
      setLoading(false);
    }
  }, [api, decisionId]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  return { decision, loading, error, refetch: fetchDecision };
}
