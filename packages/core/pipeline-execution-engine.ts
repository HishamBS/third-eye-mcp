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

import type {
  PipelineDag,
  PipelineDagNode,
  PipelineDagEdge,
} from "@third-eye/types";
import { DagGraphBuilder, type DagGraph } from "./dag-graph";
import {
  EyeNodeHandler,
  TerminalNodeHandler,
  UserInputNodeHandler,
  ConditionNodeHandler,
  IFNodeHandler,
  type NodeHandler,
  type ExecutionContext,
  type NodeExecutionResult,
} from "./node-handlers";
import { SwitchNodeHandler } from "./node-handlers/switch-node-handler";
import { LoopNodeHandler } from "./node-handlers/loop-node-handler";
import {
  evaluateExpression,
  type ExpressionContext,
} from "./expression-evaluator";
import { PauseResumeManager } from "./pause-resume-manager";

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
  status: "running" | "paused" | "completed" | "failed" | "awaiting_input";
  currentNodeId?: string;
  executedNodes: string[];
  nodeResults: Map<string, NodeExecutionResult>;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export type PipelineEventType =
  | "pipeline_started"
  | "node_started"
  | "node_completed"
  | "node_error"
  | "pipeline_paused"
  | "pipeline_resumed"
  | "pipeline_completed"
  | "pipeline_failed"
  | "awaiting_input";

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
  private pauseResumeManager: PauseResumeManager | null = null;

  constructor() {
    // Initialize node handlers
    this.handlers = [
      new EyeNodeHandler(),
      new TerminalNodeHandler(),
      new UserInputNodeHandler(),
      new ConditionNodeHandler(),
      new IFNodeHandler(),
      new SwitchNodeHandler(),
      new LoopNodeHandler(),
    ];
  }

  /**
   * Lazy-load PauseResumeManager with database connection
   */
  private getPauseResumeManager(): PauseResumeManager {
    if (!this.pauseResumeManager) {
      const { getDb } = require("@third-eye/db");
      const { db } = getDb();
      this.pauseResumeManager = new PauseResumeManager(db);
    }
    return this.pauseResumeManager;
  }

  /**
   * Execute a pipeline from start to finish
   */
  async execute(
    config: PipelineExecutionConfig,
    dag: PipelineDag,
  ): Promise<void> {
    try {
      // Initialize state
      this.initializeState(config);
      this.dag = dag;

      // Build DAG graph
      const entryNodeId = dag.entryNodeId || dag.nodes[0]?.id;
      if (!entryNodeId) {
        throw new Error(
          "Pipeline DAG must have at least one node and an entryNodeId",
        );
      }
      let fullGraph = DagGraphBuilder.buildGraph(
        dag.nodes,
        dag.edges,
        entryNodeId,
      );

      // Intelligent routing: prune graph if recommendedEyes provided
      if (
        config.recommendedEyes &&
        config.recommendedEyes.length > 0 &&
        !config.bypassRouting
      ) {
        console.log(
          `[PipelineEngine] Intelligent routing enabled - pruning to ${config.recommendedEyes.length} Eyes:`,
          config.recommendedEyes,
        );
        this.graph = DagGraphBuilder.pruneToRequiredEyes(
          fullGraph,
          config.recommendedEyes,
        );
        console.log(
          `[PipelineEngine] Pruned graph: ${this.graph.nodes.size} nodes (from ${fullGraph.nodes.size})`,
        );
      } else {
        console.log(
          `[PipelineEngine] Executing full pipeline (${fullGraph.nodes.size} nodes)`,
        );
        this.graph = fullGraph;
      }

      // Validate graph
      const validation = DagGraphBuilder.validateGraph(this.graph);
      if (!validation.valid) {
        throw new Error(
          `Invalid pipeline graph: ${validation.errors.join(", ")}`,
        );
      }

      // Emit start event
      this.emitEvent("pipeline_started", {
        pipelineId: config.pipelineId,
        sessionId: config.sessionId,
        entryNodeId: this.graph.entryNodeId,
        intelligentRouting: !!config.recommendedEyes,
        plannedNodes: this.graph.nodes.size,
      });

      // Execute pipeline
      await this.executeFromNode(this.graph.entryNodeId, config.input);

      // Mark as completed if not already
      if (this.state!.status === "running") {
        this.state!.status = "completed";
        this.state!.completedAt = Date.now();

        // Phase 1-A3: Mark pipeline as completed in database
        const manager = this.getPauseResumeManager();
        await manager.completePipeline(this.state!.sessionId);

        this.emitEvent("pipeline_completed", {
          executedNodes: this.state!.executedNodes,
          totalLatencyMs: Date.now() - this.state!.startedAt,
        });
      }
    } catch (error) {
      this.state!.status = "failed";
      this.state!.error =
        error instanceof Error ? error.message : String(error);
      this.state!.completedAt = Date.now();

      this.emitEvent("pipeline_failed", {
        error: this.state!.error,
        failedAt: this.state!.currentNodeId,
      });

      throw error;
    }
  }

  /**
   * Pause pipeline execution
   * Phase 1-A3: Persists state to database via PauseResumeManager
   */
  async pause(): Promise<void> {
    if (!this.state) {
      throw new Error("No active pipeline execution");
    }

    this.state.status = "paused";

    // Persist pause state to database
    const manager = this.getPauseResumeManager();
    await manager.pausePipeline({
      sessionId: this.state.sessionId,
      currentEye: this.state.currentNodeId || "unknown",
      reason: "validation_failed",
      pendingData: {
        executedNodes: this.state.executedNodes,
        nodeResults: Array.from(this.state.nodeResults.entries()),
      },
    });

    this.emitEvent("pipeline_paused", {
      pausedAt: this.state.currentNodeId,
    });
  }

  /**
   * Resume pipeline execution with optional user input
   * Phase 1-A3: Loads state from database and resumes execution
   */
  async resume(userInput?: unknown, resumeToken?: string): Promise<void> {
    if (!this.state) {
      throw new Error("No active pipeline execution");
    }

    if (
      this.state.status !== "paused" &&
      this.state.status !== "awaiting_input"
    ) {
      throw new Error(
        `Cannot resume pipeline with status: ${this.state.status}`,
      );
    }

    // Load and validate resume state from database if token provided
    if (resumeToken) {
      const manager = this.getPauseResumeManager();
      const pipelineState = await manager.resumePipeline(
        this.state.sessionId,
        resumeToken,
      );

      // Restore pending data if available
      if (pipelineState.pendingData) {
        const pendingData = pipelineState.pendingData as {
          nodeResults?: Array<[string, NodeExecutionResult]>;
          executedNodes?: string[];
        };

        if (pendingData.nodeResults) {
          this.state.nodeResults = new Map(pendingData.nodeResults);
        }
        if (pendingData.executedNodes) {
          this.state.executedNodes = pendingData.executedNodes;
        }
      }
    }

    this.state.status = "running";
    this.emitEvent("pipeline_resumed", {
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
      status: "running",
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
      throw new Error("Execution engine not initialized");
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
    const handler = this.handlers.find((h) => h.canHandle(node));
    if (!handler) {
      throw new Error(`No handler found for node type: ${node.type}`);
    }

    // Emit node started event
    this.emitEvent("node_started", {
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
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };

      this.emitEvent("node_error", {
        nodeId,
        error: result.error,
      });

      throw error;
    }

    // Store result
    this.state.nodeResults.set(nodeId, result);
    this.state.executedNodes.push(nodeId);

    // Emit node completed event
    this.emitEvent("node_completed", {
      nodeId,
      status: result.status,
      verdict: result.verdict,
      latencyMs: result.latencyMs,
      tokensUsed: result.tokensUsed,
    });

    // Handle result status
    if (result.status === "awaiting_input") {
      this.state.status = "awaiting_input";

      // Phase 1-A3: Persist pause state to database
      const manager = this.getPauseResumeManager();
      await manager.pausePipeline({
        sessionId: this.state.sessionId,
        currentEye: nodeId,
        reason: "clarification",
        pendingData: {
          nodeId,
          promptKey: result.metadata?.promptKey,
          nodeResults: Array.from(this.state.nodeResults.entries()),
        },
        expiresInMs: 3600000, // 1 hour
      });

      this.emitEvent("awaiting_input", {
        nodeId,
        promptKey: result.metadata?.promptKey,
      });
      return; // Pause execution
    }

    if (result.status === "error") {
      throw new Error(`Node execution failed: ${result.error}`);
    }

    // Check if terminal node
    if (node.type === "terminal") {
      this.state.status = "completed";
      this.state.completedAt = Date.now();
      this.emitEvent("pipeline_completed", {
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
        nextNodeIds.map(async (nextId) => {
          await this.executeFromNode(nextId, result.output);
        }),
      );
    } else if (nextNodeIds.length === 1) {
      await this.executeFromNode(nextNodeIds[0], result.output);
    }
    // If no next nodes, pipeline ends naturally
  }

  /**
   * Determine next node(s) to execute based on current node result
   * Supports: Switch nodes, IF nodes, Loop nodes, expression-based edges
   */
  private determineNextNodes(
    currentNodeId: string,
    result: NodeExecutionResult,
  ): string[] {
    if (!this.graph || !this.dag) {
      return [];
    }

    const outgoingEdges = this.graph.adjacencyList.get(currentNodeId) ?? [];
    const currentNode = this.graph.nodes.get(currentNodeId);

    // Special handling for Switch nodes
    if (currentNode?.type === "switch" && result.metadata?.matchedOutputs) {
      const matchedOutputs = result.metadata.matchedOutputs as number[];
      return this.getEdgesByOutputIndices(outgoingEdges, matchedOutputs);
    }

    // Special handling for IF nodes
    if (currentNode?.type === "if") {
      const conditionMet = result.metadata?.conditionMet as boolean;
      const trueEdges = outgoingEdges.filter(
        (e) => e.condition === "true" || e.condition === "TRUE",
      );
      const falseEdges = outgoingEdges.filter(
        (e) => e.condition === "false" || e.condition === "FALSE",
      );
      const targetEdges = conditionMet ? trueEdges : falseEdges;
      return targetEdges.map((e) => e.targetNodeId);
    }

    // Special handling for Loop nodes
    if (currentNode?.type === "loop_over_items") {
      const verdict = result.verdict || "LOOP_CONTINUE";
      if (verdict === "LOOP_COMPLETE" || verdict === "MAX_ITERATIONS_REACHED") {
        // Exit loop - find non-loop edges
        const exitEdges = outgoingEdges.filter((e) => !e.loop);
        return exitEdges.map((e) => e.targetNodeId);
      }
      // Continue loop - find loop-back edges
      const loopEdges = outgoingEdges.filter((e) => e.loop === true);
      return loopEdges.map((e) => e.targetNodeId);
    }

    // Special handling for legacy Condition nodes
    if (currentNode?.type === "condition" && result.metadata?.selectedNext) {
      return [result.metadata.selectedNext as string];
    }

    // Build expression context for edge evaluation
    const expressionContext = this.buildExpressionContextFromResult(result);

    // Evaluate edges with expressions/conditions
    const matchingEdges = outgoingEdges.filter((edge) => {
      // Skip loop edges for normal flow
      if (edge.loop) return false;

      // No condition - always match
      if (!edge.condition) return true;

      // Try expression evaluation
      try {
        const evalResult = evaluateExpression(
          edge.condition,
          expressionContext,
        );
        return evalResult.success && evalResult.value === true;
      } catch {
        // Fallback: simple verdict matching for backward compatibility
        const verdict = result.verdict || "OK";
        return edge.condition === verdict || edge.condition === "OK";
      }
    });

    return matchingEdges.map((edge) => edge.targetNodeId);
  }

  /**
   * Get edges by output indices (for Switch nodes)
   */
  private getEdgesByOutputIndices(
    edges: { targetNodeId: string; priority?: number }[],
    indices: number[],
  ): string[] {
    // Sort edges by priority
    const sortedEdges = [...edges].sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
    );

    // Map indices to target node IDs
    return indices
      .filter((idx) => idx < sortedEdges.length)
      .map((idx) => sortedEdges[idx].targetNodeId);
  }

  /**
   * Build expression context from node execution result
   */
  private buildExpressionContextFromResult(
    result: NodeExecutionResult,
  ): ExpressionContext {
    const output =
      result.output && typeof result.output === "object"
        ? (result.output as Record<string, unknown>)
        : undefined;

    return {
      output: {
        verdict: result.verdict,
        ...output,
      },
      metadata: result.metadata ?? {},
      verdict: result.verdict,
    };
  }

  /**
   * Emit pipeline event (WebSocket)
   */
  private emitEvent(
    type: PipelineEventType,
    data: Record<string, unknown>,
  ): void {
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
