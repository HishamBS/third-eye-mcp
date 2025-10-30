/**
 * Base Node Handler - Interface for all node type handlers
 *
 * Strategy pattern for handling different node types in pipeline execution
 */

import type { PipelineDagNode } from '../../types/dist/pipeline';

export interface ExecutionContext {
  runId: string;
  sessionId: string;
  pipelineId: string;
  input: unknown;
  previousResults: Map<string, NodeExecutionResult>;
  currentNodeId: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'awaiting_input';
  verdict?: string;
  output?: unknown;
  error?: string;
  tokensUsed?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface NodeHandler {
  /**
   * Check if this handler can handle the given node
   */
  canHandle(node: PipelineDagNode): boolean;

  /**
   * Execute the node
   */
  execute(node: PipelineDagNode, context: ExecutionContext): Promise<NodeExecutionResult>;
}
