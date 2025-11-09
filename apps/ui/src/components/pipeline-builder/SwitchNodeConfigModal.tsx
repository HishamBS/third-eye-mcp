'use client';

import { memo, useState, useCallback } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { ExpressionBuilder } from './ExpressionBuilder';
import { ANIMATION_DURATION } from '@/constants/timing';
import type { SwitchNodeConfig, SwitchRule } from '@third-eye/types';

/**
 * Switch Node Configuration Modal
 *
 * Visual rule builder for Switch nodes with:
 * - Mode selector (Rules/Expression)
 * - Add/remove rules visually
 * - ExpressionBuilder per rule
 * - Auto-assign output indices
 * - Fallback output toggle
 * - Send-to-all toggle
 *
 * Per R01: Uses centralized ExpressionBuilder
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 * Per R13: No magic strings/numbers
 */

/**
 * Modal UI Text Constants
 */
const MODAL_TEXT = {
  TITLE: 'Configure Switch Node',
  MODE_LABEL: 'Mode',
  MODE_RULES: 'Rules',
  MODE_EXPRESSION: 'Expression',
  RULES_SECTION_TITLE: 'Routing Rules',
  RULES_HELP: 'Each rule defines a condition and which output to route to',
  ADD_RULE_BUTTON: 'Add Rule',
  RULE_LABEL_PLACEHOLDER: 'Rule label...',
  RULE_OUTPUT_LABEL: 'Output',
  EXPRESSION_SECTION_TITLE: 'Single Expression',
  EXPRESSION_HELP: 'Define a single expression that determines routing',
  FALLBACK_TOGGLE_LABEL: 'Enable Fallback Output',
  FALLBACK_HELP: 'Route to this output if no rules match',
  FALLBACK_OUTPUT_LABEL: 'Fallback Output Index',
  SEND_ALL_TOGGLE_LABEL: 'Send to All Matching Outputs',
  SEND_ALL_HELP: 'When enabled, executes all matching rules instead of just the first match',
  SAVE_BUTTON: 'Save Configuration',
  CANCEL_BUTTON: 'Cancel',
} as const;

/**
 * SwitchNodeConfigModal Props
 */
export interface SwitchNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: SwitchNodeConfig | undefined;
  onSave: (config: SwitchNodeConfig) => void;
}

/**
 * SwitchNodeConfigModal Component
 */
function SwitchNodeConfigModalComponent({
  isOpen,
  onClose,
  config,
  onSave,
}: SwitchNodeConfigModalProps) {
  const [mode, setMode] = useState<'rules' | 'expression'>(config?.mode ?? 'rules');
  const [rules, setRules] = useState<SwitchRule[]>(
    config?.rules ?? [
      {
        expression: { '==': [{ var: 'verdict' }, 'OK'] },
        label: 'Approved',
        outputIndex: 0,
      },
    ]
  );
  const [expression, setExpression] = useState<unknown>(
    config?.expression ?? { '==': [{ var: 'verdict' }, 'OK'] }
  );
  const [sendToAll, setSendToAll] = useState<boolean>(config?.sendToAll ?? false);
  const [fallbackEnabled, setFallbackEnabled] = useState<boolean>(
    config?.fallbackOutput !== undefined
  );
  const [fallbackOutput, setFallbackOutput] = useState<number>(config?.fallbackOutput ?? 0);

  const handleAddRule = useCallback(() => {
    const newRule: SwitchRule = {
      expression: { '==': [{ var: 'verdict' }, 'OK'] },
      label: `Rule ${rules.length + 1}`,
      outputIndex: rules.length,
    };
    setRules((prev) => [...prev, newRule]);
  }, [rules.length]);

  const handleRemoveRule = useCallback((index: number) => {
    setRules((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      // Re-index output indices
      return updated.map((rule, idx) => ({ ...rule, outputIndex: idx }));
    });
  }, []);

  const handleRuleExpressionChange = useCallback((index: number, newExpression: unknown) => {
    setRules((prev) =>
      prev.map((rule, idx) => (idx === index ? { ...rule, expression: newExpression } : rule))
    );
  }, []);

  const handleRuleLabelChange = useCallback((index: number, newLabel: string) => {
    setRules((prev) =>
      prev.map((rule, idx) => (idx === index ? { ...rule, label: newLabel } : rule))
    );
  }, []);

  const handleSave = useCallback(() => {
    const newConfig: SwitchNodeConfig = {
      mode,
      sendToAll,
      ...(mode === 'rules' && { rules }),
      ...(mode === 'expression' && { expression }),
      ...(fallbackEnabled && { fallbackOutput }),
    };
    onSave(newConfig);
    onClose();
  }, [mode, rules, expression, sendToAll, fallbackEnabled, fallbackOutput, onSave, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
        relative w-full max-w-3xl max-h-[90vh] overflow-y-auto
        bg-brand-paper rounded-lg shadow-2xl
        transition-all ${ANIMATION_DURATION.NORMAL} ease-out
      `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-brand-paper border-b border-brand-outline">
          <h2 className="text-xl font-semibold text-brand-foreground">{MODAL_TEXT.TITLE}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-semantic-muted hover:text-brand-foreground hover:bg-brand-outline/20 rounded transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-foreground">
              {MODAL_TEXT.MODE_LABEL}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode('rules')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${ANIMATION_DURATION.FAST}
                  ${
                    mode === 'rules'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-brand-outline bg-brand-surface text-brand-foreground hover:border-brand-primary/50'
                  }
                `}
              >
                {MODAL_TEXT.MODE_RULES}
              </button>
              <button
                type="button"
                onClick={() => setMode('expression')}
                className={`
                  flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${ANIMATION_DURATION.FAST}
                  ${
                    mode === 'expression'
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-brand-outline bg-brand-surface text-brand-foreground hover:border-brand-primary/50'
                  }
                `}
              >
                {MODAL_TEXT.MODE_EXPRESSION}
              </button>
            </div>
          </div>

          {/* Rules Mode */}
          {mode === 'rules' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-foreground mb-1">
                  {MODAL_TEXT.RULES_SECTION_TITLE}
                </h3>
                <p className="text-xs text-semantic-muted">{MODAL_TEXT.RULES_HELP}</p>
              </div>

              {/* Rules List */}
              <div className="space-y-4">
                {rules.map((rule, index) => (
                  <div
                    key={index}
                    className="p-4 bg-brand-surface border border-brand-outline rounded-lg space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-semantic-muted" />
                      <input
                        type="text"
                        className="flex-1 px-3 py-2 text-sm bg-brand-paper border border-brand-outline rounded-md text-brand-foreground placeholder-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        placeholder={MODAL_TEXT.RULE_LABEL_PLACEHOLDER}
                        value={rule.label}
                        onChange={(e) => handleRuleLabelChange(index, e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-semantic-muted">
                          {MODAL_TEXT.RULE_OUTPUT_LABEL}:
                        </span>
                        <span className="px-2 py-1 text-xs font-mono bg-brand-primary/10 text-brand-primary rounded">
                          {rule.outputIndex}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(index)}
                        className="p-2 text-semantic-error hover:bg-semantic-error/10 rounded transition-all"
                        disabled={rules.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Expression Builder for this rule */}
                    <ExpressionBuilder
                      value={rule.expression}
                      onChange={(newExpression) => handleRuleExpressionChange(index, newExpression)}
                      placeholder="Define condition for this rule..."
                    />
                  </div>
                ))}
              </div>

              {/* Add Rule Button */}
              <button
                type="button"
                onClick={handleAddRule}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                {MODAL_TEXT.ADD_RULE_BUTTON}
              </button>

              {/* Send to All Toggle */}
              <div className="flex items-center justify-between p-4 bg-brand-surface border border-brand-outline rounded-lg">
                <div className="flex-1">
                  <label className="text-sm font-medium text-brand-foreground">
                    {MODAL_TEXT.SEND_ALL_TOGGLE_LABEL}
                  </label>
                  <p className="text-xs text-semantic-muted mt-1">{MODAL_TEXT.SEND_ALL_HELP}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={sendToAll}
                    onChange={(e) => setSendToAll(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-brand-outline peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                </label>
              </div>
            </div>
          )}

          {/* Expression Mode */}
          {mode === 'expression' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-brand-foreground mb-1">
                  {MODAL_TEXT.EXPRESSION_SECTION_TITLE}
                </h3>
                <p className="text-xs text-semantic-muted">{MODAL_TEXT.EXPRESSION_HELP}</p>
              </div>

              <ExpressionBuilder
                value={expression}
                onChange={setExpression}
                placeholder="Define routing expression..."
              />
            </div>
          )}

          {/* Fallback Output */}
          <div className="space-y-3 p-4 bg-brand-surface border border-brand-outline rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-brand-foreground">
                  {MODAL_TEXT.FALLBACK_TOGGLE_LABEL}
                </label>
                <p className="text-xs text-semantic-muted mt-1">{MODAL_TEXT.FALLBACK_HELP}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={fallbackEnabled}
                  onChange={(e) => setFallbackEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-brand-outline peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            {fallbackEnabled && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-brand-foreground">
                  {MODAL_TEXT.FALLBACK_OUTPUT_LABEL}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 text-sm bg-brand-paper border border-brand-outline rounded-md text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  value={fallbackOutput}
                  onChange={(e) => setFallbackOutput(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 bg-brand-paper border-t border-brand-outline">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-brand-foreground bg-brand-surface border border-brand-outline rounded-md hover:bg-brand-outline/20 transition-all"
          >
            {MODAL_TEXT.CANCEL_BUTTON}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-brand-background bg-brand-primary rounded-md hover:bg-brand-primary/90 transition-all"
          >
            {MODAL_TEXT.SAVE_BUTTON}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized SwitchNodeConfigModal (Performance optimization per R04)
 */
export const SwitchNodeConfigModal = memo(SwitchNodeConfigModalComponent);
SwitchNodeConfigModal.displayName = 'SwitchNodeConfigModal';
