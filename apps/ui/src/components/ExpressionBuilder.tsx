'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

type Operator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'in' | 'not_in';
type LogicalOperator = 'AND' | 'OR';

interface SimpleCondition {
  field: string;
  operator: Operator;
  value: string;
}

interface ExpressionBuilderProps {
  value: string;
  onChange: (expression: string) => void;
  mode?: 'simple' | 'advanced';
  placeholder?: string;
  availableFields?: string[];
  showTemplates?: boolean;
}

const OPERATORS: { value: Operator; label: string }[] = [
  { value: '==', label: 'equals (==)' },
  { value: '!=', label: 'not equals (!=)' },
  { value: '>', label: 'greater than (>)' },
  { value: '>=', label: 'greater or equal (>=)' },
  { value: '<', label: 'less than (<)' },
  { value: '<=', label: 'less or equal (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'regex', label: 'matches regex' },
  { value: 'in', label: 'in list' },
  { value: 'not_in', label: 'not in list' },
];

const TEMPLATES = [
  {
    label: 'Check if field exists',
    expression: '{{ $json.fieldName !== undefined }}',
  },
  {
    label: 'Check if field is empty',
    expression: '{{ !$json.fieldName || $json.fieldName === "" }}',
  },
  {
    label: 'Score above threshold',
    expression: '{{ $json.score > 0.7 }}',
  },
  {
    label: 'Status is approved',
    expression: '{{ $json.status === "approved" }}',
  },
  {
    label: 'Multiple conditions (AND)',
    expression: '{{ $json.isValid && $json.score > 0.5 }}',
  },
  {
    label: 'Multiple conditions (OR)',
    expression: '{{ $json.isValid || $json.retryCount < 3 }}',
  },
  {
    label: 'Array has items',
    expression: '{{ Array.isArray($json.items) && $json.items.length > 0 }}',
  },
  {
    label: 'String contains text',
    expression: '{{ $json.message.includes("error") }}',
  },
];

const DEFAULT_FIELDS = [
  '$json.score',
  '$json.status',
  '$json.isValid',
  '$json.approved',
  '$json.message',
  '$json.count',
  '$json.items',
  '$json.result',
];

/**
 * ExpressionBuilder Component
 *
 * A reusable component for building conditional expressions with two modes:
 * - Simple Mode: Visual builder with field/operator/value dropdowns
 * - Advanced Mode: Raw expression textarea with syntax validation
 *
 * Used by SwitchNodeConfigModal, IFNodeConfigModal, and edge condition builders.
 */
export function ExpressionBuilder({
  value,
  onChange,
  mode: initialMode = 'simple',
  placeholder = 'Enter expression...',
  availableFields = DEFAULT_FIELDS,
  showTemplates = true,
}: ExpressionBuilderProps) {
  const [mode, setMode] = useState<'simple' | 'advanced'>(initialMode);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Parse expression to simple conditions (best effort)
  const parseToSimple = useCallback((expr: string): SimpleCondition[] => {
    // Strip {{ }} wrappers
    const cleaned = expr.replace(/^\{\{\s*|\s*\}\}$/g, '').trim();

    // Try to parse simple conditions joined by && or ||
    if (!cleaned) {
      return [{ field: '', operator: '==', value: '' }];
    }

    // Simple single condition pattern: $json.field operator value
    const singleMatch = cleaned.match(/(\$json\.\w+)\s*(==|!=|>|>=|<|<=)\s*(.+)/);
    if (singleMatch) {
      return [{
        field: singleMatch[1],
        operator: singleMatch[2] as Operator,
        value: singleMatch[3].replace(/^["']|["']$/g, ''),
      }];
    }

    // Default empty condition
    return [{ field: '', operator: '==', value: '' }];
  }, []);

  const [simpleConditions, setSimpleConditions] = useState<SimpleCondition[]>(() => parseToSimple(value));
  const [logicalOp, setLogicalOp] = useState<LogicalOperator>('AND');

  // Build expression from simple conditions
  const buildExpression = useCallback((conditions: SimpleCondition[], logicOp: LogicalOperator): string => {
    if (conditions.length === 0) return '';

    const parts = conditions
      .filter(c => c.field && c.operator)
      .map(c => {
        const op = c.operator;
        let expr = '';

        // Handle special operators
        if (op === 'contains') {
          expr = `${c.field}.includes(${JSON.stringify(c.value)})`;
        } else if (op === 'not_contains') {
          expr = `!${c.field}.includes(${JSON.stringify(c.value)})`;
        } else if (op === 'starts_with') {
          expr = `${c.field}.startsWith(${JSON.stringify(c.value)})`;
        } else if (op === 'ends_with') {
          expr = `${c.field}.endsWith(${JSON.stringify(c.value)})`;
        } else if (op === 'regex') {
          expr = `/${c.value}/.test(${c.field})`;
        } else if (op === 'in') {
          expr = `[${c.value}].includes(${c.field})`;
        } else if (op === 'not_in') {
          expr = `![${c.value}].includes(${c.field})`;
        } else {
          // Standard comparison operators
          const valueFormatted = isNaN(Number(c.value))
            ? JSON.stringify(c.value)
            : c.value;
          expr = `${c.field} ${op} ${valueFormatted}`;
        }

        return expr;
      });

    if (parts.length === 0) return '';

    const joined = parts.join(` ${logicOp === 'AND' ? '&&' : '||'} `);
    return `{{ ${joined} }}`;
  }, []);

  // Validate expression syntax
  const validateExpression = useCallback((expr: string): { valid: boolean; error?: string } => {
    if (!expr.trim()) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    // Check for {{ }} wrapper
    if (!expr.includes('{{') || !expr.includes('}}')) {
      return { valid: false, error: 'Expression must be wrapped in {{ }}' };
    }

    // Check for balanced braces
    const openCount = (expr.match(/\{\{/g) || []).length;
    const closeCount = (expr.match(/\}\}/g) || []).length;
    if (openCount !== closeCount) {
      return { valid: false, error: 'Unbalanced {{ }} braces' };
    }

    return { valid: true };
  }, []);

  const validation = useMemo(() => validateExpression(value), [value, validateExpression]);

  const addCondition = useCallback(() => {
    const newConditions = [...simpleConditions, { field: '', operator: '==', value: '' } as SimpleCondition];
    setSimpleConditions(newConditions);
  }, [simpleConditions]);

  const removeCondition = useCallback((index: number) => {
    const newConditions = simpleConditions.filter((_, i) => i !== index);
    setSimpleConditions(newConditions);
    onChange(buildExpression(newConditions, logicalOp));
  }, [simpleConditions, buildExpression, logicalOp, onChange]);

  const updateCondition = useCallback((index: number, field: keyof SimpleCondition, value: string) => {
    const newConditions = [...simpleConditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setSimpleConditions(newConditions);
    onChange(buildExpression(newConditions, logicalOp));
  }, [simpleConditions, buildExpression, logicalOp, onChange]);

  const updateLogicalOp = useCallback((op: LogicalOperator) => {
    setLogicalOp(op);
    onChange(buildExpression(simpleConditions, op));
  }, [simpleConditions, buildExpression, onChange]);

  const applyTemplate = useCallback((template: string) => {
    onChange(template);
    setShowTemplateMenu(false);
    // Try to parse it back to simple mode
    setSimpleConditions(parseToSimple(template));
  }, [onChange, parseToSimple]);

  const switchMode = useCallback((newMode: 'simple' | 'advanced') => {
    if (newMode === 'simple') {
      // Parse current expression to simple conditions
      setSimpleConditions(parseToSimple(value));
    } else if (newMode === 'advanced') {
      // Build expression from simple conditions before switching
      if (simpleConditions.some(c => c.field && c.operator)) {
        onChange(buildExpression(simpleConditions, logicalOp));
      }
    }
    setMode(newMode);
  }, [value, simpleConditions, logicalOp, parseToSimple, buildExpression, onChange]);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper p-1">
          <button
            type="button"
            onClick={() => switchMode('simple')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === 'simple'
                ? 'bg-brand-accent text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Simple
          </button>
          <button
            type="button"
            onClick={() => switchMode('advanced')}
            className={`rounded-md px-3 py-1 text-sm font-medium transition ${
              mode === 'advanced'
                ? 'bg-brand-accent text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Advanced
          </button>
        </div>

        {/* Template Selector */}
        {showTemplates && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              className="flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-1.5 text-sm text-slate-300 transition hover:border-brand-accent hover:text-white"
            >
              Templates
              <ChevronDown className="h-4 w-4" />
            </button>
            {showTemplateMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-brand-outline/40 bg-brand-paper shadow-xl">
                {TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(template.expression)}
                    className="w-full border-b border-brand-outline/20 px-4 py-3 text-left transition hover:bg-brand-paperElev last:border-b-0"
                  >
                    <div className="text-sm font-medium text-white">{template.label}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{template.expression}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simple Mode */}
      {mode === 'simple' && (
        <div className="space-y-3">
          {simpleConditions.map((condition, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-2">
                {/* Field Selector */}
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Field</label>
                  <input
                    type="text"
                    list={`fields-${index}`}
                    value={condition.field}
                    onChange={(e) => updateCondition(index, 'field', e.target.value)}
                    placeholder="e.g., $json.score"
                    className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                  />
                  <datalist id={`fields-${index}`}>
                    {availableFields.map((field) => (
                      <option key={field} value={field} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Operator Selector */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Operator</label>
                    <select
                      value={condition.operator}
                      onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                      className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 focus:border-brand-accent focus:outline-none"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Value Input */}
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Value</label>
                    <input
                      type="text"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, 'value', e.target.value)}
                      placeholder="value"
                      className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Remove Button */}
              {simpleConditions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {/* Logical Operator (if multiple conditions) */}
          {simpleConditions.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Join with:</label>
              <div className="flex gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper p-1">
                <button
                  type="button"
                  onClick={() => updateLogicalOp('AND')}
                  className={`rounded px-3 py-1 text-sm font-medium transition ${
                    logicalOp === 'AND'
                      ? 'bg-brand-accent text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => updateLogicalOp('OR')}
                  className={`rounded px-3 py-1 text-sm font-medium transition ${
                    logicalOp === 'OR'
                      ? 'bg-brand-accent text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  OR
                </button>
              </div>
            </div>
          )}

          {/* Add Condition Button */}
          <button
            type="button"
            onClick={addCondition}
            className="flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2 text-sm text-slate-300 transition hover:border-brand-accent hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add Condition
          </button>

          {/* Preview */}
          <div className="rounded-lg border border-brand-outline/40 bg-brand-ink/60 p-3">
            <div className="mb-1 text-xs font-medium text-slate-400">Expression Preview:</div>
            <code className="text-xs text-green-400">{buildExpression(simpleConditions, logicalOp) || '(empty)'}</code>
          </div>
        </div>
      )}

      {/* Advanced Mode */}
      {mode === 'advanced' && (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 font-mono text-sm text-green-400 placeholder-slate-500 focus:border-brand-accent focus:outline-none"
          />

          {/* Validation */}
          {value && !validation.valid && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <span className="text-red-400">⚠</span>
              <div className="text-sm text-red-400">{validation.error}</div>
            </div>
          )}

          {value && validation.valid && (
            <div className="flex items-start gap-2 rounded-lg border border-green-500/40 bg-green-500/10 p-3">
              <span className="text-green-400">✓</span>
              <div className="text-sm text-green-400">Expression is valid</div>
            </div>
          )}

          {/* Help Text */}
          <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-xs text-blue-300">
            <div className="mb-1 font-semibold">Expression Syntax:</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>Wrap expressions in <code className="text-blue-200">{'{{ }}'}</code></li>
              <li>Access data with <code className="text-blue-200">$json.fieldName</code></li>
              <li>Use JavaScript operators: <code className="text-blue-200">{'&&, ||, ==, !=, >, <'}</code></li>
              <li>Examples: <code className="text-blue-200">{'{{ $json.score > 0.8 }}'}</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
