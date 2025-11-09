'use client';

import { memo, useState, useCallback } from 'react';
import { X, Check, XIcon } from 'lucide-react';
import { ExpressionBuilder } from './ExpressionBuilder';
import { ANIMATION_DURATION } from '@/constants/timing';
import type { IfNodeConfig } from '@third-eye/types';

/**
 * IF Node Configuration Modal
 *
 * Condition builder for IF nodes with:
 * - ExpressionBuilder for condition
 * - True/False label text inputs
 * - Live condition preview
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
  TITLE: 'Configure IF Node',
  CONDITION_LABEL: 'Condition',
  CONDITION_HELP: 'Define the condition that determines True/False routing',
  TRUE_LABEL: 'True Output Label',
  TRUE_LABEL_PLACEHOLDER: 'Yes',
  TRUE_HELP: 'Label shown on the True output handle',
  FALSE_LABEL: 'False Output Label',
  FALSE_LABEL_PLACEHOLDER: 'No',
  FALSE_HELP: 'Label shown on the False output handle',
  PREVIEW_TITLE: 'Output Preview',
  SAVE_BUTTON: 'Save Configuration',
  CANCEL_BUTTON: 'Cancel',
} as const;

/**
 * IFNodeConfigModal Props
 */
export interface IFNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IfNodeConfig | undefined;
  onSave: (config: IfNodeConfig) => void;
}

/**
 * IFNodeConfigModal Component
 */
function IFNodeConfigModalComponent({
  isOpen,
  onClose,
  config,
  onSave,
}: IFNodeConfigModalProps) {
  const [condition, setCondition] = useState<unknown>(
    config?.condition ?? { '==': [{ var: 'verdict' }, 'OK'] }
  );
  const [trueLabel, setTrueLabel] = useState<string>(config?.trueLabel ?? 'Yes');
  const [falseLabel, setFalseLabel] = useState<string>(config?.falseLabel ?? 'No');

  const handleSave = useCallback(() => {
    const newConfig: IfNodeConfig = {
      condition,
      trueLabel,
      falseLabel,
    };
    onSave(newConfig);
    onClose();
  }, [condition, trueLabel, falseLabel, onSave, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
        relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
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
          {/* Condition */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-brand-foreground mb-1">
                {MODAL_TEXT.CONDITION_LABEL}
              </label>
              <p className="text-xs text-semantic-muted">{MODAL_TEXT.CONDITION_HELP}</p>
            </div>

            <ExpressionBuilder
              value={condition}
              onChange={setCondition}
              placeholder="Define condition for True/False branching..."
            />
          </div>

          {/* Output Labels */}
          <div className="grid grid-cols-2 gap-4">
            {/* True Label */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-foreground">
                {MODAL_TEXT.TRUE_LABEL}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Check className="w-4 h-4 text-semantic-success" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground placeholder-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder={MODAL_TEXT.TRUE_LABEL_PLACEHOLDER}
                  value={trueLabel}
                  onChange={(e) => setTrueLabel(e.target.value)}
                />
              </div>
              <p className="text-xs text-semantic-muted">{MODAL_TEXT.TRUE_HELP}</p>
            </div>

            {/* False Label */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-foreground">
                {MODAL_TEXT.FALSE_LABEL}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <XIcon className="w-4 h-4 text-semantic-error" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 text-sm bg-brand-surface border border-brand-outline rounded-md text-brand-foreground placeholder-semantic-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder={MODAL_TEXT.FALSE_LABEL_PLACEHOLDER}
                  value={falseLabel}
                  onChange={(e) => setFalseLabel(e.target.value)}
                />
              </div>
              <p className="text-xs text-semantic-muted">{MODAL_TEXT.FALSE_HELP}</p>
            </div>
          </div>

          {/* Output Preview */}
          <div className="p-4 bg-brand-surface border border-brand-outline rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-brand-foreground">
              {MODAL_TEXT.PREVIEW_TITLE}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* True Output Preview */}
              <div className="flex items-center gap-2 p-3 bg-semantic-success/10 border border-semantic-success/30 rounded">
                <Check className="w-4 h-4 text-semantic-success" />
                <span className="text-sm font-medium text-semantic-success">{trueLabel}</span>
              </div>

              {/* False Output Preview */}
              <div className="flex items-center gap-2 p-3 bg-semantic-error/10 border border-semantic-error/30 rounded">
                <XIcon className="w-4 h-4 text-semantic-error" />
                <span className="text-sm font-medium text-semantic-error">{falseLabel}</span>
              </div>
            </div>
          </div>

          {/* Current Condition Preview */}
          {condition && (
            <div className="p-3 bg-brand-surface border border-brand-outline rounded-md">
              <div className="text-xs font-medium text-semantic-muted mb-1">Current Condition:</div>
              <pre className="text-xs font-mono text-brand-foreground overflow-x-auto">
                {JSON.stringify(condition, null, 2)}
              </pre>
            </div>
          )}
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
 * Memoized IFNodeConfigModal (Performance optimization per R04)
 */
export const IFNodeConfigModal = memo(IFNodeConfigModalComponent);
IFNodeConfigModal.displayName = 'IFNodeConfigModal';
