/**
 * Expression Evaluator
 *
 * Evaluates conditional expressions for pipeline workflow execution.
 * Supports operators: ==, !=, >, <, >=, <=, contains, starts_with, ends_with, regex, in, not_in
 * Supports logical operators: AND, OR
 * Expression format: {{ $json.field operator value }}
 */

export interface EvaluationContext {
  $json: Record<string, unknown>;
  $input: Record<string, unknown>;
  [key: string]: unknown;
}

export class ExpressionEvaluator {
  /**
   * Evaluate an expression with given context
   */
  static evaluate(expression: string, context: EvaluationContext): boolean {
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    const trimmed = expression.trim();

    // Remove template delimiters if present
    const cleaned = this.cleanExpression(trimmed);

    // Handle logical operators (AND/OR)
    if (cleaned.includes(' AND ')) {
      return this.evaluateLogicalAnd(cleaned, context);
    }

    if (cleaned.includes(' OR ')) {
      return this.evaluateLogicalOr(cleaned, context);
    }

    // Single condition
    return this.evaluateSingleCondition(cleaned, context);
  }

  /**
   * Remove template delimiters from expression
   */
  private static cleanExpression(expression: string): string {
    let cleaned = expression.trim();

    // Remove {{ }} delimiters
    if (cleaned.startsWith('{{') && cleaned.endsWith('}}')) {
      cleaned = cleaned.slice(2, -2).trim();
    }

    return cleaned;
  }

  /**
   * Evaluate logical AND expression
   */
  private static evaluateLogicalAnd(expression: string, context: EvaluationContext): boolean {
    const parts = expression.split(' AND ').map(p => p.trim());
    return parts.every(part => this.evaluateSingleCondition(part, context));
  }

  /**
   * Evaluate logical OR expression
   */
  private static evaluateLogicalOr(expression: string, context: EvaluationContext): boolean {
    const parts = expression.split(' OR ').map(p => p.trim());
    return parts.some(part => this.evaluateSingleCondition(part, context));
  }

  /**
   * Evaluate a single condition (no logical operators)
   */
  private static evaluateSingleCondition(condition: string, context: EvaluationContext): boolean {
    // Try to match pattern: field operator value
    // Support operators with spaces and without
    const operators = [
      'not_contains',
      'not_in',
      'starts_with',
      'ends_with',
      'contains',
      'regex',
      'in',
      '>=',
      '<=',
      '==',
      '!=',
      '>',
      '<',
    ];

    for (const operator of operators) {
      const index = condition.indexOf(` ${operator} `);
      if (index !== -1) {
        const fieldPart = condition.slice(0, index).trim();
        const valuePart = condition.slice(index + operator.length + 2).trim();

        const fieldValue = this.resolveValue(fieldPart, context);
        const compareValue = this.resolveValue(valuePart, context);

        return this.applyOperator(fieldValue, operator, compareValue);
      }
    }

    // If no operator found, try to evaluate as boolean variable
    const value = this.resolveValue(condition, context);
    return Boolean(value);
  }

  /**
   * Resolve a value from context or parse literal
   */
  private static resolveValue(value: string, context: EvaluationContext): unknown {
    const trimmed = value.trim();

    // Check if it's a context variable ($json.field, $input.field)
    if (trimmed.startsWith('$')) {
      return this.resolveContextPath(trimmed, context);
    }

    // Parse literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    if (trimmed === 'undefined') return undefined;

    // Try to parse as number
    const num = Number(trimmed);
    if (!isNaN(num)) return num;

    // Remove quotes from strings
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Try to parse as JSON array/object
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }

    // Return as-is (unquoted string)
    return trimmed;
  }

  /**
   * Resolve context path like $json.score or $json.user.name
   */
  private static resolveContextPath(path: string, context: EvaluationContext): unknown {
    const parts = path.split('.');
    const rootKey = parts[0]; // e.g., '$json'

    if (!(rootKey in context)) {
      return undefined;
    }

    let value: unknown = context[rootKey];

    // Traverse nested properties
    for (let i = 1; i < parts.length; i++) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = (value as Record<string, unknown>)[parts[i]];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Apply operator to compare two values
   */
  private static applyOperator(left: unknown, operator: string, right: unknown): boolean {
    switch (operator) {
      case '==':
        return left === right;

      case '!=':
        return left !== right;

      case '>':
        return Number(left) > Number(right);

      case '<':
        return Number(left) < Number(right);

      case '>=':
        return Number(left) >= Number(right);

      case '<=':
        return Number(left) <= Number(right);

      case 'contains':
        return String(left).includes(String(right));

      case 'not_contains':
        return !String(left).includes(String(right));

      case 'starts_with':
        return String(left).startsWith(String(right));

      case 'ends_with':
        return String(left).endsWith(String(right));

      case 'regex': {
        try {
          const regex = new RegExp(String(right));
          return regex.test(String(left));
        } catch {
          return false;
        }
      }

      case 'in':
        if (Array.isArray(right)) {
          return right.includes(left);
        }
        return false;

      case 'not_in':
        if (Array.isArray(right)) {
          return !right.includes(left);
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Validate expression syntax (basic validation)
   */
  static validate(expression: string): { valid: boolean; error?: string } {
    if (!expression || typeof expression !== 'string') {
      return { valid: false, error: 'Expression must be a non-empty string' };
    }

    const cleaned = this.cleanExpression(expression.trim());

    if (cleaned.length === 0) {
      return { valid: false, error: 'Expression is empty' };
    }

    // Basic syntax check - should have at least one operator or be a variable reference
    const hasOperator = [
      '==', '!=', '>', '<', '>=', '<=',
      'contains', 'not_contains', 'starts_with', 'ends_with',
      'regex', 'in', 'not_in'
    ].some(op => cleaned.includes(` ${op} `));

    const hasLogicalOp = cleaned.includes(' AND ') || cleaned.includes(' OR ');
    const isVariableRef = cleaned.startsWith('$');

    if (!hasOperator && !hasLogicalOp && !isVariableRef) {
      return {
        valid: false,
        error: 'Expression must contain an operator, logical operator, or be a variable reference'
      };
    }

    return { valid: true };
  }
}
