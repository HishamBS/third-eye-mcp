/**
 * Expression Evaluator - JSONLogic-based expression engine
 *
 * Per R01: SSOT for expression evaluation logic
 * Per R07: Strict typing throughout
 *
 * Supports:
 * - Field access: {{output.score}}, {{metadata.category}}, {{verdict}}
 * - JSONLogic expressions for conditional routing
 * - Expression validation and error handling
 * - Type-safe execution context
 */

import jsonLogic, { type RulesLogic } from "json-logic-js";

/**
 * Execution context available to expressions
 * Represents data available during pipeline node execution
 */
export interface ExpressionContext {
  /** Output from the previous node */
  output?: {
    score?: number;
    verdict?: string;
    confidence?: number;
    [key: string]: unknown;
  };
  /** Metadata about the current execution */
  metadata?: {
    category?: string;
    priority?: string;
    tags?: string[];
    [key: string]: unknown;
  };
  /** Direct verdict string (for backward compatibility) */
  verdict?: string;
  /** Loop state (if within a loop node) */
  loop?: {
    index: number;
    item?: unknown;
    total?: number;
  };
  /** Custom fields from node configuration */
  [key: string]: unknown;
}

/**
 * Expression evaluation result
 */
export interface ExpressionResult {
  /** Whether evaluation succeeded */
  success: boolean;
  /** Evaluated value (boolean for conditions, any for expressions) */
  value: unknown;
  /** Error message if evaluation failed */
  error?: string;
}

/**
 * Expression validation result
 */
export interface ValidationResult {
  /** Whether expression is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Parsed expression (if valid) */
  parsed?: unknown;
}

/**
 * Evaluate a JSONLogic expression against execution context
 *
 * @param expression - JSONLogic expression object or string
 * @param context - Execution context with available data
 * @returns Evaluation result with success/value/error
 *
 * @example
 * // Score threshold condition
 * evaluateExpression(
 *   { ">": [{ "var": "output.score" }, 80] },
 *   { output: { score: 85 } }
 * ) // => { success: true, value: true }
 *
 * @example
 * // Category matching
 * evaluateExpression(
 *   { "==": [{ "var": "metadata.category" }, "urgent"] },
 *   { metadata: { category: "urgent" } }
 * ) // => { success: true, value: true }
 */
export function evaluateExpression(
  expression: unknown,
  context: ExpressionContext,
): ExpressionResult {
  try {
    // Validate expression format
    if (
      !expression ||
      (typeof expression !== "object" && typeof expression !== "string")
    ) {
      return {
        success: false,
        value: false,
        error: "Expression must be an object or string",
      };
    }

    // Parse string expressions as JSON
    let parsedExpression: object =
      typeof expression === "string" ? {} : expression;
    if (typeof expression === "string") {
      try {
        parsedExpression = JSON.parse(expression);
      } catch (parseError) {
        return {
          success: false,
          value: false,
          error: `Invalid JSON expression: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        };
      }
    } else {
      parsedExpression = expression;
    }

    // Apply JSONLogic
    const result = jsonLogic.apply(parsedExpression as RulesLogic, context);

    return {
      success: true,
      value: result,
    };
  } catch (error) {
    return {
      success: false,
      value: false,
      error: `Expression evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate expression syntax without evaluating
 *
 * @param expression - Expression to validate
 * @returns Validation result with valid/error/parsed
 *
 * @example
 * validateExpression({ ">": [{ "var": "score" }, 50] })
 * // => { valid: true, parsed: {...} }
 */
export function validateExpression(expression: unknown): ValidationResult {
  try {
    if (!expression) {
      return {
        valid: false,
        error: "Expression cannot be empty",
      };
    }

    // Parse string expressions
    let parsedExpression = expression;
    if (typeof expression === "string") {
      try {
        parsedExpression = JSON.parse(expression);
      } catch (parseError) {
        return {
          valid: false,
          error: `Invalid JSON: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
        };
      }
    }

    // Validate structure
    if (typeof parsedExpression !== "object" || parsedExpression === null) {
      return {
        valid: false,
        error: "Expression must be a JSON object",
      };
    }

    // Basic validation - check if it has JSONLogic operators
    const validOperators = [
      "==",
      "!=",
      ">",
      ">=",
      "<",
      "<=",
      "and",
      "or",
      "not",
      "if",
      "var",
      "in",
      "!",
    ];
    const hasValidOperator = Object.keys(parsedExpression).some((key) =>
      validOperators.includes(key),
    );

    if (!hasValidOperator) {
      return {
        valid: false,
        error: "Expression must contain at least one JSONLogic operator",
      };
    }

    return {
      valid: true,
      parsed: parsedExpression,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Evaluate simple string condition (backward compatibility)
 * Converts simple verdict matching to JSONLogic expression
 *
 * @param condition - Simple condition string (e.g., "OK", "APPROVED")
 * @param context - Execution context
 * @returns True if context.verdict matches condition
 *
 * @example
 * evaluateSimpleCondition("OK", { verdict: "OK" }) // => true
 * evaluateSimpleCondition("APPROVED", { verdict: "REJECTED" }) // => false
 */
export function evaluateSimpleCondition(
  condition: string,
  context: ExpressionContext,
): boolean {
  // Simple string matching for backward compatibility
  const verdict = context.verdict || context.output?.verdict;
  return verdict === condition;
}

/**
 * Test expression against sample context (for preview/debugging)
 *
 * @param expression - Expression to test
 * @param sampleContext - Sample execution context
 * @returns Evaluation result
 */
export function testExpression(
  expression: unknown,
  sampleContext: ExpressionContext,
): ExpressionResult {
  return evaluateExpression(expression, sampleContext);
}

/**
 * Get field value from context using dot notation
 * Helper for expression builders
 *
 * @param context - Execution context
 * @param fieldPath - Dot-notation path (e.g., "output.score")
 * @returns Field value or undefined
 *
 * @example
 * getContextField({ output: { score: 85 } }, "output.score") // => 85
 * getContextField({ metadata: { tags: ["urgent"] } }, "metadata.tags.0") // => "urgent"
 */
export function getContextField(
  context: ExpressionContext,
  fieldPath: string,
): unknown {
  // Use JSONLogic's var operator to get field value
  return jsonLogic.apply({ var: fieldPath }, context);
}

/**
 * Available context fields for expression building
 * Used by UI to populate autocomplete/dropdowns
 */
export const CONTEXT_FIELDS = [
  "output.score",
  "output.verdict",
  "output.confidence",
  "metadata.category",
  "metadata.priority",
  "metadata.tags",
  "verdict",
  "loop.index",
  "loop.item",
  "loop.total",
] as const;

export type ContextField = (typeof CONTEXT_FIELDS)[number];

/**
 * Common expression templates for quick selection
 * Used by UI expression builder
 */
export const EXPRESSION_TEMPLATES = {
  SCORE_THRESHOLD: {
    name: "Score Threshold",
    description: "Check if output score meets minimum threshold",
    template: { ">": [{ var: "output.score" }, 80] },
  },
  VERDICT_MATCH: {
    name: "Verdict Match",
    description: "Check if verdict matches expected value",
    template: { "==": [{ var: "verdict" }, "APPROVED"] },
  },
  CATEGORY_IN_LIST: {
    name: "Category In List",
    description: "Check if category is in allowed list",
    template: {
      in: [{ var: "metadata.category" }, ["urgent", "high-priority"]],
    },
  },
  LOOP_INDEX_CHECK: {
    name: "Loop Index Check",
    description: "Check loop iteration index",
    template: { "<": [{ var: "loop.index" }, 5] },
  },
  AND_CONDITION: {
    name: "AND Condition",
    description: "Multiple conditions must all be true",
    template: {
      and: [
        { ">": [{ var: "output.score" }, 70] },
        { "==": [{ var: "verdict" }, "OK"] },
      ],
    },
  },
  OR_CONDITION: {
    name: "OR Condition",
    description: "At least one condition must be true",
    template: {
      or: [
        { ">": [{ var: "output.score" }, 90] },
        { "==": [{ var: "metadata.priority" }, "urgent"] },
      ],
    },
  },
} as const;

export type ExpressionTemplate = keyof typeof EXPRESSION_TEMPLATES;
