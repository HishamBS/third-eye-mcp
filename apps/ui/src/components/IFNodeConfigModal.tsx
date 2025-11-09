'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { ExpressionBuilder } from './ExpressionBuilder';
import type { IFNodeConfig } from './pipeline/types';

interface IFNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: IFNodeConfig;
  onSave: (config: IFNodeConfig) => void;
  stepId?: string;
}

/**
 * IFNodeConfigModal Component
 *
 * Visual configuration modal for IF/Condition nodes that allows users to:
 * - Build conditions using the ExpressionBuilder
 * - Set custom labels for true/false branches
 * - Preview the condition live
 *
 * Eliminates the need to manually write IF node JSON configuration.
 */
export function IFNodeConfigModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
  stepId,
}: IFNodeConfigModalProps) {
  const [condition, setCondition] = useState<string>(initialConfig?.condition || '');
  const [trueLabel, setTrueLabel] = useState<string>(initialConfig?.trueLabel || 'True');
  const [falseLabel, setFalseLabel] = useState<string>(initialConfig?.falseLabel || 'False');

  // Reset state when modal opens with new config
  useEffect(() => {
    if (isOpen) {
      setCondition(initialConfig?.condition || '');
      setTrueLabel(initialConfig?.trueLabel || 'True');
      setFalseLabel(initialConfig?.falseLabel || 'False');
    }
  }, [isOpen, initialConfig]);

  const handleSave = useCallback(() => {
    const config: IFNodeConfig = {
      condition,
      trueLabel: trueLabel || 'True',
      falseLabel: falseLabel || 'False',
    };
    onSave(config);
    onClose();
  }, [condition, trueLabel, falseLabel, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Validate condition
  const isValid = useMemo(() => {
    if (!condition.trim()) return false;
    // Basic validation: check for {{ }} wrapper
    return condition.includes('{{') && condition.includes('}}');
  }, [condition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Configure IF Node</h2>
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
            {/* Description */}
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-300">
              <p>
                IF nodes evaluate a single condition and route data to one of two branches:
                <strong className="text-blue-200"> true</strong> or <strong className="text-blue-200">false</strong>.
              </p>
            </div>

            {/* Condition Builder */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Condition <span className="text-red-400">*</span>
              </label>
              <ExpressionBuilder
                value={condition}
                onChange={setCondition}
                placeholder="e.g., {{ $json.isValid && $json.score > 0.7 }}"
                showTemplates={true}
              />
            </div>

            {/* Branch Labels */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* True Label */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  True Branch Label
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={trueLabel}
                    onChange={(e) => setTrueLabel(e.target.value)}
                    placeholder="e.g., Valid"
                    className="w-full rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
                  />
                  <CheckCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400" />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Label for the output when condition is true
                </p>
              </div>

              {/* False Label */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  False Branch Label
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={falseLabel}
                    onChange={(e) => setFalseLabel(e.target.value)}
                    placeholder="e.g., Invalid"
                    className="w-full rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:border-red-500 focus:outline-none"
                  />
                  <XCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-400" />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Label for the output when condition is false
                </p>
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-lg border border-brand-outline/40 bg-brand-ink/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Preview</h3>
              <div className="space-y-3">
                {/* Condition Display */}
                <div className="rounded-lg border border-brand-outline/30 bg-brand-paper/50 p-3">
                  <div className="mb-1 text-xs font-medium text-slate-400">Condition:</div>
                  <code className="text-sm text-green-400">{condition || '(empty)'}</code>
                </div>

                {/* Branch Flow Diagram */}
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="rounded-lg border-2 border-green-500/50 bg-green-500/10 p-3 text-center">
                      <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-400" />
                      <div className="text-xs font-medium text-slate-400">IF TRUE</div>
                      <div className="mt-1 text-sm font-semibold text-green-400">
                        {trueLabel || 'True'}
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl text-slate-600">⚡</div>

                  <div className="flex-1">
                    <div className="rounded-lg border-2 border-red-500/50 bg-red-500/10 p-3 text-center">
                      <XCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
                      <div className="text-xs font-medium text-slate-400">IF FALSE</div>
                      <div className="mt-1 text-sm font-semibold text-red-400">
                        {falseLabel || 'False'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Conditions */}
            <details className="rounded-lg border border-brand-outline/40 bg-brand-ink/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                Example Conditions
              </summary>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="text-xs text-slate-400">Check if approved:</div>
                  <code className="mt-1 block text-xs text-green-400">{'{{ $json.approved === true }}'}</code>
                </div>
                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="text-xs text-slate-400">Score threshold:</div>
                  <code className="mt-1 block text-xs text-green-400">{'{{ $json.score > 0.8 }}'}</code>
                </div>
                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="text-xs text-slate-400">Multiple conditions:</div>
                  <code className="mt-1 block text-xs text-green-400">
                    {'{{ $json.isValid && $json.score > 0.5 }}'}
                  </code>
                </div>
                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="text-xs text-slate-400">Check field exists:</div>
                  <code className="mt-1 block text-xs text-green-400">
                    {'{{ $json.result !== undefined }}'}
                  </code>
                </div>
              </div>
            </details>

            {/* Help Text */}
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-300">
              <div className="mb-2 font-semibold">Tips:</div>
              <ul className="ml-4 list-disc space-y-1">
                <li>Use the expression builder to create conditions without writing code</li>
                <li>Labels help identify branches in the visual flow diagram</li>
                <li>Conditions must evaluate to true or false</li>
                <li>You can access any field from the previous step using <code className="text-yellow-200">$json.fieldName</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div className="text-sm text-slate-400">
            {!isValid && <span className="text-red-400">⚠ Condition is required</span>}
            {isValid && <span className="text-green-400">✓ Configuration is valid</span>}
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
