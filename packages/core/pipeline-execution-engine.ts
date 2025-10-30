/**
 * Pipeline Execution Engine - Core orchestrator for DAG pipeline execution
 *
 * Responsibilities:
 * - Load pipeline from database
 * - Build & validate DAG graph
 * - Execute nodes in topological order
 * - Handle conditional branching
 * - Emit WebSocket events for real-time updates
 * - Persist execution state
 * - Handle errors & retries
 */

import type { PipelineDag, PipelineDagNode, PipelineDagEdge } from '../types/dist/pipeline';
import { DagGraphBuilder, type DagGraph } from './dag-graph';
import {
  EyeNodeHandler,
  TerminalNodeHandler,
  UserInputNodeHandler,
  ConditionNodeHandler,
  type NodeHandler,
  type ExecutionContext,
  type NodeExecutionResult,
} from './node-handlers';

// ============================================================================
// Types
// ============================================================================

export interface PipelineExecutionConfig {
  pipelineId: string;
  sessionId: string;
  input: unknown;
  runId: string;
  recommendedEyes?: string[]; // Optional: intelligent routing from AutoRouter
  bypassRouting?: boolean; // Optional: force full pipeline execution
}

export interface PipelineExecutionState {
  runId: string;
  pipelineId: string;
  sessionId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'awaiting_input';
  currentNodeId?: string;
  executedNodes: string[];
  nodeResults: Map<string, NodeExecutionResult>;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export type PipelineEventType =
  | 'pipeline_started'
  | 'node_started'
  | 'node_completed'
  | 'node_error'
  | 'pipeline_paused'
  | 'pipeline_resumed'
  | 'pipeline_completed'
  | 'pipeline_failed'
  | 'awaiting_input';

export interface PipelineEvent {
  type: PipelineEventType;
  runId: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ============================================================================
// Pipeline Execution Engine
// ============================================================================

export class PipelineExecutionEngine {
  private readonly handlers: NodeHandler[];
  private state: PipelineExecutionState | null = null;
  private graph: DagGraph | null = null;
  private dag: PipelineDag | null = null;

  constructor() {
    // Initialize node handlers
    this.handlers = [
      new EyeNodeHandler(),
      new TerminalNodeHandler(),
      new UserInputNodeHandler(),
      new ConditionNodeHandler(),
    ];
  }

  /**
   * Execute a pipeline from start to finish
   */
  async execute(config: PipelineExecutionConfig, dag: PipelineDag): Promise<void> {
    try {
      // Initialize state
      this.initializeState(config);
      this.dag = dag;

      // Build DAG graph
      let fullGraph = DagGraphBuilder.buildGraph(dag.nodes, dag.edges, dag.entry);

      // Intelligent routing: prune graph if recommendedEyes provided
      if (config.recommendedEyes && config.recommendedEyes.length > 0 && !config.bypassRouting) {
        console.log(`[PipelineEngine] Intelligent routing enabled - pruning to ${config.recommendedEyes.length} Eyes:`, config.recommendedEyes);
        this.graph = DagGraphBuilder.pruneToRequiredEyes(fullGraph, config.recommendedEyes);
        console.log(`[PipelineEngine] Pruned graph: ${this.graph.nodes.size} nodes (from ${fullGraph.nodes.size})`);
      } else {
        console.log(`[PipelineEngine] Executing full pipeline (${fullGraph.nodes.size} nodes)`);
        this.graph = fullGraph;
      }

      // Validate graph
      const validation = DagGraphBuilder.validateGraph(this.graph);
      if (!validation.valid) {
        throw new Error(`Invalid pipeline graph: ${validation.errors.join(', ')}`);
      }

      // Emit start event
      this.emitEvent('pipeline_started', {
        pipelineId: config.pipelineId,
        sessionId: config.sessionId,
        entryNodeId: this.graph.entryNodeId,
        intelligentRouting: !!config.recommendedEyes,
        plannedNodes: this.graph.nodes.size,
      });

      // Execute pipeline
      await this.executeFromNode(this.graph.entryNodeId, config.input);

      // Mark as completed if not already
      if (this.state!.status === 'running') {
        this.state!.status = 'completed';
        this.state!.completedAt = Date.now();
        this.emitEvent('pipeline_completed', {
          executedNodes: this.state!.executedNodes,
          totalLatencyMs: Date.now() - this.state!.startedAt,
        });
      }
    } catch (error) {
      this.state!.status = 'failed';
      this.state!.error = error instanceof Error ? error.message : String(error);
      this.state!.completedAt = Date.now();

      this.emitEvent('pipeline_failed', {
        error: this.state!.error,
        failedAt: this.state!.currentNodeId,
      });

      throw error;
    }
  }

  /**
   * Pause pipeline execution
   */
  async pause(): Promise<void> {
    if (!this.state) {
      throw new Error('No active pipeline execution');
    }

    this.state.status = 'paused';
    this.emitEvent('pipeline_paused', {
      pausedAt: this.state.currentNodeId,
    });
  }

  /**
   * Resume pipeline execution with optional user input
   */
  async resume(userInput?: unknown): Promise<void> {
    if (!this.state) {
      throw new Error('No active pipeline execution');
    }

    if (this.state.status !== 'paused' && this.state.status !== 'awaiting_input') {
      throw new Error(`Cannot resume pipeline with status: ${this.state.status}`);
    }

    this.state.status = 'running';
    this.emitEvent('pipeline_resumed', {
      resumedFrom: this.state.currentNodeId,
    });

    // Continue execution from current node
    if (this.state.currentNodeId) {
      await this.executeFromNode(this.state.currentNodeId, userInput);
    }
  }

  /**
   * Get current execution state
   */
  getState(): PipelineExecutionState | null {
    return this.state;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Initialize execution state
   */
  private initializeState(config: PipelineExecutionConfig): void {
    this.state = {
      runId: config.runId,
      pipelineId: config.pipelineId,
      sessionId: config.sessionId,
      status: 'running',
      executedNodes: [],
      nodeResults: new Map(),
      startedAt: Date.now(),
    };
  }

  /**
   * Execute pipeline starting from a specific node
   */
  private async executeFromNode(nodeId: string, input: unknown): Promise<void> {
    if (!this.graph || !this.state || !this.dag) {
      throw new Error('Execution engine not initialized');
    }

    // Get node
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Update current node
    this.state.currentNodeId = nodeId;

    // Build execution context
    const context: ExecutionContext = {
      runId: this.state.runId,
      sessionId: this.state.sessionId,
      pipelineId: this.state.pipelineId,
      input,
      previousResults: this.state.nodeResults,
      currentNodeId: nodeId,
    };

    // Find handler for node type
    const handler = this.handlers.find(h => h.canHandle(node));
    if (!handler) {
      throw new Error(`No handler found for node type: ${node.type}`);
    }

    // Emit node started event
    this.emitEvent('node_started', {
      nodeId,
      nodeType: node.type,
    });

    // Execute node
    let result: NodeExecutionResult;
    try {
      result = await handler.execute(node, context);
    } catch (error) {
      // Handle execution error
      result = {
        nodeId,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };

      this.emitEvent('node_error', {
        nodeId,
        error: result.error,
      });

      throw error;
    }

    // Store result
    this.state.nodeResults.set(nodeId, result);
    this.state.executedNodes.push(nodeId);

    // Emit node completed event
    this.emitEvent('node_completed', {
      nodeId,
      status: result.status,
      verdict: result.verdict,
      latencyMs: result.latencyMs,
      tokensUsed: result.tokensUsed,
    });

    // Handle result status
    if (result.status === 'awaiting_input') {
      this.state.status = 'awaiting_input';
      this.emitEvent('awaiting_input', {
        nodeId,
        promptKey: result.metadata?.promptKey,
      });
      return; // Pause execution
    }

    if (result.status === 'error') {
      throw new Error(`Node execution failed: ${result.error}`);
    }

    // Check if terminal node
    if (node.type === 'Terminal') {
      this.state.status = 'completed';
      this.state.completedAt = Date.now();
      this.emitEvent('pipeline_completed', {
        terminalNodeId: nodeId,
        finalVerdict: result.verdict,
      });
      return; // End execution
    }

    // Determine next node(s) based on verdict/condition
    const nextNodeIds = this.determineNextNodes(nodeId, result);

    // Execute next nodes
    // If multiple next nodes, execute in parallel (parallel branches)
    if (nextNodeIds.length > 1) {
      await Promise.all(
        nextNodeIds.map(async nextId => {
          await this.executeFromNode(nextId, result.output);
        })
      );
    } else if (nextNodeIds.length === 1) {
      await this.executeFromNode(nextNodeIds[0], result.output);
    }
    // If no next nodes, pipeline ends naturally
  }

  /**
   * Determine next node(s) to execute based on current node result
   */
  private determineNextNodes(currentNodeId: string, result: NodeExecutionResult): string[] {
    if (!this.graph || !this.dag) {
      return [];
    }

    const outgoingEdges = this.graph.adjacencyList.get(currentNodeId) ?? [];

    // Special handling for Condition nodes
    const currentNode = this.graph.nodes.get(currentNodeId);
    if (currentNode?.type === 'Condition' && result.metadata?.selectedNext) {
      return [result.metadata.selectedNext as string];
    }

    // Filter edges by verdict condition
    const verdict = result.verdict || 'OK';
    const matchingEdges = outgoingEdges.filter(
      edge => !edge.loop && (edge.condition === verdict || edge.condition === 'OK')
    );

    return matchingEdges.map(edge => edge.targetNodeId);
  }

  /**
   * Emit pipeline event (WebSocket)
   */
  private emitEvent(type: PipelineEventType, data: Record<string, unknown>): void {
    if (!this.state) return;

    const event: PipelineEvent = {
      type,
      runId: this.state.runId,
      timestamp: Date.now(),
      data: {
        sessionId: this.state.sessionId,
        pipelineId: this.state.pipelineId,
        ...data,
      },
    };

    // TODO: Integrate with WebSocket service
    // For now, log to console
    console.log(`[PipelineEvent] ${type}:`, event);
  }
}
