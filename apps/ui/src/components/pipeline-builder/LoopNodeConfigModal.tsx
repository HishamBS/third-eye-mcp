'use client';

import { memo, useState, useCallback } from 'react';
import { X, RotateCw, Package } from 'lucide-react';
import { ANIMATION_DURATION } from '@/constants/timing';
import type { LoopNodeConfig } from '@third-eye/types';

/**
 * Loop Node Configuration Modal
 *
 * Simple form for Loop nodes with:
 * - Max iterations number input (min/max validation)
 * - Batch size toggle + optional input
 * - Help text for each field
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing throughout
 * Per R13: No magic strings/numbers
 */

/**
 * Modal UI Text Constants
 */
const MODAL_TEXT = {
  TITLE: 'Configure Loop Node',
  MAX_ITERATIONS_LABEL: 'Maximum Iterations',
  MAX_ITERATIONS_PLACEHOLDER: '10',
  MAX_ITERATIONS_HELP: 'Maximum number of times the loop will execute before exiting',
  BATCH_SIZE_TOGGLE_LABEL: 'Enable Batch Processing',
  BATCH_SIZE_TOGGLE_HELP: 'Process items in batches instead of one at a time',
  BATCH_SIZE_LABEL: 'Batch Size',
  BATCH_SIZE_PLACEHOLDER: '5',
  BATCH_SIZE_HELP: 'Number of items to process per iteration',
  VALIDATION_MIN_ITERATIONS: 'Minimum iterations is 1',
  VALIDATION_MAX_ITERATIONS: 'Maximum iterations is 1000',
  VALIDATION_MIN_BATCH_SIZE: 'Minimum batch size is 1',
  VALIDATION_MAX_BATCH_SIZE: 'Maximum batch size is 100',
  SAVE_BUTTON: 'Save Configuration',
  CANCEL_BUTTON: 'Cancel',
} as const;

/**
 * Loop Configuration Limits
 */
const LOOP_LIMITS = {
  MIN_ITERATIONS: 1,
  MAX_ITERATIONS: 1000,
  DEFAULT_ITERATIONS: 10,
  MIN_BATCH_SIZE: 1,
  MAX_BATCH_SIZE: 100,
  DEFAULT_BATCH_SIZE: 5,
} as const;

/**
 * LoopNodeConfigModal Props
 */
export interface LoopNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LoopNodeConfig | undefined;
  onSave: (config: LoopNodeConfig) => void;
}

/**
 * LoopNodeConfigModal Component
 */
function LoopNodeConfigModalComponent({
  isOpen,
  onClose,
  config,
  onSave,
}: LoopNodeConfigModalProps) {
  const [maxIterations, setMaxIterations] = useState<number>(
    config?.maxIterations ?? LOOP_LIMITS.DEFAULT_ITERATIONS
  );
  const [batchEnabled, setBatchEnabled] = useState<boolean>(config?.batchSize !== undefined);
  const [batchSize, setBatchSize] = useState<number>(
    config?.batchSize ?? LOOP_LIMITS.DEFAULT_BATCH_SIZE
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateMaxIterations = useCallback((value: number): string | undefined => {
    if (value < LOOP_LIMITS.MIN_ITERATIONS) {
      return MODAL_TEXT.VALIDATION_MIN_ITERATIONS;
    }
    if (value > LOOP_LIMITS.MAX_ITERATIONS) {
      return MODAL_TEXT.VALIDATION_MAX_ITERATIONS;
    }
    return undefined;
  }, []);

  const validateBatchSize = useCallback((value: number): string | undefined => {
    if (value < LOOP_LIMITS.MIN_BATCH_SIZE) {
      return MODAL_TEXT.VALIDATION_MIN_BATCH_SIZE;
    }
    if (value > LOOP_LIMITS.MAX_BATCH_SIZE) {
      return MODAL_TEXT.VALIDATION_MAX_BATCH_SIZE;
    }
    return undefined;
  }, []);

  const handleMaxIterationsChange = useCallback(
    (value: number) => {
      setMaxIterations(value);
      const error = validateMaxIterations(value);
      setValidationErrors((prev) => ({
        ...prev,
        maxIterations: error ?? '',
      }));
    },
    [validateMaxIterations]
  );

  const handleBatchSizeChange = useCallback(
    (value: number) => {
      setBatchSize(value);
      const error = validateBatchSize(value);
      setValidationErrors((prev) => ({
        ...prev,
        batchSize: error ?? '',
      }));
    },
    [validateBatchSize]
  );

  const handleSave = useCallback(() => {
    const maxIterError = validateMaxIterations(maxIterations);
    const batchSizeError = batchEnabled ? validateBatchSize(batchSize) : undefined;

    if (maxIterError || batchSizeError) {
      setValidationErrors({
        maxIterations: maxIterError ?? '',
        batchSize: batchSizeError ?? '',
      });
      return;
    }

    const newConfig: LoopNodeConfig = {
      maxIterations,
      ...(batchEnabled && { batchSize }),
    };
    onSave(newConfig);
    onClose();
  }, [
    maxIterations,
    batchEnabled,
    batchSize,
    validateMaxIterations,
    validateBatchSize,
    onSave,
    onClose,
  ]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className={`
        relative w-full max-w-xl max-h-[90vh] overflow-y-auto
        bg-brand-paper rounded-lg shadow-2xl
        transition-all ${ANIMATION_DURATION.NORMAL} ease-out
      `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-brand-paper border-b border-brand-outline">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg">
              <RotateCw className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-xl font-semibold text-brand-foreground">{MODAL_TEXT.TITLE}</h2>
          </div>
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
          {/* Max Iterations */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-brand-foreground">
              {MODAL_TEXT.MAX_ITERATIONS_LABEL}
            </label>
            <input
              type="number"
              min={LOOP_LIMITS.MIN_ITERATIONS}
              max={LOOP_LIMITS.MAX_ITERATIONS}
              className={`
                w-full px-4 py-3 text-sm bg-brand-surface border rounded-md text-brand-foreground
                placeholder-semantic-muted focus:outline-none focus:ring-2 transition-all
                ${
                  validationErrors.maxIterations
                    ? 'border-semantic-error focus:ring-semantic-error'
                    : 'border-brand-outline focus:ring-brand-primary'
                }
              `}
              placeholder={MODAL_TEXT.MAX_ITERATIONS_PLACEHOLDER}
              value={maxIterations}
              onChange={(e) => handleMaxIterationsChange(parseInt(e.target.value, 10) || 0)}
            />
            {validationErrors.maxIterations ? (
              <p className="text-xs text-semantic-error">{validationErrors.maxIterations}</p>
            ) : (
              <p className="text-xs text-semantic-muted">{MODAL_TEXT.MAX_ITERATIONS_HELP}</p>
            )}
          </div>

          {/* Batch Processing Toggle */}
          <div className="p-4 bg-brand-surface border border-brand-outline rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex items-start gap-3">
                <div className="p-2 bg-brand-primary/10 rounded">
                  <Package className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-brand-foreground">
                    {MODAL_TEXT.BATCH_SIZE_TOGGLE_LABEL}
                  </label>
                  <p className="text-xs text-semantic-muted mt-1">
                    {MODAL_TEXT.BATCH_SIZE_TOGGLE_HELP}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={batchEnabled}
                  onChange={(e) => setBatchEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-brand-outline peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
              </label>
            </div>

            {/* Batch Size Input (only shown when enabled) */}
            {batchEnabled && (
              <div className="space-y-2 pt-2 border-t border-brand-outline">
                <label className="block text-sm font-medium text-brand-foreground">
                  {MODAL_TEXT.BATCH_SIZE_LABEL}
                </label>
                <input
                  type="number"
                  min={LOOP_LIMITS.MIN_BATCH_SIZE}
                  max={LOOP_LIMITS.MAX_BATCH_SIZE}
                  className={`
                    w-full px-4 py-3 text-sm bg-brand-paper border rounded-md text-brand-foreground
                    placeholder-semantic-muted focus:outline-none focus:ring-2 transition-all
                    ${
                      validationErrors.batchSize
                        ? 'border-semantic-error focus:ring-semantic-error'
                        : 'border-brand-outline focus:ring-brand-primary'
                    }
                  `}
                  placeholder={MODAL_TEXT.BATCH_SIZE_PLACEHOLDER}
                  value={batchSize}
                  onChange={(e) => handleBatchSizeChange(parseInt(e.target.value, 10) || 0)}
                />
                {validationErrors.batchSize ? (
                  <p className="text-xs text-semantic-error">{validationErrors.batchSize}</p>
                ) : (
                  <p className="text-xs text-semantic-muted">{MODAL_TEXT.BATCH_SIZE_HELP}</p>
                )}
              </div>
            )}
          </div>

          {/* Configuration Summary */}
          <div className="p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
            <h3 className="text-sm font-semibold text-brand-foreground mb-2">
              Configuration Summary
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-semantic-muted">Max Iterations:</span>
                <span className="font-mono font-medium text-brand-foreground">
                  {maxIterations}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-semantic-muted">Batch Processing:</span>
                <span className="font-medium text-brand-foreground">
                  {batchEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {batchEnabled && (
                <div className="flex items-center justify-between">
                  <span className="text-semantic-muted">Batch Size:</span>
                  <span className="font-mono font-medium text-brand-foreground">{batchSize}</span>
                </div>
              )}
            </div>
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
 * Memoized LoopNodeConfigModal (Performance optimization per R04)
 */
export const LoopNodeConfigModal = memo(LoopNodeConfigModalComponent);
LoopNodeConfigModal.displayName = 'LoopNodeConfigModal';
