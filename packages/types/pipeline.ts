/**
 * Pipeline DAG Types - Directed Acyclic Graph structures for pipeline execution
 *
 * Defines the core data structures for representing pipeline workflows
 * as DAGs (Directed Acyclic Graphs) for execution orchestration.
 */

import type { EyeName } from "./enums";

/**
 * Pipeline DAG Node - Represents a single node in the pipeline graph
 */
export interface PipelineDagNode {
  /** Unique identifier for the node */
  id: string;

  /** Type of node: 'Eye', 'condition', 'user_input', 'terminal', 'switch', 'if', 'loop_over_items' */
  type:
    | "Eye"
    | "condition"
    | "user_input"
    | "terminal"
    | "switch"
    | "if"
    | "loop_over_items";

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

  /** Switch node configuration (for switch type nodes) */
  switchConfig?: SwitchNodeConfig;

  /** IF node configuration (for if type nodes) */
  ifConfig?: IfNodeConfig;

  /** Loop node configuration (for loop_over_items type nodes) */
  loopConfig?: LoopNodeConfig;
}

/**
 * Switch Node Configuration - N8N-style multi-way routing
 * Evaluates rules against execution context and routes to matching outputs
 */
export interface SwitchNodeConfig {
  /** Mode: rules-based or single expression */
  mode: "rules" | "expression";

  /** Rules for multi-way routing (rules mode) */
  rules?: SwitchRule[];

  /** Single expression returning output index (expression mode) */
  expression?: string;

  /** Index of fallback output when no rules match */
  fallbackOutput?: number;

  /** Send data to all matching outputs vs first match only */
  sendToAll: boolean;
}

/**
 * Switch Rule - Individual routing rule
 */
export interface SwitchRule {
  /** JSONLogic expression or simple condition */
  expression: string;

  /** Human-readable label for this rule */
  label: string;

  /** Output index to route to when this rule matches */
  outputIndex: number;
}

/**
 * IF Node Configuration - Binary branching (true/false)
 */
export interface IfNodeConfig {
  /** JSONLogic expression evaluating to boolean */
  condition: string;

  /** Label for true branch */
  trueLabel?: string;

  /** Label for false branch */
  falseLabel?: string;
}

/**
 * Loop Node Configuration - Iterate over items with batch support
 */
export interface LoopNodeConfig {
  /** Maximum number of iterations */
  maxIterations: number;

  /** Number of items to process per iteration (optional) */
  batchSize?: number;
}

/**
 * Pipeline DAG Edge - Represents a connection between nodes
 */
export interface PipelineDagEdge {
  /** Source node ID */
  from: string;

  /** Target node ID */
  to: string;

  /** Conditional expression (optional) - can be string or ExpressionRule */
  on?: string | ExpressionRule;

  /** Whether this edge represents a loop/retry */
  loop?: boolean;

  /** Edge label/description */
  label?: string;

  /** Whether this is a fallback edge (executes when no other conditions match) */
  fallback?: boolean;

  /** Priority for multi-path routing (lower number = higher priority) */
  priority?: number;
}

/**
 * Expression Rule - Structured expression configuration
 * Supports both simple conditions and complex JSONLogic expressions
 */
export interface ExpressionRule {
  /** Type of expression */
  type: "expression" | "simple";

  /** JSONLogic expression (for type='expression') */
  expression?: string;

  /** Simple field comparison (for type='simple') */
  field?: string;

  /** Comparison operator (for type='simple') */
  operator?: "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "contains";

  /** Comparison value (for type='simple') */
  value?: unknown;
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

  /** Routing mode for this pipeline */
  routingMode?: PipelineRoutingMode;

  /** Expression language version (for backward compatibility) */
  expressionVersion?: string;
}

/**
 * Pipeline Routing Mode - How pipeline execution is controlled
 */
export type PipelineRoutingMode = "overseer" | "manual" | "guided";

/**
 * Routing Mode Descriptions (for UI)
 */
export const ROUTING_MODE_DESCRIPTIONS: Record<PipelineRoutingMode, string> = {
  overseer:
    "Overseer analyzes request and recommends optimal eye sequence (default)",
  manual: "Fully manual routing with Switch/IF nodes controlling flow",
  guided: "Overseer provides verdicts, Switch nodes evaluate them",
} as const;
