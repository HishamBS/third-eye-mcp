"use client";

import { useEffect, useState, useCallback } from "react";
import type { Node, Edge } from "reactflow";
import { useReactFlow } from "reactflow";
import type { RoutingDecision } from "@/types/routing";
import {
  ACTIVE_PATH_GLOW_COLOR,
  ACTIVE_PATH_NODE_BORDER,
  ACTIVE_PATH_EDGE_STYLE,
  INACTIVE_PATH_OPACITY,
  INACTIVE_PATH_FILTER,
  PATH_HIGHLIGHT_TRANSITION,
  ERROR_ROUTING_DECISION_NOT_FOUND,
  ERROR_ROUTING_DECISION_FETCH_FAILED,
} from "@third-eye/constants";
import { API_BASE_URL } from "@/consts/api";

export interface RuntimeRouteHighlighterProps {
  sessionId: string | null;
  onRoutingDecisionLoaded?: (decision: RoutingDecision) => void;
  onError?: (error: string) => void;
}

/**
 * Runtime Route Highlighter
 *
 * Fetches routing decision for a given session and highlights the actual path taken
 * in the pipeline visualization with smooth animations.
 *
 * Features:
 * - Fetches routing decision from API
 * - Highlights nodes and edges in the actual routing path
 * - Dims unused branches
 * - Smooth transition animations
 * - Error handling with user-friendly messages
 *
 * Per R01: Uses centralized constants for styling
 * Per R04: Optimized with useCallback for performance
 * Per R07: Strict typing throughout
 * Per R13: No magic strings - all from constants
 */
export function RuntimeRouteHighlighter({
  sessionId,
  onRoutingDecisionLoaded,
  onError,
}: RuntimeRouteHighlighterProps) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const [routingDecision, setRoutingDecision] =
    useState<RoutingDecision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch routing decision from API
   */
  const fetchRoutingDecision = useCallback(
    async (sid: string): Promise<RoutingDecision | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/routing-decisions/session/${sid}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            const errorMessage = ERROR_ROUTING_DECISION_NOT_FOUND;
            setError(errorMessage);
            onError?.(errorMessage);
            return null;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.decision) {
          throw new Error(ERROR_ROUTING_DECISION_FETCH_FAILED);
        }

        const decision = data.data.decision as RoutingDecision;
        setRoutingDecision(decision);
        onRoutingDecisionLoaded?.(decision);
        return decision;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : ERROR_ROUTING_DECISION_FETCH_FAILED;
        setError(errorMessage);
        onError?.(errorMessage);
        console.error("[RuntimeRouteHighlighter] Fetch error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onRoutingDecisionLoaded, onError],
  );

  /**
   * Highlight the routing path by modifying node and edge styles
   */
  const highlightPath = useCallback(
    (decision: RoutingDecision) => {
      const activePath = new Set(decision.selectedEyes);
      const nodes = getNodes();
      const edges = getEdges();

      // Update nodes: highlight active, dim inactive
      const updatedNodes = nodes.map((node) => {
        const isInPath = activePath.has(node.id);

        return {
          ...node,
          style: {
            ...node.style,
            opacity: isInPath ? 1 : INACTIVE_PATH_OPACITY,
            filter: isInPath ? "none" : INACTIVE_PATH_FILTER,
            transition: `all ${PATH_HIGHLIGHT_TRANSITION}ms ease-in-out`,
          },
          className: isInPath
            ? `${node.className || ""} ${ACTIVE_PATH_GLOW_COLOR}`
            : node.className,
        };
      });

      // Update edges: highlight if both source and target are in path
      const updatedEdges = edges.map((edge) => {
        const sourceInPath = activePath.has(edge.source);
        const targetInPath = activePath.has(edge.target);
        const isInPath = sourceInPath && targetInPath;

        return {
          ...edge,
          style: {
            ...edge.style,
            opacity: isInPath ? 1 : INACTIVE_PATH_OPACITY,
            stroke: isInPath ? "#10b981" : edge.style?.stroke,
            strokeWidth: isInPath ? 3 : edge.style?.strokeWidth || 2,
            transition: `all ${PATH_HIGHLIGHT_TRANSITION}ms ease-in-out`,
          },
          animated: isInPath,
        };
      });

      setNodes(updatedNodes);
      setEdges(updatedEdges);
    },
    [getNodes, getEdges, setNodes, setEdges],
  );

  /**
   * Reset all highlights back to default
   */
  const resetHighlights = useCallback(() => {
    const nodes = getNodes();
    const edges = getEdges();

    const resetNodes = nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: 1,
        filter: "none",
      },
      className: node.className?.replace(ACTIVE_PATH_GLOW_COLOR, ""),
    }));

    const resetEdges = edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: 1,
      },
      animated: false,
    }));

    setNodes(resetNodes);
    setEdges(resetEdges);
  }, [getNodes, getEdges, setNodes, setEdges]);

  /**
   * Main effect: Fetch routing decision and highlight path when sessionId changes
   */
  useEffect(() => {
    if (!sessionId) {
      // No session selected - reset highlights
      resetHighlights();
      setRoutingDecision(null);
      setError(null);
      return;
    }

    // Fetch and highlight
    const performFetchAndHighlight = async () => {
      const decision = await fetchRoutingDecision(sessionId);
      if (decision) {
        highlightPath(decision);
      }
    };

    performFetchAndHighlight();
  }, [sessionId, fetchRoutingDecision, highlightPath, resetHighlights]);

  // Component doesn't render anything - it only modifies ReactFlow state
  return null;
}
