/**
 * Workflow Interpreter
 *
 * Executes visual pipeline workflows created by the PipelineFlowBuilder.
 * Handles all node types: eye, condition, switch, loop, user_input, terminal.
 * Supports conditional branching, loops, and complex routing logic.
 */

import { nanoid } from 'nanoid';
import { EyeOrchestrator } from './orchestrator';
import { ExpressionEvaluator, type EvaluationContext } from './expression-evaluator';
import type { EyeResponse } from '@third-eye/eyes';

export interface WorkflowNode {
  id: string;
  type?: 'eye' | 'condition' | 'switch' | 'loop' | 'user_input' | 'terminal';
  eye?: string;
  next?: string;
  condition?: string;
  true?: string;
  false?: string;
  prompt?: string;
  switchConfig?: {
    mode: 'rules' | 'expression';
    rules?: Array<{
      expression: string;
      label: string;
      outputIndex: number;
    }>;
    expression?: string;
    fallbackIndex?: number;
    sendToAll?: boolean;
    outputs?: Array<{ nodeId: string; label: string }>;
  };
  loopConfig?: {
    maxIterations?: number;
    batchSize?: number;
    body?: string;
  };
  trueLabel?: string;
  falseLabel?: string;
  x?: number;
  y?: number;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  startNodeId?: string;
}

export interface WorkflowExecutionOptions {
  sessionId?: string;
  input: Record<string, unknown>;
  maxSteps?: number;
}

export interface WorkflowExecutionResult {
  success: boolean;
  sessionId: string;
  steps: Array<{
    nodeId: string;
    type: string;
    eye?: string;
    result?: EyeResponse;
    skipped?: boolean;
    error?: string;
    latencyMs: number;
  }>;
  output: Record<string, unknown>;
  totalLatency: number;
  error?: string;
}

interface ExecutionState {
  visitedNodes: Set<string>;
  loopIterations: Map<string, number>;
  context: EvaluationContext;
  stepCount: number;
}

export class WorkflowInterpreter {
  private orchestrator: EyeOrchestrator;

  constructor() {
    this.orchestrator = new EyeOrchestrator();
  }

  /**
   * Execute a workflow with given input
   */
  async execute(
    workflow: WorkflowDefinition,
    options: WorkflowExecutionOptions
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const maxSteps = options.maxSteps || 1000;

    // Initialize execution state
    const state: ExecutionState = {
      visitedNodes: new Set(),
      loopIterations: new Map(),
      context: {
        $json: {},
        $input: options.input,
      },
      stepCount: 0,
    };

    const steps: WorkflowExecutionResult['steps'] = [];
    let sessionId = options.sessionId;

    // Create session if not provided
    if (!sessionId) {
      const session = await this.orchestrator.createSession({
        agentName: 'Workflow Interpreter',
        displayName: 'Workflow Execution',
      });
      sessionId = session.sessionId;
    }

    try {
      // Find start node
      const startNode = this.findStartNode(workflow);
      if (!startNode) {
        throw new Error('Workflow has no start node');
      }

      // Execute workflow from start node
      let currentNodeId: string | undefined = startNode.id;

      while (currentNodeId && state.stepCount < maxSteps) {
        const node = workflow.nodes.find(n => n.id === currentNodeId);
        if (!node) {
          throw new Error(`Node not found: ${currentNodeId}`);
        }

        // Execute node
        const stepResult = await this.executeNode(node, state, sessionId, workflow);
        steps.push(stepResult);
        state.stepCount++;

        // Update context with result
        if (stepResult.result) {
          state.context.$json = {
            ...state.context.$json,
            [node.id]: this.extractResultData(stepResult.result),
          };
        }

        // Determine next node
        currentNodeId = stepResult.nextNodeId;

        // Check for terminal node
        if (node.type === 'terminal') {
          break;
        }
      }

      if (state.stepCount >= maxSteps) {
        throw new Error(`Workflow exceeded maximum steps (${maxSteps})`);
      }

      const totalLatency = Date.now() - startTime;

      return {
        success: true,
        sessionId,
        steps: steps.map(({ nextNodeId, ...rest }) => rest),
        output: state.context.$json,
        totalLatency,
      };
    } catch (error) {
      const totalLatency = Date.now() - startTime;

      return {
        success: false,
        sessionId: sessionId || 'unknown',
        steps: steps.map(({ nextNodeId, ...rest }) => rest),
        output: state.context.$json,
        totalLatency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    state: ExecutionState,
    sessionId: string,
    workflow: WorkflowDefinition
  ): Promise<WorkflowExecutionResult['steps'][0] & { nextNodeId?: string }> {
    const startTime = Date.now();

    // Mark node as visited
    state.visitedNodes.add(node.id);

    const nodeType = node.type || 'eye';

    try {
      switch (nodeType) {
        case 'eye':
          return await this.executeEyeNode(node, state, sessionId, startTime);

        case 'condition':
          return this.executeConditionNode(node, state, startTime);

        case 'switch':
          return this.executeSwitchNode(node, state, startTime);

        case 'loop':
          return await this.executeLoopNode(node, state, sessionId, workflow, startTime);

        case 'user_input':
          return this.executeUserInputNode(node, state, startTime);

        case 'terminal':
          return this.executeTerminalNode(node, startTime);

        default:
          throw new Error(`Unknown node type: ${nodeType}`);
      }
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        nodeId: node.id,
        type: nodeType,
        error: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
        nextNodeId: undefined,
      };
    }
  }

  /**
   * Execute Eye node
   */
  private async executeEyeNode(
    node: WorkflowNode,
    state: ExecutionState,
    sessionId: string,
    startTime: number
  ): Promise<WorkflowExecutionResult['steps'][0] & { nextNodeId?: string }> {
    if (!node.eye) {
      throw new Error('Eye node missing eye name');
    }

    // Prepare input from context
    const input = JSON.stringify(state.context.$input);

    // Execute eye
    const result = await this.orchestrator.runEye(node.eye, input, sessionId);

    const latencyMs = Date.now() - startTime;

    return {
      nodeId: node.id,
      type: 'eye',
      eye: node.eye,
      result,
      latencyMs,
      nextNodeId: node.next,
    };
  }

  /**
   * Execute Condition node (IF)
   */
  private executeConditionNode(
    node: WorkflowNode,
    state: ExecutionState,
    startTime: number
  ): WorkflowExecutionResult['steps'][0] & { nextNodeId?: string } {
    if (!node.condition) {
      throw new Error('Condition node missing condition expression');
    }

    // Evaluate condition
    const conditionResult = ExpressionEvaluator.evaluate(node.condition, state.context);

    const latencyMs = Date.now() - startTime;
    const nextNodeId = conditionResult ? node.true : node.false;

    return {
      nodeId: node.id,
      type: 'condition',
      result: {
        ok: true,
        code: 'OK',
        md: `Condition evaluated to ${conditionResult}`,
        data: { conditionResult, branch: conditionResult ? 'true' : 'false' },
      } as EyeResponse,
      latencyMs,
      nextNodeId,
    };
  }

  /**
   * Execute Switch node
   */
  private executeSwitchNode(
    node: WorkflowNode,
    state: ExecutionState,
    startTime: number
  ): WorkflowExecutionResult['steps'][0] & { nextNodeId?: string } {
    if (!node.switchConfig) {
      throw new Error('Switch node missing switchConfig');
    }

    const { mode, rules, expression, fallbackIndex, sendToAll, outputs } = node.switchConfig;

    let matchedIndex = -1;

    if (mode === 'rules' && rules) {
      // Evaluate rules in order
      for (const rule of rules) {
        if (ExpressionEvaluator.evaluate(rule.expression, state.context)) {
          matchedIndex = rule.outputIndex;
          break;
        }
      }
    } else if (mode === 'expression' && expression) {
      // Evaluate single expression - result should be a number
      const result = ExpressionEvaluator.evaluate(expression, state.context);
      if (typeof result === 'number') {
        matchedIndex = result;
      }
    }

    // Use fallback if no match
    if (matchedIndex === -1 && fallbackIndex !== undefined) {
      matchedIndex = fallbackIndex;
    }

    const latencyMs = Date.now() - startTime;

    // Determine next node from outputs
    let nextNodeId: string | undefined;
    if (outputs && matchedIndex >= 0 && matchedIndex < outputs.length) {
      nextNodeId = outputs[matchedIndex].nodeId;
    }

    return {
      nodeId: node.id,
      type: 'switch',
      result: {
        ok: true,
        code: 'OK',
        md: `Switch routed to output ${matchedIndex}`,
        data: { matchedIndex, outputCount: outputs?.length || 0 },
      } as EyeResponse,
      latencyMs,
      nextNodeId,
    };
  }

  /**
   * Execute Loop node
   */
  private async executeLoopNode(
    node: WorkflowNode,
    state: ExecutionState,
    sessionId: string,
    workflow: WorkflowDefinition,
    startTime: number
  ): Promise<WorkflowExecutionResult['steps'][0] & { nextNodeId?: string }> {
    if (!node.loopConfig) {
      throw new Error('Loop node missing loopConfig');
    }

    const { maxIterations = 10, batchSize, body } = node.loopConfig;

    // Track loop iterations
    const currentIterations = state.loopIterations.get(node.id) || 0;

    if (currentIterations >= maxIterations) {
      // Loop complete, exit to next node
      state.loopIterations.delete(node.id);
      const latencyMs = Date.now() - startTime;

      return {
        nodeId: node.id,
        type: 'loop',
        result: {
          ok: true,
          code: 'OK',
          md: `Loop completed after ${currentIterations} iterations`,
          data: { iterations: currentIterations, maxIterations },
        } as EyeResponse,
        latencyMs,
        nextNodeId: node.next,
      };
    }

    // Execute loop body
    state.loopIterations.set(node.id, currentIterations + 1);

    const latencyMs = Date.now() - startTime;

    return {
      nodeId: node.id,
      type: 'loop',
      result: {
        ok: true,
        code: 'OK',
        md: `Loop iteration ${currentIterations + 1}/${maxIterations}`,
        data: {
          iteration: currentIterations + 1,
          maxIterations,
          batchSize,
        },
      } as EyeResponse,
      latencyMs,
      nextNodeId: body || node.next,
    };
  }

  /**
   * Execute User Input node
   */
  private executeUserInputNode(
    node: WorkflowNode,
    state: ExecutionState,
    startTime: number
  ): WorkflowExecutionResult['steps'][0] & { nextNodeId?: string } {
    const latencyMs = Date.now() - startTime;

    return {
      nodeId: node.id,
      type: 'user_input',
      result: {
        ok: false,
        code: 'AWAIT_INPUT',
        md: node.prompt || 'Waiting for user input',
        data: { prompt: node.prompt },
      } as EyeResponse,
      latencyMs,
      nextNodeId: undefined,
    };
  }

  /**
   * Execute Terminal node
   */
  private executeTerminalNode(
    node: WorkflowNode,
    startTime: number
  ): WorkflowExecutionResult['steps'][0] & { nextNodeId?: string } {
    const latencyMs = Date.now() - startTime;

    return {
      nodeId: node.id,
      type: 'terminal',
      result: {
        ok: true,
        code: 'OK',
        md: 'Workflow completed',
        data: {},
      } as EyeResponse,
      latencyMs,
      nextNodeId: undefined,
    };
  }

  /**
   * Find the start node in workflow
   */
  private findStartNode(workflow: WorkflowDefinition): WorkflowNode | undefined {
    // Use explicit start node if specified
    if (workflow.startNodeId) {
      return workflow.nodes.find(n => n.id === workflow.startNodeId);
    }

    // Find node that is not referenced by any other node
    const referencedNodeIds = new Set<string>();

    for (const node of workflow.nodes) {
      if (node.next) referencedNodeIds.add(node.next);
      if (node.true) referencedNodeIds.add(node.true);
      if (node.false) referencedNodeIds.add(node.false);
      if (node.switchConfig?.outputs) {
        for (const output of node.switchConfig.outputs) {
          referencedNodeIds.add(output.nodeId);
        }
      }
      if (node.loopConfig?.body) {
        referencedNodeIds.add(node.loopConfig.body);
      }
    }

    // Start node is the one not referenced by others
    return workflow.nodes.find(n => !referencedNodeIds.has(n.id));
  }

  /**
   * Extract data from Eye response for context
   */
  private extractResultData(result: EyeResponse): Record<string, unknown> {
    return {
      ok: result.ok,
      code: result.code,
      verdict: result.ok ? 'APPROVED' : 'REJECTED',
      ...result.data,
    };
  }

  /**
   * Validate workflow structure
   */
  static validate(workflow: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
      return { valid: false, errors };
    }

    const nodeIds = new Set(workflow.nodes.map(n => n.id));

    // Validate each node
    for (const node of workflow.nodes) {
      if (!node.id) {
        errors.push('All nodes must have an id');
        continue;
      }

      const nodeType = node.type || 'eye';

      switch (nodeType) {
        case 'eye':
          if (!node.eye) {
            errors.push(`Eye node ${node.id} missing eye name`);
          }
          break;

        case 'condition':
          if (!node.condition) {
            errors.push(`Condition node ${node.id} missing condition expression`);
          }
          if (!node.true && !node.false) {
            errors.push(`Condition node ${node.id} must have at least one branch`);
          }
          break;

        case 'switch':
          if (!node.switchConfig) {
            errors.push(`Switch node ${node.id} missing switchConfig`);
          }
          break;

        case 'loop':
          if (!node.loopConfig) {
            errors.push(`Loop node ${node.id} missing loopConfig`);
          }
          break;
      }

      // Validate node references
      if (node.next && !nodeIds.has(node.next)) {
        errors.push(`Node ${node.id} references non-existent node: ${node.next}`);
      }
      if (node.true && !nodeIds.has(node.true)) {
        errors.push(`Node ${node.id} references non-existent node: ${node.true}`);
      }
      if (node.false && !nodeIds.has(node.false)) {
        errors.push(`Node ${node.id} references non-existent node: ${node.false}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
