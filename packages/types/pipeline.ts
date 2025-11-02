/**
 * Pipeline DAG Types - Directed Acyclic Graph structures for pipeline execution
 *
 * Defines the core data structures for representing pipeline workflows
 * as DAGs (Directed Acyclic Graphs) for execution orchestration.
 */

import type { EyeName } from './enums';

/**
 * Pipeline DAG Node - Represents a single node in the pipeline graph
 */
export interface PipelineDagNode {
  /** Unique identifier for the node */
  id: string;

  /** Type of node: 'Eye', 'condition', 'user_input', 'terminal' */
  type: 'Eye' | 'condition' | 'user_input' | 'terminal';

  /** Eye identifier (required for Eye type nodes) */
  eyeId?: EyeName | string;

  /** Provider override configuration */
  providerOverride?: {
    provider: string;
    model: string;
  };

  /** Strictness override */
  strictnessOverride?: string;

  /** Additional node configuration */
  config?: Record<string, unknown>;

  /** Display label for UI */
  label?: string;

  /** Position metadata (for UI rendering) */
  position?: {
    x: number;
    y: number;
  };

  /** Conditional expression (for condition type nodes) */
  expression?: string;

  /** Verdict value (for terminal type nodes) */
  verdict?: string;

  /** Prompt key (for user_input type nodes) */
  promptKey?: string;
}

/**
 * Pipeline DAG Edge - Represents a connection between nodes
 */
export interface PipelineDagEdge {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Conditional expression (optional) */
  on?: string;

  /** Whether this edge represents a loop/retry */
  loop?: boolean;

  /** Edge label/description */
  label?: string;
}

/**
 * Pipeline DAG - Complete graph structure
 */
export interface PipelineDag {
  /** All nodes in the pipeline */
  nodes: PipelineDagNode[];

  /** All edges connecting nodes */
  edges: PipelineDagEdge[];

  /** Entry point node ID */
  entryNodeId?: string;
}
