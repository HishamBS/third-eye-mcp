/**
 * DAG Graph Builder - Builds and analyzes directed acyclic graphs for pipeline execution
 *
 * Responsibilities:
 * - Build adjacency list from nodes/edges
 * - Topological sort for execution order
 * - Cycle detection
 * - Parallel branch identification
 * - Dependency resolution
 */

import type { PipelineDagNode, PipelineDagEdge } from '../types/dist/pipeline';

// ============================================================================
// Types
// ============================================================================

export interface DagGraph {
  nodes: Map<string, PipelineDagNode>;
  adjacencyList: Map<string, DagEdgeInfo[]>;
  reverseAdjacencyList: Map<string, DagEdgeInfo[]>;
  entryNodeId: string;
}

export interface DagEdgeInfo {
  targetNodeId: string;
  condition: string;
  loop: boolean;
}

export interface TopologicalSortResult {
  order: string[];
  levels: string[][];
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath?: string[];
}

export interface ParallelBranches {
  branches: string[][];
  convergenceNodeId?: string;
}

// ============================================================================
// DAG Graph Builder
// ============================================================================

export class DagGraphBuilder {
  /**
   * Build DAG graph from nodes and edges
   */
  static buildGraph(
    nodes: PipelineDagNode[],
    edges: PipelineDagEdge[],
    entryNodeId: string
  ): DagGraph {
    const nodesMap = new Map<string, PipelineDagNode>();
    const adjacencyList = new Map<string, DagEdgeInfo[]>();
    const reverseAdjacencyList = new Map<string, DagEdgeInfo[]>();

    // Build nodes map
    for (const node of nodes) {
      nodesMap.set(node.id, node);
      adjacencyList.set(node.id, []);
      reverseAdjacencyList.set(node.id, []);
    }

    // Build adjacency lists
    for (const edge of edges) {
      const edgeInfo: DagEdgeInfo = {
        targetNodeId: edge.to,
        condition: edge.on,
        loop: edge.loop ?? false,
      };

      // Forward edges
      const fromEdges = adjacencyList.get(edge.from) ?? [];
      fromEdges.push(edgeInfo);
      adjacencyList.set(edge.from, fromEdges);

      // Reverse edges (for dependency tracking)
      const toEdges = reverseAdjacencyList.get(edge.to) ?? [];
      toEdges.push({
        targetNodeId: edge.from,
        condition: edge.on,
        loop: edge.loop ?? false,
      });
      reverseAdjacencyList.set(edge.to, toEdges);
    }

    return {
      nodes: nodesMap,
      adjacencyList,
      reverseAdjacencyList,
      entryNodeId,
    };
  }

  /**
   * Detect cycles in the graph using DFS
   */
  static detectCycles(graph: DagGraph): CycleDetectionResult {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.adjacencyList.get(nodeId) ?? [];
      for (const edge of neighbors) {
        // Skip loop edges (they're allowed for retry logic)
        if (edge.loop) continue;

        if (!visited.has(edge.targetNodeId)) {
          if (dfs(edge.targetNodeId)) {
            return true;
          }
        } else if (recursionStack.has(edge.targetNodeId)) {
          // Cycle detected
          path.push(edge.targetNodeId);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
      return false;
    };

    // Start DFS from entry node
    if (dfs(graph.entryNodeId)) {
      return {
        hasCycle: true,
        cyclePath: [...path],
      };
    }

    return { hasCycle: false };
  }

  /**
   * Perform topological sort using Kahn's algorithm
   * Returns execution order and parallel levels
   */
  static topologicalSort(graph: DagGraph): TopologicalSortResult {
    // Calculate in-degrees (excluding loop edges)
    const inDegree = new Map<string, number>();
    for (const nodeId of graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
    }

    for (const [nodeId, edges] of graph.adjacencyList.entries()) {
      for (const edge of edges) {
        if (!edge.loop) {
          const currentDegree = inDegree.get(edge.targetNodeId) ?? 0;
          inDegree.set(edge.targetNodeId, currentDegree + 1);
        }
      }
    }

    // Queue for nodes with in-degree 0
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const order: string[] = [];
    const levels: string[][] = [];

    while (queue.length > 0) {
      // Process all nodes at current level (parallel execution)
      const currentLevel = [...queue];
      levels.push(currentLevel);
      queue.length = 0;

      for (const nodeId of currentLevel) {
        order.push(nodeId);

        // Reduce in-degree of neighbors
        const neighbors = graph.adjacencyList.get(nodeId) ?? [];
        for (const edge of neighbors) {
          if (!edge.loop) {
            const newDegree = (inDegree.get(edge.targetNodeId) ?? 1) - 1;
            inDegree.set(edge.targetNodeId, newDegree);

            if (newDegree === 0) {
              queue.push(edge.targetNodeId);
            }
          }
        }
      }
    }

    return { order, levels };
  }

  /**
   * Identify parallel branches from a given node
   * Returns groups of nodes that can execute in parallel
   */
  static identifyParallelBranches(
    graph: DagGraph,
    startNodeId: string
  ): ParallelBranches {
    const outgoingEdges = graph.adjacencyList.get(startNodeId) ?? [];

    // If less than 2 outgoing edges, no parallelism
    if (outgoingEdges.length < 2) {
      return { branches: [] };
    }

    // Build branches by following each path
    const branches: string[][] = [];
    const visitedInBranch = new Set<string>();

    for (const edge of outgoingEdges) {
      if (edge.loop) continue;

      const branch: string[] = [];
      const queue = [edge.targetNodeId];
      const branchVisited = new Set<string>();

      while (queue.length > 0) {
        const nodeId = queue.shift()!;

        // Stop if we've seen this node in another branch (convergence point)
        if (visitedInBranch.has(nodeId)) {
          // This is a convergence point
          return {
            branches,
            convergenceNodeId: nodeId,
          };
        }

        if (branchVisited.has(nodeId)) continue;

        branch.push(nodeId);
        branchVisited.add(nodeId);
        visitedInBranch.add(nodeId);

        // Follow outgoing edges
        const nextEdges = graph.adjacencyList.get(nodeId) ?? [];
        for (const nextEdge of nextEdges) {
          if (!nextEdge.loop) {
            queue.push(nextEdge.targetNodeId);
          }
        }
      }

      if (branch.length > 0) {
        branches.push(branch);
      }
    }

    return { branches };
  }

  /**
   * Get all paths from start to end node
   * Useful for execution planning
   */
  static getAllPaths(
    graph: DagGraph,
    startNodeId: string,
    endNodeId: string
  ): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (nodeId: string, path: string[]) => {
      if (nodeId === endNodeId) {
        paths.push([...path, nodeId]);
        return;
      }

      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const neighbors = graph.adjacencyList.get(nodeId) ?? [];
      for (const edge of neighbors) {
        if (!edge.loop) {
          dfs(edge.targetNodeId, [...path, nodeId]);
        }
      }

      visited.delete(nodeId);
    };

    dfs(startNodeId, []);
    return paths;
  }

  /**
   * Find terminal nodes (nodes with no outgoing edges)
   */
  static findTerminalNodes(graph: DagGraph): string[] {
    const terminalNodes: string[] = [];

    for (const [nodeId, edges] of graph.adjacencyList.entries()) {
      const nonLoopEdges = edges.filter(e => !e.loop);
      if (nonLoopEdges.length === 0) {
        terminalNodes.push(nodeId);
      }
    }

    return terminalNodes;
  }

  /**
   * Get dependencies for a node (all nodes that must execute before it)
   */
  static getDependencies(graph: DagGraph, nodeId: string): string[] {
    const dependencies = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const incomingEdges = graph.reverseAdjacencyList.get(current) ?? [];
      for (const edge of incomingEdges) {
        if (!edge.loop && edge.targetNodeId !== nodeId) {
          dependencies.add(edge.targetNodeId);
          queue.push(edge.targetNodeId);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Prune graph to only include required Eye nodes and their connecting paths
   * Used for intelligent routing - executes only necessary Eyes
   */
  static pruneToRequiredEyes(
    graph: DagGraph,
    requiredEyeNames: string[]
  ): DagGraph {
    // Find nodes matching required Eye names
    const requiredNodeIds = new Set<string>();
    for (const [nodeId, node] of graph.nodes.entries()) {
      // Match Eye nodes by eyeId field
      if (node.type === 'Eye' && node.eyeId && requiredEyeNames.includes(node.eyeId)) {
        requiredNodeIds.add(nodeId);
      }
    }

    // Always include entry node
    requiredNodeIds.add(graph.entryNodeId);

    // Always include terminal nodes
    const terminalNodes = this.findTerminalNodes(graph);
    for (const terminalId of terminalNodes) {
      requiredNodeIds.add(terminalId);
    }

    // Find all nodes in paths from entry to required Eyes to terminals
    const pathNodes = new Set<string>();

    // BFS from entry to find paths to required nodes
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: graph.entryNodeId, path: [graph.entryNodeId] }
    ];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // If this node is required or terminal, add entire path
      if (requiredNodeIds.has(nodeId)) {
        for (const pathNodeId of path) {
          pathNodes.add(pathNodeId);
        }
      }

      // Continue exploring
      const edges = graph.adjacencyList.get(nodeId) ?? [];
      for (const edge of edges) {
        if (!edge.loop && !visited.has(edge.targetNodeId)) {
          queue.push({
            nodeId: edge.targetNodeId,
            path: [...path, edge.targetNodeId]
          });
        }
      }
    }

    // Build pruned graph with only path nodes
    const prunedNodes = new Map<string, PipelineDagNode>();
    const prunedAdjacencyList = new Map<string, DagEdgeInfo[]>();
    const prunedReverseAdjacencyList = new Map<string, DagEdgeInfo[]>();

    // Add nodes
    for (const nodeId of pathNodes) {
      const node = graph.nodes.get(nodeId);
      if (node) {
        prunedNodes.set(nodeId, node);
        prunedAdjacencyList.set(nodeId, []);
        prunedReverseAdjacencyList.set(nodeId, []);
      }
    }

    // Add edges (only between nodes that are both in pruned set)
    for (const [fromId, edges] of graph.adjacencyList.entries()) {
      if (!pathNodes.has(fromId)) continue;

      for (const edge of edges) {
        if (pathNodes.has(edge.targetNodeId)) {
          // Add to forward adjacency
          const forwardEdges = prunedAdjacencyList.get(fromId) ?? [];
          forwardEdges.push(edge);
          prunedAdjacencyList.set(fromId, forwardEdges);

          // Add to reverse adjacency
          const reverseEdges = prunedReverseAdjacencyList.get(edge.targetNodeId) ?? [];
          reverseEdges.push({
            targetNodeId: fromId,
            condition: edge.condition,
            loop: edge.loop,
          });
          prunedReverseAdjacencyList.set(edge.targetNodeId, reverseEdges);
        }
      }
    }

    return {
      nodes: prunedNodes,
      adjacencyList: prunedAdjacencyList,
      reverseAdjacencyList: prunedReverseAdjacencyList,
      entryNodeId: graph.entryNodeId,
    };
  }

  /**
   * Validate graph structure
   * Checks for common issues like orphan nodes, missing entry, etc.
   */
  static validateGraph(graph: DagGraph): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check entry node exists
    if (!graph.nodes.has(graph.entryNodeId)) {
      errors.push(`Entry node "${graph.entryNodeId}" does not exist`);
    }

    // Check for cycles
    const cycleResult = this.detectCycles(graph);
    if (cycleResult.hasCycle) {
      errors.push(`Cycle detected: ${cycleResult.cyclePath?.join(' -> ')}`);
    }

    // Check for orphan nodes (nodes with no incoming or outgoing edges, except entry)
    for (const nodeId of graph.nodes.keys()) {
      if (nodeId === graph.entryNodeId) continue;

      const incoming = graph.reverseAdjacencyList.get(nodeId) ?? [];
      const outgoing = graph.adjacencyList.get(nodeId) ?? [];
      const nonLoopIncoming = incoming.filter(e => !e.loop);
      const nonLoopOutgoing = outgoing.filter(e => !e.loop);

      if (nonLoopIncoming.length === 0 && nonLoopOutgoing.length === 0) {
        errors.push(`Orphan node detected: "${nodeId}"`);
      }
    }

    // Check for unreachable nodes (can't reach from entry)
    const reachable = new Set<string>();
    const queue = [graph.entryNodeId];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (reachable.has(nodeId)) continue;
      reachable.add(nodeId);

      const edges = graph.adjacencyList.get(nodeId) ?? [];
      for (const edge of edges) {
        if (!edge.loop) {
          queue.push(edge.targetNodeId);
        }
      }
    }

    for (const nodeId of graph.nodes.keys()) {
      if (!reachable.has(nodeId)) {
        errors.push(`Unreachable node: "${nodeId}"`);
      }
    }

    // Check for terminal nodes
    const terminalNodes = this.findTerminalNodes(graph);
    if (terminalNodes.length === 0) {
      errors.push('No terminal nodes found - pipeline must have at least one terminal node');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
