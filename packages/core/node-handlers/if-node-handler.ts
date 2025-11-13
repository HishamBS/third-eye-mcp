/**
 * IF Node Handler - Binary conditional branching
 *
 * Evaluates a condition and sets metadata.conditionMet for routing.
 * Supports JSONLogic expressions via centralized expression evaluator.
 *
 * Per R01: Uses centralized expression-evaluator
 * Per R07: Strict typing throughout
 */

import type { PipelineDagNode } from "@third-eye/types";
import type {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
} from "./base-handler";
import {
  evaluateExpression,
  type ExpressionContext,
} from "../expression-evaluator";

export class IFNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === "if";
  }

  async execute(
    node: PipelineDagNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (node.type !== "if") {
      throw new Error(`IFNodeHandler cannot handle node type: ${node.type}`);
    }

    const startTime = Date.now();

    try {
      // Validate IF configuration
      const ifConfig = node.ifConfig;
      if (!ifConfig) {
        throw new Error("IF node must have ifConfig property");
      }

      if (!ifConfig.condition) {
        throw new Error("IF node must have condition in ifConfig");
      }

      // Build expression context from execution context
      const expressionContext = this.buildExpressionContext(context);

      // Evaluate condition using centralized expression evaluator
      const evalResult = evaluateExpression(
        ifConfig.condition,
        expressionContext,
      );

      if (!evalResult.success) {
        throw new Error(evalResult.error ?? "Condition evaluation failed");
      }

      // Condition result must be boolean
      const conditionMet = Boolean(evalResult.value);

      const latencyMs = Date.now() - startTime;

      // Return result with conditionMet in metadata for routing
      return {
        nodeId: node.id,
        status: "success",
        verdict: conditionMet ? "TRUE" : "FALSE",
        output: {
          type: "if",
          condition: ifConfig.condition,
          conditionMet,
        },
        latencyMs,
        metadata: {
          conditionMet, // Used by determineNextNodes() at line 359
          trueLabel: ifConfig.trueLabel,
          falseLabel: ifConfig.falseLabel,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        nodeId: node.id,
        status: "error",
        error: `IF node evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs,
      };
    }
  }

  /**
   * Build expression context from execution context
   * Maps ExecutionContext to ExpressionContext format
   */
  private buildExpressionContext(context: ExecutionContext): ExpressionContext {
    // Get last node result
    const lastResult = Array.from(context.previousResults.values()).pop();

    if (!lastResult) {
      // No previous results - return minimal context
      return {
        output: undefined,
        metadata: {},
        verdict: undefined,
      };
    }

    // Extract output data
    const output =
      lastResult.output && typeof lastResult.output === "object"
        ? (lastResult.output as Record<string, unknown>)
        : undefined;

    // Build expression context
    return {
      output: {
        verdict: lastResult.verdict,
        ...output,
      },
      metadata: lastResult.metadata ?? {},
      verdict: lastResult.verdict,
    };
  }
}
