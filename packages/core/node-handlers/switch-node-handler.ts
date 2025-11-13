/**
 * Switch Node Handler - N8N-style multi-way routing with rule evaluation
 *
 * Evaluates multiple rules against execution context and routes to matching outputs.
 * Supports both rules-based and expression-based modes.
 *
 * Per R01: Uses centralized expression-evaluator for all evaluations
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

/**
 * Result of switch evaluation
 */
interface SwitchEvaluationResult {
  /** Output indices that matched (can be multiple if sendToAll=true) */
  matchedOutputs: number[];
  /** Matched rule labels for debugging */
  matchedRules: string[];
  /** Whether any rules matched */
  hasMatch: boolean;
}

export class SwitchNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === "switch";
  }

  async execute(
    node: PipelineDagNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (node.type !== "switch") {
      throw new Error(
        `SwitchNodeHandler cannot handle node type: ${node.type}`,
      );
    }

    const startTime = Date.now();

    try {
      // Validate switch configuration
      const switchConfig = node.switchConfig;
      if (!switchConfig) {
        throw new Error("Switch node must have switchConfig property");
      }

      // Build expression context from execution context
      const expressionContext = this.buildExpressionContext(context);

      // Evaluate switch rules/expression
      const result =
        switchConfig.mode === "rules"
          ? this.evaluateRulesMode(switchConfig, expressionContext)
          : this.evaluateExpressionMode(switchConfig, expressionContext);

      // Handle no matches
      if (!result.hasMatch && switchConfig.fallbackOutput !== undefined) {
        result.matchedOutputs = [switchConfig.fallbackOutput];
        result.matchedRules = ["<fallback>"];
        result.hasMatch = true;
      }

      const latencyMs = Date.now() - startTime;

      // Return result with matched output indices
      return {
        nodeId: node.id,
        status: "success",
        verdict: result.hasMatch ? "MATCHED" : "NO_MATCH",
        output: {
          type: "switch",
          mode: switchConfig.mode,
          matchedOutputs: result.matchedOutputs,
          matchedRules: result.matchedRules,
          hasMatch: result.hasMatch,
        },
        latencyMs,
        metadata: {
          switchMode: switchConfig.mode,
          matchedOutputs: result.matchedOutputs,
          matchedRules: result.matchedRules,
          sendToAll: switchConfig.sendToAll,
        },
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: "error",
        error: `Switch evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate switch in rules mode
   * Each rule is tested; returns first match or all matches based on sendToAll
   */
  private evaluateRulesMode(
    config: NonNullable<PipelineDagNode["switchConfig"]>,
    context: ExpressionContext,
  ): SwitchEvaluationResult {
    const rules = config.rules ?? [];
    if (rules.length === 0) {
      return { matchedOutputs: [], matchedRules: [], hasMatch: false };
    }

    const matchedOutputs: number[] = [];
    const matchedRules: string[] = [];

    // Evaluate each rule
    for (const rule of rules) {
      try {
        // Parse expression (support both JSON string and object)
        const expression =
          typeof rule.expression === "string"
            ? rule.expression
            : rule.expression;

        // Evaluate using expression evaluator
        const evalResult = evaluateExpression(expression, context);

        // Check if rule matched
        if (evalResult.success && evalResult.value === true) {
          matchedOutputs.push(rule.outputIndex);
          matchedRules.push(rule.label);

          // If not sendToAll, stop at first match
          if (!config.sendToAll) {
            break;
          }
        }
      } catch (error) {
        // Log error but continue evaluating other rules
        console.error(`Error evaluating switch rule "${rule.label}":`, error);
      }
    }

    return {
      matchedOutputs,
      matchedRules,
      hasMatch: matchedOutputs.length > 0,
    };
  }

  /**
   * Evaluate switch in expression mode
   * Single expression returns output index directly
   */
  private evaluateExpressionMode(
    config: NonNullable<PipelineDagNode["switchConfig"]>,
    context: ExpressionContext,
  ): SwitchEvaluationResult {
    const expression = config.expression;
    if (!expression) {
      throw new Error("Switch expression mode requires expression property");
    }

    try {
      // Evaluate expression
      const evalResult = evaluateExpression(expression, context);

      if (!evalResult.success) {
        throw new Error(evalResult.error ?? "Expression evaluation failed");
      }

      // Expression should return a number (output index)
      const outputIndex = evalResult.value;
      if (typeof outputIndex !== "number") {
        throw new Error(
          `Switch expression must return number, got ${typeof outputIndex}`,
        );
      }

      // Validate output index
      if (outputIndex < 0 || !Number.isInteger(outputIndex)) {
        throw new Error(`Invalid output index: ${outputIndex}`);
      }

      return {
        matchedOutputs: [outputIndex],
        matchedRules: ["<expression>"],
        hasMatch: true,
      };
    } catch (error) {
      throw new Error(
        `Expression mode evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build expression context from execution context
   * Maps NodeExecutionResult to ExpressionContext format
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
