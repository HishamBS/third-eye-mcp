"use client";

import { memo, useState, useCallback, useMemo } from "react";
import { Plus, Trash2, Code, WandSparkles } from "lucide-react";
import { ANIMATION_DURATION } from "@/constants/timing";

/**
 * Expression Builder Component - SSOT for visual expression construction
 *
 * Provides two modes:
 * - Simple: Visual field/operator/value builder with AND/OR chains
 * - Advanced: Raw JSONLogic textarea with validation
 *
 * Per R01: Centralized expression building logic
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 * Per R13: No magic strings/numbers
 */

/**
 * Available operators for simple mode
 */
const OPERATORS = [
  { value: "==", label: "Equals (==)", jsonLogic: "==" },
  { value: "!=", label: "Not Equals (!=)", jsonLogic: "!=" },
  { value: ">", label: "Greater Than (>)", jsonLogic: ">" },
  { value: ">=", label: "Greater or Equal (>=)", jsonLogic: ">=" },
  { value: "<", label: "Less Than (<)", jsonLogic: "<" },
  { value: "<=", label: "Less or Equal (<=)", jsonLogic: "<=" },
  { value: "in", label: "In Array (in)", jsonLogic: "in" },
  { value: "contains", label: "Contains", jsonLogic: "in" },
] as const;

/**
 * Available fields from execution context
 */
const AVAILABLE_FIELDS = [
  { value: "verdict", label: "Verdict", path: "verdict" },
  { value: "output.score", label: "Output Score", path: "output.score" },
  { value: "output.verdict", label: "Output Verdict", path: "output.verdict" },
  {
    value: "output.confidence",
    label: "Output Confidence",
    path: "output.confidence",
  },
  {
    value: "metadata.category",
    label: "Metadata Category",
    path: "metadata.category",
  },
  {
    value: "metadata.priority",
    label: "Metadata Priority",
    path: "metadata.priority",
  },
  { value: "metadata.tags", label: "Metadata Tags", path: "metadata.tags" },
  { value: "loop.index", label: "Loop Index", path: "loop.index" },
  { value: "loop.item", label: "Loop Item", path: "loop.item" },
  { value: "loop.total", label: "Loop Total", path: "loop.total" },
] as const;

/**
 * Expression templates for common patterns
 */
const EXPRESSION_TEMPLATES = [
  {
    label: "Verdict is OK",
    expression: { "==": [{ var: "verdict" }, "OK"] },
  },
  {
    label: "Score above 80",
    expression: { ">": [{ var: "output.score" }, 80] },
  },
  {
    label: "Score between 60-80",
    expression: {
      and: [
        { ">=": [{ var: "output.score" }, 60] },
        { "<=": [{ var: "output.score" }, 80] },
      ],
    },
  },
  {
    label: "High confidence",
    expression: { ">": [{ var: "output.confidence" }, 0.9] },
  },
  {
    label: "Category is Security",
    expression: { "==": [{ var: "metadata.category" }, "security"] },
  },
  {
    label: 'Tags contains "urgent"',
    expression: { in: ["urgent", { var: "metadata.tags" }] },
  },
] as const;

/**
 * Chain operator types
 */
type ChainOperator = "and" | "or";

/**
 * Simple condition structure
 */
interface SimpleCondition {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean;
}

/**
 * ExpressionBuilder Props
 */
export interface ExpressionBuilderProps {
  value?: unknown;
  onChange: (expression: unknown) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Validate JSONLogic expression
 */
function validateJSONLogic(expr: unknown): { valid: boolean; error?: string } {
  if (!expr) {
    return { valid: false, error: "Expression cannot be empty" };
  }

  if (typeof expr === "string") {
    try {
      const parsed = JSON.parse(expr);
      return validateJSONLogic(parsed);
    } catch (err) {
      return {
        valid: false,
        error: `Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      };
    }
  }

  if (typeof expr !== "object" || expr === null) {
    return {
      valid: false,
      error: "Expression must be an object or valid JSON string",
    };
  }

  return { valid: true };
}

/**
 * Convert simple conditions to JSONLogic
 */
function conditionsToJSONLogic(
  conditions: SimpleCondition[],
  chainOperator: ChainOperator,
): unknown {
  if (conditions.length === 0) {
    return null;
  }

  if (conditions.length === 1) {
    const condition = conditions[0];
    const operator = OPERATORS.find((op) => op.value === condition.operator);
    if (!operator) {
      return null;
    }

    return {
      [operator.jsonLogic]: [{ var: condition.field }, condition.value],
    };
  }

  const logicConditions = conditions
    .map((condition) => {
      const operator = OPERATORS.find((op) => op.value === condition.operator);
      if (!operator) {
        return null;
      }

      return {
        [operator.jsonLogic]: [{ var: condition.field }, condition.value],
      };
    })
    .filter((c) => c !== null);

  return {
    [chainOperator]: logicConditions,
  };
}

/**
 * Parse JSONLogic into simple conditions (best effort)
 */
function parseJSONLogicToConditions(expr: unknown): {
  conditions: SimpleCondition[];
  chainOperator: ChainOperator;
} | null {
  if (!expr || typeof expr !== "object") {
    return null;
  }

  const exprObj = expr as Record<string, unknown>;
  const keys = Object.keys(exprObj);

  if (keys.length === 0) {
    return null;
  }

  // Single condition case
  const operatorKey = keys[0];
  const operatorMatch = OPERATORS.find((op) => op.jsonLogic === operatorKey);

  if (operatorMatch && !["and", "or"].includes(operatorKey)) {
    const operands = exprObj[operatorKey] as unknown[];
    if (Array.isArray(operands) && operands.length === 2) {
      const field = (operands[0] as { var?: string })?.var;
      const value = operands[1];

      if (field && value !== undefined) {
        return {
          conditions: [
            {
              id: Math.random().toString(36).substring(7),
              field,
              operator: operatorMatch.value,
              value: value as string | number | boolean,
            },
          ],
          chainOperator: "and",
        };
      }
    }
  }

  // Chain condition case (and/or)
  if (operatorKey === "and" || operatorKey === "or") {
    const chainOperator = operatorKey as ChainOperator;
    const operands = exprObj[operatorKey] as unknown[];

    if (!Array.isArray(operands)) {
      return null;
    }

    const conditions: SimpleCondition[] = [];

    for (const operand of operands) {
      if (typeof operand !== "object" || operand === null) {
        continue;
      }

      const operandObj = operand as Record<string, unknown>;
      const opKey = Object.keys(operandObj)[0];
      const opMatch = OPERATORS.find((op) => op.jsonLogic === opKey);

      if (opMatch) {
        const opOperands = operandObj[opKey] as unknown[];
        if (Array.isArray(opOperands) && opOperands.length === 2) {
          const field = (opOperands[0] as { var?: string })?.var;
          const value = opOperands[1];

          if (field && value !== undefined) {
            conditions.push({
              id: Math.random().toString(36).substring(7),
              field,
              operator: opMatch.value,
              value: value as string | number | boolean,
            });
          }
        }
      }
    }

    if (conditions.length > 0) {
      return { conditions, chainOperator };
    }
  }

  return null;
}

/**
 * ExpressionBuilder Component
 */
function ExpressionBuilderComponent({
  value,
  onChange,
  placeholder = "Build your expression...",
  className = "",
}: ExpressionBuilderProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [chainOperator, setChainOperator] = useState<ChainOperator>("and");
  const [conditions, setConditions] = useState<SimpleCondition[]>(() => {
    const parsed = parseJSONLogicToConditions(value);
    return (
      parsed?.conditions ?? [
        {
          id: Math.random().toString(36).substring(7),
          field: "verdict",
          operator: "==",
          value: "OK",
        },
      ]
    );
  });
  const [advancedText, setAdvancedText] = useState<string>(() =>
    value ? JSON.stringify(value, null, 2) : "",
  );
  const [validationError, setValidationError] = useState<string | undefined>();

  const handleModeChange = useCallback(
    (newMode: "simple" | "advanced") => {
      if (newMode === "advanced") {
        const jsonLogic = conditionsToJSONLogic(conditions, chainOperator);
        setAdvancedText(jsonLogic ? JSON.stringify(jsonLogic, null, 2) : "");
      } else {
        try {
          const parsed = JSON.parse(advancedText);
          const result = parseJSONLogicToConditions(parsed);
          if (result) {
            setConditions(result.conditions);
            setChainOperator(result.chainOperator);
          }
        } catch {
          // Keep existing conditions
        }
      }
      setMode(newMode);
      setValidationError(undefined);
    },
    [conditions, chainOperator, advancedText],
  );

  const handleAddCondition = useCallback(() => {
    const newCondition: SimpleCondition = {
      id: Math.random().toString(36).substring(7),
      field: "verdict",
      operator: "==",
      value: "",
    };
    setConditions((prev) => [...prev, newCondition]);
  }, []);

  const handleRemoveCondition = useCallback((id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleConditionChange = useCallback(
    (
      id: string,
      field: keyof SimpleCondition,
      value: string | number | boolean,
    ) => {
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
      );
    },
    [],
  );

  const handleSimpleModeUpdate = useCallback(() => {
    const jsonLogic = conditionsToJSONLogic(conditions, chainOperator);
    if (jsonLogic) {
      onChange(jsonLogic);
      setValidationError(undefined);
    } else {
      setValidationError("Invalid conditions");
    }
  }, [conditions, chainOperator, onChange]);

  const handleAdvancedModeUpdate = useCallback(() => {
    try {
      const parsed = JSON.parse(advancedText);
      const validation = validateJSONLogic(parsed);
      if (validation.valid) {
        onChange(parsed);
        setValidationError(undefined);
      } else {
        setValidationError(validation.error);
      }
    } catch (err) {
      setValidationError(
        `Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }, [advancedText, onChange]);

  const handleTemplateSelect = useCallback(
    (template: (typeof EXPRESSION_TEMPLATES)[number]) => {
      onChange(template.expression);
      setAdvancedText(JSON.stringify(template.expression, null, 2));

      const parsed = parseJSONLogicToConditions(template.expression);
      if (parsed) {
        setConditions(parsed.conditions);
        setChainOperator(parsed.chainOperator);
      }

      setValidationError(undefined);
    },
    [onChange],
  );

  const handleChainOperatorChange = useCallback(
    (newOperator: ChainOperator) => {
      setChainOperator(newOperator);
    },
    [],
  );

  const currentExpression = useMemo(() => {
    if (mode === "simple") {
      return conditionsToJSONLogic(conditions, chainOperator);
    }
    try {
      return JSON.parse(advancedText);
    } catch {
      return null;
    }
  }, [mode, conditions, chainOperator, advancedText]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleModeChange("simple")}
            className={`
              px-3 py-1.5 text-sm font-medium rounded-md transition-all ${ANIMATION_DURATION.FAST}
              ${
                mode === "simple"
                  ? "bg-brand-primary text-brand-background"
                  : "bg-brand-surface text-brand-foreground hover:bg-brand-outline/20"
              }
            `}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("advanced")}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${ANIMATION_DURATION.FAST}
              ${
                mode === "advanced"
                  ? "bg-brand-primary text-brand-background"
                  : "bg-brand-surface text-brand-foreground hover:bg-brand-outline/20"
              }
            `}
          >
            <Code className="w-3.5 h-3.5" />
            Advanced
          </button>
        </div>

        {/* Template Selector */}
        <select
          className="px-3 py-1.5 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
          onChange={(e) => {
            const templateIndex = parseInt(e.target.value, 10);
            if (!isNaN(templateIndex)) {
              handleTemplateSelect(EXPRESSION_TEMPLATES[templateIndex]);
            }
          }}
          value=""
        >
          <option value="" disabled>
            Load Template...
          </option>
          {EXPRESSION_TEMPLATES.map((template, index) => (
            <option key={index} value={index}>
              {template.label}
            </option>
          ))}
        </select>
      </div>

      {/* Simple Mode */}
      {mode === "simple" && (
        <div className="space-y-3">
          {/* Chain Operator (only show if multiple conditions) */}
          {conditions.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-semantic-muted">
                Join conditions with:
              </span>
              <button
                type="button"
                onClick={() => handleChainOperatorChange("and")}
                className={`
                  px-3 py-1 text-xs font-medium rounded transition-all ${ANIMATION_DURATION.FAST}
                  ${
                    chainOperator === "and"
                      ? "bg-brand-primary text-brand-background"
                      : "bg-brand-surface text-brand-foreground hover:bg-brand-outline/20"
                  }
                `}
              >
                AND
              </button>
              <button
                type="button"
                onClick={() => handleChainOperatorChange("or")}
                className={`
                  px-3 py-1 text-xs font-medium rounded transition-all ${ANIMATION_DURATION.FAST}
                  ${
                    chainOperator === "or"
                      ? "bg-brand-primary text-brand-background"
                      : "bg-brand-surface text-brand-foreground hover:bg-brand-outline/20"
                  }
                `}
              >
                OR
              </button>
            </div>
          )}

          {/* Conditions */}
          {conditions.map((condition, index) => (
            <div key={condition.id} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-xs font-medium text-semantic-muted uppercase">
                  {chainOperator}
                </span>
              )}
              <select
                className="flex-1 px-3 py-2 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                value={condition.field}
                onChange={(e) =>
                  handleConditionChange(condition.id, "field", e.target.value)
                }
              >
                {AVAILABLE_FIELDS.map((field) => (
                  <option key={field.value} value={field.path}>
                    {field.label}
                  </option>
                ))}
              </select>
              <select
                className="flex-1 px-3 py-2 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                value={condition.operator}
                onChange={(e) =>
                  handleConditionChange(
                    condition.id,
                    "operator",
                    e.target.value,
                  )
                }
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="flex-1 px-3 py-2 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground placeholder-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="Value"
                value={condition.value}
                onChange={(e) =>
                  handleConditionChange(condition.id, "value", e.target.value)
                }
              />
              <button
                type="button"
                onClick={() => handleRemoveCondition(condition.id)}
                className="p-2 text-semantic-error hover:bg-semantic-error/10 rounded transition-all"
                disabled={conditions.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Add Condition Button */}
          <button
            type="button"
            onClick={handleAddCondition}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/10 rounded transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>

          {/* Update Button */}
          <button
            type="button"
            onClick={handleSimpleModeUpdate}
            className="w-full px-4 py-2 text-sm font-medium bg-brand-primary text-brand-background rounded-md hover:bg-brand-primary/90 transition-all"
          >
            Update Expression
          </button>
        </div>
      )}

      {/* Advanced Mode */}
      {mode === "advanced" && (
        <div className="space-y-3">
          <textarea
            className="w-full h-40 px-3 py-2 text-sm font-mono bg-brand-surface border border-brand-outline rounded-md text-brand-foreground placeholder-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-primary resize-y"
            placeholder={placeholder}
            value={advancedText}
            onChange={(e) => setAdvancedText(e.target.value)}
          />
          {validationError && (
            <div className="text-xs text-semantic-error">{validationError}</div>
          )}
          <button
            type="button"
            onClick={handleAdvancedModeUpdate}
            className="w-full px-4 py-2 text-sm font-medium bg-brand-primary text-brand-background rounded-md hover:bg-brand-primary/90 transition-all"
          >
            Update Expression
          </button>
        </div>
      )}

      {/* Current Expression Preview */}
      {currentExpression && (
        <div className="p-3 bg-brand-surface border border-brand-outline rounded-md">
          <div className="text-xs font-medium text-semantic-muted mb-1">
            Current Expression:
          </div>
          <pre className="text-xs font-mono text-brand-foreground overflow-x-auto">
            {JSON.stringify(currentExpression, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized ExpressionBuilder (Performance optimization per R04)
 */
export const ExpressionBuilder = memo(ExpressionBuilderComponent);
ExpressionBuilder.displayName = "ExpressionBuilder";
