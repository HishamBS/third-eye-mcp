/**
 * Condition Node Handler - Evaluates conditional expressions for branching
 *
 * Evaluates expressions like:
 * - "last.response.ok === true"
 * - "last.verdict === 'APPROVED'"
 * - "last.tokensUsed > 1000"
 */

import type { PipelineDagNode } from '@third-eye/types';
import type { NodeHandler, ExecutionContext, NodeExecutionResult } from './base-handler';

export class ConditionNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === 'condition';
  }

  async execute(node: PipelineDagNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (node.type !== 'condition') {
      throw new Error(`ConditionNodeHandler cannot handle node type: ${node.type}`);
    }

    try {
      // Evaluate condition expression
      const expression = node.expression;
      if (!expression) {
        throw new Error('Condition node must have an expression property');
      }
      const conditionMet = this.evaluateExpression(expression, context);

      // Return result - execution engine will use edges to determine next node
      return {
        nodeId: node.id,
        status: 'success',
        verdict: conditionMet ? 'TRUE' : 'FALSE',
        output: {
          type: 'condition',
          expression: expression,
          result: conditionMet,
        },
        latencyMs: 0,
        metadata: {
          conditionResult: conditionMet,
        },
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: 'error',
        error: `Condition evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: 0,
      };
    }
  }

  /**
   * Evaluate conditional expression against execution context
   *
   * Supported expressions:
   * - "last.path.to.value === 'expected'"
   * - "last.path.to.value !== 'unexpected'"
   * - "last.path.to.value > 100"
   * - "last.path.to.value < 100"
   * - "last.path.to.value >= 100"
   * - "last.path.to.value <= 100"
   * - "last.path.to.value.includes('substring')"
   * - "last.path.to.value.startsWith('prefix')"
   */
  private evaluateExpression(expression: string, context: ExecutionContext): boolean {
    // Get last result from context
    const lastResult = Array.from(context.previousResults.values()).pop();
    if (!lastResult) {
      throw new Error('No previous results available for condition evaluation');
    }

    // Parse expression
    const match = expression.match(/^([a-zA-Z0-9._]+)\s*(===|!==|>|<|>=|<=)\s*(.+)$/);
    if (!match) {
      // Try method-based expressions
      return this.evaluateMethodExpression(expression, lastResult);
    }

    const [, path, operator, valueStr] = match;

    // Extract value from path
    const actualValue = this.getValueByPath(path, lastResult);

    // Parse expected value
    const expectedValue = this.parseValue(valueStr.trim());

    // Compare using operator
    return this.compareValues(actualValue, operator, expectedValue);
  }

  /**
   * Evaluate method-based expressions like "last.verdict.includes('APPROVED')"
   */
  private evaluateMethodExpression(expression: string, lastResult: NodeExecutionResult): boolean {
    const includesMatch = expression.match(/^([a-zA-Z0-9._]+)\.includes\(['"](.+)['"]\)$/);
    if (includesMatch) {
      const [, path, substring] = includesMatch;
      const value = this.getValueByPath(path, lastResult);
      return typeof value === 'string' && value.includes(substring);
    }

    const startsWithMatch = expression.match(/^([a-zA-Z0-9._]+)\.startsWith\(['"](.+)['"]\)$/);
    if (startsWithMatch) {
      const [, path, prefix] = startsWithMatch;
      const value = this.getValueByPath(path, lastResult);
      return typeof value === 'string' && value.startsWith(prefix);
    }

    throw new Error(`Unsupported expression format: ${expression}`);
  }

  /**
   * Get value from object using dot-notation path
   * Supports "last.path.to.value" where "last" refers to last result
   */
  private getValueByPath(path: string, result: NodeExecutionResult): unknown {
    // Remove "last." prefix if present
    const cleanPath = path.startsWith('last.') ? path.substring(5) : path;

    // Split path and traverse
    const parts = cleanPath.split('.');
    let current: unknown = result;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Parse value string to appropriate type
   */
  private parseValue(valueStr: string): unknown {
    // Remove quotes for string values
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) ||
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      return valueStr.slice(1, -1);
    }

    // Parse boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;

    // Parse number
    if (/^-?\d+(\.\d+)?$/.test(valueStr)) {
      return Number(valueStr);
    }

    // Parse null
    if (valueStr === 'null') return null;

    // Return as string if no other type matches
    return valueStr;
  }

  /**
   * Compare two values using operator
   */
  private compareValues(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case '===':
        return actual === expected;
      case '!==':
        return actual !== expected;
      case '>':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case '<':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case '>=':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case '<=':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
}
