'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { ExpressionBuilder } from './ExpressionBuilder';
import type { SwitchNodeConfig, SwitchRule } from './pipeline/types';

interface SwitchNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: SwitchNodeConfig;
  onSave: (config: SwitchNodeConfig) => void;
  stepId?: string;
}

/**
 * SwitchNodeConfigModal Component
 *
 * Visual configuration modal for Switch nodes that allows users to:
 * - Choose between Rules or Expression mode
 * - Add/remove/reorder rules visually
 * - Use ExpressionBuilder for each rule's condition
 * - Auto-assign output indices
 * - Configure fallback behavior
 * - Toggle send-to-all mode
 *
 * Eliminates the need to manually write Switch node JSON configuration.
 */
export function SwitchNodeConfigModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
  stepId,
}: SwitchNodeConfigModalProps) {
  const [mode, setMode] = useState<'rules' | 'expression'>(initialConfig?.mode || 'rules');
  const [rules, setRules] = useState<SwitchRule[]>(
    initialConfig?.rules || [{ expression: '', label: 'Rule 1', outputIndex: 0 }]
  );
  const [fallbackIndex, setFallbackIndex] = useState<number | undefined>(initialConfig?.fallbackIndex);
  const [sendToAll, setSendToAll] = useState<boolean>(initialConfig?.sendToAll || false);
  const [enableFallback, setEnableFallback] = useState<boolean>(initialConfig?.fallbackIndex !== undefined);
  const [expandedRuleIndex, setExpandedRuleIndex] = useState<number | null>(0);

  // Reset state when modal opens with new config
  useEffect(() => {
    if (isOpen) {
      setMode(initialConfig?.mode || 'rules');
      setRules(initialConfig?.rules || [{ expression: '', label: 'Rule 1', outputIndex: 0 }]);
      setFallbackIndex(initialConfig?.fallbackIndex);
      setSendToAll(initialConfig?.sendToAll || false);
      setEnableFallback(initialConfig?.fallbackIndex !== undefined);
      setExpandedRuleIndex(0);
    }
  }, [isOpen, initialConfig]);

  const addRule = useCallback(() => {
    const newIndex = rules.length;
    setRules([
      ...rules,
      {
        expression: '',
        label: `Rule ${newIndex + 1}`,
        outputIndex: newIndex,
      },
    ]);
    setExpandedRuleIndex(newIndex);
  }, [rules]);

  const removeRule = useCallback((index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    // Re-index output indices
    const reindexed = newRules.map((rule, i) => ({
      ...rule,
      outputIndex: i,
    }));
    setRules(reindexed);
    if (expandedRuleIndex === index) {
      setExpandedRuleIndex(null);
    }
  }, [rules, expandedRuleIndex]);

  const updateRule = useCallback((index: number, field: keyof SwitchRule, value: string | number) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  }, [rules]);

  const moveRule = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rules.length) return;

    const newRules = [...rules];
    const [moved] = newRules.splice(fromIndex, 1);
    newRules.splice(toIndex, 0, moved);

    // Re-index output indices
    const reindexed = newRules.map((rule, i) => ({
      ...rule,
      outputIndex: i,
    }));

    setRules(reindexed);
    setExpandedRuleIndex(toIndex);
  }, [rules]);

  const handleSave = useCallback(() => {
    const config: SwitchNodeConfig = {
      mode,
      rules: mode === 'rules' ? rules : undefined,
      fallbackIndex: enableFallback ? fallbackIndex : undefined,
      sendToAll,
    };
    onSave(config);
    onClose();
  }, [mode, rules, fallbackIndex, enableFallback, sendToAll, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const isValid = mode === 'rules' && rules.every(r => r.expression.trim() && r.label.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Configure Switch Node</h2>
            {stepId && <p className="mt-1 text-sm text-slate-400">Step: {stepId}</p>}
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-ink/50 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Mode Selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Mode</label>
              <div className="flex gap-2 rounded-lg border border-brand-outline/40 bg-brand-ink/40 p-1">
                <button
                  type="button"
                  onClick={() => setMode('rules')}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    mode === 'rules'
                      ? 'bg-brand-accent text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rules Mode
                </button>
                <button
                  type="button"
                  onClick={() => setMode('expression')}
                  className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
                    mode === 'expression'
                      ? 'bg-brand-accent text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  disabled
                  title="Expression mode coming soon"
                >
                  Expression Mode (Coming Soon)
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Rules mode allows multiple conditions with different outputs. Each rule is evaluated in order.
              </p>
            </div>

            {/* Rules Configuration */}
            {mode === 'rules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-white">Rules</h3>
                  <button
                    type="button"
                    onClick={addRule}
                    className="flex items-center gap-2 rounded-lg bg-brand-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-accent/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </button>
                </div>

                {/* Rules List */}
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-brand-outline/40 bg-brand-ink/40 overflow-hidden"
                    >
                      {/* Rule Header */}
                      <div
                        className="flex cursor-pointer items-center justify-between bg-brand-paperElev/30 px-4 py-3 transition hover:bg-brand-paperElev/50"
                        onClick={() => setExpandedRuleIndex(expandedRuleIndex === index ? null : index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveRule(index, index - 1);
                              }}
                              disabled={index === 0}
                              className="text-slate-400 transition hover:text-white disabled:opacity-30"
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent/20 text-sm font-semibold text-brand-accent">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-white">{rule.label || `Rule ${index + 1}`}</div>
                            <div className="text-xs text-slate-400">Output Index: {rule.outputIndex}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rules.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRule(index);
                              }}
                              className="rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          <span className="text-slate-400">
                            {expandedRuleIndex === index ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Rule Body (Expanded) */}
                      {expandedRuleIndex === index && (
                        <div className="border-t border-brand-outline/40 p-4 space-y-4">
                          {/* Label */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              Label <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={rule.label}
                              onChange={(e) => updateRule(index, 'label', e.target.value)}
                              placeholder="e.g., High Score"
                              className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                            />
                          </div>

                          {/* Expression */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              Condition <span className="text-red-400">*</span>
                            </label>
                            <ExpressionBuilder
                              value={rule.expression}
                              onChange={(expr) => updateRule(index, 'expression', expr)}
                              placeholder="e.g., {{ $json.score > 0.8 }}"
                              showTemplates={true}
                            />
                          </div>

                          {/* Output Index (read-only, auto-assigned) */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-400">
                              Output Index (Auto-assigned)
                            </label>
                            <input
                              type="number"
                              value={rule.outputIndex}
                              disabled
                              className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/60 px-3 py-2 text-sm text-slate-400"
                            />
                            <p className="mt-1 text-xs text-slate-500">
                              This index determines which output path this rule connects to. Reorder rules to change indices.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* No Rules Message */}
                {rules.length === 0 && (
                  <div className="rounded-lg border border-brand-outline/40 bg-brand-ink/40 p-8 text-center">
                    <p className="text-slate-400">No rules defined. Add a rule to get started.</p>
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            <div className="space-y-4 rounded-lg border border-brand-outline/40 bg-brand-ink/40 p-4">
              <h3 className="text-sm font-semibold text-white">Options</h3>

              {/* Fallback Toggle */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enable-fallback"
                  checked={enableFallback}
                  onChange={(e) => setEnableFallback(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-outline/40 bg-brand-ink/40 text-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                />
                <div className="flex-1">
                  <label htmlFor="enable-fallback" className="cursor-pointer text-sm font-medium text-slate-300">
                    Enable Fallback Output
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    If no rules match, route to this fallback output index.
                  </p>
                  {enableFallback && (
                    <input
                      type="number"
                      value={fallbackIndex ?? rules.length}
                      onChange={(e) => setFallbackIndex(Number(e.target.value))}
                      min={0}
                      className="mt-2 w-32 rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-3 py-2 text-sm text-slate-200 focus:border-brand-accent focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Send to All Toggle */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="send-to-all"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-outline/40 bg-brand-ink/40 text-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                />
                <div className="flex-1">
                  <label htmlFor="send-to-all" className="cursor-pointer text-sm font-medium text-slate-300">
                    Send to All Matching Outputs
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    If enabled, the data will be sent to all outputs where rules match, not just the first match.
                  </p>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-xs text-blue-300">
              <div className="mb-2 font-semibold">How Switch Nodes Work:</div>
              <ul className="ml-4 list-disc space-y-1">
                <li>Rules are evaluated in order from top to bottom</li>
                <li>Each rule routes data to a specific output index based on its condition</li>
                <li>Use the expression builder to create conditions without writing code</li>
                <li>Drag rules to reorder them (output indices update automatically)</li>
                <li>Enable fallback to handle cases where no rules match</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div className="text-sm text-slate-400">
            {!isValid && <span className="text-red-400">⚠ All rules must have labels and expressions</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-brand-outline/40 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-brand-ink/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
